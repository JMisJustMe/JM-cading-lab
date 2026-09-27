#!/usr/bin/env python3
"""JM Relational Opportunity Detector v0.1.

Bounded deterministic organ for the existing JM Adaptive ECOSTATE Agent.
It does not invent theories or crown similarity as relation. It evaluates
explicit candidate bodies against grounded structural signals and preserves
a trace suitable for later re-entry.
"""
from __future__ import annotations
import argparse, json
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import Iterable

OFFICES={"EXPLAIN","GOVERN","ACT","REPRESENT","VERIFY","RECOVER","REFLECT"}
DECISIONS={"CARRY","HOLD","COOL","REJECT"}
INLETS={"RETRIEVAL","FEEDBACK","CHECK_IN","OUTCOME","ANOMALY","REENTRY","QUESTION","REFLECTION","HUMAN_INVITATION"}
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

GROUNDING_LEXICON={
  "mismatch":("mismatch","unexpected","does not match","wrong state"),
  "trace":("trace","record","receipt","left behind"),
  "state_transition":("state changed","changed state","transition"),
  "verification":("verify","verified","verification"),
  "feedback":("feedback","told us","reported back"),
  "check_in":("check-in","check in"),
  "reentry_change":("re-entry changed","reentry changed","changed on return"),
  "support":("support","scaffold"),
  "agency":("choice","agency"),
  "authority":("authority","permission"),
  "revocation":("revoked","revocation"),
}

def ground_raw_contact(contact:dict, registry:list[dict]|None=None)->tuple[list[str],str]:
    supplied=contact.get("signals")
    if supplied is not None:
        return list(supplied),"SUPPLIED"
    raw=str(contact.get("raw_contact","")).lower()
    signals=[name for name,phrases in GROUNDING_LEXICON.items() if any(p in raw for p in phrases)]
    if registry:
        for item in registry:
            for mechanism in item.get("mechanisms",[]):
                phrase=str(mechanism).replace("_"," ").lower()
                if phrase and phrase in raw and mechanism not in signals:
                    signals.append(mechanism)
        return signals,"REGISTRY_AWARE_LEXICON"
    return signals,"BOUNDED_LEXICON"

def infer_inlet(contact:dict)->str:
    """Conservative inlet inference from explicit grounded signals only."""
    explicit=contact.get("inlet")
    if explicit is not None:
        inlet=str(explicit).upper()
        if inlet not in INLETS: raise ValueError(f"invalid opportunity inlet {inlet}")
        return inlet
    sig=norm(contact.get("_grounded_signals",contact.get("signals",[])))
    cues=[
      ("FEEDBACK",{"human_feedback","feedback"}),
      ("CHECK_IN",{"check_in"}),
      ("OUTCOME",{"outcome","world_response"}),
      ("ANOMALY",{"anomaly","mismatch"}),
      ("REENTRY",{"reentry","reentry_change"}),
      ("QUESTION",{"question","question_pressure"}),
      ("REFLECTION",{"reflection","self_check"}),
      ("HUMAN_INVITATION",{"human_invitation","deliberate_comparison"}),
    ]
    hits=[name for name,keys in cues if sig & keys]
    return hits[0] if len(hits)==1 else "RETRIEVAL"

def transition_trace(prior:str|None,current:str,inlet:str)->dict:
    """Append-only relation-status observation; prior history is never rewritten."""
    if prior is not None and prior not in DECISIONS:
        raise ValueError(f"invalid prior decision {prior}")
    return {
      "prior_decision":prior,
      "current_decision":current,
      "changed":prior is not None and prior != current,
      "inlet":inlet,
      "law":"STATUS MAY CHANGE; HISTORY MUST NOT"
    }

def discover_candidates(signals:Iterable[str], registry:list[dict])->list[dict]:
    """Bounded registry discovery: retrieve bodies sharing grounded mechanisms."""
    sig=norm(signals)
    ranked=[]
    for item in registry:
        overlap=sorted(sig & norm(item.get("mechanisms",[])))
        if overlap:
            ranked.append((len(overlap),item["body"],item))
    ranked.sort(key=lambda x:(-x[0],x[1]))
    return [item for _,_,item in ranked]

def detect(contact:dict)->dict:
    signals,grounding_mode=ground_raw_contact(contact,contact.get("registry"))
    contact=dict(contact); contact["_grounded_signals"]=signals
    inlet=infer_inlet(contact)
    evidence=contact.get("evidence",[])
    prior_status=contact.get("prior_status",{})
    candidates=contact.get("candidates")
    discovery_mode="SUPPLIED"
    if candidates is None:
        registry=contact.get("registry",[])
        candidates=discover_candidates(signals,registry)
        discovery_mode="BOUNDED_REGISTRY"
    results=[evaluate(signals,evidence,Candidate(
      body=x["body"], office=x["office"],
      mechanisms=tuple(x.get("mechanisms",[])), adds=tuple(x.get("adds",[])),
      excludes=tuple(x.get("excludes",[])), required_evidence=tuple(x.get("required_evidence",[])),
      identity_risk=bool(x.get("identity_risk",False)),
      representation_options=tuple(x.get("representation_options",[]))
    )) for x in candidates]
    relation_history=[
      {"body":r["body"],**transition_trace(prior_status.get(r["body"]),r["decision"],inlet)}
      for r in results if r["body"] in prior_status
    ]
    return {
      "schema":"jm.rod/0.1","grounded_contact":contact.get("grounded_contact",""),
      "opportunity_inlet":inlet,
      "candidate_discovery":discovery_mode,
      "grounding_mode":grounding_mode,
      "grounded_signals":signals,
      "claim_ceiling":evidence_ceiling(evidence),"results":results,
      "relation_history":relation_history,
      "trace":{
        "carry":[r["body"] for r in results if r["decision"]=="CARRY"],
        "hold":[r["body"] for r in results if r["decision"]=="HOLD"],
        "cool":[r["body"] for r in results if r["decision"]=="COOL"],
        "reject":[r["body"] for r in results if r["decision"]=="REJECT"],
        "law":"CANDIDATE != ACCEPTED RELATION; OBSERVED FIT != FIXED IDENTITY; INLET != VERDICT"
      }}

def fixture(signals,evidence,candidates,inlet="RETRIEVAL"):
    return {"grounded_contact":"deterministic proof fixture","signals":signals,"evidence":evidence,"candidates":candidates,"inlet":inlet}

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
    # Opportunity can enter through feedback/check-in, not retrieval alone.
    r=detect(fixture(["trace","human_feedback"],["consequence","trace"],[
      {"body":"Feedback-sensitive route","office":"REFLECT","mechanisms":["human_feedback"],"adds":["next_route_correction"]}],inlet="FEEDBACK"))
    assert r["opportunity_inlet"]=="FEEDBACK" and r["results"][0]["decision"]=="CARRY"
    # Prior HOLD can become CARRY when later feedback supplies missing evidence.
    r=detect({"grounded_contact":"feedback re-entry","inlet":"FEEDBACK",
      "signals":["trace","human_feedback","reentry_change"],
      "evidence":["consequence","trace","retention","reentry_change"],
      "prior_status":{"Learning-bearing adaptation":"HOLD"},
      "candidates":[{"body":"Learning-bearing adaptation","office":"EXPLAIN",
        "mechanisms":["trace","reentry_change"],"adds":["adaptation"],
        "required_evidence":["reentry_change"]}]})
    assert r["results"][0]["decision"]=="CARRY"
    assert r["relation_history"][0]["prior_decision"]=="HOLD"
    assert r["relation_history"][0]["current_decision"]=="CARRY"
    assert r["relation_history"][0]["changed"]

    # Inlet provenance never decides fit by itself.
    r=detect(fixture(["human_feedback"],["consequence"],[
      {"body":"Unrelated candidate","office":"EXPLAIN","mechanisms":["different_mechanism"],"adds":["novel"]}],inlet="FEEDBACK"))
    assert r["opportunity_inlet"]=="FEEDBACK" and r["results"][0]["decision"]=="REJECT"

    # Inlet can be conservatively inferred from a unique explicit structural cue.
    r=detect({"grounded_contact":"unlabelled anomaly contact",
      "signals":["mismatch","trace"],"evidence":["consequence","trace"],
      "candidates":[{"body":"Mismatch explainer","office":"EXPLAIN","mechanisms":["mismatch"],"adds":["boundary"]}]})
    assert r["opportunity_inlet"]=="ANOMALY" and r["results"][0]["decision"]=="CARRY"

    # Ambiguous inlet cues fall back to retrieval rather than inventing provenance.
    r=detect({"grounded_contact":"ambiguous unlabelled contact",
      "signals":["feedback","question"],"evidence":["consequence"],
      "candidates":[]})
    assert r["opportunity_inlet"]=="RETRIEVAL"

    # Candidate bodies can be discovered from a bounded registry when none are supplied.
    r=detect({"grounded_contact":"registry discovery","signals":["mismatch","trace"],
      "evidence":["consequence","trace"],"registry":[
        {"body":"Contact Field","office":"EXPLAIN","mechanisms":["mismatch","state_transition"],"adds":["condition_shift"]},
        {"body":"HOSF","office":"RECOVER","mechanisms":["support","agency"],"adds":["scaffold"]},
        {"body":"TraceBox","office":"REPRESENT","mechanisms":["trace"],"adds":["retained_route"]}]})
    assert r["candidate_discovery"]=="BOUNDED_REGISTRY"
    assert [x["body"] for x in r["results"]]==["Contact Field","TraceBox"]
    assert [x["decision"] for x in r["results"]]==["CARRY","CARRY"]

    # Raw text can be conservatively grounded without supplied signals.
    r=detect({"raw_contact":"The live route produced an unexpected mismatch. The state changed and left a trace.",
      "evidence":["consequence","trace"],"registry":[
        {"body":"Contact Field","office":"EXPLAIN","mechanisms":["mismatch","state_transition"],"adds":["condition_shift"]},
        {"body":"HOSF","office":"RECOVER","mechanisms":["support"],"adds":["scaffold"]}]})
    assert r["grounding_mode"]=="BOUNDED_LEXICON"
    assert r["opportunity_inlet"]=="ANOMALY"
    assert [x["body"] for x in r["results"]]==["Contact Field"]

    # Registry mechanisms can extend grounding without changing the static lexicon.
    r=detect({"raw_contact":"The observed causal route changed after passage through the mechanism.",
      "evidence":["consequence"],"registry":[
        {"body":"Cause Must Pass","office":"EXPLAIN","mechanisms":["causal_route","passage","mechanism"],"adds":["passage_mechanism"]}]})
    assert r["grounding_mode"]=="REGISTRY_AWARE_LEXICON"
    assert r["candidate_discovery"]=="BOUNDED_REGISTRY"
    assert r["results"][0]["body"]=="Cause Must Pass" and r["results"][0]["decision"]=="CARRY"

    print("JM ROD v0.1 self-test PASS: 14/14 bounded fixtures")

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--self-test",action="store_true")
    p.add_argument("--input")
    p.add_argument("--registry")
    p.add_argument("--ledger")
    p.add_argument("--write-ledger")
    a=p.parse_args()
    if a.self_test:
        self_test(); return
    if not a.input: p.error("use --self-test or --input FILE")
    with open(a.input,encoding="utf-8") as f: payload=json.load(f)
    if a.registry and "candidates" not in payload:
        with open(a.registry,encoding="utf-8") as f: payload["registry"]=json.load(f)
    ledger={}
    if a.ledger and Path(a.ledger).exists():
        with open(a.ledger,encoding="utf-8") as f: ledger=json.load(f)
        payload.setdefault("prior_status",ledger.get("current_status",{}))
    result=detect(payload)
    if a.write_ledger:
        history=list(ledger.get("events",[]))
        history.extend(result.get("relation_history",[]))
        current=dict(ledger.get("current_status",{}))
        current.update({r["body"]:r["decision"] for r in result["results"]})
        out={"schema":"jm.rod.ledger/0.1","current_status":current,"events":history}
        with open(a.write_ledger,"w",encoding="utf-8") as f: json.dump(out,f,indent=2)
    print(json.dumps(result,indent=2))

if __name__=="__main__": main()
