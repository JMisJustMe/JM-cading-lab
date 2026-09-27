#!/usr/bin/env python3
"""AILatheo Unified Circuit v0.1 — bounded ECOSTATE orchestration descendant.

AILatheo does not merge Estate bodies. It receives contact, passes it through
the Coding Estate spine, asks ROD for earned relations, routes productive
contact, records TraceBox consequence, and returns changed nextness.
"""
from __future__ import annotations
import argparse, json
from pathlib import Path
from jm_relational_opportunity import detect

CODING_SPINE=[
 "Cading","FlowTalk","JMLogic","Build Gates","RouteCode","Kading","Quadze",
 "OneBody IR","CodeHand","RouteOS","CadenVM","TraceBox","THEO","Zionfolder"
]
VALID={"CARRY","HOLD","COOL","REJECT"}

def coding_pass(raw:str)->list[dict]:
    state={"raw_contact":raw,"intent":"contact","route":"unified-circuit","phase":"Q0"}
    out=[]
    actions={
      "Cading":lambda s:s.update(source_parsed=bool(raw.strip())),
      "FlowTalk":lambda s:s.update(intent_locked=True),
      "JMLogic":lambda s:s.update(laws=["RELATION != MERGER","INLET != VERDICT"]),
      "Build Gates":lambda s:s.update(pre_gate="PASS" if s.get("source_parsed") else "HOLD"),
      "RouteCode":lambda s:s.update(route_code="CONTACT->ROD->ROUTEOS->TRACE"),
      "Kading":lambda s:s.update(structure="mapped"),
      "Quadze":lambda s:s.update(phase="Q1_CONTACT"),
      "OneBody IR":lambda s:s.update(ir={"contact":raw,"route":s.get("route_code")}),
      "CodeHand":lambda s:s.update(carrier="python"),
      "RouteOS":lambda s:s.update(route_bound=True),
      "CadenVM":lambda s:s.update(runtime="ready"),
      "TraceBox":lambda s:s.update(trace_open=True),
      "THEO":lambda s:s.update(identity="AILatheo","authority="bounded"),
      "Zionfolder":lambda s:s.update(recoverable=True),
    }
    for body in CODING_SPINE:
        actions[body](state)
        out.append({"body":body,"pass":True,"phase":state.get("phase"),"state_keys":sorted(state)})
    return out

def run(contact:dict,registry:list[dict],prior:dict|None=None)->dict:
    raw=str(contact.get("raw_contact",""))
    spine=coding_pass(raw)
    if len(spine)!=14 or [x["body"] for x in spine]!=CODING_SPINE:
        raise RuntimeError("NO DING: coding spine incomplete")
    packet=dict(contact); packet["registry"]=registry
    if prior: packet["prior_status"]=prior
    rod=detect(packet)
    conductive=[r for r in rod["results"] if r["decision"]=="CARRY"]
    return {
      "schema":"jm.ailatheo.circuit/0.1",
      "identity":"AILatheo / AITheO",
      "mode":"UNIFIED_BROWSER_CIRCUIT",
      "coding_spine":{"executed":14,"required":14,"complete":True,"receipts":spine},
      "rod":rod,
      "light_circuit":{
        "source":"CURRENT CONTACT",
        "energised":[r["body"] for r in conductive],
        "conducted":[{"from":"AILatheo","via":"ROD -> RouteOS","to":r["body"],"office":r["office"]} for r in conductive],
        "dim":[r["body"] for r in rod["results"] if r["decision"] in {"COOL","REJECT"}],
        "gated":[r["body"] for r in rod["results"] if r["decision"]=="HOLD"],
      },
      "tracebox":{"retained":True,"carry":rod["trace"]["carry"],"claim_ceiling":rod["claim_ceiling"]},
      "ding":"AILATHEO_UNIFIED_CIRCUIT_DING",
      "laws":["MESH != MERGE","COMMON ROUTE != COMMON BODY","CANDIDATE != ACCEPTED RELATION",
              "STATUS MAY CHANGE; HISTORY MUST NOT","NO DING, NO CLAIM"]
    }

def self_test(registry):
    x=run({"raw_contact":"An unexpected mismatch caused a consequence, left behind a trace, persisted and re-entry changed the next action."},registry)
    assert x["coding_spine"]["executed"]==14 and x["coding_spine"]["complete"]
    assert "RouteCode" in [z["body"] for z in x["coding_spine"]["receipts"]]
    assert x["rod"]["claim_ceiling"]=="REENTRY_CHANGE"
    assert set(x["light_circuit"]["energised"]) >= {"Interactors Interacting","Contact Field","TraceBox"}
    assert x["ding"]=="AILATHEO_UNIFIED_CIRCUIT_DING"
    print("AILatheo Unified Circuit v0.1 self-test PASS: 5/5")

if __name__=="__main__":
    ap=argparse.ArgumentParser(); ap.add_argument("--registry",default="registry/rod-bodies-v0-1.json")
    ap.add_argument("--input"); ap.add_argument("--self-test",action="store_true"); args=ap.parse_args()
    registry=json.loads(Path(args.registry).read_text())
    if args.self_test:self_test(registry)
    else:
        contact=json.loads(Path(args.input).read_text()) if args.input else {"raw_contact":"trace"}
        print(json.dumps(run(contact,registry),indent=2))
