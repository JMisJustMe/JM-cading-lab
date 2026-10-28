#!/usr/bin/env python3
"""JM M001 CP28: byte-exact, independently named four-edition TIWIN recovery.

Recipient of existing sovereign CP25 zstd restorer, not an app substitute,
new service, user-data backup, native Library mutation, or quota claim.
All app ZIP editions retain separate native IDs and purposes.
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

SCHEMA = 'JM.M001.TIWIN.IndependentEditionDelta/CP28.v1'
SOURCE = 'JM_M001_EXACT_DELTA_RESTORE_CP25.py'
EDITIONS = ('CP05', 'CP06', 'CP07', 'CP08')
ANCHOR = 'CP08'
MAX_PACK = 3_000_000

def sha256(path):
    digest = hashlib.sha256()
    with open(path,'rb') as stream:
        for chunk in iter(lambda:stream.read(1048576),b''):
            digest.update(chunk)
    return digest.hexdigest()

def validate(row):
    if not isinstance(row,dict) or row.get('edition') not in EDITIONS:
        raise ValueError('EDITION_NOT_ALLOWED')
    name=row.get('filename')
    if (not isinstance(name,str) or not name.startswith('TIWIN_') or
        not name.endswith('.zip') or '/' in name or '\\' in name or Path(name).name != name):
        raise ValueError('UNSAFE_OR_UNMATCHED_EDITION_NAME')
    if type(row.get('bytes')) is not int or not (1 <= row['bytes'] < 200_000_000):
        raise ValueError('EDITION_BYTES_INVALID')
    digest=row.get('sha256')
    if (not isinstance(digest,str) or len(digest)!=64 or
        any(char not in '0123456789abcdef' for char in digest)):
        raise ValueError('EDITION_HASH_INVALID')
    if type(row.get('zip_members')) is not int or not (1 <= row['zip_members'] < 10000):
        raise ValueError('EDITION_MEMBER_COUNT_INVALID')
    if (not isinstance(row.get('carrier_id'),str) or
        not row['carrier_id'].startswith('libfile_') or len(row['carrier_id'])<16):
        raise ValueError('NATIVE_ROLE_ID_MISSING')
    if not isinstance(row.get('separate_use'),str) or len(row['separate_use'])<12:
        raise ValueError('SEPARATE_USE_MISSING')
    if row.get('retirement_authorised') is not False:
        raise ValueError('RETIREMENT_CANNOT_BE_ENABLED')

def check_zip(path,row):
    validate(row)
    target=Path(path)
    if target.is_symlink() or not target.is_file():raise ValueError('INVALID_OR_SYMLINK_FILE')
    if target.stat().st_size!=row['bytes'] or sha256(target)!=row['sha256']:
        raise ValueError('SOURCE_OR_RESTORED_SHA_CHANGED')
    with zipfile.ZipFile(target) as archive:
        names=archive.namelist()
        if (len(names)!=row['zip_members'] or len(set(names))!=len(names) or
            archive.testzip() is not None):
            raise ValueError('ZIP_MEMBERS_OR_CRC_CHANGED')
    return target

def cp25_module(path):
    src=Path(path)
    if src.is_symlink() or not src.is_file():raise ValueError('CP25_SOURCE_UNAVAILABLE')
    spec=importlib.util.spec_from_file_location('jm_m001_proven_cp25',str(src))
    donor=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(donor)
    if donor.SCHEMA != 'JM.M001.ExactMusicDelta/CP25.v1':
        raise ValueError('CP25_SCHEMA_REGRESSION')
    return donor

def restore_all(pack,anchor,output_dir,cp25_source=None):
    pack=Path(pack);anchor=Path(anchor);dest=Path(output_dir)
    if pack.is_symlink() or not pack.is_file() or pack.stat().st_size>MAX_PACK:
        raise ValueError('PACK_MISSING_OR_NOT_BOUNDED')
    if dest.is_symlink() or dest.exists() or not dest.parent.is_dir():
        raise ValueError('OUTPUT_MUST_BE_NEW_DIRECTORY')
    if cp25_source is None:cp25_source=Path(__file__).with_name(SOURCE)
    donor=cp25_module(cp25_source)
    with zipfile.ZipFile(pack) as archive:
        names=archive.namelist()
        if len(names)!=len(set(names)) or archive.testzip() is not None:
            raise ValueError('COLD_PACK_CRC_OR_DUPLICATE_FAILURE')
        manifest=json.loads(archive.read('MANIFEST_CP28.json'))
        if (manifest.get('schema')!=SCHEMA or manifest.get('retirement_authorised') is not False or
            manifest.get('quota_savings_claimed_bytes')!=0):
            raise ValueError('AUTHORITY_OR_SCHEMA_CHANGED')
        rows=manifest.get('carriers')
        if not isinstance(rows,list) or len(rows)!=4:raise ValueError('ALL_FOUR_EDITIONS_REQUIRED')
        for item in rows:validate(item)
        if (set(r['edition'] for r in rows)!=set(EDITIONS) or
            len(set(r['filename'] for r in rows))!=4 or
            len(set(r['carrier_id'] for r in rows))!=4):
            raise ValueError('DISTINCT_EDITIONS_AND_ROLES_REQUIRED')
        lookup={r['edition']:r for r in rows}
        base=lookup[ANCHOR]
        if base.get('mode')!='anchor' or base['filename']!='TIWIN_CP08_ENGINEERING_COMPLETION_FULL_SOURCE.zip':
            raise ValueError('CURRENT_ANCHOR_IDENTITY_CHANGED')
        check_zip(anchor,base)
        expected={'MANIFEST_CP28.json','README_CP28.md',SOURCE,'JM_M001_PURPOSE_CHAIN_RESTORE_CP28.py'}
        for edition in EDITIONS[:3]:
            row=lookup[edition]
            if row.get('mode')!='delta' or row.get('base_sha256')!=base['sha256']:
                raise ValueError('DELTA_BASE_ROLE_MISMATCH')
            d=row.get('delta')
            if not isinstance(d,dict) or type(d.get('bytes')) is not int or not (1<=d['bytes']<=MAX_PACK):
                raise ValueError('INVALID_PATCH_SIZE')
            if not isinstance(d.get('sha256'),str) or len(d['sha256'])!=64 or any(c not in '0123456789abcdef' for c in d['sha256']):
                raise ValueError('INVALID_PATCH_DIGEST')
            member=f'PATCHES/{edition}.zstpatch'
            if d.get('member')!=member or member not in names or archive.getinfo(member).file_size!=d['bytes']:
                raise ValueError('PATCH_NOT_PINNED_IN_PRIVATE_PACK')
            expected.add(member)
        if set(names)!=expected:raise ValueError('UNEXPECTED_PRIVATE_PACK_MEMBER')
        stage=Path(tempfile.mkdtemp(prefix='.jm-m001-cp28-',dir=dest.parent))
        try:
            shutil.copyfile(anchor,stage/base['filename'])
            check_zip(stage/base['filename'],base)
            scratch=stage/'.private_tmp';scratch.mkdir()
            for edition in EDITIONS[:3]:
                row=lookup[edition];spec=row['delta']
                candidate=scratch/(edition+'.zstpatch')
                with archive.open(spec['member']) as src, candidate.open('xb') as out:
                    shutil.copyfileobj(src,out)
                if candidate.stat().st_size!=spec['bytes'] or sha256(candidate)!=spec['sha256']:
                    raise ValueError('PATCH_BYTES_CHANGED')
                receipt=scratch/(edition+'.json')
                receipt.write_text(json.dumps({'schema':donor.SCHEMA,'gate':{'retirement_authorised':False},
                     'base':base,'target':row,'delta':spec},sort_keys=True),encoding='utf-8')
                donor.restore(receipt,anchor,candidate,stage/row['filename'])
                check_zip(stage/row['filename'],row)
            shutil.rmtree(scratch)
            for row in rows:check_zip(stage/row['filename'],row)
            if len(list(stage.iterdir()))!=4 or dest.exists():
                raise ValueError('INCOMPLETE_OR_CONFLICTING_RESTORE')
            os.rename(stage,dest)
            return {'schema':SCHEMA,'status':'FOUR_INDEPENDENT_TIWIN_EDITIONS_EXACT',
                    'versions':4,'delta_versions':3,'source_bytes':sum(r['bytes'] for r in rows),
                    'files':[{'edition':r['edition'],'carrier_id':r['carrier_id'],
                         'filename':r['filename'],'bytes':r['bytes'],'sha256':r['sha256']} for r in rows],
                    'retirement_authorised':False,'native_library_mutations':0,'quota_savings_claimed_bytes':0}
        finally:
            if stage.exists():shutil.rmtree(stage)

def main(argv=None):
    p=argparse.ArgumentParser(description=__doc__)
    for arg in ('pack','anchor','output-dir'):p.add_argument('--'+arg,required=True)
    p.add_argument('--cp25-source')
    a=p.parse_args(argv)
    try:
        result=restore_all(a.pack,a.anchor,a.output_dir,a.cp25_source)
        print(json.dumps({k:v for k,v in result.items() if k!='files'},indent=2,sort_keys=True))
        return 0
    except (ValueError,KeyError,OSError,TypeError,zipfile.BadZipFile,ImportError) as err:
        print(json.dumps({'schema':SCHEMA,'status':'HOLD_INVALID','reason_type':type(err).__name__,
           'native_library_mutations':0,'quota_savings_claimed_bytes':0}))
        return 2

if __name__=='__main__':raise SystemExit(main())
