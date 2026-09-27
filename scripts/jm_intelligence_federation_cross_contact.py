#!/usr/bin/env python3
"""JM Intelligence Federation cross-contact proof v0.1."""
import json
from jm_ailatheo_unified_circuit import run as ailatheo_run, load_registry
from jm_teo_os_recovered_runtime import TeoKernel

CONTACT="The route produced a mismatch, caused a consequence, left a trace, persisted, and on re-entry changed the next action."

def prove():
    registry=load_registry()
    a=ailatheo_run(CONTACT,registry)
    assert a["coding_route"]["complete"] and a["coding_route"]["count"]==14
    assert a["ding"]=="AILATHEO_UNIFIED_CIRCUIT_DING"

    k=TeoKernel().boot(); k.add_librarian()
    # AILatheo consequence enters Teo as a bounded Ding payload, not merged state.
    receipt=k.ding("ding:make-receipt",source="body:teo-kernel-operator",
      payload={"event":"ailatheo-cross-contact","ailatheo_ding":a["ding"],
               "carry":a["tracebox"]["carry"]},target="body:teo-librarian")
    trace=k.ding("ding:query-trace",payload={"event":"receipt"},target="body:teo-librarian")
    assert receipt["event"]=="ailatheo-cross-contact" and trace

    # Re-entry: prior AILatheo result is supplied back through its own public prior-state interface.
    b=ailatheo_run(CONTACT,registry,prior=a)
    assert b["ding"]=="AILATHEO_UNIFIED_CIRCUIT_DING"
    assert b["coding_route"]["complete"]

    return {
      "schema":"jm.intelligence-federation.cross-contact/0.1",
      "status":"PASS",
      "contact":CONTACT,
      "offices":{
        "ailatheo":"visible operator / unified circuit",
        "rod":"bounded relational-opportunity organ inside AILatheo route",
        "teo-os":"cognitive continuity/trace donor",
        "adaptive-ecostate":"separately CI-proved execution/governance office"
      },
      "observed":{
        "ailatheo_ding":a["ding"],
        "coding_bodies":a["coding_route"]["count"],
        "teo_receipt":receipt["event"],
        "teo_trace_readback":len(trace)>0,
        "ailatheo_reentry_ding":b["ding"]
      },
      "boundary":[
        "RELATION != MERGER",
        "This proves AILatheo <-> Teo OS bounded payload/trace/re-entry contact.",
        "Adaptive ECOSTATE execution is proved separately in the same CI job; this harness does not pretend it is a Python import.",
        "JM AI Lab v2.0 is not mounted in this repository branch and is not claimed as cross-contacted here."
      ],
      "ding":"JM_INTELLIGENCE_FEDERATION_CROSS_CONTACT_DING"
    }

if __name__=="__main__": print(json.dumps(prove(),indent=2))
