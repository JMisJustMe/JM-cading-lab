#!/usr/bin/env python3
import base64,gzip,hashlib,json,pathlib,shutil
ROOT=pathlib.Path(__file__).resolve().parent
OUT=ROOT/'build_out'
if OUT.exists(): shutil.rmtree(OUT)
OUT.mkdir()

def stable(v):
    if isinstance(v,list): return [stable(x) for x in v]
    if isinstance(v,dict): return {k:stable(v[k]) for k in sorted(v)}
    return v

def fnv1a(text):
    h=0x811c9dc5
    for b in text.encode('utf-8'): h=((h^b)*0x01000193)&0xffffffff
    return f'{h:08x}'

def canonical(pkg):
    return json.dumps(stable({'recordType':pkg['recordType'],'standard':pkg['standard'],'manifest':pkg['manifest'],'runtime':pkg['runtime']}),separators=(',',':'),ensure_ascii=False)

def source_bytes(pkg):
    filename=pkg['runtime']['source']['filename']
    if filename.endswith('TBOYS_CORE_CLASH_DIRECT_COMMAND_v0_3_JM_NATIVE.html'):
        data=gzip.decompress((ROOT/'source_bodies'/f'{filename}.gz').read_bytes())
        expected=(ROOT/'source_bodies'/f'{filename}.sha256').read_text().split()[0]
        actual=hashlib.sha256(data).hexdigest()
        if actual!=expected: raise SystemExit(f'HOLD compressed source SHA mismatch {actual}')
        (OUT/filename).write_bytes(data)
        return data
    data=(ROOT/'source_bodies'/filename).read_bytes()
    (OUT/filename).write_bytes(data)
    return data

specs=json.loads((ROOT/'package_specs.json').read_text())
pkgs=[]
for spec in specs:
    pkg=spec['package']; data=source_bytes(pkg)
    pkg['runtime']['source']['bodyBase64']=base64.b64encode(data).decode()
    pkg['runtime']['source']['sha256']=hashlib.sha256(data).hexdigest()
    pkg['runtime']['source']['bytes']=len(data)
    pkg['integrity']={'algorithm':'FNV1A32','value':fnv1a(canonical(pkg))}
    (OUT/spec['output']).write_text(json.dumps(pkg,ensure_ascii=False,indent=2)+'\n')
    pkgs.append(pkg)
shell=(ROOT/'templates/OPEN_FIRST.shell.html').read_text()
sdk=(ROOT/'donors/04_JM_CARTRIDGE_SDK_v1_0.js').read_text()
adapter=(ROOT/'03_JM_SOVEREIGN_HTML_CARTRIDGE_ADAPTER_v0_1.js').read_text()
open_first=shell.replace('__DONOR_SDK__',sdk).replace('__ADAPTER_RUNTIME__',adapter).replace('__BUNDLED_PACKAGES__',json.dumps(pkgs,ensure_ascii=False,separators=(',',':')))
(OUT/'00_OPEN_FIRST_JM_SOVEREIGN_HTML_CARTRIDGE_ADAPTER_v0_1.html').write_text(open_first)
receipt={
 'status':'BUILD PASS',
 'adapterStandard':'JM-SOVEREIGN-HTML-CARTRIDGE/0.1',
 'openFirstSha256':hashlib.sha256(open_first.encode()).hexdigest(),
 'packages':[{'id':p['manifest']['id'],'sourceSha256':p['runtime']['source']['sha256'],'sourceBytes':p['runtime']['source']['bytes'],'integrity':p['integrity']['value']} for p in pkgs]
}
(OUT/'BUILD_RECEIPT.json').write_text(json.dumps(receipt,indent=2)+'\n')
assert receipt['packages'][0]['sourceSha256']=='b4e75e41f5f65ade5a438f49987e7cf61ee5c658fdbc7a69c7e75b3365b4d95b'
print('EXACT_COMPRESSED_SOURCE_RECOVERY PASS')
print('JM_CARTRIDGE_PACKAGE_BUILD PASS')
print('OPEN_FIRST_ADAPTER_BUILD PASS')
