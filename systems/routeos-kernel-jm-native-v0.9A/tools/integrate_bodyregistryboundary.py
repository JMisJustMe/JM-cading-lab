#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path
BODY_START="/* ---- BODYREGISTRY / ROUTESCHEDULER ---- */"
SCHED_START="/* GENERATED OPERATIONAL OFFICE. EDIT source/routescheduler.jmroute, NOT THIS FILE. */"
BOUNDARY_START="static void mark_user_page(uint64_t address) {"
IGNITION_START="/* GENERATED OPERATIONAL OFFICE. EDIT source/ignitionbody.jmroute, NOT THIS FILE. */"
def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()
def main()->int:
    ap=argparse.ArgumentParser();ap.add_argument("--kernel",type=Path,required=True);ap.add_argument("--registry",type=Path,required=True);ap.add_argument("--boundary",type=Path,required=True);ap.add_argument("--receipt",type=Path,required=True);a=ap.parse_args()
    raw=a.kernel.read_text(); registry=a.registry.read_text().rstrip()+"\n\n"; boundary=a.boundary.read_text().rstrip()+"\n\n"
    if raw.count(BODY_START)!=1 or raw.count(SCHED_START)!=1: raise SystemExit("HOLD: BodyRegistry seam not singular")
    before,tail=raw.split(BODY_START,1); old_body,after_sched=tail.split(SCHED_START,1)
    if "struct cpu_frame" not in old_body or "static struct body bodies" not in old_body: raise SystemExit("HOLD: handwritten BodyRegistry absent")
    stage=before+registry+SCHED_START+after_sched
    if stage.count(BOUNDARY_START)!=1 or stage.count(IGNITION_START)!=1: raise SystemExit("HOLD: UserBoundary seam not singular")
    before_b,tail_b=stage.split(BOUNDARY_START,1); old_boundary,after_i=tail_b.split(IGNITION_START,1)
    if "routeos_reload_cr3();" not in old_boundary or "bodies[1].frame.ss" not in old_boundary: raise SystemExit("HOLD: handwritten UserBoundary absent")
    out=before_b+boundary+IGNITION_START+after_i
    if out.count("/* GENERATED BODYREGISTRY.")!=1 or out.count("/* GENERATED USERBOUNDARY.")!=1: raise SystemExit("HOLD: generated offices not singular")
    if BODY_START in out or "bodies[0].id = 1; bodies[0].state = BODY_READY;" not in out: raise SystemExit("HOLD: replacement incomplete")
    for sig in ("struct cpu_frame {","static struct body bodies[JM_BODYREGISTRY_BODY_COUNT];","static void user_boundary_install(void)"):
        if out.count(sig)!=1: raise SystemExit(f"HOLD: generated route count wrong: {sig}")
    before_sha=sha(raw.encode());after_sha=sha(out.encode());a.kernel.write_text(out)
    meta=json.loads((a.registry.parent/"bodyregistry_userboundary.json").read_text())
    receipt={"version":meta["VERSION"],"proof_parent":meta["PROOF_PARENT"],"machine_parent":meta["MACHINE_PARENT"],"source_sha256":meta["source_sha256"],"registry_sha256":sha(a.registry.read_bytes()),"boundary_sha256":sha(a.boundary.read_bytes()),"kernel_before_sha256":before_sha,"kernel_after_sha256":after_sha,"bodyregistry_count":out.count("/* GENERATED BODYREGISTRY."),"userboundary_count":out.count("/* GENERATED USERBOUNDARY."),"runtime_registry_marker":f'[JM] BODYREGISTRY GENERATED {meta["VERSION"]} SOURCE {meta["source_sha256"]} ACTIVE',"runtime_boundary_marker":f'[JM] USERBOUNDARY GENERATED {meta["VERSION"]} SOURCE {meta["source_sha256"]} ACTIVE'}
    a.receipt.parent.mkdir(parents=True,exist_ok=True);a.receipt.write_text(json.dumps(receipt,indent=2,sort_keys=True)+"\n");print(json.dumps(receipt,indent=2,sort_keys=True));return 0
if __name__=="__main__":raise SystemExit(main())
