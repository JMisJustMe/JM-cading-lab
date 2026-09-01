#!/usr/bin/env python3
import subprocess,sys
from pathlib import Path
trace,kernel,elf,receipt=map(Path,sys.argv[1:5]);t=trace.read_text(errors='replace');c=kernel.read_text();m='[JM] ORCHESTRATIONROUTE GENERATED v1.9A SOURCE 46aa34e7ac97ebdc6d128c727c0901b890129a988fc549de005ad7c69b689507 ACTIVE';assert t.count(m)==1
for inherited in ['KERNELCONTRACTROUTE GENERATED v1.8A','ENTRYROUTE GENERATED v1.7A','DISPATCHROUTE GENERATED v1.6A','PRIMITIVEROUTE GENERATED v1.5A']:assert t.count(inherited)==1,inherited
assert t.count('INVALID OPCODE CAUGHT')==1 and t.count('RECOVERYBODY: FAULTING BODY BLOCKED; SAFE BODY CONTINUES')==1;f=t.index('INVALID OPCODE CAUGHT');assert t.find('[JM] USER BODY 1 -> SYSTEM CALL TRACE_READ',f)>f
names={x.split()[-1] for x in subprocess.check_output(['nm','-n',str(elf)],text=True).splitlines() if x.split()}
for s in ['jm_generated_ignitionbody']:assert s in names,s
assert '/* GENERATED OPERATIONAL OFFICE. EDIT source/ignitionbody.jmroute' not in c
print('JM_GENERATED_ORCHESTRATIONROUTE DING: PASS')
