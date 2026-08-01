#!/usr/bin/env python3
from pathlib import Path
import hashlib
import json

ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist'
receipt=json.loads((DIST/'BUILD_RECEIPT_v0_2.json').read_text(encoding='utf-8'))
assert receipt['schema']=='jm.wave2-dist/0.2'
assert len(receipt['files'])==5

for name,metadata in receipt['files'].items():
    path=DIST/name
    data=path.read_bytes()
    text=data.decode('utf-8')
    assert path.exists()
    assert len(data)==metadata['bytes']
    assert hashlib.sha256(data).hexdigest()==metadata['sha256']
    assert 'runWave2Proof' in text
    assert 'final native binaries and crown remain open' in text
    assert 'https://' not in text and 'http://' not in text
    assert 'JM GameCore' in text or 'GameCore' in text

print(json.dumps({'status':'PASS','files':receipt['files']},indent=2))
