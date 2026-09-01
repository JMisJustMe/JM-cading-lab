#!/usr/bin/env python3
import subprocess,sys
from pathlib import Path
trace,kernel,elf,receipt=map(Path,sys.argv[1:5]);t=trace.read_text(errors='replace');c=kernel.read_text();m='[JM] ENTRYROUTE GENERATED v1.7A SOURCE b21d58124ea69cb9e57394163a1b83294a6dac1c31f452e9098fb7e144e70647 ACTIVE';assert t.count(m)==1;assert t.count('[JM] DISPATCHROUTE GENERATED v1.6A')==1;assert t.count('INVALID OPCODE CAUGHT')==1;f=t.index('INVALID OPCODE CAUGHT');assert t.find('[JM] USER BODY 1 -> SYSTEM CALL TRACE_READ',f)>f
names={x.split()[-1] for x in subprocess.check_output(['nm','-n',str(elf)],text=True).splitlines() if x.split()}
for s in ['jm_generated_entryroute_announce', 'routeos_kernel_entry']:assert s in names,s
assert '__attribute__((noreturn)) void routeos_kernel_entry' not in c
print('JM_GENERATED_ENTRYROUTE DING: PASS')
