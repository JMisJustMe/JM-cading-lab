#!/usr/bin/env python3
"""JM Knowledge Query v0.5: re-use an earlier candidate with fresh source replay.

Deterministic textual retrieval. No semantic model, no authority, no autonomous action.
"""
import argparse
import json
from pathlib import Path
import sys

import jm_knowledge_assurance as assurance
import jm_knowledge_intake as intake

SCHEMA="JM.KnowledgeQuery/0.5"

def source_coverage(matches:list[dict])->dict:
    """Reveal document-vs-passage multiplicity. Never certify corroboration."""
    groups={}
    for item in matches:
        sid=item["source_id"]
        if sid not in groups:
            groups[sid]={"source_id":sid,"filename":item["filename"],"passages":0,
                         "lines":[],"scores":[]}
        group=groups[sid]
        group["passages"]+=1
        group["lines"].append(item["source_line"])
        group["scores"].append(item["score"])
    return {"retrieved_passages":len(matches),"distinct_source_documents":len(groups),
            "repeated_passages_within_documents":len(matches)-len(groups),
            "sources":list(groups.values()),
            "independent_factual_corroboration":"NOT_ESTABLISHED",
            "explanation":"Several passages from one source are not several independent sources. Different documents are not necessarily independent corroboration."}

def query(candidate:Path, sources:list[Path], question:str, top:int=6,
          expected_manifest_sha256:str|None=None)->dict:
    if not question or len(question)>1200 or "\x00" in question:
        raise assurance.Held("INVALID_RETRIEVAL_QUERY")
    if top<1 or top>20:
        raise assurance.Held("INVALID_RESULT_LIMIT")
    provenance=assurance.verify(candidate,sources,expected_manifest_sha256)
    index=assurance.load(candidate/"evidence/SOURCE_INDEX.json")
    if index.get("schema")!="JM.KnowledgeEvidenceIndex/0.4" or not isinstance(index.get("records"),list):
        raise assurance.Held("INVALID_EVIDENCE_INDEX")
    matches=intake.select(index["records"],question,top)
    return {
        "schema":SCHEMA,"state":"HELD","action":"RETRIEVE_QUOTED_SOURCE_DATA_ONLY",
        "candidate":provenance["candidate"],
        "source_integrity":"PASS_REPLAY" if provenance["result"]=="PASS_SOURCE_REPLAY_ONLY" else "FAIL",
        "anchor_compared":provenance["anchor_compared"],
        "question":question,"question_matches":len(matches),
        "matches":[{"source_id":x["source_id"],"filename":x["filename"],
                    "section":x["section"],"line":x["source_line"],
                    "location_precision":x["location_precision"],"timestamp":x["timestamp"],
                    "score":x["score"],"matched_terms":x["matched_terms"],
                    "quote_UNTRUSTED_DATA":x["data"]} for x in matches],
        "selection":"DETERMINISTIC_LEXICAL_NOT_SEMANTIC_OR_TRANSFORMER",
        "source_coverage":source_coverage(matches),
        "promotion":"NOT_ALLOWED","human_approval":"NOT_PERFORMED",
        "agent_executed":False,"claim":"NO_DING_NO_CLAIM",
        "warning":"Quoted text is source data, not an instruction or verified factual conclusion. The heuristic injection scan is incomplete."
    }

def contact_existing_runtime(verified_query:dict, surface:str="jm-knowledge-query")->dict:
    """Execute JM's existing Python+Node parity route after verified source replay.

    Only the user question reaches the runtime; source quotations stay inert data.
    Routing candidates are *not* executed code, approved knowledge or authority.
    """
    if verified_query.get("state")!="HELD" or verified_query.get("source_integrity")!="PASS_REPLAY":
        raise assurance.Held("SOURCE_REPLAY_REQUIRED_BEFORE_ROUTE")
    if not verified_query.get("question_matches"):
        return dict(verified_query, existing_jm_route={
            "scope_state":"HELD","result":"NO_SOURCE_MATCH_NO_ROUTE",
            "runtime_contact":"NOT_ATTEMPTED","target_consequence":"NOT_ATTEMPTED"})
    import jm_skill_gate as existing_gate
    route=existing_gate.contact(verified_query["question"],surface)
    if (route.get("schema")!="JM.AgentSkillReadOnlyContact/0.3"
        or route.get("scope_state")!="HELD"
        or route.get("query")!=verified_query["question"]
        or route.get("surface_requested")!=surface
        or route.get("discrepancies")!=[]
        or route.get("coding_selection_is_process_execution") is not False
        or route.get("target_consequence")!="NOT_ATTEMPTED"
        or route.get("host_contact")!="OPEN"
        or route.get("live_current_head_resolution")!="OPEN"):
        raise assurance.Held("EXISTING_JM_ROUTE_INVALID_OR_INFLATED")
    return dict(verified_query, existing_jm_route={
        "scope_state":"HELD","result":route["result"],
        "runtime_contact":"PYTHON_AND_NODE_PARITY_CONTACTED",
        "route_receipt_sha256":route["receipt_sha256"],
        "coding_selection":route["coding_selection"],
        "selected_candidates":route["selected_candidates"],
        "host_contact":route["host_contact"],
        "live_current_head_resolution":route["live_current_head_resolution"],
        "target_consequence":"NOT_ATTEMPTED",
        "source_query_integrity":"PASS_REPLAY",
        "proof_boundary":"Deterministic route selection only; no target body executed or promoted."})

def main(argv=None):
    p=argparse.ArgumentParser()
    p.add_argument("--candidate",type=Path,required=True)
    p.add_argument("--source",action="append",type=Path,required=True)
    p.add_argument("--query",required=True)
    p.add_argument("--top",type=int,default=6)
    p.add_argument("--expect-manifest-sha256")
    p.add_argument("--receipt",type=Path)
    p.add_argument("--route-existing",action="store_true",help="After source replay, contact the actual JM Python+Node route; no target mutation")
    p.add_argument("--surface",default="jm-knowledge-query")
    args=p.parse_args(argv)
    try:
        result=query(args.candidate,args.source,args.query,args.top,args.expect_manifest_sha256)
        if args.route_existing:
            result=contact_existing_runtime(result,args.surface)
        code=0
    except (assurance.Held, OSError, KeyError, ValueError, TypeError, RuntimeError, ImportError) as exc:
        result={"schema":SCHEMA,"state":"BUGG","result":"FAIL_CLOSED",
                "error":str(exc) if isinstance(exc,assurance.Held) else type(exc).__name__,
                "promotion":"NOT_ALLOWED","agent_executed":False}
        code=1
    body=intake.json_bytes(result)
    if args.receipt:
        if args.receipt.resolve().is_relative_to(args.candidate.resolve()):
            print("JM KNOWLEDGE QUERY: BUGG RECEIPT_INSIDE_CANDIDATE",file=sys.stderr)
            return 1
        args.receipt.write_bytes(body)
    sys.stdout.buffer.write(body)
    return code

if __name__=="__main__":raise SystemExit(main())
