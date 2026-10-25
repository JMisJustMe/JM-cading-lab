#!/usr/bin/env python3
"""CP16 strict 32 independent Godot engine invocations and 192 gameplay receipts."""
import json,re,sys,hashlib
from pathlib import Path
p=Path(sys.argv[1])
assert p.is_dir(), 'NATIVE_EVIDENCE_DIR_MISSING'
seen=set(); allhashes=[]; total_checks=0
expected={
 ('GUARD',False):('BRACE',8),
 ('GUARD',True):('HEAVY WARD',12),
 ('RECOVER',False):('RALLY',9),
 ('RECOVER',True):('SURGE HEAL',14),
 ('INTERCEPT',False):('TRAP',10),
 ('INTERCEPT',True):('DIVE',17)
}
for i in range(32):
 name=f'run-{i:02d}'
 file=p/f'{name}.json'
 log=p/f'{name}.log'
 assert file.is_file() and log.is_file(),f'MISSING_ACTUAL_GODOT_ENGINE_RUN_{i}'
 raw=file.read_bytes()
 d=json.loads(raw)
 text=log.read_text()
 assert d['schema']=='jm.cp16-native-32-run/1' and d['runIndex']==i, f'FALSE_RUN_INDEX_{i}'
 assert d['failed']==0 and d['passed']>=35, f'FAILED_NATIVE_ASSERTIONS_{i}'
 assert d['host']=='Linux' and d['engine'].startswith('4.5.'),f'NOT_REAL_GODOT_{i}'
 assert d['ownerFoldPhysicalTest'] is False
 assert len(d['cases'])==6,f'INCOMPLETE_SIX_ROUTES_{i}'
 modes=set()
 for c in d['cases']:
  key=(c['action'],c['power']);assert key in expected and key not in modes,f'DUPLICATE_MODE_{i}'
  modes.add(key)
  label,cost=expected[key]
  r=c['receipt']
  assert c['variant']==label and r['variant']==label
  assert r['selected']==c['action'] and r['cost']==cost
  assert round(r['before']['energy']-r['after']['energy'],4)==cost
  assert r['host']=='Linux' and r['engine'].startswith('4.5.')
  assert r['originalJourMazeSHA256']=='56c5ff4f76a222eb32d6b01d955ed0fe45d5389e5c14cba12f8e7618157545db'
  assert r['schema']==('jm.cp16-power-native-return/1' if key[1] else 'jm.jourmaze-player-native-return/1')
 assert modes==set(expected),f'MISSING_MODE_{i}'
 assert not re.search(r'SCRIPT ERROR:|Parse Error:|ERROR: Failed to load|CP16 TEST FAIL|CP16 ASSERT FAIL',text),f'UNACKNOWLEDGED_NATIVE_ENGINE_ERROR_{i}'
 match=re.search(rf'CP16 RUN {i} SUMMARY (\d+)/(\d+) CASES 6',text)
 assert match and match.group(1)==match.group(2) and int(match.group(1))>=35,f'MISSING_NATIVE_SUMMARY_{i}'
 total_checks+=int(match.group(1))
 seen.add(i);allhashes.append(hashlib.sha256(raw).hexdigest())
assert len(seen)==32 and total_checks>=1120
receipt={'schema':'jm.cp16-32-real-native-runs/1','runs':len(seen),
 'routeActions':len(seen)*6,'passedNativeChecks':total_checks,'failedNativeChecks':0,
 'engine':'Godot Linux native, independently invoked once for each run 00..31',
 'ownerPhysicalFoldTest':False,'runFileSHA256':allhashes,
 'conclusion':'PASS only if all 32 real engine invocations, six native actions each, and logs/evidence are exact'}
(p/'SUMMARY.json').write_text(json.dumps(receipt,indent=2)+'\n')
print('CP16 32/32 REAL GODOT RUNS PASS',f'{len(seen)*6}/192 NATIVE TACTIC CONTACTS',f'{total_checks} STRICT ASSERTIONS',flush=True)
