#!/usr/bin/env python3
import argparse, hashlib, json
from pathlib import Path
START='static inline void outb(uint16_t port, uint8_t value) {'
END='/* GENERATED SERIALROUTE v1.3A SOURCE '
MARK='/* GENERATED PRIMITIVEROUTE v1.5A SOURCE '
RESIDUE=['static inline void outb(uint16_t port, uint8_t value) {','static inline uint8_t inb(uint16_t port) {','static inline void io_wait(void)','static void *jm_memcpy(void *dst, const void *src, size_t n) {','static void *jm_memset(void *dst, int value, size_t n) {']
def sha(x): return hashlib.sha256(x.encode()).hexdigest()
def main():
 p=argparse.ArgumentParser(); p.add_argument('--kernel',type=Path,required=True); p.add_argument('--generated',type=Path,required=True); p.add_argument('--receipt',type=Path,required=True); a=p.parse_args()
 text=a.kernel.read_text()
 if MARK in text: raise SystemExit('HOLD: PrimitiveRoute already integrated')
 if text.count(START)!=1 or text.count(END)!=1: raise SystemExit('HOLD: PrimitiveRoute seam not singular')
 left=text.index(START); right=text.index(END,left); old=text[left:right]
 unit=a.generated.read_text().rstrip()+'\n\n'
 text=text[:left]+unit+text[right:]
 needle='  serial_init();\n'
 if text.count(needle)!=1: raise SystemExit('HOLD: serial activation seam not singular')
 text=text.replace(needle,needle+'  jm_generated_primitiveroute_announce();\n',1)
 residue={x:text.count(x) for x in RESIDUE}
 if any(residue.values()): raise SystemExit(f'HOLD: PrimitiveRoute residue {residue}')
 if text.count(MARK)!=1 or text.count('jm_generated_primitiveroute_announce();')!=1: raise SystemExit('HOLD: PrimitiveRoute marker/call mismatch')
 a.kernel.write_text(text)
 rec={'version':'v1.5A','removed_sha256':sha(old),'integrated_kernel_sha256':sha(text),'handwritten_residue':residue,'generated_marker_count':text.count(MARK)}
 a.receipt.parent.mkdir(parents=True,exist_ok=True); a.receipt.write_text(json.dumps(rec,indent=2,sort_keys=True)+'\n')
if __name__=='__main__': main()
