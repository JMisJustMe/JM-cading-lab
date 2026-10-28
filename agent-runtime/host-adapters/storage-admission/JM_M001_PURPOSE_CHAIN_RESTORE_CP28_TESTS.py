#!/usr/bin/env python3
"""CP28 synthetic/adversarial TIWIN four-edition test. No owner source assets."""
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
spec=importlib.util.spec_from_file_location('jm_m001_cp28',HERE/'JM_M001_PURPOSE_CHAIN_RESTORE_CP28.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
assert shutil.which('zstd'), 'zstd CLI required for genuine reconstruction'
checks={}
def test(label,ok):
    checks[label]=bool(ok)
    if not ok:raise AssertionError(label)
def hold(label,fn):
    try:fn()
    except (ValueError,OSError,KeyError,TypeError,zipfile.BadZipFile):test(label,True)
    else:test(label,False)

def digest(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def make_zip(path,n):
    with zipfile.ZipFile(path,'w',zipfile.ZIP_DEFLATED) as z:
        z.writestr('tiwin-app/server.py','import json\n'+'pass # edition\n'*4000+f'{n}')
        z.writestr('tiwin-app/views.html','<html><p>FIND SIGNAL</p></html>'+str(n))
        z.writestr('tiwin-app/version.json',json.dumps({'edition':n}))

def make_pack(path,rows,patches,extras=None):
    with zipfile.ZipFile(path,'w',zipfile.ZIP_DEFLATED) as z:
        z.writestr('MANIFEST_CP28.json',json.dumps({'schema':m.SCHEMA,'carriers':rows,
            'retirement_authorised':False,'quota_savings_claimed_bytes':0}))
        z.writestr('README_CP28.md','synthetic exercise')
        z.write(HERE/m.SOURCE,m.SOURCE)
        z.write(HERE/'JM_M001_PURPOSE_CHAIN_RESTORE_CP28.py','JM_M001_PURPOSE_CHAIN_RESTORE_CP28.py')
        for edition,p in patches.items():z.write(p,f'PATCHES/{edition}.zstpatch')
        for name in (extras or []):z.writestr(name,'unexpected')

with tempfile.TemporaryDirectory() as temp:
    d=Path(temp)
    anchors={}
    for e in m.EDITIONS:
        p=d/(e+'.zip');make_zip(p,e);anchors[e]=p
    cp08=anchors['CP08']
    rows=[];patches={}
    for e in m.EDITIONS:
        p=anchors[e]
        row={'edition':e,'filename':('TIWIN_CP08_ENGINEERING_COMPLETION_FULL_SOURCE.zip' if e=='CP08' else f'TIWIN_{e}_SYNTHETIC_FULL_SOURCE.zip'),
             'carrier_id':'libfile_test_unique_edition_'+e,
             'separate_use':'Independent original testing '+e+' direct source version',
             'bytes':p.stat().st_size,'sha256':digest(p),'zip_members':3,
             'retirement_authorised':False,'mode':'anchor' if e=='CP08' else 'delta'}
        if e!='CP08':
            patch=d/(e+'.zstpatch')
            pr=subprocess.run(['zstd','-q','--patch-from',str(cp08),str(p),'-o',str(patch)],capture_output=True)
            test('patch_generated_'+e,pr.returncode==0 and patch.is_file())
            patches[e]=patch
            row.update({'base_sha256':digest(cp08),'delta':{
                'member':f'PATCHES/{e}.zstpatch','bytes':patch.stat().st_size,'sha256':digest(patch)}})
        rows.append(row)
    private=d/'pack.zip';make_pack(private,rows,patches)
    dest=d/'reconstructed'
    result=m.restore_all(private,cp08,dest)
    test('all_four_source_editions',result['versions']==4 and len(result['files'])==4)
    test('all_separate_filename_outputs',len(list(dest.iterdir()))==4)
    test('distinct_native_id_routes',len(set(r['carrier_id'] for r in result['files']))==4)
    for e in m.EDITIONS:
        target=next(r for r in rows if r['edition']==e)
        file=dest/target['filename']
        test('source_exact_'+e,digest(file)==digest(anchors[e]) and file.read_bytes()==anchors[e].read_bytes())
        test('crc_exact_'+e,zipfile.ZipFile(file).testzip() is None)
    test('no_native_mutations',result['native_library_mutations']==0)
    test('no_quota_credit',result['quota_savings_claimed_bytes']==0)
    test('no_retirement_permission',result['retirement_authorised'] is False)
    hold('existing_output_directory_refused',lambda:m.restore_all(private,cp08,dest))
    missing=d/'nonexistent.zip'
    hold('missing_anchor_refused',lambda:m.restore_all(private,missing,d/'missingout'))
    corrupt=d/'corrupt-anchor.zip';corrupt.write_bytes(cp08.read_bytes()+b'EVIL')
    hold('anchor_full_sha_tamper_rejected',lambda:m.restore_all(private,corrupt,d/'tamperout'))
    link=d/'linked.zip';link.symlink_to(cp08)
    hold('symlink_source_refused',lambda:m.restore_all(private,link,d/'symlinkout'))
    linkpack=d/'linkedpack.zip';linkpack.symlink_to(private)
    hold('symlink_private_pack_refused',lambda:m.restore_all(linkpack,cp08,d/'linkpackout'))
    def bad_pack(case,modify):
        new=d/('bad_'+case+'.zip')
        data=copy.deepcopy(rows)
        modify(data)
        make_pack(new,data,patches)
        hold(case,lambda:m.restore_all(new,cp08,d/('out_'+case)))
        test('no_partial_output_'+case,not (d/('out_'+case)).exists())
    bad_pack('forged_retirement',lambda a:a[0].__setitem__('retirement_authorised',True))
    bad_pack('duplicate_native_id',lambda a:a[1].__setitem__('carrier_id',a[0]['carrier_id']))
    bad_pack('wrong_delta_base',lambda a:a[0].__setitem__('base_sha256','0'*64))
    bad_pack('unsafe_filename',lambda a:a[1].__setitem__('filename','TIWIN_../evil.zip'))
    bad_pack('bad_patch_digest',lambda a:a[2]['delta'].__setitem__('sha256','0'*64))
    bad_pack('wrong_anchor_identity',lambda a:a[3].__setitem__('filename','TIWIN_CP08_OTHER.zip'))
    bad_pack('missing_distinct_use',lambda a:a[0].__setitem__('separate_use',''))
    changed=d/'extra.zip';make_pack(changed,rows,patches,['UNEXPECTED.txt'])
    hold('unexpected_cold_member_refused',lambda:m.restore_all(changed,cp08,d/'extraout'))
    test('no_partial_output_unexpected_member',not (d/'extraout').exists())
    bad_crc=d/'corrupted-pack.zip';raw=bytearray(private.read_bytes());raw[-30]^=0xFF;bad_crc.write_bytes(raw)
    hold('corrupt_cold_pack_refused',lambda:m.restore_all(bad_crc,cp08,d/'corruptpackout'))
    test('original_source_archives_preserved',all(x.exists() for x in anchors.values()))
print(json.dumps({'schema':'JM.M001.CP28.Tests/1','pass':all(checks.values()),
      'checks':len(checks),'cases':checks},indent=2,sort_keys=True))
if not all(checks.values()):raise SystemExit(2)
