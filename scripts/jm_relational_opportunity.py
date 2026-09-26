#!/usr/bin/env python3
"""JM Relational Opportunity Detector v0.1.

Bounded deterministic organ for the existing JM Adaptive ECOSTATE Agent.
It does not invent theories or crown similarity as relation. It evaluates
explicit candidate bodies against grounded structural signals and preserves
a trace suitable for later re-entry.
"""
from __future__ import annotations
import argparse, json
from dataclasses import dataclass, asdict
from typing import Iterable

OFFICES={"EXPLAIN","GOVERN","ACT","REPRESENT","VERIFY","RECOVER","REFLECT"}
DECISIONS={"CARRY","HOLD","COOL","REJECT"}
CEILINGS=["CONTACT","CONSEQUENCE","TRACE","RETENTION","REENTRY_CHANGE","ADAPTATION","TRANSFER","STABILISATION"]

@dataclass(frozen=True)
class Candidate:
    body:str
    office:str
    mechanisms:tuple[str,...]
    adds:tuple[str,...]=()
    excludes:tuple[str,...]=()
    required_evidence:tuple[str,...]=()
    identity_risk:bool=False
    representation_options:tuple[str,...]=()

def norm(xs:Iterable[str])->set[str]:
    return {str(x).strip().lower() for x in xs if str(x).strip()}

def evidence_ceiling(evidence:Iterable[str])->str:
    have=norm(evidence)
    ceiling="CONTACT"
    chain=[
      ("CONSEQUENCE","consequence"),("TRACE","trace"),("RETENTION","retention"),
      ("REENTRY_CHANGE","reentry_change"),("ADAPTATION","adaptation"),
      ("TRANSFER","transfer"),("STABILISATION","stabilisation")]
    for label,key in chain:
        if key not in have: break
        ceiling=label
    return ceiling

def evaluate(signals:Iterable[str], evidence:Iterable[str], c:Candidate)->dict:
    if c.office not in OFFICES: raise ValueError(f"invalid office {c.office}")
    sig,ev=norm(signals),norm(evidence)
    mech=norm(c.mechanisms)
    overlap=sorted(sig & mech)
    missing=sorted(norm(c.required_evidence)-ev)
    delta=sorted(norm(c.adds)-sig)
    # Productive contact needs grounded overlap AND differential yield.
    if not overlap: decision="REJECT"
    elif missing: decision="HOLD"
    elif not delta: decision="COOL"
    else: decision="CARRY"
    # Identity risk never promotes a candidate; it constrains the trace.
    return {
      "body":c.body,"office":c.office,"decision":decision,
      "grounded_overlap":overlap,"differential_yield":delta,
      "missing_evidence":missing,"does_not_explain":list(c.excludes),
      "identity_inference_blocked":bool(c.identity_risk),
      "representation_options":list(c.representation_options)}

def detect(contact:dict)->dict:
    signals=contact.get("signals",[])
    evidence=contact.get("evidence",[])
    results=[evaluate(signals,evidence,Candidate(
      body=x["body"], office=x["office"],
      mechanisms=tuple(x.get("mechanisms",[])), adds=tuple(x.get("adds",[])),
      excludes=tuple(x.get("excludes",[])), required_evidence=tuple(x.get("required_evidence",[])),
      identity_risk=bool(x.get("identity_risk",False)),
      representation_options=tuple(x.get("representation_options",[]))
    )) for x in contact.get("candidates",[])]
    return {
      "schema":"jm.rod/0.1","grounded_contact":contact.get("grounded_contact",""),
      "claim_ceiling":evidence_ceiling(evidence),"results":results,
      "trace":{
        "carry":[r["body"] for r in results if r["decision"]=="CARRY"],
        "hold":[r["body"] for r in results if r["decision"]=="HOLD"],
        "cool":[r["body"] for r in results if r["decision"]=="COOL"],
        "reject":[r["body"] for r in results if r["decision"]=="REJECT"],
        "law":"CANDIDATE != ACCEPTED RELATION; OBSERVED FIT != FIXED IDENTITY"
      }}

def fixture(signals,evidence,candidates):
    return {"grounded_contact":"deterministic proof fixture","signals":signals,"evidence":evidence,"candidates":candidates}

def self_test():
    # 001 human/support: II + HOSF carry; irrelevant CMP rejected.
    r=detect(fixture(["support","agency","consequence","trace"],["consequence","trace"],[
      {"body":"II","office":"EXPLAIN","mechanisms":["consequence","trace"],"adds":["changed_nextness"]},
      {"body":"HOSF","office":"RECOVER","mechanisms":["support","agency"],"adds":["scaffolded_reentry"]},
      {"body":"CMP","office":"EXPLAIN","mechanisms":["passage"],"adds":["passage_mechanism"]}]))
    assert [x["decision"] for x in r["results"]]==["CARRY","CARRY","REJECT"]

    # 002 deployment: governance carries; HOSF rejected.
    r=detect(fixture(["carrier","mismatch","verification","trace"],["consequence","trace"],[
      {"body":"Claim Governance","office":"GOVERN","mechanisms":["verification","trace"],"adds":["claim_boundary"]},
      {"body":"HOSF","office":"RECOVER","mechanisms":["support","agency"],"adds":["scaffold"]}]))
    assert [x["decision"] for x in r["results"]]==["CARRY","REJECT"]

    # 003 learning: identity inference is blocked rather than promoted.
    r=detect(fixture(["learner_route","reflection","trace"],["consequence","trace"],[
      {"body":"Reflective Learning","office":"REFLECT","mechanisms":["reflection","learner_route"],"adds":["route_awareness"],"identity_risk":True}]))
    assert r["results"][0]["decision"]=="CARRY" and r["results"][0]["identity_inference_blocked"]

    # 004 non-human: intelligence-bearing candidate held without re-entry evidence.
    r=detect(fixture(["contact","consequence","trace"],["consequence","trace"],[
      {"body":"Learning-bearing adaptation","office":"EXPLAIN","mechanisms":["consequence","trace"],"adds":["adaptation"],"required_evidence":["reentry_change"]}]))
    assert r["results"][0]["decision"]=="HOLD" and r["claim_ceiling"]=="TRACE"

    # 005 carry: same evidence plus re-entry changes ceiling and permits candidate.
    r=detect(fixture(["contact","consequence","trace","reentry_change"],["consequence","trace","retention","reentry_change"],[
      {"body":"Learning-bearing adaptation","office":"EXPLAIN","mechanisms":["consequence","trace"],"adds":["adaptation"],"required_evidence":["reentry_change"]}]))
    assert r["results"][0]["decision"]=="CARRY" and r["claim_ceiling"]=="REENTRY_CHANGE"

    # Similarity with no differential yield cools, not crowns.
    r=detect(fixture(["trace"],["consequence","trace"],[
      {"body":"Redundant Candidate","office":"EXPLAIN","mechanisms":["trace"],"adds":["trace"]}]))
    assert r["results"][0]["decision"]=="COOL"
    print("JM ROD v0.1 self-test PASS: 6/6 bounded fixtures")

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--self-test",action="store_true")
    p.add_argument("--input")
    a=p.parse_args()
    if a.self_test:
        self_test(); return
    if not a.input: p.error("use --self-test or --input FILE")
    with open(a.input,encoding="utf-8") as f: payload=json.load(f)
    print(json.dumps(detect(payload),indent=2))

if __name__=="__main__": main()
