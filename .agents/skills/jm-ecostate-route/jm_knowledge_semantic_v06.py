#!/usr/bin/env python3
"""JM Knowledge Semantic Contact v0.6.

Pretrained ONNX sentence embeddings used for semantic retrieval on *unmodified*
original books; a verbatim selected source line becomes the answer. Gold never
touches retrieval. This is NOT generative LLM inference, model training, or a
general proof of understanding. Canonical JM full-book replay, original byte
rehash, and exact original line citations are mandatory.
"""
from __future__ import annotations
import argparse,hashlib,importlib.metadata,json,re,tempfile,time
from pathlib import Path
try:
    import numpy as np
except ImportError:
    np=None  # Optional: original JM knowledge and its tests do not require neural dependencies.
import jm_knowledge_fullbook as books
import jm_knowledge_answer_eval as v04
import jm_knowledge_robustness_v05 as v05
import jm_knowledge_assurance as assurance

SCHEMA="JM.KnowledgeSemanticContact/0.6"
MODEL="sentence-transformers/all-MiniLM-L6-v2"
MAX_PARAGRAPHS=16000
MAX_EMBED_CHARS=700

def hashbytes(b):
    return hashlib.sha256(b).hexdigest()

def texts_and_lines(originals):
    paragraphs=[]
    for path in originals:
        raw=Path(path).read_bytes()
        lines=raw.decode("utf-8-sig").splitlines()
        buf=[];start=0
        def flush():
            nonlocal buf,start
            if not buf:return
            joined=" ".join(row[1] for row in buf)
            if len(joined)>=28:
                paragraphs.append({"book":Path(path).name,"book_sha256":hashbytes(raw),
                  "text":joined[:MAX_EMBED_CHARS],"lines":list(buf)})
            buf=[];start=0
        for n,line in enumerate(lines,1):
            txt=line.strip()
            if not txt:
                flush()
                continue
            if "project gutenberg" in txt.casefold() or txt.startswith("***"):
                flush()
                continue
            if len(txt)>650:
                flush()
                continue
            if not buf:start=n
            if sum(len(s) for _,s in buf)+len(txt)>MAX_EMBED_CHARS:
                flush()
                start=n
            buf.append((n,txt))
        flush()
    if not paragraphs or len(paragraphs)>MAX_PARAGRAPHS:
        raise assurance.Held("BOUNDED_PARAGRAPH_INDEX_REQUIRED")
    return paragraphs

def unit(vec):
    if np is None: raise assurance.Held('SEMANTIC_EXTRAS_NOT_INSTALLED')
    a=np.asarray(vec,dtype=np.float32)
    norm=np.linalg.norm(a,axis=-1,keepdims=True)
    return a/np.maximum(norm,1e-8)

class Contact:
    def __init__(self,originals,model,cache_dir,check_original_replay=True):
        self.originals=[Path(p) for p in originals]
        self.model=model
        self.cache_dir=Path(cache_dir)
        self.original_hashes={p.name:hashbytes(p.read_bytes()) for p in self.originals}
        if len(self.original_hashes)!=len(self.originals):
            raise assurance.Held("DUPLICATE_BOOK_NAME")
        self.stage=self.cache_dir/"original_chunks"
        if check_original_replay:
            books.stage(self.originals,self.stage)
            proof=books.run(self.originals,self.stage,"habit")
            if proof["original_replay"]!="PASS" or proof["canonical_jm_query_replay"]!="PASS":
                raise assurance.Held("CANONICAL_JM_BOOK_REPLAY_MISSING")
        self.paragraphs=texts_and_lines(self.originals)
        self.matrix=unit(list(self.model.embed([p["text"] for p in self.paragraphs])))
        if self.matrix.ndim!=2 or self.matrix.shape[0]!=len(self.paragraphs):
            raise assurance.Held("NEURAL_EMBEDDING_SHAPE")
        self.model_weights_sha256=self.read_model_hash()
        self.index_sha256=hashbytes(b"".join(self.original_hashes[k].encode("ascii") for k in sorted(self.original_hashes))+
                        self.matrix.tobytes())
        self.model_calls=1 # one embedding batch for index

    def read_model_hash(self):
        files=sorted(self.cache_dir.rglob("*.onnx"))
        if not files:return None
        h=hashlib.sha256()
        for p in files:
            h.update(p.name.encode());h.update(p.read_bytes())
        return h.hexdigest()

    def check_originals(self):
        if {p.name:hashbytes(p.read_bytes()) for p in self.originals}!=self.original_hashes:
            raise assurance.Held("ORIGINAL_BOOK_DRIFT")
        if self.stage.exists():
            books.verify(self.originals,self.stage)

    def answer(self,question,threshold=.46):
        self.check_originals()
        if not isinstance(question,str) or not question.strip() or len(question)>1200:
            raise assurance.Held("INVALID_QUESTION")
        t0=time.perf_counter()
        q=question
        authors={v05.author_of(p.name) for p in self.originals}
        for author in authors:
            if author:q=re.sub(r"\b"+re.escape(author)+r"\b","",q,flags=re.I)
        query_vec=unit(list(self.model.embed([q])))[0]
        self.model_calls+=1
        sim=self.matrix@query_vec
        idx=np.argsort(-sim,kind="stable")[:min(12,len(sim))]
        candidates=[]
        for i in idx:
            paragraph=self.paragraphs[int(i)]
            for lineno,txt in paragraph["lines"]:
                if len(txt)<25:continue
                candidates.append((paragraph,lineno,txt))
        if candidates:
            line_vecs=unit(list(self.model.embed([c[2] for c in candidates])))
            self.model_calls+=1
            scores=line_vecs@query_vec
            # paragraph context rewards finding a relevant full thought but cannot
            # override sentence-level evidence.
            overall=np.asarray([.83*float(scores[j])+.17*float(sim[int(idx_for)])
                         for j,idx_for in enumerate(
                          [next(int(i) for i in idx if self.paragraphs[int(i)] is c[0])
                           for c in candidates])])
            best=int(np.argmax(overall))
            hit=candidates[best]
            best_score=float(overall[best])
        else:
            hit=None;best_score=0.0
        response={"kind":"ABSTAIN","answer":None,"citation":None,
                  "abstained":True,"reason":"SEMANTIC_EVIDENCE_BELOW_THRESHOLD"}
        if hit is not None and best_score>=threshold:
            paragraph,lineno,quote=hit
            evidence={"original_name":paragraph["book"],"original_sha256":paragraph["book_sha256"],
                      "original_line":lineno,"quote_UNTRUSTED_DATA":quote}
            citation=v04.citation_check(evidence,self.originals)
            response={"kind":"EXTRACTIVE_BOOK_QUOTE","answer":quote,"citation":citation,
                      "abstained":False,"reason":"NEURAL_RETRIEVAL_QUOTE_EXACTLY_VERIFIED"}
        result={
            "schema":SCHEMA,"state":"HELD","question":question,"response":response,
            "model":MODEL,"semantic_score":round(best_score,5),
            "threshold":threshold,"index_paragraphs":len(self.paragraphs),
            "model_sha256":self.model_weights_sha256,"index_sha256":self.index_sha256,
            "cost":{"elapsed_ms":round((time.perf_counter()-t0)*1000,2),
                    "local_embedding_batches":self.model_calls,
                    "generative_model_calls":0},
            "model_generated":False,"pretrained_embedding_model_used":True,
            "model_fine_tuned_in_JM":False,"promotion":"NOT_ALLOWED",
        }
        # Inherit exact author-consistency guard from v0.5; do not modify v0.4.
        guarded=v05.conservative(result,self.originals)
        if not guarded["response"]["abstained"]:
            cite=guarded["response"]["citation"]
            if cite["check"]!="EXACT_ORIGINAL_BOOK_LINE_PASS":
                raise assurance.Held("ORIGINAL_CITATION_RECHECK_REQUIRED")
        return guarded

def compare(originals,tasks,model,cache_dir,threshold=.46):
    originals=[Path(p) for p in originals]
    v05.validate_gold(tasks,originals)
    start=time.perf_counter()
    c=Contact(originals,model,cache_dir)
    rows=[]
    for i,task in enumerate(tasks):
        with tempfile.TemporaryDirectory(prefix=f"jm-v06-baseline-{i}-") as tmp:
            baseline=v04.answer(originals,task["question"],tmp)
        old=v05.conservative(baseline,originals)
        new=c.answer(task["question"],threshold)
        old_ok,old_reason=v05.score_response(old,task)
        new_ok,new_reason=v05.score_response(new,task)
        rows.append({"id":task["id"],"category":task["category"],
            "baseline_pass":old_ok,"semantic_pass":new_ok,
            "baseline_reason":old_reason,"semantic_reason":new_reason,
            "baseline_abstained":old["response"]["abstained"],
            "semantic_abstained":new["response"]["abstained"],
            "semantic_score":new["semantic_score"],"semantic_book":new["response"]["citation"]["book"] if new["response"]["citation"] else None,
            "semantic_exact_citation":new["response"]["citation"] is not None and
                new["response"]["citation"]["check"]=="EXACT_ORIGINAL_BOOK_LINE_PASS",
            "change":"GAIN" if new_ok and not old_ok else "REGRESSION" if old_ok and not new_ok else "UNCHANGED"})
    b=sum(x["baseline_pass"] for x in rows)
    s=sum(x["semantic_pass"] for x in rows)
    return {"schema":SCHEMA,"state":"HELD","cases":len(rows),
        "baseline_correct":b,"semantic_correct":s,
        "gains":sum(x["change"]=="GAIN" for x in rows),
        "regressions":sum(x["change"]=="REGRESSION" for x in rows),
        "categories":{cat:{"cases":sum(x["category"]==cat for x in rows),
                           "baseline_correct":sum(x["category"]==cat and x["baseline_pass"] for x in rows),
                           "semantic_correct":sum(x["category"]==cat and x["semantic_pass"] for x in rows)}
                      for cat in ("DIRECT","PARAPHRASE","FALSE_ATTRIBUTION","UNSUPPORTED")},
        "model":MODEL,"model_sha256":c.model_weights_sha256,"paragraphs":len(c.paragraphs),
        "semantic_index_sha256":c.index_sha256,"elapsed_ms_total":round((time.perf_counter()-start)*1000,2),
        "embedding_batches":c.model_calls,"model_generations":0,
        "retrieval_model_pretrained":True,"generative_llm_comparison":"NOT_PERFORMED",
        "trained_JM_model":False,"new_promotion":"NOT_ALLOWED",
        "gold_during_retrieval":False,
        "rows":rows,
        "boundary":"Actual pretrained neural sentence embeddings with exact original-book quote/citation or abstention; does not prove generative LLM knowledge, original thought, or universal language understanding."}

def main(argv=None):
    p=argparse.ArgumentParser()
    p.add_argument("--book",action="append",type=Path,required=True)
    p.add_argument("--gold",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True)
    p.add_argument("--cache",type=Path,required=True)
    p.add_argument("--threshold",type=float,default=.46)
    x=p.parse_args(argv)
    try:
        if x.out.exists():raise assurance.Held("OUTPUT_EXISTS")
        from fastembed import TextEmbedding
        encoder=TextEmbedding(model_name=MODEL,cache_dir=str(x.cache))
        tasks=json.loads(x.gold.read_text(encoding="utf8"))
        report=compare(x.book,tasks,encoder,x.cache,x.threshold)
        x.out.parent.mkdir(parents=True,exist_ok=True)
        payload=(json.dumps(report,ensure_ascii=False,sort_keys=True,indent=2)+"\n").encode("utf8")
        x.out.write_bytes(payload)
        if x.out.read_bytes()!=payload:raise assurance.Held("OUTPUT_READBACK_FAILED")
        print(payload.decode("utf8"),end="")
        return 0
    except (assurance.Held,ValueError,KeyError,TypeError,OSError,RuntimeError) as exc:
        print(json.dumps({"state":"BUGG","error":str(exc) if isinstance(exc,assurance.Held) else type(exc).__name__,
                          "promotion":"NOT_ALLOWED"}))
        return 1

if __name__=="__main__":raise SystemExit(main())
