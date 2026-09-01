#!/usr/bin/env python3
import json, subprocess, sys
from pathlib import Path
trace,kernel,elf,receipt=map(Path,sys.argv[1:5])
s=trace.read_text(errors='replace'); c=kernel.read_text(); r=json.loads(receipt.read_text())
source='7a8f084140170c348bce0fac29e912ad9c7ea1b4a1772b1751d2ca9fbbf45190'
marker=f'[JM] SERIALROUTE GENERATED v1.3A SOURCE {source} ACTIVE'
assert s.count(marker)==1, s.count(marker)
assert '[JM] FAULTHOLD: USER BODY 2 INVALID OPCODE CAUGHT' in s
assert '[JM] RECOVERYBODY: FAULTING BODY BLOCKED; SAFE BODY CONTINUES' in s
fault=s.index('INVALID OPCODE CAUGHT'); assert s.find('[JM] USER BODY 1 -> SYSTEM CALL TRACE_READ',fault)>fault
assert c.count('GENERATED SERIALROUTE v1.3A')==1 and 'static void serial_init(void)' not in c
assert r['generated_serialroute_count']==1 and r['handwritten_serialroute_residue']==0
nm=subprocess.check_output(['nm','-n',str(elf)],text=True)
for sym in ['jm_generated_serialroute_init','jm_generated_serialroute_char','jm_generated_serialroute_write','jm_generated_serialroute_u64','jm_generated_serialroute_receipt','jm_generated_serialroute_source']: assert sym in nm, sym
strings=subprocess.check_output(['strings',str(elf)],text=True); assert source in strings and marker in strings
print('JM_GENERATED_SERIALROUTE DING: PASS')
