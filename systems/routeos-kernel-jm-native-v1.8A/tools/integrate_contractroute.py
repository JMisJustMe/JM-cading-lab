#!/usr/bin/env python3
import argparse,hashlib,json
from pathlib import Path
START='#define COM1 JM_DEVICE_SERIALROUTE_PORT'
END='/* GENERATED PRIMITIVEROUTE v1.5A SOURCE '
MARK='/* GENERATED KERNELCONTRACTROUTE v1.8A SOURCE '
def H(x):return hashlib.sha256(x.encode()).hexdigest()
def main():
 p=argparse.ArgumentParser();p.add_argument('--kernel',type=Path,required=True);p.add_argument('--generated',type=Path,required=True);p.add_argument('--receipt',type=Path,required=True);a=p.parse_args();t=a.kernel.read_text()
 if MARK in t:raise SystemExit('HOLD: already integrated')
 if t.count(START)!=1 or t.count(END)!=1:raise SystemExit('HOLD: contract seam not singular')
 l=t.index(START);r=t.index(END,l);old=t[l:r];t=t[:l]+a.generated.read_text().rstrip()+'\n\n'+t[r:]
 call='  serial_init();\n'
 if t.count(call)!=1:raise SystemExit('HOLD: activation seam not singular')
 t=t.replace(call,call+'  jm_generated_contractroute_announce();\n',1)
 for x in ['#define COM1 JM_DEVICE_SERIALROUTE_PORT','extern uint64_t boot_pml4[];']:
  if t.count(x)!=1:raise SystemExit('HOLD: generated contract count mismatch')
 if t.count(MARK)!=1:raise SystemExit('HOLD: marker mismatch')
 a.kernel.write_text(t);a.receipt.parent.mkdir(parents=True,exist_ok=True);a.receipt.write_text(json.dumps({'version':'v1.8A','removed_sha256':H(old),'integrated_kernel_sha256':H(t),'generated_marker_count':t.count(MARK),'handwritten_contract_residue':0},indent=2,sort_keys=True)+'\n')
if __name__=='__main__':main()
