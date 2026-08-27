#!/usr/bin/env python3
from pathlib import Path
import base64,gzip,hashlib,json,subprocess,sys,tempfile
ROOT=Path(__file__).resolve().parents[1]
M=json.loads((ROOT/'PUBLICATION_MANIFEST.json').read_text(encoding='utf-8'))

def die(msg):
    raise SystemExit('FAIL: '+msg)

def git_blob(path):
    return subprocess.check_output(['git','hash-object',str(path)],text=True).strip()
parts=M['transport']['parts']
if [p['order'] for p in parts] != list(range(1,len(parts)+1)): die('carrier order')
if len(parts)!=3: die('carrier count')
chunks=[]
for p in parts:
    f=ROOT/p['path']
    if not f.is_file(): die('missing '+p['path'])
    b=f.read_bytes()
    if len(b)!=p['bytes']: die('size '+p['path'])
    if git_blob(f)!=p['git_blob_sha']: die('git blob '+p['path'])
    chunks.append(b)
enc=b''.join(chunks)
if len(enc)!=M['transport']['encoded_bytes']: die('encoded size')
try: raw=gzip.decompress(base64.b64decode(enc,validate=True))
except Exception as e: die('decode '+repr(e))
a=M['authority']
if len(raw)!=a['bytes']: die('source bytes')
if hashlib.sha256(raw).hexdigest()!=a['sha256']: die('source sha256')
text=raw.decode('utf-8')
need=[
 'PRESSUREPOINT: BREAKLINE v0.3',
 'PRESSURE HOUSES / CONSEQUENCE FIELDS',
 "house:'PIVOT HOUSE'",
 "house:'WARD HOUSE'",
 "house:'RIFT HOUSE'",
 "name:'SPLIT RING'",
 "name:'ROOT BOX'",
 "name:'FLASH YARD'",
 'damageMul', 'pressureMul', 'pushMul', 'friction'
]
for s in need:
    if s not in text: die('current-head marker '+s)
rp=ROOT/M['android_carrier_receipt']['path']
r=json.loads(rp.read_text(encoding='utf-8'))
expected_status={'SOFTWARE_CARRIER_PASS','SOURCE_EXACT','ZIP_PASS','ZIP_ALIGNMENT_PASS','DEX_INTEGRITY_PASS','V1_SIGNATURE_PASS','V2_SIGNATURE_PASS','PHYSICAL_OWNER_DEVICE_DING_OPEN'}
if not expected_status.issubset(set(r.get('status',[]))): die('android status')
for k,v in [('body',M['body']),('source_file',a['path']),('source_bytes',a['bytes']),('source_sha256',a['sha256'])]:
    if r.get(k)!=v: die('android receipt '+k)
ac=M['android_carrier_receipt']
# accept common key spellings but require exact values
checks=[
 ('apk_bytes',ac['apk_bytes']),('apk_sha256',ac['apk_sha256']),('emitted_package',ac['package']),('signer_certificate_sha256',ac['signer_certificate_sha256'])
]
for k,v in checks:
    if r.get(k)!=v: die('android receipt '+k)
# claim-boundary guard
joined='\n'.join(M['claim_boundary'])+'\n'+(ROOT/'PUBLICATION_RECEIPT.md').read_text(encoding='utf-8')
for phrase in ['Physical owner-device Ding remains OPEN','does **not** manufacture']:
    if phrase not in joined: die('claim boundary '+phrase)
with tempfile.NamedTemporaryFile(suffix='.html',delete=False) as tf:
    tf.write(raw); out=Path(tf.name)
print('PASS exact source',a['bytes'],a['sha256'])
print('RECONSTRUCTED',out)
