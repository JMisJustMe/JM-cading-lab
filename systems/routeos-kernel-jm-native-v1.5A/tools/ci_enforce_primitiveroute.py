#!/usr/bin/env python3
import json, subprocess, sys
from pathlib import Path
trace,kernel,elf,receipt=map(Path,sys.argv[1:5]); text=trace.read_text(errors='replace'); code=kernel.read_text(); rec=json.loads(receipt.read_text())
source='62476361bed4398041d8005dd242d0344809a893a6ca5e85618f3495ca77ccbb'; marker=f'[JM] PRIMITIVEROUTE GENERATED v1.5A SOURCE {source} ACTIVE'
assert text.count(marker)==1, text.count(marker)
assert text.count('[JM] BODYFRAMEINSTALL GENERATED v1.4A')==1
assert text.count('INVALID OPCODE CAUGHT')==1
assert text.count('RECOVERYBODY: FAULTING BODY BLOCKED; SAFE BODY CONTINUES')==1
fault=text.index('INVALID OPCODE CAUGHT'); assert text.find('[JM] USER BODY 1 -> SYSTEM CALL TRACE_READ',fault)>fault
assert all(x==0 for x in rec['handwritten_residue'].values())
for r in ['static inline void outb','static inline uint8_t inb','static void *jm_memcpy','static void *jm_memset']: assert r not in code
nm=subprocess.check_output(['nm','-n',str(elf)],text=True).splitlines(); names={line.split()[-1] for line in nm if line.split()}
for s in ['jm_generated_portout', 'jm_generated_portin', 'jm_generated_iowait', 'jm_generated_memorycopy', 'jm_generated_memoryset', 'jm_generated_primitiveroute_announce']: assert s in names,s
strings=subprocess.check_output(['strings',str(elf)],text=True); assert source in strings and marker in strings
print('JM_GENERATED_PRIMITIVEROUTE DING: PASS')
