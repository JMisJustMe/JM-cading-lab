#!/usr/bin/env python3
"""Fail-closed verification of a Godot host body emitted from the registered JM source."""
from pathlib import Path
import hashlib,json,re,sys,zipfile
root=Path(__file__).resolve().parent.parent
passport=json.loads((root/'bridge/source_passport.json').read_text())
plan=json.loads((root/'bridge/semantic_plan.json').read_text())
source=root/'ancestry'/passport['body']['file']
assert source.is_file(), 'source missing'
body=source.read_bytes(); digest=hashlib.sha256(body).hexdigest()
assert digest==passport['body']['sha256']==plan['source']['sha256'],'source changed; refuse'
for key,pattern in passport['checked_expressions'].items():
 assert re.search(pattern,body.decode()), f'source semantic failed: {key}'
assert len(set(plan['semantic_ids']))==9
assert len(plan['hold'])>=4
assert plan['operations']['kic']['spin_delta'] == -4.2
assert plan['operations']['wake']['integrity_delta'] == -3.5
host=(root/'godot') if (root/'godot/project.godot').is_file() else root
scene=(host/'Main.tscn').read_text(); code=(host/'Main.gd').read_text()
assert 'res://Main.gd' in scene and (host/'project.godot').is_file()
assert digest in code
for x in plan['semantic_ids']: assert x in code,x
assert 'save_receipt()' in code and 'DisplayServer.clipboard_set' in code
assert 'complete = true' in code and 'if not complete:' in code
assert 'mark("contact.you_rival_a", "separated", "colliders intersect")' in code
assert 'SOURCE_SHA' in code and 'BOUNDED PASS' in code
print('STATIC QA PASS: source exact, semantics 9/9 represented, native project, gated return receipt, custody')
print('CLAIM CEILING: static QA only; physical runtime contact OPEN')
