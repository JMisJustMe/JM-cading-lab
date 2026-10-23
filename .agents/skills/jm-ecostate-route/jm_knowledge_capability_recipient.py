#!/usr/bin/env python3
"""JM Knowledge Capability recipient v0.2: additive, guarded JSON action.

Requires original JM Knowledge Intake v0.4, Assurance v0.5, Query v0.5 on
this branch. Source quotation is inert data. No agent promotion or training.
"""
from __future__ import annotations
import argparse, hashlib, json, os, tempfile
from pathlib import Path
import jm_knowledge_query as kq
import jm_knowledge_assurance as assurance
import jm_knowledge_intake as intake

SCHEMA="JM.KnowledgeCapabilityRecipient/0.2"
EVIDENCE="EVIDENCE_CARDS.json"
MANIFEST="CONTACT_MANIFEST.json"

def encoded(x):
    return (json.dumps(x,sort_keys=True,ensure_ascii=False,separators=(",",":"))+"\n").encode("utf8")

def digest(b):
    return hashlib.sha256(b).hexdigest()

def baseline(records, question, top):
    terms=intake.tokens(question)
    ranks=[]
    for item in records:
        if item["possible_instruction_attack"]: continue
        c=intake.tokens(item["data"]); h=intake.tokens(item["section"])
        if not terms.intersection(c|h): continue
        score=3*len(terms&c)+len(terms&h)+int(item["explicit_rule_candidate"])
        ranks.append((score,item))
    ranks.sort(key=lambda x:(-x[0],x[1]["filename"],x[1]["source_line"] or 0,x[1]["data"]))
    return [x[1] for x in ranks[:top]]

def build_data(candidate,sources,question,top,anchor=None,route_existing=False):
    # The *actual* canonical source-replay gate is mandatory and happens first.
    q=kq.query(candidate,sources,question,top,anchor)
    if q.get("state")!="HELD" or q.get("source_integrity")!="PASS_REPLAY":
        raise assurance.Held("CANONICAL_SOURCE_REPLAY_REQUIRED")
    if not q.get("question_matches"):
        raise assurance.Held("ZERO_MATCH_NO_RECIPIENT_ACTION")
    route=None
    if route_existing:
        contacted=kq.contact_existing_runtime(q)
        route=contacted["existing_jm_route"]
        if (route.get("scope_state")!="HELD" or
            route.get("runtime_contact")!="PYTHON_AND_NODE_PARITY_CONTACTED" or
            route.get("target_consequence")!="NOT_ATTEMPTED"):
            raise assurance.Held("CANONICAL_RUNTIME_CONTACT_INVALID")
    index=assurance.load(candidate/"evidence/SOURCE_INDEX.json")
    old=baseline(index["records"],question,top)
    matches=q["matches"]
    cards=[{
        "source_id":m["source_id"],"filename":m["filename"],
        "line":m["line"],"section":m["section"],
        "quote_UNTRUSTED_DATA":m["quote_UNTRUSTED_DATA"],
        "score":m["score"],"matched_terms":m["matched_terms"],
    } for m in matches]
    independent=len({c["source_id"] for c in cards})
    if q["source_coverage"]["distinct_source_documents"]!=independent:
        raise assurance.Held("SOURCE_COVERAGE_DRIFT")
    return {
        "schema":SCHEMA,"state":"HELD",
        "source_integrity":"CANONICAL_ORIGINAL_REPLAY_PASS",
        "target_consequence":"LOCAL_EVIDENCE_CARDS_WRITTEN",
        "question":question,"top":top,"candidate":q["candidate"],
        "baseline_documents":len({x["source_id"] for x in old}),
        "jm_documents":independent,
        "source_coverage_delta":independent-len({x["source_id"] for x in old}),
        "cards":cards,
        "existing_jm_runtime_contact":"PYTHON_NODE_ROUTING_ONLY" if route else "NOT_REQUESTED",
        "route_receipt_sha256":route["route_receipt_sha256"] if route else None,
        "agent_executed":False,"source_truth_certified":False,
        "independent_corroboration":"NOT_ESTABLISHED",
        "model_weights_changed":False,"promotion":"NOT_ALLOWED",
    }

def build(candidate,sources,question,out,top=4,anchor=None,route_existing=False):
    candidate=Path(candidate);sources=[Path(s) for s in sources];out=Path(out)
    if not 1<=top<=20: raise assurance.Held("BAD_TOP")
    if out.exists() or out.is_symlink(): raise assurance.Held("OUTPUT_EXISTS")
    if out.resolve().is_relative_to(candidate.resolve()):
        raise assurance.Held("OUTPUT_INSIDE_CANDIDATE")
    result=build_data(candidate,sources,question,top,anchor,route_existing)
    payload=encoded(result)
    manifest={"schema":"JM.KnowledgeCapabilityRecipientManifest/0.2",
              "evidence_sha256":digest(payload),
              "candidate_manifest_sha256":digest((candidate/"SHA256_MANIFEST.json").read_bytes()),
              "state":"HELD","owner_approval":"NOT_PERFORMED"}
    out.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(dir=out.parent,prefix=".jm-knowledge-recipient-") as temp:
        draft=Path(temp)
        (draft/EVIDENCE).write_bytes(payload)
        (draft/MANIFEST).write_bytes(encoded(manifest))
        if digest((draft/EVIDENCE).read_bytes())!=manifest["evidence_sha256"]:
            raise assurance.Held("STAGING_READBACK_DRIFT")
        if out.exists(): raise assurance.Held("OUTPUT_RACE")
        os.rename(draft,out)
    return recover(candidate,sources,out)

def recover(candidate,sources,out):
    candidate=Path(candidate);sources=[Path(s) for s in sources];out=Path(out)
    if not out.is_dir() or out.is_symlink(): raise assurance.Held("MISSING_RECIPIENT")
    if {p.name for p in out.iterdir()}!={EVIDENCE,MANIFEST}:
        raise assurance.Held("RECIPIENT_FILE_SET_DRIFT")
    if any(p.is_symlink() for p in out.iterdir()):
        raise assurance.Held("RECIPIENT_SYMLINK")
    m=assurance.load(out/MANIFEST); old=assurance.load(out/EVIDENCE)
    if (m.get("schema")!="JM.KnowledgeCapabilityRecipientManifest/0.2" or
        m.get("state")!="HELD" or
        m.get("evidence_sha256")!=digest((out/EVIDENCE).read_bytes()) or
        m.get("candidate_manifest_sha256")!=digest((candidate/"SHA256_MANIFEST.json").read_bytes())):
        raise assurance.Held("RECIPIENT_MANIFEST_DRIFT")
    if (old.get("schema")!=SCHEMA or old.get("state")!="HELD" or
        old.get("agent_executed") is not False or old.get("promotion")!="NOT_ALLOWED"):
        raise assurance.Held("RECIPIENT_AUTHORITY_INFLATION")
    rebuilt=build_data(candidate,sources,old["question"],old["top"],
                       m["candidate_manifest_sha256"],False)
    if old.get("existing_jm_runtime_contact")=="PYTHON_NODE_ROUTING_ONLY":
        route_hash=old.get("route_receipt_sha256")
        if not isinstance(route_hash,str) or len(route_hash)!=64:
            raise assurance.Held("ROUTE_RECEIPT_INVALID")
        rebuilt["existing_jm_runtime_contact"]="PYTHON_NODE_ROUTING_ONLY"
        rebuilt["route_receipt_sha256"]=route_hash
    if encoded(rebuilt)!=(out/EVIDENCE).read_bytes():
        raise assurance.Held("RECIPIENT_EXACT_REPLAY_DRIFT")
    return {"schema":SCHEMA,"state":"HELD","recovery":"PASS_SOURCE_AND_RESULT_REPLAY",
            "cards":len(old["cards"]),"baseline_documents":old["baseline_documents"],
            "jm_documents":old["jm_documents"],"coverage_delta":old["source_coverage_delta"],
            "target_consequence":"LOCAL_EVIDENCE_CARDS_WRITTEN",
            "promotion":"NOT_ALLOWED"}

def main(argv=None):
    p=argparse.ArgumentParser()
    p.add_argument("--candidate",required=True,type=Path)
    p.add_argument("--source",action="append",required=True,type=Path)
    p.add_argument("--question",default="")
    p.add_argument("--out",required=True,type=Path)
    p.add_argument("--top",type=int,default=4)
    p.add_argument("--route-existing",action="store_true")
    p.add_argument("--recover",action="store_true")
    a=p.parse_args(argv)
    try:
        print(json.dumps(recover(a.candidate,a.source,a.out) if a.recover else
              build(a.candidate,a.source,a.question,a.out,a.top,
                    route_existing=a.route_existing),sort_keys=True,indent=2))
        return 0
    except (assurance.Held,ValueError,KeyError,OSError,RuntimeError) as exc:
        print(json.dumps({"state":"BUGG","error":str(exc) if isinstance(exc,assurance.Held) else type(exc).__name__,
                          "promotion":"NOT_ALLOWED"}))
        return 1

if __name__=="__main__": raise SystemExit(main())
