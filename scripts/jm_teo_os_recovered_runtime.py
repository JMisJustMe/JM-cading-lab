#!/usr/bin/env python3
"""Teo OS recovered-spec executable descendant v0.1.

This is a fresh executable reconstruction from the recovered Teo OS v1.0
architecture/boot sequence. It proves the recovered semantics can execute now;
it does NOT claim byte-identical recovery of a historical program.
"""
from copy import deepcopy
import json, sys

class TeoKernel:
    def __init__(self):
        self.bodies={}
        self.active=None
        self.dings=[]
        self.stance={}
        self.continuity={}
        self.savepacks=[]
        self.trace=[]
        self.routes={}
        self.participation={}

    def log(self,event,**data): self.trace.append({"event":event,**data})

    def boot(self):
        self.continuity["cc:genesis"]={"label":"Teo OS Genesis","lineage":[]}
        self.register_body("body:teo-kernel-operator","Teo Kernel Operator",
                           ["ding:perceive","ding:interpret","ding:act","ding:update-continuity"])
        self.active="body:teo-kernel-operator"
        self.stance[self.active]={"mode":"calm","exploration":"high","conservatism":"medium"}
        self.log("kernel-boot",body=self.active,continuity="cc:genesis")
        self.snapshot("savepack:0")
        return self

    def register_body(self,bid,label,routes):
        self.bodies[bid]={"id":bid,"label":label,"memory":{}}
        self.routes[bid]=routes
        self.participation[bid]={"acceptsFrom":["kernel"],"emitsTo":["kernel","trace"]}
        self.log("body-registered",body=bid)

    def add_librarian(self):
        bid="body:teo-librarian"
        self.register_body(bid,"Teo Librarian",
          ["ding:perceive","ding:interpret","ding:act","ding:update-continuity",
           "ding:query-trace","ding:get-continuity","ding:make-receipt","ding:organize-savepacks"])
        self.stance[bid]={"mode":"calm","exploration":"medium","conservatism":"high","focus":"very-high"}

    def ding(self,dtype,source="kernel",payload=None,target=None):
        target=target or self.active
        d={"type":dtype,"source":source,"payload":payload or {},"target":target}
        self.dings.append(d); self.log("ding-received",type=dtype,target=target)
        if dtype not in self.routes.get(target,[]): raise ValueError("NO_ROUTE")
        if dtype=="ding:query-trace":
            out=[x for x in self.trace if d["payload"].get("event") in (None,x.get("event"))]
            self.bodies[target]["memory"]["lastResult"]=out
        elif dtype=="ding:get-continuity":
            out=self.continuity[d["payload"]["id"]]["lineage"]
            self.bodies[target]["memory"]["lastResult"]=out
        elif dtype=="ding:make-receipt":
            out={"event":d["payload"]["event"],"body":source}
            self.log("receipt",**out)
        elif dtype=="ding:organize-savepacks":
            out=[x["id"] for x in self.savepacks]
            self.bodies[target]["memory"]["lastResult"]=out
        else:
            out={"handled":dtype,"by":target}
        self.log("route-executed",route=dtype,body=target)
        return out

    def snapshot(self,sid):
        snap={"id":sid,"active":self.active,"bodies":sorted(self.bodies),"trace_count":len(self.trace)}
        self.savepacks.append(deepcopy(snap)); self.log("savepack-created",id=sid); return snap

def prove():
    k=TeoKernel().boot()
    assert k.active=="body:teo-kernel-operator"
    assert "cc:genesis" in k.continuity and len(k.savepacks)==1
    k.add_librarian()
    r=k.ding("ding:make-receipt",source="body:teo-kernel-operator",
             payload={"event":"teo-current-runtime-reproof"},target="body:teo-librarian")
    k.ding("ding:query-trace",payload={"event":"receipt"},target="body:teo-librarian")
    assert r["event"]=="teo-current-runtime-reproof"
    assert k.bodies["body:teo-librarian"]["memory"]["lastResult"]
    k.snapshot("savepack:1")
    return {"schema":"jm.teo-os.reproof/0.1","status":"PASS",
            "scope":"RECOVERED_SPEC_EXECUTABLE_DESCENDANT_NOT_HISTORICAL_BYTE_IDENTITY",
            "bodies":sorted(k.bodies),"continuity":sorted(k.continuity),
            "savepacks":len(k.savepacks),"trace_events":len(k.trace),
            "ding":"TEO_OS_CURRENT_RUNTIME_REPROOF_DING"}

if __name__=="__main__":
    out=prove()
    if "--json" in sys.argv: print(json.dumps(out,indent=2))
    else: print(out["ding"],out["status"])
