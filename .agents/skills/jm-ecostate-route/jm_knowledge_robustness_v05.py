#!/usr/bin/env python3
"""JM Knowledge Robustness v0.5 — grounded answerer A/B, paraphrases + false attribution.

Existing v0.4 native extractive generator is run unmodified. A separate
author-consistency guard either preserves its cited answer or abstains when
an explicitly named single author conflicts with its actual book citation.
This is a bounded control rule, NOT general semantic contradiction detection.
Gold is never passed to generator or guard. No model API, no training, no promotion.
"""
from __future__ import annotations
import argparse,hashlib,json,re,tempfile
from pathlib import Path
import jm_knowledge_answer_eval as v04
import jm_knowledge_assurance as assurance

SCHEMA="JM.KnowledgeAnswerRobustness/0.5"

def author_of(book):
    # Exact registered source filename. No author invented from content.
    if not isinstance(book,str):return None
    name=Path(book).stem.split("_")[0].casefold()
    return name if name.isalpha() and len(name)>=4 else None

def conservative(base,originals):
    r=json.loads(json.dumps(base))
    r["policy"]="AUTHOR_CONSISTENCY_GUARD_AFTER_NATIVE_V04"
    known={author_of(Path(p).name) for p in originals}
    known.discard(None)
    words={x.casefold() for x in re.findall(r"[A-Za-z]+",base["question"])}
    asked=words&known
    response=r["response"]
    if not response["abstained"] and len(asked)==1:
        author=author_of(response["citation"]["book"])
        if author not in asked:
            response["answer"]=None
            response["kind"]="ABSTAIN"
            response["abstained"]=True
            response["citation"]=None
            response["reason"]="EXPLICIT_AUTHOR_CONFLICT_GUARD"
    r["author_guard"]={
        "known_book_authors":sorted(known),"explicit_author_mentions":sorted(asked),
        "scope":"ONE_EXPLICIT_FILENAME_AUTHOR_ONLY",
        "semantic_contradiction_detection":False,
        "book_metadata_based":True}
    return r

def validate_gold(tasks,originals):
    if not isinstance(tasks,list) or not 8<=len(tasks)<=40:
        raise assurance.Held("HELDOUT_CASE_COUNT")
    names=set();bodies={}
    for p in originals:
        p=Path(p)
        if p.name in bodies:raise assurance.Held("DUPLICATE_BOOK_NAME")
        bodies[p.name]=p.read_bytes().decode("utf-8-sig").casefold()
    for task in tasks:
        if not isinstance(task,dict) or set(task)!={"id","question","answerable","expected_book","accepted_fragments","category"}:
            raise assurance.Held("HELDOUT_GOLD_SCHEMA")
        if not isinstance(task["id"],str) or not task["id"] or task["id"] in names:
            raise assurance.Held("HELDOUT_GOLD_ID")
        names.add(task["id"])
        if not isinstance(task["question"],str) or not task["question"].strip() or len(task["question"])>1200:
            raise assurance.Held("HELDOUT_QUESTION")
        if task["category"] not in {"PARAPHRASE","DIRECT","FALSE_ATTRIBUTION","UNSUPPORTED"}:
            raise assurance.Held("HELDOUT_CATEGORY")
        if not isinstance(task["answerable"],bool):raise assurance.Held("HELDOUT_ANSWERABLE")
        phrases=task["accepted_fragments"]
        if not isinstance(phrases,list):raise assurance.Held("HELDOUT_PHRASES")
        if task["answerable"]:
            if (task["expected_book"] not in bodies or not phrases or
                not all(isinstance(q,str) and len(q)>=5 and q.casefold() in bodies[task["expected_book"]]
                        for q in phrases)):
                raise assurance.Held("GOLD_ANCHOR_NOT_IN_ORIGINAL")
        elif task["expected_book"] is not None or phrases:
            raise assurance.Held("NEGATIVE_CASE_HAS_GOLD")

def score_response(item,task):
    reply=item["response"]
    if reply["abstained"]:
        return (not task["answerable"]),"CORRECT_ABSTAIN" if not task["answerable"] else "MISSED_ANSWER"
    c=reply["citation"]
    right_book=(c is not None and c["book"]==task["expected_book"] and
                c["check"]=="EXACT_ORIGINAL_BOOK_LINE_PASS")
    hit=(isinstance(reply["answer"],str) and any(
        frag.casefold() in reply["answer"].casefold() for frag in task["accepted_fragments"]))
    ok=bool(task["answerable"] and right_book and hit)
    return ok,"SUPPORTED_QUOTE" if ok else "WRONG_OR_UNSUPPORTED"

def compare(originals,tasks):
    originals=[Path(x) for x in originals]
    validate_gold(tasks,originals)
    rows=[];totals={"baseline":{"correct":0,"abstentions":0,"citation_failures":0},
                    "guarded":{"correct":0,"abstentions":0,"citation_failures":0}}
    for i,task in enumerate(tasks):
        with tempfile.TemporaryDirectory(prefix="jm-robustness-v05-"+str(i)+"-") as temp:
            baseline=v04.answer(originals,task["question"],temp)
        guarded=conservative(baseline,originals)
        results={}
        for policy,case in [("baseline",baseline),("guarded",guarded)]:
            correct,reason=score_response(case,task)
            quote=case["response"]
            totals[policy]["correct"]+=int(correct)
            totals[policy]["abstentions"]+=int(quote["abstained"])
            if not quote["abstained"] and (quote["citation"] is None or quote["citation"]["check"]!="EXACT_ORIGINAL_BOOK_LINE_PASS"):
                totals[policy]["citation_failures"]+=1
            results[policy]={"passed":correct,"reason":reason,
                             "abstained":quote["abstained"],
                             "book":quote["citation"]["book"] if quote["citation"] else None,
                             "source_line":quote["citation"]["line"] if quote["citation"] else None,
                             "answer_preview":quote["answer"][:200] if quote["answer"] else None}
        rows.append({"id":task["id"],"category":task["category"],
                     "question":task["question"],"baseline":results["baseline"],
                     "guarded":results["guarded"],"change":"GAIN" if results["guarded"]["passed"] and not results["baseline"]["passed"] else
                      "REGRESSION" if results["baseline"]["passed"] and not results["guarded"]["passed"] else "UNCHANGED",
                     "time_ms":baseline["cost"]["elapsed_ms"],
                     "context_characters":baseline["cost"]["context_evidence_characters"]})
    gains=sum(r["change"]=="GAIN" for r in rows)
    regressions=sum(r["change"]=="REGRESSION" for r in rows)
    return {"schema":SCHEMA,"state":"HELD","cases":len(rows),
            "baseline":totals["baseline"],"guarded":totals["guarded"],
            "gains":gains,"regressions":regressions,
            "categories":{k:{"cases":sum(r["category"]==k for r in rows),
                             "baseline_pass":sum(r["category"]==k and r["baseline"]["passed"] for r in rows),
                             "guarded_pass":sum(r["category"]==k and r["guarded"]["passed"] for r in rows)}
                          for k in ("DIRECT","PARAPHRASE","FALSE_ATTRIBUTION","UNSUPPORTED")},
            "rows":rows,
            "elapsed_ms_total":round(sum(x["time_ms"] for x in rows),2),
            "context_evidence_characters_total":sum(x["context_characters"] for x in rows),
            "model_calls":0,"model_generated":False,
            "model_comparison":"NOT_YET_RUN",
            "rubric":"GOLD_EXACT_BOOK_AND_PHRASE_PRESENT_IN_CITED_QUOTE_OR_CORRECT_ABSTENTION",
            "gold_used_during_answer_generation":False,
            "no_production_promotion":True,
            "boundary":"Paraphrase and author-misattribution adversarial evaluation of extractive answers; no model language understanding is claimed."}

def main(argv=None):
    p=argparse.ArgumentParser()
    p.add_argument("--book",action="append",required=True,type=Path)
    p.add_argument("--gold",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    a=p.parse_args(argv)
    try:
        tasks=json.loads(a.gold.read_text(encoding="utf8"))
        if a.out.exists() or a.out.is_symlink():raise assurance.Held("OUTPUT_EXISTS")
        report=compare(a.book,tasks)
        a.out.parent.mkdir(parents=True,exist_ok=True)
        data=(json.dumps(report,indent=2,sort_keys=True,ensure_ascii=False)+"\n").encode("utf8")
        a.out.write_bytes(data)
        if a.out.read_bytes()!=data:raise assurance.Held("RECEIPT_READBACK_DRIFT")
        print(data.decode("utf8"),end="")
        return 0
    except (assurance.Held,ValueError,KeyError,TypeError,OSError) as exc:
        print(json.dumps({"state":"BUGG","error":str(exc) if isinstance(exc,assurance.Held) else type(exc).__name__,
                          "promotion":"NOT_ALLOWED"}))
        return 1

if __name__=="__main__":raise SystemExit(main())
