#!/usr/bin/env python3
"""JM M001 CP26: whole-source exact-restoration mesh for 8 distinct editions.

No Library mutation, replacement, retirement or quota assertion. This is an
additive orchestration recipient of the existing CP25 exact-delta restoration.
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

SCHEMA='JM.M001.EditionChain/CP26.v1'
CP25_MODULE='JM_M001_EXACT_DELTA_RESTORE_CP25.py'
EDITIONS=tuple(f'CP{i:02d}' for i in range(1,9))
ANCHORS=('CP01','CP04')
DERIVED=tuple(x for x in EDITIONS if x not in ANCHORS)
MAX_PATCH_BYTES=45_000_000


def digest(path):
    h=hashlib.sha256()
    with open(path,'rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
    return h.hexdigest()


def validate_info(info):
    if not isinstance(info,dict) or type(info.get('bytes')) is not int or info['bytes']<1:
        raise ValueError('INVALID_CARRIER_BYTES')
    if not isinstance(info.get('sha256'),str) or len(info['sha256'])!=64 or any(c not in '0123456789abcdef' for c in info['sha256']):
        raise ValueError('INVALID_CARRIER_DIGEST')


def inspect_original(path,info):
    validate_info(info)
    p=Path(path)
    if p.is_symlink() or not p.is_file() or p.stat().st_size!=info['bytes'] or digest(p)!=info['sha256']:
        raise ValueError('ORIGINAL_CARRIER_NOT_PROVED')
    with zipfile.ZipFile(p) as z:
        names=z.namelist()
        if len(names)!=len(set(names)) or len(names)!=info['zip_members'] or z.testzip() is not None:
            raise ValueError('ZIP_SOURCE_INTEGRITY_FAIL')
    return p


def import_cp25(path):
    p=Path(path)
    if p.is_symlink() or not p.is_file():
        raise ValueError('CP25_DONOR_UNAVAILABLE')
    spec=importlib.util.spec_from_file_location('jm_m001_original_cp25_restore',p)
    m=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    if m.SCHEMA!='JM.M001.ExactMusicDelta/CP25.v1':
        raise ValueError('CP25_DONOR_SCHEMA_MISMATCH')
    return m


def restore_all(pack_path,base_cp01,base_cp04,output_dir,cp25_path=None):
    pack=Path(pack_path)
    if pack.is_symlink() or not pack.is_file():
        raise ValueError('DELTA_PACK_NOT_REGULAR')
    dest=Path(output_dir)
    if dest.is_symlink() or dest.exists() or not dest.parent.is_dir():
        raise ValueError('OUTPUT_ALREADY_EXISTS_OR_PARENT_MISSING')
    if cp25_path is None:
        cp25_path=Path(__file__).resolve().with_name(CP25_MODULE)
    cp25=import_cp25(cp25_path)
    with zipfile.ZipFile(pack) as archive:
        names=archive.namelist()
        if len(names)!=len(set(names)) or archive.testzip() is not None:
            raise ValueError('PATCH_PACK_CRC_OR_DUPLICATE_FAIL')
        if 'MANIFEST_CP26.json' not in names:
            raise ValueError('MISSING_MANIFEST')
        manifest=json.loads(archive.read('MANIFEST_CP26.json'))
        if manifest.get('schema')!=SCHEMA or manifest.get('retirement_authorised') is not False or manifest.get('quota_savings_claimed_bytes')!=0:
            raise ValueError('MANIFEST_AUTHORITY_CHANGED')
        base_info=manifest.get('anchors')
        changes=manifest.get('derived')
        if set(base_info or {})!=set(ANCHORS) or set(changes or {})!=set(DERIVED):
            raise ValueError('EDITIONS_MISSING_OR_UNEXPECTED')
        base_files={'CP01':base_cp01,'CP04':base_cp04}
        for key,path in base_files.items():
            inspect_original(path,base_info[key])
        patches={}
        expected_members={'MANIFEST_CP26.json','README_CP26.md',CP25_MODULE,'JM_M001_EDITIONS_RESTORE_CP26.py'}
        for edition in DERIVED:
            row=changes[edition]
            b=row.get('base')
            target=row.get('target')
            patch=row.get('delta')
            member=row.get('delta_member')
            if b not in ANCHORS or not isinstance(target,dict) or not isinstance(patch,dict):
                raise ValueError('EDITION_PARENT_OR_SHAPE_INVALID')
            if not isinstance(member,str) or member!=f'PATCHES/{edition}.zstpatch':
                raise ValueError('UNSAFE_PATCH_MEMBER_NAME')
            if row.get('purpose')!='DISTINCT_PROTECTED_EDITION':
                raise ValueError('DISTINCT_PURPOSE_LOST')
            validate_info(target);validate_info(patch)
            if target.get('filename')!=f'JM_LYRICS_MUSIC_{row.get("edition_label")}_FLAZ_2026-10-27.zip':
                raise ValueError('TARGET_FILENAME_MISMATCH')
            if member not in names or patch['bytes']>MAX_PATCH_BYTES:
                raise ValueError('PATCH_MEMBER_MISSING_OR_TOO_BIG')
            if archive.getinfo(member).file_size!=patch['bytes']:
                raise ValueError('PATCH_DECLARED_BYTES_MISMATCH')
            expected_members.add(member)
            patches[edition]=(row,member)
        if set(names)!=expected_members:
            raise ValueError('UNEXPECTED_ARCHIVE_MEMBER')
        stage=Path(tempfile.mkdtemp(prefix='.jm-m001-cp26-',dir=dest.parent))
        try:
            for edition,original in base_files.items():
                target=stage/base_info[edition]['filename']
                shutil.copyfile(original,target)
                inspect_original(target,base_info[edition])
            temp=stage/'.CP26_TEMP'
            temp.mkdir()
            restored=[]
            for edition,(row,member) in patches.items():
                patch=temp/(edition+'.zstpatch')
                with archive.open(member) as src,open(patch,'xb') as out:
                    shutil.copyfileobj(src,out,1024*1024)
                if digest(patch)!=row['delta']['sha256']:
                    raise ValueError('PATCH_HASH_CHANGED')
                receipt=temp/(edition+'.json')
                target=dict(row['target'])
                task={'schema':cp25.SCHEMA,'gate':{'retirement_authorised':False},
                      'base':base_info[row['base']],'target':target,'delta':row['delta']}
                receipt.write_text(json.dumps(task,sort_keys=True),encoding='utf-8')
                outpath=stage/target['filename']
                cp25.restore(receipt,base_files[row['base']],patch,outpath)
                restored.append({'edition':edition,'sha256':target['sha256'],
                                 'zip_members':target['zip_members']})
            shutil.rmtree(temp)
            if len(list(stage.iterdir()))!=8:
                raise ValueError('OUTPUT_SET_INCOMPLETE')
            # Destination never exists before the fully verified staging directory is promoted.
            if dest.exists():
                raise ValueError('DESTINATION_CREATED_DURING_VERIFY')
            os.rename(stage,dest)
            return {'schema':SCHEMA,'status':'EIGHT_EXACT_EDITIONS_RESTORED',
                    'edition_count':8,'restored_delta_count':len(restored),
                    'native_library_mutations':0,'retirement_authorised':False,
                    'account_quota_savings_claimed_bytes':0,
                    'base_keys':list(ANCHORS),'derived_sha256':restored}
        finally:
            if stage.exists():
                shutil.rmtree(stage)


def main():
    p=argparse.ArgumentParser(description=__doc__)
    for name in ('pack','base-cp01','base-cp04','output-dir'):
        p.add_argument('--'+name,required=True)
    p.add_argument('--cp25-source',help='Existing sovereign CP25 restorer, default adjacent file')
    a=p.parse_args()
    try:
        result=restore_all(a.pack,a.base_cp01,a.base_cp04,a.output_dir,a.cp25_source)
        print(json.dumps(result,sort_keys=True,indent=2))
        return 0
    except (OSError,ValueError,TypeError,KeyError,json.JSONDecodeError,zipfile.BadZipFile,ImportError) as e:
        print(json.dumps({'schema':SCHEMA,'status':'HOLD_INVALID',
            'reason_type':type(e).__name__,'native_library_mutations':0,
            'quota_savings_claimed_bytes':0}))
        return 2

if __name__=='__main__':
    raise SystemExit(main())