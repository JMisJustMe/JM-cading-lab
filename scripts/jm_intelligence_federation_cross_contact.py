#!/usr/bin/env python3
"""JM Intelligence Federation cross-contact proof v0.2."""
import json
from pathlib import Path
from jm_ailatheo_unified_circuit import run as ailatheo_run
from jm_teo_os_recovered_runtime import TeoKernel

CONTACT="The route produced a mismatch, caused a consequence, left a trace, persisted, and on re-entry changed the next action."

def load_registry():
    return json.loads(Path("registry/rod-bodies-v0-1.json").read_text())

def prove():
    registry=load_registry()
    packet={"raw_contact":CONTACT}
    a=ailatheo_run(packet,registry)
    assert a["coding_spine"]["complete"] and a["coding_spine"]["executed"]==14
    assert a["ding"]=="AILATHEO_UNIFIED_CIRCUIT_DING"

    k=TeoKernel().boot(); k.add_librarian()
    receipt=k.ding("ding:make-receipt",source="body:teo-kernel-operator",
      payload={"event":"ailatheo-cross-contact","ailatheo_ding":a["ding"],
               "carry":a["tracebox"]["carry"]},target="body:teo-librarian")
    trace=k.ding("ding:query-trace",payload={"event":"receipt"},target="body:teo-librarian")
    assert receipt["receipt_event"]=="ailatheo-cross-contact" and trace

    b=ailatheo_run(packet,registry,prior=a)
    assert b["ding"]=="AILATHEO_UNIFIED_CIRCUIT_DING"
    assert b["coding_spine"]["complete"]

    return {
      "schema":"jm.intelligence-federation.cross-contact/0.2","status":"PASS","contact":CONTACT,
      "offices":{"ailatheo":"visible operator / unified circuit","rod":"bounded relational-opportunity organ",
        "teo-os":"cognitive continuity/trace donor","adaptive-ecostate":"separately CI-proved execution/governance office",
        "jm-ai-lab":"exact v2 body separately cross-contacted by exact-source harness"},
      "observed":{"ailatheo_ding":a["ding"],"coding_bodies":a["coding_spine"]["executed"],
        "teo_receipt":receipt["receipt_event"],"teo_trace_readback":len(trace)>0,"ailatheo_reentry_ding":b["ding"]},
      "boundary":["RELATION != MERGER","AILatheo <-> Teo OS bounded payload/trace/re-entry contact.",
        "Adaptive ECOSTATE execution is proved separately in this CI job.",
        "Exact JM AI Lab v2.0 contact is proved by scripts/jm_ai_lab_exact_cross_contact.js."],
      "ding":"JM_INTELLIGENCE_FEDERATION_CROSS_CONTACT_DING"
    }

if __name__=="__main__": print(json.dumps(prove(),indent=2))
