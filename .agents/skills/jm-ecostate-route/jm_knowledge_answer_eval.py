#!/usr/bin/env python3
"""JM Knowledge Answer Evaluation v0.4 — bounded extractive answer/contact.

Actual canonical v0.3 full-book adapter, original-source integrity, bounded
passage-to-answer operation and exact source-line/hash citations. No LLM is
called, no book sentence is treated as an instruction, no model weight changes.
Gold labels are used only *after* an answer has been written.
"""
from __future__ import annotations
import argparse, hashlib, json, math, tempfile, time
from pathlib import Path
import jm_knowledge_fullbook as books
import jm_knowledge_assurance as assurance
import jm_knowledge_intake as intake

SCHEMA="JM.KnowledgeAnswerContact/0.4"

def sha(b:bytes)->str:
    return hashlib.sha256(b).hexdigest()

def citation_check(evidence, originals):
    if not isinstance(evidence,dict):
        raise assurance.Held("NO_CITABLE_EVIDENCE")
    wanted_name=evidence.get("original_name")
    wanted_sha=evidence.get("original_sha256")
    lineno=evidence.get("original_line")
    quote=evidence.get("quote_UNTRUSTED_DATA")
    if not isinstance(lineno,int) or lineno<1 or not isinstance(quote,str) or not quote:
        raise assurance.Held("NO_EXACT_BOOK_LINE")
    matching=[]
    for p in originals:
        p=Path(p)
        raw=p.read_bytes()
        if p.name==wanted_name and sha(raw)==wanted_sha:
            matching.append(raw)
    if len(matching)!=1:
        raise assurance.Held("WRONG_BOOK_OR_ORIGINAL_HASH")
    lines=matching[0].decode("utf-8-sig").splitlines()
    if lineno>len(lines):
        raise assurance.Held("ORIGINAL_LINE_OUT_OF_BOUNDS")
    # Canonical intake removes invisible controls and normalizes whitespace
    # only by trimming. A stored quote must be an exact visible substring.
    visible=intake.clean(lines[lineno-1]).strip()
    if quote not in visible:
        raise assurance.Held("QUOTE_NOT_IN_ORIGINAL_LINE")
    return {"book":wanted_name,"original_sha256":wanted_sha,
            "line":lineno,"quote_sha256":sha(quote.encode("utf8")),
            "check":"EXACT_ORIGINAL_BOOK_LINE_PASS"}

def answer(originals,question,workdir,top=4):
    t0=time.perf_counter()
    if not isinstance(question,str) or not question.strip() or len(question)>1200:
        raise assurance.Held("BAD_QUESTION")
    if not 1<=top<=20:
        raise assurance.Held("BAD_TOP")
    originals=[Path(p) for p in originals]
    folder=Path(workdir)/"original_book_chunks"
    books.stage(originals,folder)
    hit=books.run(originals,folder,question,top)
    if hit.get("original_replay")!="PASS" or hit.get("canonical_jm_query_replay")!="PASS":
        raise assurance.Held("CANONICAL_SOURCE_REPLAY_REQUIRED")
    query_terms=intake.tokens(question)
    chosen=None
    for item in hit["matches"]:
        evidence_terms=intake.tokens(item["quote_UNTRUSTED_DATA"])
        matched=len(query_terms&evidence_terms)
        # At least two meaningful question words must appear in the SAME
        # source sentence. This prevents answering based on one vague keyword.
        if matched>=2 and (not query_terms or matched/len(query_terms)>=0.25):
            chosen=item
            break
    if chosen is not None:
        verified=citation_check(chosen,originals)
        answer_text=chosen["quote_UNTRUSTED_DATA"]
        response={"kind":"EXTRACTIVE_BOOK_QUOTE","answer":answer_text,
                  "citation":verified,"abstained":False,
                  "reason":"MATCHED_QUOTE_EXACTLY_VERIFIED"}
    else:
        response={"kind":"ABSTAIN","answer":None,"citation":None,
                  "abstained":True,"reason":"INSUFFICIENT_QUOTED_EVIDENCE"}
    return {
        "schema":SCHEMA,"state":"HELD","question":question,"response":response,
        "contact":{"books":hit["original_documents"],
                   "physical_chunks":hit["physical_chunks"],
                   "original_book_sha256":hit["original_sha256"],
                   "retrieved_passages":len(hit["matches"]),
                   "unique_original_books_in_context":hit["true_document_coverage"],
                   "original_replay":"PASS",
                   "canonical_python_query_replay":"PASS"},
        "cost":{"elapsed_ms":round((time.perf_counter()-t0)*1000,2),
                "context_evidence_characters":sum(len(x["quote_UNTRUSTED_DATA"]) for x in hit["matches"]),
                "local_llm_calls":0,"model_input_tokens":0,"model_output_tokens":0,
                "api_price":"NONE_NO_MODEL_CALL"},
        "model_generated":False,"model_weights_changed":False,
        "human_approval":"NOT_PERFORMED","promotion":"NOT_ALLOWED"
    }

def score(results,tasks):
    if len(results)!=len(tasks) or not results:raise assurance.Held("CASE_COUNT")
    cases=[]
    for result,gold in zip(results,tasks):
        if set(gold)!={"id","question","answerable","accepted_fragments","original_book"}:
            raise assurance.Held("BAD_GOLD_TASK")
        if result["question"]!=gold["question"]:
            raise assurance.Held("TASK_ANSWER_MISMATCH")
        if not isinstance(gold["answerable"],bool):
            raise assurance.Held("BAD_GOLD_BOOLEAN")
        response=result["response"]
        if response["abstained"]:
            passed=not gold["answerable"]
            reason="CORRECT_ABSTENTION" if passed else "FALSE_ABSTENTION"
        else:
            text=response["answer"].casefold()
            citation=response["citation"]
            grounded=citation["check"]=="EXACT_ORIGINAL_BOOK_LINE_PASS"
            correctbook=citation["book"]==gold["original_book"]
            fragments=gold["accepted_fragments"]
            if not isinstance(fragments,list) or not all(isinstance(x,str) and x for x in fragments):
                raise assurance.Held("BAD_GOLD_FRAGMENTS")
            hits=any(x.casefold() in text for x in fragments)
            passed=gold["answerable"] and correctbook and grounded and hits
            reason="GOLD_ANSWER_AND_CITATION_MATCH" if passed else "WRONG_OR_UNSUPPORTED_ANSWER"
        cases.append({"id":gold["id"],"passed":passed,"reason":reason,
                      "abstained":response["abstained"],
                      "citation_verified":response["citation"] is not None and response["citation"]["check"]=="EXACT_ORIGINAL_BOOK_LINE_PASS",
                      "answer_preview":response["answer"][:240] if response["answer"] else None,
                      "book":response["citation"]["book"] if response["citation"] else None,
                      "elapsed_ms":result["cost"]["elapsed_ms"]})
    return {"schema":"JM.KnowledgeAnswerBenchmark/0.4",
            "state":"HELD","cases":len(cases),
            "correct":sum(x["passed"] for x in cases),
            "abstentions":sum(x["abstained"] for x in cases),
            "wrong":sum(not x["passed"] for x in cases),
            "citation_integrity_failures":sum(not x["citation_verified"] and not x["abstained"] for x in cases),
            "total_elapsed_ms":round(sum(x["elapsed_ms"] for x in cases),2),
            "total_model_calls":0,"model_generated":False,
            "gold_was_not_used_by_generator":True,
            "rubric":"EXPECTED_BOOK_AND_ANSWER_FRAGMENT_PRESENT_IN_EXACT_VERIFIED_QUOTE",
            "results":cases,
            "claim_boundary":"Extractive answer+exact citation benchmark only; does not test LLM answer quality, semantic entailment or intelligence."}

def run(originals,tasks,output_dir):
    out=Path(output_dir)
    if out.exists() or out.is_symlink():
        raise assurance.Held("OUTPUT_EXISTS")
    if any(out.resolve().is_relative_to(Path(p).resolve()) for p in originals):
        raise assurance.Held("OUTPUT_INSIDE_BOOK")
    # Gold tasks remain distinct from the answerer. Construct every response
    # before scoring any of them; never route an accepted phrase to retrieval.
    with tempfile.TemporaryDirectory(prefix="jm-answer-qa-v04-") as tmp:
        responses=[]
        for n,t in enumerate(tasks):
            with tempfile.TemporaryDirectory(dir=tmp,prefix=f"case{n}-") as work:
                responses.append(answer(originals,t["question"],work))
        report=score(responses,tasks)
        body=(json.dumps({"report":report,"answers":responses},sort_keys=True,ensure_ascii=False,indent=2)+"\n").encode("utf8")
        out.mkdir(parents=True,exist_ok=False)
        payload=out/"ANSWER_EVALUATION.json"
        payload.write_bytes(body)
        checksum=out/"SHA256.txt"
        checksum.write_text(sha(body)+"  ANSWER_EVALUATION.json\n",encoding="utf8")
        if sha(payload.read_bytes())!=checksum.read_text(encoding="utf8").split()[0]:
            raise assurance.Held("OUTPUT_READBACK_DRIFT")
    return report

def main(argv=None):
    p=argparse.ArgumentParser()
    p.add_argument("--book",action="append",required=True,type=Path)
    p.add_argument("--gold",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    x=p.parse_args(argv)
    try:
        gold=json.loads(x.gold.read_text(encoding="utf8"))
        print(json.dumps(run(x.book,gold,x.out),ensure_ascii=False,sort_keys=True,indent=2))
        return 0
    except (assurance.Held,ValueError,KeyError,OSError,TypeError) as e:
        print(json.dumps({"state":"BUGG","error":str(e) if isinstance(e,assurance.Held) else type(e).__name__,
                          "promotion":"NOT_ALLOWED"}))
        return 1

if __name__=="__main__":
    raise SystemExit(main())
