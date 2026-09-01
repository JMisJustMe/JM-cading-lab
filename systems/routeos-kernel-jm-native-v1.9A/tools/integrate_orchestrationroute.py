#!/usr/bin/env python3
import argparse,hashlib,json
from pathlib import Path
START='/* GENERATED OPERATIONAL OFFICE. EDIT source/ignitionbody.jmroute, NOT THIS FILE. */'
END='/* GENERATED ENTRYROUTE v1.7A TAIL SOURCE '
MARK='/* GENERATED ORCHESTRATIONROUTE v1.9A SOURCE '
def H(x):return hashlib.sha256(x.encode()).hexdigest()
def main():
 p=argparse.ArgumentParser();p.add_argument('--kernel',type=Path,required=True);p.add_argument('--generated',type=Path,required=True);p.add_argument('--receipt',type=Path,required=True);a=p.parse_args();t=a.kernel.read_text()
 if MARK in t:raise SystemExit('HOLD: already integrated')
 if t.count(START)!=1 or t.count(END)!=1:raise SystemExit('HOLD: orchestration seam not singular')
 l=t.index(START);r=t.index(END,l);old=t[l:r];t=t[:l]+a.generated.read_text().rstrip()+'\n\n'+t[r:]
 for x in ['__attribute__((noreturn)) static void jm_generated_ignitionbody','/* GENERATED OPERATIONAL OFFICE. EDIT source/ignitionbody.jmroute']:
  if x in t:raise SystemExit('HOLD: old ignition residue')
 if t.count(MARK)!=1:raise SystemExit('HOLD: marker mismatch')
 a.kernel.write_text(t);a.receipt.parent.mkdir(parents=True,exist_ok=True);a.receipt.write_text(json.dumps({'version':'v1.9A','removed_sha256':H(old),'integrated_kernel_sha256':H(t),'generated_marker_count':t.count(MARK),'old_ignition_residue':0},indent=2,sort_keys=True)+'\n')
if __name__=='__main__':main()
