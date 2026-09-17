#!/usr/bin/env python3
from pathlib import Path
import hashlib
import json

ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist'
registry=json.loads((DIST/'ENGINE_REGISTRY.json').read_text(encoding='utf-8'))
assert registry['schema']=='jm.game-engine-army-bundle/0.1'
assert registry['status']=='NINE_CURRENT_SCOPE_FIRST_FLOORS'
assert registry['count']==9
assert len(registry['engines'])==9
assert len({engine['name'] for engine in registry['engines']})==9
assert len({engine['sha256'] for engine in registry['engines']})==9

for engine in registry['engines']:
    path=DIST/engine['file']
    assert path.exists(), engine['name']
    data=path.read_bytes()
    assert len(data)==engine['bytes']
    assert hashlib.sha256(data).hexdigest()==engine['sha256']

launcher=(DIST/'OPEN_FIRST_JM_GAME_ENGINE_ARMY_WAVES_1_2.html').read_text(encoding='utf-8')
assert launcher.count('class="card"')==9
assert 'Shared organs ≠ identical bodies' in launcher
assert 'phone + laptop' in launcher
assert '<iframe' in launcher
assert 'Open separately' in launcher
assert 'https://' not in launcher and 'http://' not in launcher

print(json.dumps({'status':'PASS','engineCount':9,'launcherHash':hashlib.sha256(launcher.encode()).hexdigest()},indent=2))
