#!/usr/bin/env python3
import subprocess,sys
from pathlib import Path
trace,kernel,elf,receipt=map(Path,sys.argv[1:5]);t=trace.read_text(errors='replace');c=kernel.read_text();m='[JM] KERNELCONTRACTROUTE GENERATED v1.8A SOURCE 853d8ecbdacb06fd080a7d0c74ca63942324b44d826755e57ab61e3c4293c1ad ACTIVE';assert t.count(m)==1;assert t.count('[JM] ENTRYROUTE GENERATED v1.7A')==1;assert t.count('INVALID OPCODE CAUGHT')==1;f=t.index('INVALID OPCODE CAUGHT');assert t.find('[JM] USER BODY 1 -> SYSTEM CALL TRACE_READ',f)>f
names={x.split()[-1] for x in subprocess.check_output(['nm','-n',str(elf)],text=True).splitlines() if x.split()}
for s in ['jm_generated_contractroute_announce']:assert s in names,s
assert c.count('/* GENERATED KERNELCONTRACTROUTE v1.8A SOURCE ')==1
print('JM_GENERATED_KERNELCONTRACTROUTE DING: PASS')
