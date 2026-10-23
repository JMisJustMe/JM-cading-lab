#!/usr/bin/env python3
"""JM v0.7 cross-encoder answer contact.

Candidate contact: existing v0.6 exact-source-replayed all-MiniLM-L6-v2
paragraph index -> bounded pretrained cross-encoder reranking -> exact original
book line citation -> existing v0.5 author-consistency guard.
Gold never enters retrieval. v0.6 remains the control. No generative LLM,
training, expert truth certification or main promotion.
"""
from __future__ import annotations
import argparse,hashlib,json,re,time
from pathlib import Path
import jm_knowledge_semantic_v06 as v06
import jm_knowledge_answer_eval as v04
import jm_knowledge_robustness_v05 as v05
import jm_knowledge_assurance as assurance

SCHEMA="JM.KnowledgeCrossEncoderContact/0.7"
RERANKER="Xenova/ms-marco-MiniLM-L-6-v2"

def digest(data):
    return hashlib.sha256(data).hexdigest()

def model_sha(cache):
    models=sorted(Path(cache).rglob("*.onnx"))
    if not models:return None
    h=hashlib.sha256()
    for file in models:
        h.update(file.relative_to(cache).as_posix().encode("utf8"))
        h.update(file.read_bytes())
    return h.hexdigest()

class CrossContact:
    def __init__(self,contact,reranker,cache):
        self.contact=contact
        self.reranker=reranker
        self.cache=Path(cache)
        if not contact.paragraphs or contact.matrix.shape[0]!=len(contact.paragraphs):
            raise assurance.Held("MISSING_VERIFIED_DENSE_CONTACT")

    def answer(self,question,top_pool=60,threshold=.30,rerank_gate=.0):
        self.contact.check_originals()
        if not question or len(question)>1200 or not isinstance(question,str):
            raise assurance.Held("BAD_QUESTION")
        if not 10<=top_pool<=100:
            raise assurance.Held("INVALID_RERANK_POOL")
        if not -20<=rerank_gate<=20 or not 0<=threshold<=1:
            raise assurance.Held("BAD_RERANK_GATES")
        t0=time.perf_counter()
        author_words={a for a in (v05.author_of(p.name) for p in self.contact.originals) if a}
        normalized=question
        for author in author_words:
            normalized=re.sub(r"\b"+re.escape(author)+r"\b"," ",normalized,flags=re.I)
        vec=v06.unit(list(self.contact.model.embed([normalized])))[0]
        sims=self.contact.matrix@vec
        ranked=v06.np.argsort(-sims,kind="stable")[:min(top_pool,len(sims))]
        paragraphs=[self.contact.paragraphs[int(i)] for i in ranked]
        para_scores=list(self.reranker.rerank(normalized,[p["text"] for p in paragraphs]))
        if len(para_scores)!=len(paragraphs):
            raise assurance.Held("CROSS_ENCODER_PARAGRAPH_SHAPE")
        ordered=sorted(range(len(paragraphs)),key=lambda i:(-float(para_scores[i]),i))
        candidate_sentences=[]
        for idx in ordered[:12]:
            p=paragraphs[idx]
            for lineno,text in p["lines"]:
                if len(text)>=24:
                    candidate_sentences.append((p,lineno,text,int(ranked[idx]),float(para_scores[idx])))
        candidate_sentences=candidate_sentences[:105]
        response={"kind":"ABSTAIN","answer":None,"citation":None,
                  "abstained":True,"reason":"CROSS_ENCODER_EVIDENCE_GATE"}
        best_dense=0.0;best_ce=-999.0
        if candidate_sentences:
            scores=list(self.reranker.rerank(normalized,[x[2] for x in candidate_sentences]))
            if len(scores)!=len(candidate_sentences):
                raise assurance.Held("CROSS_ENCODER_SENTENCE_SHAPE")
            ranked_lines=sorted(range(len(scores)),key=lambda i:(-float(scores[i]),i))
            for k in ranked_lines:
                p,lineno,quote,index,para_score=candidate_sentences[k]
                cs=float(scores[k])
                similarity=float(sims[index])
                if cs <rerank_gate or similarity<threshold:
                    continue
                found={"original_name":p["book"],"original_sha256":p["book_sha256"],
                       "original_line":lineno,"quote_UNTRUSTED_DATA":quote}
                citation=v04.citation_check(found,self.contact.originals)
                response={"kind":"EXTRACTIVE_BOOK_QUOTE","answer":quote,"citation":citation,
                          "abstained":False,"reason":"CROSS_ENCODER_QUOTE_EXACT_REPLAY"}
                best_dense=similarity;best_ce=cs
                break
        result={"schema":SCHEMA,"state":"HELD","question":question,"response":response,
                "model":RERANKER,"dense_model":v06.MODEL,
                "score_ce":round(best_ce,5) if best_ce!=-999 else None,
                "score_dense":round(best_dense,5),
                "min_cross_score":rerank_gate,"min_dense_score":threshold,
                "pool_limit":top_pool,"candidate_sentences":len(candidate_sentences),
                "cost":{"elapsed_ms":round((time.perf_counter()-t0)*1000,2),
                        "generative_llm_calls":0},
                "model_generated":False,"fine_tuned_in_JM":False,
                "promotion":"NOT_ALLOWED"}
        result=v05.conservative(result,self.contact.originals)
        self.contact.check_originals()
        return result

def compare(originals,tasks,dense,reranker,cache,pool=60,threshold=.30,rerank_gate=0.0):
    originals=[Path(x) for x in originals]
    v05.validate_gold(tasks,originals)
    c=v06.Contact(originals,dense,Path(cache)/"dense_index")
    guard=CrossContact(c,reranker,cache)
    rows=[]
    start=time.perf_counter()
    for task in tasks:
        v6=c.answer(task["question"])
        v7=guard.answer(task["question"],pool,threshold,rerank_gate)
        oldok,oldwhy=v05.score_response(v6,task)
        newok,newwhy=v05.score_response(v7,task)
        rows.append({
            "id":task["id"],"category":task["category"],
            "v06_correct":oldok,"v07_correct":newok,
            "v06_reason":oldwhy,"v07_reason":newwhy,
            "v06_book":v6["response"]["citation"]["book"] if v6["response"]["citation"] else None,
            "v07_book":v7["response"]["citation"]["book"] if v7["response"]["citation"] else None,
            "v07_answer_preview":v7["response"]["answer"][:170] if v7["response"]["answer"] else None,
            "v07_abstained":v7["response"]["abstained"],
            "v07_source_verified":v7["response"]["citation"] is not None and
                 v7["response"]["citation"]["check"]=="EXACT_ORIGINAL_BOOK_LINE_PASS",
            "v07_ce_score":v7["score_ce"],
            "v07_dense_score":v7["score_dense"],
            "delta":"GAIN" if newok and not oldok else "REGRESSION" if oldok and not newok else "UNCHANGED",
            "time_ms_v07":v7["cost"]["elapsed_ms"]})
    return {"schema":SCHEMA,"state":"HELD","cases":len(rows),
        "v06_correct":sum(x["v06_correct"] for x in rows),
        "v07_correct":sum(x["v07_correct"] for x in rows),
        "gains":sum(x["delta"]=="GAIN" for x in rows),
        "regressions":sum(x["delta"]=="REGRESSION" for x in rows),
        "categories":{cat:{"cases":sum(x["category"]==cat for x in rows),
            "v06_correct":sum(x["category"]==cat and x["v06_correct"] for x in rows),
            "v07_correct":sum(x["category"]==cat and x["v07_correct"] for x in rows)}
            for cat in ("DIRECT","PARAPHRASE","FALSE_ATTRIBUTION","UNSUPPORTED")},
        "pool":pool,"min_dense_score":threshold,"min_cross_score":rerank_gate,
        "dense_model":v06.MODEL,"reranker":RERANKER,
        "models_cache_hash":model_sha(cache),
        "indexed_paragraphs":len(c.paragraphs),
        "total_elapsed_ms":round((time.perf_counter()-start)*1000,2),
        "rows":rows,"gold_used_in_candidate":False,
        "model_fine_tuned_in_JM":False,"generative_model_calls":0,
        "llm_comparison":"NOT_PERFORMED",
        "promotion":"NOT_ALLOWED",
        "proof_boundary":"Real pretrained cross-encoder and embedding models with original JM full-book replay and line-cited extractive answers. No generative LLM or general semantic truth proof."}

def main(argv=None):
    parser=argparse.ArgumentParser()
    parser.add_argument("--book",action="append",type=Path,required=True)
    parser.add_argument("--gold",required=True,type=Path)
    parser.add_argument("--out",required=True,type=Path)
    parser.add_argument("--cache",required=True,type=Path)
    parser.add_argument("--pool",type=int,default=60)
    parser.add_argument("--threshold",type=float,default=.30)
    parser.add_argument("--rerank-gate",type=float,default=0.0)
    a=parser.parse_args(argv)
    try:
        if a.out.exists() or a.out.is_symlink():raise assurance.Held("OUTPUT_EXISTS")
        from fastembed import TextEmbedding
        from fastembed.rerank.cross_encoder import TextCrossEncoder
        dense=TextEmbedding(model_name=v06.MODEL,cache_dir=str(a.cache))
        reranker=TextCrossEncoder(model_name=RERANKER,cache_dir=str(a.cache))
        tasks=json.loads(a.gold.read_text(encoding="utf8"))
        result=compare(a.book,tasks,dense,reranker,a.cache,a.pool,a.threshold,a.rerank_gate)
        a.out.parent.mkdir(parents=True,exist_ok=True)
        data=(json.dumps(result,sort_keys=True,ensure_ascii=False,indent=2)+"\n").encode("utf8")
        a.out.write_bytes(data)
        if a.out.read_bytes()!=data:raise assurance.Held("OUTPUT_READBACK_DRIFT")
        print(data.decode("utf8"),end="")
        return 0
    except (assurance.Held,ValueError,KeyError,TypeError,OSError,RuntimeError) as exc:
        print(json.dumps({"state":"BUGG","error":str(exc) if isinstance(exc,assurance.Held) else type(exc).__name__,
                          "promotion":"NOT_ALLOWED"}))
        return 1

if __name__=="__main__":raise SystemExit(main())
