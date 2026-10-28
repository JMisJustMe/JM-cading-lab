#!/usr/bin/env python3
"""JM M001 CP27 — read-only exact Slingfall APK lineage recovery.

Child of the sovereign M001 CP25 exact delta restorer and CP26 edition flow.
One full distinct APK + 10 verified patches + 2 separately named equal-byte
carriers recover 13 historical APK distributions. No native retirements, quota
claims, installer substitutions, signing changes or publisher acceptance.
"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import tempfile
import zipfile

SCHEMA='JM.M001.SlingfallAPKCOLD/CP27.v1'
CP25_SOURCE='JM_M001_EXACT_DELTA_RESTORE_CP25.py'
RESTORE_COUNT=13
PATCH_COUNT=10
ALIAS_COUNT=2
MAX_PACK_BYTES=2_500_000


def digest(path):
    h=hashlib.sha256()
    with open(path,'rb') as f:
        for b in iter(lambda:f.read(1048576),b''):h.update(b)
    return h.hexdigest()


def validate_entry(info):
    if not isinstance(info,dict):raise ValueError('NOT_A_RECORD')
    name=info.get('filename')
    if not isinstance(name,str) or not name.endswith('.apk') or Path(name).name!=name or '\\' in name or '/' in name or name in ('.','..'):
        raise ValueError('UNSAFE_APK_FILENAME')
    if type(info.get('bytes')) is not int or not 0<info['bytes']<200_000_000:
        raise ValueError('INVALID_CARRIER_SIZE')
    sha=info.get('sha256')
    if not isinstance(sha,str) or len(sha)!=64 or any(c not in '0123456789abcdef' for c in sha):
        raise ValueError('INVALID_CARRIER_HASH')
    if type(info.get('zip_members')) is not int or not 1<=info['zip_members']<=10000:
        raise ValueError('INVALID_ZIP_MEMBER_COUNT')
    if not isinstance(info.get('carrier_id'),str) or not info['carrier_id'].startswith('libfile_'):
        raise ValueError('MISSING_NATIVE_CARRIER_ID')
    if not isinstance(info.get('separate_use'),str) or len(info['separate_use'])<8:
        raise ValueError('SEPARATE_USE_NOT_PRESERVED')
    if info.get('retirement_authorised') is not False:
        raise ValueError('RETIREMENT_NOT_PROHIBITED')


def inspect_apk(path,entry):
    validate_entry(entry)
    file=Path(path)
    if file.is_symlink() or not file.is_file():raise ValueError('NONREGULAR_APK')
    if file.stat().st_size!=entry['bytes'] or digest(file)!=entry['sha256']:
        raise ValueError('APK_SIZE_OR_HASH_CHANGED')
    with zipfile.ZipFile(file) as z:
        names=z.namelist()
        if len(names)!=entry['zip_members'] or len(names)!=len(set(names)) or z.testzip() is not None:
            raise ValueError('APK_CRC_OR_MEMBER_REGRESSION')
        signing=[n for n in names if n.startswith('META-INF/') and n.upper().endswith(('.RSA','.EC','.SF'))]
        if not signing:raise ValueError('ORIGINAL_SIGNING_RECORD_LOST')
    return file


def import_cp25(source):
    path=Path(source)
    if path.is_symlink() or not path.is_file():raise ValueError('CP25_DONOR_NOT_REGULAR')
    spec=importlib.util.spec_from_file_location('jm_m001_cp25_sovereign',path)
    mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
    if mod.SCHEMA!='JM.M001.ExactMusicDelta/CP25.v1':raise ValueError('CP25_DONOR_SCHEMA_CHANGED')
    return mod


def restore_all(pack,anchor,output_dir,cp25_source=None):
    pack=Path(pack);anchor=Path(anchor);dest=Path(output_dir)
    if pack.is_symlink() or not pack.is_file() or pack.stat().st_size>MAX_PACK_BYTES:
        raise ValueError('PACK_NOT_REGULAR_OR_EXCESSIVE')
    if dest.is_symlink() or dest.exists() or not dest.parent.is_dir():
        raise ValueError('OUTPUT_MUST_BE_NEW_DIRECTORY')
    if cp25_source is None:cp25_source=Path(__file__).with_name(CP25_SOURCE)
    cp25=import_cp25(cp25_source)
    with zipfile.ZipFile(pack) as archive:
        names=archive.namelist()
        if len(set(names))!=len(names) or archive.testzip() is not None:
            raise ValueError('PACK_MEMBER_CRC_OR_DUPLICATE')
        if 'MANIFEST_CP27.json' not in names:raise ValueError('MISSING_PRIVATE_MANIFEST')
        m=json.loads(archive.read('MANIFEST_CP27.json'))
        if m.get('schema')!=SCHEMA or m.get('retirement_authorised') is not False or m.get('quota_savings_claimed_bytes')!=0:
            raise ValueError('PACK_AUTHORITY_WRONG')
        rows=m.get('carriers',[])
        if not isinstance(rows,list) or len(rows)!=RESTORE_COUNT:
            raise ValueError('NOT_13_SEPARATE_CARRIERS')
        for r in rows:validate_entry(r)
        if len(set(r['filename'] for r in rows))!=RESTORE_COUNT or len(set(r['carrier_id'] for r in rows))!=RESTORE_COUNT:
            raise ValueError('LOSS_OF_NATIVE_IDENTITIES')
        group={k:[r for r in rows if r.get('mode')==k] for k in ('anchor','delta','same_bytes_alias')}
        if list(map(lambda k:len(group[k]),('anchor','delta','same_bytes_alias')))!=[1,PATCH_COUNT,ALIAS_COUNT]:
            raise ValueError('WRONG_LINEAGE_SHAPE')
        base=group['anchor'][0]
        if base['filename']!='JM_SLINGFALL_CP17_SIX_TACTICS_FOLD_TEST.apk':
            raise ValueError('ANCHOR_INCORRECT')
        inspect_apk(anchor,base)
        expected={'MANIFEST_CP27.json','README_CP27.md',CP25_SOURCE,'JM_M001_APK_LINEAGE_RESTORE_CP27.py'}
        for r in group['delta']:
            if r.get('base_sha256')!=base['sha256']:
                raise ValueError('PATCH_BASE_NOT_PINNED')
            patch=r.get('delta')
            if not isinstance(patch,dict) or type(patch.get('bytes')) is not int or not 0<patch['bytes']<MAX_PACK_BYTES:
                raise ValueError('PATCH_BYTES_INVALID')
            if not isinstance(patch.get('sha256'),str) or len(patch['sha256'])!=64:
                raise ValueError('PATCH_HASH_INVALID')
            member=patch.get('member')
            if member!=f"PATCHES/{r['filename']}.zstpatch":
                raise ValueError('PATCH_MEMBER_PATH_CHANGED')
            if member not in names or archive.getinfo(member).file_size!=patch['bytes']:
                raise ValueError('PATCH_MEMBER_MISSING')
            expected.add(member)
        for r in group['same_bytes_alias']:
            canonical=next((x for x in group['delta'] if x['filename']==r.get('same_bytes_as')),None)
            if canonical is None or canonical['bytes']!=r['bytes'] or canonical['sha256']!=r['sha256'] or canonical['zip_members']!=r['zip_members']:
                raise ValueError('SAME_BYTE_ALIAS_UNPROVED')
        if set(names)!=expected:
            raise ValueError('UNEXPECTED_PACK_MEMBERS')
        stage=Path(tempfile.mkdtemp(prefix='.jm-cp27-',dir=dest.parent))
        try:
            out_base=stage/base['filename']
            shutil.copyfile(anchor,out_base)
            inspect_apk(out_base,base)
            scratch=stage/'.SCRATCH';scratch.mkdir()
            for r in group['delta']:
                patch_info=r['delta']
                payload=scratch/(r['filename']+'.zstpatch')
                with archive.open(patch_info['member']) as src,open(payload,'xb') as dst:
                    shutil.copyfileobj(src,dst)
                if digest(payload)!=patch_info['sha256']:
                    raise ValueError('PATCH_SHA_FAILED')
                receipt=scratch/(r['filename']+'.json')
                task={'schema':cp25.SCHEMA,'gate':{'retirement_authorised':False},
                      'base':base,'target':r,'delta':patch_info}
                receipt.write_text(json.dumps(task,sort_keys=True),encoding='utf-8')
                cp25.restore(receipt,anchor,payload,stage/r['filename'])
                inspect_apk(stage/r['filename'],r)
            for r in group['same_bytes_alias']:
                original=stage/r['same_bytes_as']
                if not original.is_file():raise ValueError('SAME_BYTE_PARENT_MISSING')
                shutil.copyfile(original,stage/r['filename'])
                inspect_apk(stage/r['filename'],r)
            shutil.rmtree(scratch)
            results=[]
            for row in rows:
                output=stage/row['filename']
                inspect_apk(output,row)
                results.append({'carrier_id':row['carrier_id'],'filename':row['filename'],
                                'sha256':row['sha256'],'bytes':row['bytes']})
            if len(list(stage.iterdir()))!=RESTORE_COUNT or dest.exists():
                raise ValueError('OUTPUT_SET_CHANGED')
            os.rename(stage,dest)
            return {'schema':SCHEMA,'status':'THIRTEEN_INDEPENDENT_APK_CARRIERS_EXACT',
                'carriers':len(results),'distinct_byte_identities':11,
                'delta_count':PATCH_COUNT,'same_byte_role_aliases':ALIAS_COUNT,
                'files':results,'retirement_authorised':False,'native_library_mutations':0,
                'quota_savings_claimed_bytes':0}
        finally:
            if stage.exists():shutil.rmtree(stage)


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--pack',required=True)
    p.add_argument('--anchor',required=True)
    p.add_argument('--output-dir',required=True)
    p.add_argument('--cp25-source')
    a=p.parse_args()
    try:
        result=restore_all(a.pack,a.anchor,a.output_dir,a.cp25_source)
        print(json.dumps({k:v for k,v in result.items() if k!='files'},sort_keys=True,indent=2))
        return 0
    except (OSError,ValueError,KeyError,TypeError,zipfile.BadZipFile,json.JSONDecodeError,ImportError) as e:
        print(json.dumps({'schema':SCHEMA,'status':'HOLD_INVALID','reason_type':type(e).__name__,
                          'native_library_mutations':0,'quota_savings_claimed_bytes':0}))
        return 2

if __name__=='__main__':raise SystemExit(main())
