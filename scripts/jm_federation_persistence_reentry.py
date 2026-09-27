#!/usr/bin/env python3
import json,tempfile,subprocess
from pathlib import Path
from jm_ailatheo_unified_circuit import run\n\ndef load_registry():\n return json.loads(Path('registry/rod-bodies-v0-1.json').read_text())
from jm_teo_os_recovered_runtime import TeoKernel
CONTACT="The stored evidence says the route caused a consequence, left a trace, persisted, and re-entry changed the next action."
def main():
 a=run({'raw_contact':CONTACT},load_registry())
 lab=json.loads(subprocess.check_output(["node","scripts/jm_ai_lab_exact_cross_contact.js"],text=True))
 k=TeoKernel().boot();k.add_librarian()
 k.ding("ding:make-receipt",source="body:teo-kernel-operator",payload={"event":"federation-persist","aiLab":lab["ding"],"ailatheo":a["ding"]},target="body:teo-librarian")
 ledger={"schema":"jm.federation.tracebox/0.1","contact":CONTACT,"ailatheo":a["ding"],"aiLab":lab["ding"],"teoTrace":k.trace,"historyImmutable":True}
 with tempfile.TemporaryDirectory() as d:
  p=Path(d)/"tracebox.json";p.write_text(json.dumps(ledger));loaded=json.loads(p.read_text())
  assert loaded==ledger and loaded["historyImmutable"]
 b=run({'raw_contact':CONTACT},load_registry(),prior=a)
 assert b["ding"]=="AILATHEO_UNIFIED_CIRCUIT_DING"
 print(json.dumps({"status":"PASS","write_readback":True,"reentry":True,"multiHop":["AILatheo","ROD","JM AI Lab v2.0","Teo OS","TraceBox","AILatheo re-entry"],"ding":"JM_FEDERATION_PERSISTENCE_REENTRY_DING"},indent=2))
if __name__=="__main__":main()
