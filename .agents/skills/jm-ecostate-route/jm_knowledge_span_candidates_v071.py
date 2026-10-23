#!/usr/bin/env python3
"""JM v0.7.1 stage: original-book verified question/context candidates for ONNX QA.

The gold scoring file is NOT used. Questions are passed as id/question only.
Existing JM replay + pretrained dense and cross-encoder candidate ranks are
inherited, not modified. Source text stays on the GitHub runner only.
"""
from __future__ import annotations
import argparse,hashlib,json,re
from pathlib import Path
import jm_knowledge_semantic_v06 as semantic
import jm_knowledge_crossencoder_v07 as cross
import jm_knowledge_robustness_v05 as v05
import jm_knowledge_assurance as assurance

SCHEMA="JM.KnowledgeSpanCandidates/0.7.1"

def candidates(contact,reranker,questions,pool=80,limit=8):
    if not isinstance(questions,list) or not 1<=len(questions)<=40:
        raise assurance.Held("QUESTION_SET_COUNT")
    if not 10<=pool<=120 or not 1<=limit<=12:
        raise assurance.Held("CANDIDATE_BOUNDS")
    items=[]
    for task in questions:
        if set(task)!={"id","question"}:
            raise assurance.Held("QUESTION_INPUT_GOLD_LEAK")
        q=task["question"]
        if not isinstance(q,str) or not q or len(q)>1200:
            raise assurance.Held("BAD_QUESTION")
        contact.check_originals()
        query=q
        for author in {v05.author_of(p.name) for p in contact.originals}:
            if author: query=re.sub(r"\b"+re.escape(author)+r"\b"," ",query,flags=re.I)
        vec=semantic.unit(list(contact.model.embed([query])))[0]
        similarities=contact.matrix@vec
        ranked=semantic.np.argsort(-similarities,kind="stable")[:min(len(similarities),pool)]
        paragraphs=[contact.paragraphs[int(i)] for i in ranked]
        scores=list(reranker.rerank(query,[p["text"] for p in paragraphs]))
        if len(scores)!=len(paragraphs):raise assurance.Held("PARAGRAPH_SCORE_SHAPE")
        indices=sorted(range(len(scores)),key=lambda i:(-float(scores[i]),i))[:limit]
        hits=[]
        for i in indices:
            p=paragraphs[i]
            hits.append({
                "source_filename":p["book"],"original_sha256":p["book_sha256"],
                "context":p["text"],"lines":[{"line":line,"source":s} for line,s in p["lines"]],
                "dense_score":float(similarities[int(ranked[i])]),
                "cross_score":float(scores[i])
            })
        items.append({"id":task["id"],"question":q,"candidates":hits})
    return {"schema":SCHEMA,"state":"HELD","items":items,"cases":len(items),
            "context_per_question_max":limit,
            "source_replay":"PASS","candidate_models":[semantic.MODEL,cross.RERANKER],
            "gold_used_in_candidate":False,"promotion":"NOT_ALLOWED"}

def main(argv=None):
    p=argparse.ArgumentParser()
    p.add_argument("--book",action="append",required=True,type=Path)
    p.add_argument("--questions",required=True,type=Path)
    p.add_argument("--cache",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    args=p.parse_args(argv)
    try:
        if args.out.exists():raise assurance.Held("OUTPUT_EXISTS")
        from fastembed import TextEmbedding
        from fastembed.rerank.cross_encoder import TextCrossEncoder
        dense=TextEmbedding(model_name=semantic.MODEL,cache_dir=str(args.cache))
        rr=TextCrossEncoder(model_name=cross.RERANKER,cache_dir=str(args.cache))
        c=semantic.Contact(args.book,dense,args.cache/"source_index")
        tasks=json.loads(args.questions.read_text(encoding="utf8"))
        output=candidates(c,rr,tasks)
        raw=(json.dumps(output,sort_keys=True,ensure_ascii=False,indent=2)+"\n").encode("utf8")
        args.out.parent.mkdir(parents=True,exist_ok=True)
        args.out.write_bytes(raw)
        if args.out.read_bytes()!=raw:raise assurance.Held("READBACK_DRIFT")
        print(json.dumps({"schema":SCHEMA,"cases":len(tasks),
            "candidate_counts":[len(t["candidates"]) for t in output["items"]],
            "bytes":len(raw),"sha256":hashlib.sha256(raw).hexdigest(),
            "model_contacts":"PRETRAINED_DENSE_PLUS_CROSS","source_replay":"PASS",
            "gold_used_in_candidate":False}))
        return 0
    except (assurance.Held,OSError,KeyError,ValueError,TypeError) as e:
        print(json.dumps({"state":"BUGG","error":str(e) if isinstance(e,assurance.Held) else type(e).__name__,
                          "promotion":"NOT_ALLOWED"}))
        return 1
if __name__=="__main__":
    raise SystemExit(main())
