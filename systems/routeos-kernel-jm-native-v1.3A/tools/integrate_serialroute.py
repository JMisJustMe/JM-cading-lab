#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

START = "static void serial_init(void) {"
END = "/* ---- CORESTATE / MEMORYBODY ---- */"
MARKER = "/* GENERATED SERIALROUTE v1.3A SOURCE "

def sha(data: bytes) -> str: return hashlib.sha256(data).hexdigest()

def main() -> int:
    ap=argparse.ArgumentParser(); ap.add_argument('--kernel',type=Path,required=True); ap.add_argument('--generated',type=Path,required=True); ap.add_argument('--receipt',type=Path,required=True); a=ap.parse_args()
    original=a.kernel.read_text()
    if original.count(START)!=1 or original.count(END)!=1: raise SystemExit('HOLD: serial seam is not singular')
    if MARKER in original: raise SystemExit('HOLD: generated SerialRoute already present')
    s=original.index(START); e=original.index(END)
    removed=original[s:e]
    generated=a.generated.read_text().rstrip()+"\n\n"
    integrated=original[:s]+generated+original[e:]
    if integrated.count(MARKER)!=1: raise SystemExit('HOLD: generated marker count mismatch')
    if START in integrated: raise SystemExit('HOLD: handwritten serial seam residue remains')
    a.kernel.write_text(integrated)
    r={'version':'v1.3A','kernel':str(a.kernel),'removed_handwritten_serial_sha256':sha(removed.encode()),'generated_serialroute_count':integrated.count(MARKER),'handwritten_serialroute_residue':integrated.count(START),'integrated_kernel_sha256':sha(integrated.encode())}
    a.receipt.parent.mkdir(parents=True,exist_ok=True); a.receipt.write_text(json.dumps(r,indent=2,sort_keys=True)+'\n')
    return 0
if __name__=='__main__': raise SystemExit(main())
