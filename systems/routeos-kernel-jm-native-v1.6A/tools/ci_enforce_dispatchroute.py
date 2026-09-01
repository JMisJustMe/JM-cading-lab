#!/usr/bin/env python3
import json,subprocess,sys
from pathlib import Path
trace,kernel,elf,receipt=map(Path,sys.argv[1:5]);t=trace.read_text(errors='replace');c=kernel.read_text();r=json.loads(receipt.read_text());m='[JM] DISPATCHROUTE GENERATED v1.6A SOURCE 50a58585fab1ee1bbcd34e76ce99e4878c82a56118531144a5131f6f2c070a80 ACTIVE'
assert t.count(m)==1;assert t.count('[JM] PRIMITIVEROUTE GENERATED v1.5A')==1;assert t.count('INVALID OPCODE CAUGHT')==1;f=t.index('INVALID OPCODE CAUGHT');assert t.find('[JM] USER BODY 1 -> SYSTEM CALL TRACE_READ',f)>f
assert r['old_dispatch_residue']==0
nm=subprocess.check_output(['nm','-n',str(elf)],text=True).splitlines();names={x.split()[-1] for x in nm if x.split()}
for s in ['jm_generated_dispatchroute', 'routeos_interrupt_dispatch', 'jm_generated_dispatchroute_announce']:assert s in names,s
assert 'if (frame->vector == 32)' not in c
print('JM_GENERATED_DISPATCHROUTE DING: PASS')
