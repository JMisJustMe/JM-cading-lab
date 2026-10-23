#!/usr/bin/env python3
"""JM v0.7.1 separately verified ONNX QA answer-span scorer.

The v0.7 source-replayed candidate corpus and v0.7 unchanged baseline are
read from the staging receipt; v0.7.1 JavaScript predictions are verified
against exact original source files and independent gold is used only here.
"""
from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path
import jm_knowledge_answer_eval as v04
import jm_knowledge_robustness_v05 as v05
import jm_knowledge_assurance as assurance
import jm_knowledge_intake as intake

SCHEMA="JM.KnowledgeSpanQAComparison/0.7.1"

def sha(b):return hashlib.sha256(b).hexdigest()

def verify_and_score(originals,stage,predictions,tasks):
    originals=[Path(x) for x in originals]
    v05.validate_gold(tasks,originals)
    if (stage.get("schema")!="JM.KnowledgeSpanCandidates/0.7.1" or
        predictions.get("schema")!="JM.KnowledgeSpanAnswers/0.7.1" or
        stage.get("state")!="HELD" or predictions.get("state")!="HELD" or
        stage.get("gold_used_in_candidate") is not False or
        predictions.get("gold_used_in_prediction") is not False or
        predictions.get("generative_llm_calls")!=0 or
        stage.get("cases")!=len(tasks) or predictions.get("question_cases")!=len(tasks)):
        raise assurance.Held("STAGED_MODEL_CLAIMS_INVALID")
    original={p.name:p for p in originals}
    if len(original)!=len(originals):raise assurance.Held("DUPLICATE_BOOK_NAMES")
    if len(stage["items"])!=len(predictions["results"]):
        raise assurance.Held("CASE_COUNT_MISMATCH")
    if set(stage.get("v07_baseline",{}))!={t["id"] for t in tasks}:
        raise assurance.Held("BASELINE_NOT_INDEPENDENTLY_EXECUTED")
    rows=[]
    for task,case,forecast in zip(tasks,stage["items"],predictions["results"]):
        if task["id"]!=case["id"] or case["id"]!=forecast["id"] or task["question"]!=case["question"] or case["question"]!=forecast["question"]:
            raise assurance.Held("TASK_ALIGNMENT_DRIFT")
        base=stage["v07_baseline"][task["id"]]
        if base.get("question")!=task["question"] or base.get("promotion")!="NOT_ALLOWED":
            raise assurance.Held("BASELINE_PROOF_INVALID")
        if not base["response"]["abstained"]:
            cite=base["response"]["citation"]
            verified=v04.citation_check({"original_name":cite["book"],
                "original_sha256":cite["original_sha256"],"original_line":cite["line"],
                "quote_UNTRUSTED_DATA":base["response"]["answer"]},originals)
            if verified["check"]!="EXACT_ORIGINAL_BOOK_LINE_PASS":
                raise assurance.Held("BASELINE_BOOK_DRIFT")
        best=forecast.get("best_index",-1)
        attempts=forecast.get("attempts")
        if not isinstance(attempts,list) or not isinstance(best,int) or best>=len(attempts):
            raise assurance.Held("QA_PREDICTION_FORMAT_INVALID")
        response={"kind":"ABSTAIN","answer":None,"citation":None,"abstained":True,
                  "reason":"MODEL_NO_EXACT_CONFIDENT_ANSWER"}
        if best>=0:
            attempt=attempts[best]
            entry=attempt.get("verified_line_candidate")
            if not isinstance(entry,dict) or not .55<=attempt.get("score",-1)<=1:
                raise assurance.Held("BAD_MODEL_CONFIDENCE")
            if entry.get("book") not in original:
                raise assurance.Held("BOOK_NOT_IN_ORIGINAL_SET")
            # Candidate itself must be present in the previously staged book context:
            valid_context=any(p["source_filename"]==entry["book"] and
                    p["original_sha256"]==entry["book_sha256"] and
                    any(x["line"]==entry["line"] and x["source"]==entry["original_line"]
                        for x in p["lines"])
                    for p in case["candidates"])
            if not valid_context:
                raise assurance.Held("MODEL_CITATION_NOT_IN_CANDIDATE")
            if attempt["span"] not in entry["original_line"]:
                raise assurance.Held("ANSWER_SPAN_NOT_EXACT")
            verified=v04.citation_check({
                "original_name":entry["book"],
                "original_sha256":entry["book_sha256"],
                "original_line":entry["line"],
                "quote_UNTRUSTED_DATA":entry["original_line"]
            },originals)
            response={"kind":"EXTRACTIVE_BOOK_QUOTE","answer":entry["original_line"],
                      "citation":verified,"abstained":False,
                      "reason":"ONNX_QA_SPAN_EXACT_SOURCE_VERIFIED"}
        proposed=v05.conservative({"question":task["question"],"response":response,
            "state":"HELD","model_generated":False,"promotion":"NOT_ALLOWED"},originals)
        bp,br=v05.score_response(base,task)
        np,nr=v05.score_response(proposed,task)
        rows.append({"id":task["id"],"category":task["category"],
            "baseline_correct":bp,"qa_correct":np,
            "baseline_reason":br,"qa_reason":nr,
            "baseline_abstained":base["response"]["abstained"],
            "qa_abstained":proposed["response"]["abstained"],
            "book":proposed["response"]["citation"]["book"] if proposed["response"]["citation"] else None,
            "answer_preview":proposed["response"]["answer"][:190] if proposed["response"]["answer"] else None,
            "change":"GAIN" if np and not bp else "REGRESSION" if bp and not np else "UNCHANGED"})
    return {"schema":SCHEMA,"state":"HELD","cases":len(rows),
        "v07_correct":sum(x["baseline_correct"] for x in rows),
        "v071_correct":sum(x["qa_correct"] for x in rows),
        "gains":sum(x["change"]=="GAIN" for x in rows),
        "regressions":sum(x["change"]=="REGRESSION" for x in rows),
        "categories":{cat:{"cases":sum(x["category"]==cat for x in rows),
            "baseline":sum(x["category"]==cat and x["baseline_correct"] for x in rows),
            "qa":sum(x["category"]==cat and x["qa_correct"] for x in rows)}
            for cat in ("DIRECT","PARAPHRASE","FALSE_ATTRIBUTION","UNSUPPORTED")},
        "rows":rows,"trained_by_JM":False,"model_generated":False,
        "pretrained_extract_answer_spans":True,
        "generative_llm_calls":0,"promotion":"NOT_ALLOWED",
        "boundary":"Pretrained SQuAD extractive answer-span evaluation; not free-form generation or independent factual entailment."}

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--book",action="append",required=True,type=Path)
    p.add_argument("--stage",required=True,type=Path)
    p.add_argument("--predictions",required=True,type=Path)
    p.add_argument("--gold",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    a=p.parse_args()
    try:
        if a.out.exists() or a.out.is_symlink():
            raise assurance.Held("OUTPUT_EXISTS")
        source_bytes=a.stage.read_bytes()
        raw=a.predictions.read_bytes()
        candidates=json.loads(source_bytes)
        preds=json.loads(raw)
        if preds.get("candidate_sha256")!=sha(source_bytes):
            raise assurance.Held("MODEL_CANDIDATE_SHA_MISMATCH")
        gold=json.loads(a.gold.read_text(encoding="utf8"))
        result=verify_and_score(a.book,candidates,preds,gold)
        body=(json.dumps(result,indent=2,sort_keys=True,ensure_ascii=False)+"\n").encode("utf8")
        a.out.parent.mkdir(parents=True,exist_ok=True)
        a.out.write_bytes(body)
        if a.out.read_bytes()!=body:raise assurance.Held("READBACK_MISMATCH")
        print(body.decode("utf8"),end="")
        return 0
    except (assurance.Held,ValueError,OSError,KeyError,TypeError) as exc:
        print(json.dumps({"state":"BUGG","error":str(exc) if isinstance(exc,assurance.Held) else type(exc).__name__,
                          "promotion":"NOT_ALLOWED"}))
        return 1
if __name__=="__main__":raise SystemExit(main())
