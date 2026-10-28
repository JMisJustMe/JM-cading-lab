#!/usr/bin/env python3
"""JM M001 CP27 synthetic tests: 13 carrier identities, 11 byte-unique APKs."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import zipfile

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('jm_cp27',HERE/'JM_M001_APK_LINEAGE_RESTORE_CP27.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
assert shutil.which('zstd'),'zstd missing from test runner'
checks={}
def check(name,ok):
    checks[name]=bool(ok)
    if not ok:raise AssertionError(name)
def blocked(name,fn):
    try:fn()
    except (ValueError,OSError,KeyError,TypeError,zipfile.BadZipFile):check(name,True)
    else:check(name,False)

def sha(b):return hashlib.sha256(b).hexdigest()

with tempfile.TemporaryDirectory() as td:
    root=Path(td); originals=root/'originals';originals.mkdir()
    anchor_name='JM_SLINGFALL_CP17_SIX_TACTICS_FOLD_TEST.apk'
    main_names=['TEST_CP%02d_FOLD.apk'%i for i in range(10)]
    alias_names=['TEST_CP01_Install_Distribution.apk','TEST_CP02_CancelSafe_Distribution.apk']
    sources={}
    for i,name in enumerate([anchor_name]+main_names):
        file=originals/name
        with zipfile.ZipFile(file,'w',compression=zipfile.ZIP_DEFLATED) as z:
            z.writestr('META-INF/ANDROIDD.SF','synthetic signature marker')
            z.writestr('META-INF/ANDROIDD.RSA','synthetic signature block marker')
            z.writestr('assets/gameplay.txt',('test role %02d:'%i)+('healthy contents'*100))
        sources[name]=file
    for name,orig in zip(alias_names,main_names[:2]):
        file=originals/name;shutil.copyfile(sources[orig],file);sources[name]=file
    rows=[]
    for i,(name,p) in enumerate(sources.items()):
        raw=p.read_bytes()
        r={'filename':name,'carrier_id':'libfile_synthetic_%02d'%i,
           'sha256':sha(raw),'bytes':len(raw),'zip_members':3,
           'retirement_authorised':False,'separate_use':'Distinct synthetic install use '+name}
        if name==anchor_name:r['mode']='anchor'
        elif name in alias_names:
            r['mode']='same_bytes_alias';r['same_bytes_as']=main_names[alias_names.index(name)]
        else:r['mode']='delta'
        rows.append(r)
    patches={};anchor=sources[anchor_name];anchor_sha=sha(anchor.read_bytes())
    for r in rows:
        if r['mode']!='delta':continue
        target=sources[r['filename']];patch=root/(r['filename']+'.zstpatch')
        proc=subprocess.run(['zstd','-q','--patch-from',str(anchor),str(target),'-o',str(patch)],capture_output=True)
        check('patch_created_'+r['filename'],proc.returncode==0)
        data=patch.read_bytes();r['base_sha256']=anchor_sha
        r['delta']={'member':'PATCHES/'+r['filename']+'.zstpatch',
                    'sha256':sha(data),'bytes':len(data)}
        patches[r['delta']['member']]=data
    def makepack(data,location):
        with zipfile.ZipFile(location,'w',compression=zipfile.ZIP_STORED) as z:
            z.writestr('MANIFEST_CP27.json',json.dumps(data,sort_keys=True))
            z.writestr('README_CP27.md','Synthetic private pack; not an actual APK signer')
            z.write(HERE/'JM_M001_EXACT_DELTA_RESTORE_CP25.py',m.CP25_SOURCE)
            z.write(HERE/'JM_M001_APK_LINEAGE_RESTORE_CP27.py','JM_M001_APK_LINEAGE_RESTORE_CP27.py')
            for n,b in patches.items():z.writestr(n,b)
        return location
    manifest={'schema':m.SCHEMA,'retirement_authorised':False,
              'quota_savings_claimed_bytes':0,'carriers':rows}
    pack=makepack(manifest,root/'synthetic_pack.zip')
    result=m.restore_all(pack,anchor,root/'restored')
    check('13_carrier_identities',result['carriers']==13)
    check('11_distinct_hashes',result['distinct_byte_identities']==11)
    check('10_separate_patches',result['delta_count']==10)
    check('2_role_preserving_aliases',result['same_byte_role_aliases']==2)
    check('no_retirement',result['retirement_authorised'] is False)
    check('zero_library_mutations',result['native_library_mutations']==0)
    check('zero_quota_credit',result['quota_savings_claimed_bytes']==0)
    check('13_separate_files_exist',len(list((root/'restored').glob('*.apk')))==13)
    check('13_exact_original_bytes',all((root/'restored'/name).read_bytes()==file.read_bytes() for name,file in sources.items()))
    check('13_unique_filenames',len({x['filename'] for x in result['files']})==13)
    blocked('refuse_existing_output',lambda:m.restore_all(pack,anchor,root/'restored'))
    wrong=root/'bad_anchor.apk';wrong.write_bytes(anchor.read_bytes()+b'bad')
    blocked('refuse_changed_anchor',lambda:m.restore_all(pack,wrong,root/'bad_anchor_out'))
    changed=copy.deepcopy(manifest);changed['retirement_authorised']=True
    blocked('refuse_forged_retirement',lambda:m.restore_all(makepack(changed,root/'forged.zip'),anchor,root/'forged_out'))
    changed=copy.deepcopy(manifest);changed['carriers'][0]['separate_use']=''
    blocked('refuse_lost_purpose',lambda:m.restore_all(makepack(changed,root/'purpose.zip'),anchor,root/'purpose_out'))
    changed=copy.deepcopy(manifest);changed['carriers'][0]['carrier_id']=changed['carriers'][1]['carrier_id']
    blocked('refuse_identity_collapse',lambda:m.restore_all(makepack(changed,root/'ids.zip'),anchor,root/'ids_out'))
    changed=copy.deepcopy(manifest);changed['carriers'][0]['filename']='../unsafe.apk'
    blocked('refuse_unsafe_filename',lambda:m.restore_all(makepack(changed,root/'path.zip'),anchor,root/'path_out'))
    changed=copy.deepcopy(manifest);changed['carriers'][-1]['same_bytes_as']='nonexistent.apk'
    blocked('refuse_unproven_alias',lambda:m.restore_all(makepack(changed,root/'alias.zip'),anchor,root/'alias_out'))
    changed=copy.deepcopy(manifest);changed['carriers'][1]['base_sha256']='0'*64
    blocked('refuse_wrong_base_pin',lambda:m.restore_all(makepack(changed,root/'badbase.zip'),anchor,root/'badbase_out'))
    changed=copy.deepcopy(manifest);changed['carriers'][1]['delta']['sha256']='0'*64
    blocked('refuse_changed_delta',lambda:m.restore_all(makepack(changed,root/'badpatch.zip'),anchor,root/'badpatch_out'))
    changed=copy.deepcopy(manifest);changed['carriers'][2]['sha256']='0'*64
    blocked('refuse_wrong_target',lambda:m.restore_all(makepack(changed,root/'badtarget.zip'),anchor,root/'badtarget_out'))
    corrupt=root/'corrupt.zip';corrupt.write_bytes(pack.read_bytes()[:-20])
    blocked('refuse_corrupt_pack',lambda:m.restore_all(corrupt,anchor,root/'corrupt_out'))
    sym=root/'symlink.zip';sym.symlink_to(pack)
    blocked('refuse_symlink_pack',lambda:m.restore_all(sym,anchor,root/'sym_out'))
    check('source_unchanged',anchor.read_bytes()==sources[anchor_name].read_bytes())
print(json.dumps({'schema':'JM.M001.CP27.Tests/1','checks':len(checks),
                  'pass':all(checks.values()),'case_labels':sorted(checks)},indent=2,sort_keys=True))
if not all(checks.values()):raise SystemExit(2)
