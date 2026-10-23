#!/usr/bin/env python3
"""JM Target Bridge Godot recipient emission v0.2: deterministic registered-source lowerer.
Not an arbitrary HTML-to-Godot translator. Refuses changed source/contract.
"""
from pathlib import Path
import hashlib,json,re,sys
root=Path(__file__).resolve().parent.parent
plan=json.loads((root/'bridge/semantic_plan.json').read_text())
passport=json.loads((root/'bridge/source_passport.json').read_text())
source=root/'ancestry'/plan['source']['file']
assert source.is_file(), 'original source missing'
raw=source.read_bytes()
sha=hashlib.sha256(raw).hexdigest()
assert sha==plan['source']['sha256']==passport['body']['sha256'], 'SOURCE CHANGED — HOLD; no emission'
text=raw.decode('utf-8')
for name,pattern in passport['checked_expressions'].items():
 assert re.search(pattern,text), f'SOURCE RULE CHANGED — HOLD: {name}'
assert plan['source']['id']=='SPINBREAK v0.8 — JM INLINE Sam.E Body'
assert len(plan['semantic_ids'])==len(set(plan['semantic_ids']))==9
op=plan['operations']
assert op['kic']['spin_delta'] == -4.2
assert op['wake'] == {'stability_delta':16.0,'spin_delta':7.0,'integrity_delta':-3.5,'one_use':True,'clamp':[0,100]}
assert len(plan['hold'])>=4
replacements={
 '__SOURCE_SHA__':sha,
 '__KIC_DELTA__':str(-op['kic']['spin_delta']),
 '__WAKE_STABILITY__':str(op['wake']['stability_delta']),
 '__WAKE_SPIN__':str(op['wake']['spin_delta']),
 '__WAKE_INTEGRITY_COST__':str(-op['wake']['integrity_delta']),
}
body=(root/'bridge/Main.gd.template').read_text()
for k,v in replacements.items():
 assert k in body,k
 body=body.replace(k,v)
for semantic in plan['semantic_ids']:
 assert semantic in body,semantic
assert not re.search(r'__(?:SOURCE_SHA|KIC_DELTA|WAKE_STABILITY|WAKE_SPIN|WAKE_INTEGRITY_COST)__',body)
host=(root/'godot') if (root/'godot/project.godot').is_file() else root
assert (host/'project.godot').is_file() and (host/'Main.tscn').is_file()
dest=host/'Main.gd'
dest.write_text(body)
print('GODOT EMISSION PASS:',dest,sha,'SEMANTICS:',len(plan['semantic_ids']))
print('REAL-HOST DING: HOLD (requires device input and receipt)')
