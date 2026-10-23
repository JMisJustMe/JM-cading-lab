#!/usr/bin/env python3
"""JM Evidence-QA v0.3: source replay, gold-anchored support checks, honest ablation.

Gold labels are used ONLY by scorer; original lexical and JM source-first
retrievers are unchanged. Reports evidence recall and abstention, NOT model QA.
No training, execution of source quotations, authority or production promotion.
"""
from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path

import jm_knowledge_query as jq
import jm_knowledge_assurance as assurance
import jm_knowledge_capability_recipient as receiver

SCHEMA="JM.KnowledgeEvidenceQABenchmark/0.3"

def sha(x:bytes)->str:
    return hashlib.sha256(x).hexdigest()

def validate_tasks(tasks,records):
    if not isinstance(tasks,list) or not 1<=len(tasks)<=100:
        raise assurance.Held("BENCHMARK_CASE_COUNT")
    ids=set()
    for t in tasks:
        if not isinstance(t,dict) or set(t)!={"id","question","answerable","source_filename","gold_anchor"}:
            raise assurance.Held("BENCHMARK_SCHEMA")
        if not isinstance(t["id"],str) or not t["id"] or t["id"] in ids:
            raise assurance.Held("DUPLICATE_OR_INVALID_GOLD_ID")
        ids.add(t["id"])
        if not isinstance(t["question"],str) or not 1<=len(t["question"])<=1200:
            raise assurance.Held("BAD_BENCHMARK_QUESTION")
        if not isinstance(t["answerable"],bool):
            raise assurance.Held("INVALID_ANSWERABLE")
        if t["answerable"]:
            anchor=t["gold_anchor"]
            name=t["source_filename"]
            if not isinstance(anchor,str) or len(anchor)<5 or not isinstance(name,str):
                raise assurance.Held("BAD_GOLD_ANCHOR")
            if not any(r["filename"]==name and anchor.casefold() in r["data"].casefold()
                       and not r["possible_instruction_attack"] for r in records):
                raise assurance.Held("GOLD_ANCHOR_NOT_IN_ORIGINALS")
        elif t["gold_anchor"] is not None or t["source_filename"] is not None:
            raise assurance.Held("NEGATIVE_GOLD_MUST_BE_NULL")

def evaluate(candidate:Path,sources:list[Path],tasks:list[dict],top:int=3):
    candidate=Path(candidate);sources=[Path(x) for x in sources]
    if not isinstance(top,int) or top<1 or top>20:
        raise assurance.Held("BAD_TOP")
    # The real candidate/source replay occurs in *every* jq.query call.
    index=assurance.load(candidate/"evidence/SOURCE_INDEX.json")
    records=index.get("records")
    if index.get("schema")!="JM.KnowledgeEvidenceIndex/0.4" or not isinstance(records,list):
        raise assurance.Held("INVALID_INDEX")
    validate_tasks(tasks,records)
    results=[]
    manifest_sha=sha((candidate/"SHA256_MANIFEST.json").read_bytes())
    for t in tasks:
        verified=jq.query(candidate,sources,t["question"],top,manifest_sha)
        if verified.get("state")!="HELD" or verified.get("source_integrity")!="PASS_REPLAY":
            raise assurance.Held("CANONICAL_REPLAY_REQUIRED")
        base=receiver.baseline(records,t["question"],top)
        jm=verified["matches"]
        def has_gold(items,kind):
            if not t["answerable"]:
                return len(items)==0
            return any(
                (r["filename"]==t["source_filename"] and
                 t["gold_anchor"].casefold() in
                 (r.get("quote_UNTRUSTED_DATA") if kind=="jm" else r["data"]).casefold())
                for r in items)
        b=has_gold(base,"baseline");j=has_gold(jm,"jm")
        bd=len({r["source_id"] for r in base})
        jd=len({r["source_id"] for r in jm})
        results.append({
            "case_id":t["id"],"question":t["question"],"answerable":t["answerable"],
            "baseline_hit":b,"jm_hit":j,
            "baseline_distinct_docs":bd,"jm_distinct_docs":jd,
            "baseline_passages":len(base),"jm_passages":len(jm),
            "change":"GAIN" if j and not b else "REGRESSION" if b and not j else "UNCHANGED",
            "source_replay":"PASS","gold_used_during_ranking":False
        })
    return {
        "schema":SCHEMA,"state":"HELD","top":top,
        "source_manifest_sha256":manifest_sha,
        "task_set_sha256":sha(json.dumps(tasks,sort_keys=True,ensure_ascii=False).encode("utf8")),
        "cases":len(results),
        "baseline_pass":sum(r["baseline_hit"] for r in results),
        "jm_pass":sum(r["jm_hit"] for r in results),
        "gains":sum(r["change"]=="GAIN" for r in results),
        "regressions":sum(r["change"]=="REGRESSION" for r in results),
        "results":results,
        "metric":"GOLD_EVIDENCE_RECALL_AT_K_AND_ZERO_MATCH_ABSTENTION",
        "gold_not_used_by_retrieval":True,
        "actual_natural_language_answers_tested":False,
        "model_weights_changed":False,
        "auto_promote":False,
        "claim_boundary":"Small gold-anchored evidence retrieval benchmark, not neural model evaluation, universal improvement, factual corroboration, or owner acceptance."
    }

def main(argv=None):
    p=argparse.ArgumentParser()
    p.add_argument("--candidate",required=True,type=Path)
    p.add_argument("--source",action="append",required=True,type=Path)
    p.add_argument("--gold",required=True,type=Path)
    p.add_argument("--top",type=int,default=3)
    p.add_argument("--receipt",type=Path)
    a=p.parse_args(argv)
    try:
        tasks=json.loads(a.gold.read_text(encoding="utf8"))
        if a.receipt and a.receipt.resolve().is_relative_to(a.candidate.resolve()):
            raise assurance.Held("RECEIPT_INSIDE_CANDIDATE")
        result=evaluate(a.candidate,a.source,tasks,a.top)
        body=json.dumps(result,sort_keys=True,ensure_ascii=False,indent=2)+"\n"
        if a.receipt:
            if a.receipt.exists():raise assurance.Held("RECEIPT_EXISTS")
            a.receipt.write_text(body,encoding="utf8")
            if a.receipt.read_text(encoding="utf8")!=body:
                raise assurance.Held("RECEIPT_READBACK")
        print(body,end="")
        return 0
    except (assurance.Held,ValueError,OSError,KeyError,TypeError) as exc:
        print(json.dumps({"state":"BUGG","result":"FAIL_CLOSED",
           "error":str(exc) if isinstance(exc,assurance.Held) else type(exc).__name__,
           "promotion":"NOT_ALLOWED"}))
        return 1

if __name__=="__main__":
    raise SystemExit(main())
