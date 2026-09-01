#!/usr/bin/env python3
import argparse,hashlib,json
from pathlib import Path
HEAD='/* GENERATED ENTRYROUTE v1.7A HEAD SOURCE '
TAIL='/* GENERATED ENTRYROUTE v1.7A TAIL SOURCE '
INSERT='/* GENERATED OPERATIONAL OFFICE. EDIT source/ignitionbody.jmroute, NOT THIS FILE. */'
WRAP='__attribute__((noreturn)) void routeos_kernel_entry(uint32_t magic, uint32_t mb_info) {'
def H(x):return hashlib.sha256(x.encode()).hexdigest()
def main():
 p=argparse.ArgumentParser();p.add_argument('--kernel',type=Path,required=True);p.add_argument('--head',type=Path,required=True);p.add_argument('--tail',type=Path,required=True);p.add_argument('--receipt',type=Path,required=True);a=p.parse_args();t=a.kernel.read_text()
 if HEAD in t or TAIL in t:raise SystemExit('HOLD: EntryRoute already integrated')
 if t.count(INSERT)!=1 or t.count(WRAP)!=1:raise SystemExit('HOLD: EntryRoute seam not singular')
 t=t.replace(INSERT,a.head.read_text().rstrip()+'\n\n'+INSERT,1)
 call='  jm_generated_primitiveroute_announce();\n'
 if t.count(call)!=1:raise SystemExit('HOLD: EntryRoute activation seam not singular')
 t=t.replace(call,call+'  jm_generated_entryroute_announce();\n',1)
 l=t.index(WRAP);old=t[l:];t=t[:l]+a.tail.read_text().rstrip()+'\n'
 if t.count(HEAD)!=1 or t.count(TAIL)!=1 or WRAP in t:raise SystemExit('HOLD: EntryRoute integration mismatch')
 a.kernel.write_text(t);a.receipt.parent.mkdir(parents=True,exist_ok=True);a.receipt.write_text(json.dumps({'version':'v1.7A','removed_wrapper_sha256':H(old),'integrated_kernel_sha256':H(t),'head_marker_count':t.count(HEAD),'tail_marker_count':t.count(TAIL)},indent=2,sort_keys=True)+'\n')
if __name__=='__main__':main()
