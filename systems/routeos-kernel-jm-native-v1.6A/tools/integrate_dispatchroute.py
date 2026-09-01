#!/usr/bin/env python3
import argparse,hashlib,json
from pathlib import Path
START='struct cpu_frame *routeos_interrupt_dispatch(struct cpu_frame *frame) {'
END='/* GENERATED USERBOUNDARY.'
MARK='/* GENERATED DISPATCHROUTE v1.6A SOURCE '
def H(x):return hashlib.sha256(x.encode()).hexdigest()
def main():
 p=argparse.ArgumentParser();p.add_argument('--kernel',type=Path,required=True);p.add_argument('--generated',type=Path,required=True);p.add_argument('--receipt',type=Path,required=True);a=p.parse_args();t=a.kernel.read_text()
 if MARK in t:raise SystemExit('HOLD: already integrated')
 if t.count(START)!=1 or t.count(END)!=1:raise SystemExit('HOLD: seam not singular')
 l=t.index(START);r=t.index(END,l);old=t[l:r];t=t[:l]+a.generated.read_text().rstrip()+'\n\n'+t[r:]
 residue={START:t.count(START)}
 if residue[START]!=1 or t.count(MARK)!=1:raise SystemExit('HOLD: dispatch integration mismatch')
 # The one surviving routeos_interrupt_dispatch definition is generated; reject old body signatures.
 for x in ['if (frame->vector == 32) {','++ticks;\n    outb(0x20, 0x20);']:
  if x in t:raise SystemExit('HOLD: old dispatch residue')
 a.kernel.write_text(t);a.receipt.parent.mkdir(parents=True,exist_ok=True);a.receipt.write_text(json.dumps({'version':'v1.6A','removed_sha256':H(old),'integrated_kernel_sha256':H(t),'generated_marker_count':t.count(MARK),'old_dispatch_residue':0},indent=2,sort_keys=True)+'\n')
if __name__=='__main__':main()
