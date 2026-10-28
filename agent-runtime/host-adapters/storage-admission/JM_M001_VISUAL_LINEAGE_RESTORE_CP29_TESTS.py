#!/usr/bin/env python3
"""JM M001 CP29 synthetic adversarial tests: no owner data, no deletion."""
import copy
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import zipfile

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('jm_cp29',(HERE/'JM_M001_VISUAL_LINEAGE_RESTORE_CP29.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
checks={}
def ok(name, expr):
    checks[name]=bool(expr)
    if not expr:raise AssertionError(name)
def refused(name, call):
    try:call()
    except (ValueError,OSError,KeyError,TypeError,zipfile.BadZipFile):ok(name,True)
    else:ok(name,False)
def make_zip(entries):
    b=io.BytesIO()
    with zipfile.ZipFile(b,'w',zipfile.ZIP_DEFLATED) as z:
        for n,v in entries.items():z.writestr(n,v)
    return b.getvalue()
def pin(b):return {'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}

def pack_make(dst,manifest,patch):
    with zipfile.ZipFile(dst,'w',zipfile.ZIP_DEFLATED) as z:
        z.writestr('manifest.json',json.dumps(manifest))
        z.writestr('intake_v1_from_v2.zstpatch',patch)

ok('zstd_available',shutil.which('zstd') is not None)
with tempfile.TemporaryDirectory(prefix='jm-m001-cp29-tests-') as tmp:
    d=Path(tmp)
    editions={r:make_zip({'readme.txt':('JM '+r+' SOURCE '*100).encode()}) for r in m.EXPECTED_EDITION_ROLES if r not in ('CP18','INTAKE_V1','INTAKE_V2')}
    v1=make_zip({'source.txt':b'intake original v1','evidence.md':b'unedited'})
    v2=make_zip({'source.txt':b'intake improved v2','evidence.md':b'unedited','expanded.txt':b'new independent source'})
    nested={f'JM_VISUAL_CREATION_CP18/protected/lineage/{r.lower()}.zip':editions[r] for r in ('CP07','CP08','CP09','CP17')}
    cp18=make_zip({**nested,'runnable/native.html':b'JM original engine and independent lineage'})
    base=d/'cp18.zip';base.write_bytes(cp18)
    base2=d/'v2.zip';base2.write_bytes(v2)
    old=d/'v1.zip';old.write_bytes(v1)
    patchfile=d/'patch.zstpatch'
    p=subprocess.run(['zstd','-q','--patch-from',str(base2),str(old),'-o',str(patchfile)],capture_output=True)
    ok('synth_patch_created',p.returncode==0 and patchfile.is_file())
    patch=patchfile.read_bytes()
    records=[]
    for r in m.EXPECTED_EDITION_ROLES:
        raw=cp18 if r=='CP18' else v2 if r=='INTAKE_V2' else v1 if r=='INTAKE_V1' else editions[r]
        e={'role':r,'name':f'visual_{r.lower()}.zip','native_library_id':'libfile_SYNTHETIC_'+r,
            'purpose':'latest_source_anchor' if r=='CP18' else 'processing_intake_source' if r.startswith('INTAKE') else 'runnable_source_archive',
            'zip_members':len(zipfile.ZipFile(io.BytesIO(raw)).infolist()),**pin(raw)}
        if r in ('CP07','CP08','CP09','CP17'):
            e['cp18_entry']=f'JM_VISUAL_CREATION_CP18/protected/lineage/{r.lower()}.zip'
        records.append(e)
    meta={'schema':m.SCHEMA,'gate':{'retirement_authorised':False},'editions_order':list(m.EXPECTED_EDITION_ROLES),
          'editions':records,'anchors':{'CP18':pin(cp18),'INTAKE_V2':pin(v2)},'patch':pin(patch)}
    pk=d/'pack.zip';pack_make(pk,meta,patch)
    valid,path=m.parse_pack(pk)
    ok('manifest_positive',valid['schema']==m.SCHEMA)
    ok('patch_positive',path==patch)
    target=d/'out'
    good=m.restore(pk,base,base2,target)
    ok('all_seven_exact',good['status']=='SEVEN_EXACT_RESTORES_PASS' and len(list(target.glob('*.zip')))==7)
    ok('native_byte_identity',all((target/e['name']).read_bytes()==(cp18 if e['role']=='CP18' else v2 if e['role']=='INTAKE_V2' else v1 if e['role']=='INTAKE_V1' else editions[e['role']]) for e in records))
    ok('no_native_mutations',good['native_mutations']==0)
    ok('no_quota_claim',good['quota_savings_claimed_bytes']==0)
    refused('reject_existing_destination',lambda:m.restore(pk,base,base2,target))
    badbase=d/'badbase.zip';badbase.write_bytes(cp18+b'extra')
    refused('reject_changed_cp18_anchor',lambda:m.restore(pk,badbase,base2,d/'badout'))
    badv2=d/'badv2.zip';badv2.write_bytes(v2[:-3])
    refused('reject_changed_v2_anchor',lambda:m.restore(pk,base,badv2,d/'badv2out'))
    sl=d/'source_link.zip';sl.symlink_to(base)
    refused('reject_symlink_anchor',lambda:m.restore(pk,sl,base2,d/'slout'))
    sl2=d/'destination-link';sl2.symlink_to(target)
    refused('reject_symlink_output',lambda:m.restore(pk,base,base2,sl2))
    for label,mut in [
      ('reject_retirement_authority',lambda x:x['gate'].update(retirement_authorised=True)),
      ('reject_duplicate_edition_role',lambda x:x['editions'][0].update(role='CP08')),
      ('reject_lost_native_identity',lambda x:x['editions'][0].update(native_library_id='')),
      ('reject_changed_source_sha',lambda x:x['editions'][1].update(sha256='f'*64)),
      ('reject_unsafe_filename',lambda x:x['editions'][0].update(name='../escaped.zip')),
      ('reject_duplicate_filename',lambda x:x['editions'][0].update(name=x['editions'][1]['name'])),
      ('reject_unsafe_nested_entry',lambda x:x['editions'][0].update(cp18_entry='../../esc.zip')),
      ('reject_missing_edition_role',lambda x:x['editions'].pop()),
      ('reject_unknown_purpose',lambda x:x['editions'][0].update(purpose='RETIRED')),
      ('reject_forged_anchor_pin',lambda x:x['anchors']['CP18'].update(sha256='0'*64)),
      ('reject_forged_delta_pin',lambda x:x['patch'].update(sha256='0'*64))]:
      changed=copy.deepcopy(meta);mut(changed)
      pathx=d/(label+'.zip');pack_make(pathx,changed,patch)
      refused(label,lambda pathx=pathx:m.restore(pathx,base,base2,d/(label+'-out')))
    badpack=d/'corruptpatch.zip';pack_make(badpack,meta,patch+b'CORRUPT')
    refused('reject_changed_patch_bytes',lambda:m.restore(badpack,base,base2,d/'patchout'))
    evilpack=d/'evil.zip'
    with zipfile.ZipFile(evilpack,'w') as z:
        z.writestr('manifest.json',json.dumps(meta));z.writestr('intake_v1_from_v2.zstpatch',patch);z.writestr('../escape',b'bad')
    refused('reject_zip_traversal',lambda:m.restore(evilpack,base,base2,d/'escapeout'))

print(json.dumps({'schema':'JM.M001.CP29.Tests/1','pass':all(checks.values()),'checks':len(checks),'cases':checks},indent=2,sort_keys=True))
