#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path
START = "/* ---- GDT / TSS ---- */"
END = "/* ---- BODYREGISTRY / ROUTESCHEDULER ---- */"

def sha(b: bytes) -> str: return hashlib.sha256(b).hexdigest()
def main() -> int:
    ap=argparse.ArgumentParser(); ap.add_argument("--kernel",type=Path,required=True); ap.add_argument("--office",type=Path,required=True); ap.add_argument("--receipt",type=Path,required=True); a=ap.parse_args()
    raw=a.kernel.read_text(encoding="utf-8"); office=a.office.read_text(encoding="utf-8").rstrip()+"\n\n"
    if raw.count(START)!=1 or raw.count(END)!=1: raise SystemExit("HOLD: descriptor/interrupt seam not singular")
    before, tail = raw.split(START,1); old, after = tail.split(END,1)
    if "static void gdt_install(void)" not in old or "static void idt_install(void)" not in old or "static void pic_pit_install(void)" not in old:
        raise SystemExit("HOLD: expected handwritten descriptor/interrupt offices missing")
    out = before + office + END + after
    if out.count("static void gdt_install(void)")!=1 or out.count("static void idt_install(void)")!=1 or out.count("static void pic_pit_install(void)")!=1:
        raise SystemExit("HOLD: generated descriptor/interrupt routes not singular")
    if START in out or "uint16_t divisor = 1193182U / 100U;" in out:
        raise SystemExit("HOLD: handwritten descriptor/interrupt route remains")
    before_sha=sha(raw.encode()); after_sha=sha(out.encode()); a.kernel.write_text(out,encoding="utf-8")
    meta=json.loads((a.office.with_suffix(".json")).read_text(encoding="utf-8"))
    receipt={"version":meta["VERSION"],"proof_parent":meta["PROOF_PARENT"],"machine_parent":meta["MACHINE_PARENT"],"source_sha256":meta["source_sha256"],"office_sha256":sha(a.office.read_bytes()),"kernel_before_sha256":before_sha,"kernel_after_sha256":after_sha,"descriptorbody_count":out.count("static void gdt_install(void)"),"interruptroute_count":out.count("static void pic_pit_install(void)"),"runtime_descriptor_marker":f'[JM] DESCRIPTORBODY GENERATED {meta["VERSION"]} SOURCE {meta["source_sha256"]} ACTIVE',"runtime_interrupt_marker":f'[JM] INTERRUPTROUTE GENERATED {meta["VERSION"]} SOURCE {meta["source_sha256"]} ACTIVE'}
    a.receipt.parent.mkdir(parents=True,exist_ok=True); a.receipt.write_text(json.dumps(receipt,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print(json.dumps(receipt,indent=2,sort_keys=True)); return 0
if __name__=="__main__": raise SystemExit(main())
