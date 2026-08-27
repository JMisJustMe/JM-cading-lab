#!/usr/bin/env python3
from pathlib import Path
import base64,gzip,hashlib,json,sys
ROOT=Path(__file__).resolve().parent
m=json.loads((ROOT/'AUTHORITY_MANIFEST.json').read_text(encoding='utf-8'))
for key,a in m['authorities'].items():
    chunks=[]
    for row in a['parts']:
        p=ROOT/row['path']
        b=p.read_bytes()
        if len(b)!=row['bytes']: raise SystemExit(f'{key}: size mismatch {p}')
        git=hashlib.sha1(f"blob {len(b)}\0".encode()+b).hexdigest()
        if git!=row['git_blob_sha1']: raise SystemExit(f'{key}: git blob mismatch {p}')
        chunks.append(b)
    gz=base64.b64decode(b''.join(chunks),validate=True)
    if len(gz)!=a['gzip_bytes'] or hashlib.sha256(gz).hexdigest()!=a['gzip_sha256']:
        raise SystemExit(f'{key}: gzip authority mismatch')
    raw=gzip.decompress(gz)
    if len(raw)!=a['raw_bytes'] or hashlib.sha256(raw).hexdigest()!=a['raw_sha256']:
        raise SystemExit(f'{key}: raw authority mismatch')
    if key=='routeos_runtime':
        t=raw.decode('utf-8')
        required=['RouteOS Participation Runtime v0.1','Blow only after Armed','VALID_REFUSAL','Armed state remained after Press release.','Full simulator route passed in this run','This package simulates hardware. No real TraceBox connection is claimed.']
        for needle in required:
            if needle not in t: raise SystemExit(f'routeos_runtime: missing contract: {needle}')
    if key=='ftr_memory':
        t=raw.decode('utf-8')
        required=['FTR Memory Fusion v1.0','Current operational case: RouteOS mini model','Physical TraceBox | Not yet connected','Whole FTR completion | Not claimed','Visual Engine']
        for needle in required:
            if needle not in t: raise SystemExit(f'ftr_memory: missing boundary: {needle}')
print('FTR WAVE2 PROOF PASS')
