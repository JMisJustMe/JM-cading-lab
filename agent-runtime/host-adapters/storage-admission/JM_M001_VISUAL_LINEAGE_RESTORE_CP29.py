#!/usr/bin/env python3
"""JM M001 CP29: seven distinct original Visual Creation ZIPs, exact cold recovery.

Inherits CP25 exact zstd patch restorer, not another compression system.
Adds independently verified embedded CP18 lineage ZIP extraction, with original
identity/role hashes. Read-only input; write-new output only; no native mutation.
"""
import argparse
import hashlib
import importlib.util
import io
import json
import os
import re
import shutil
import stat
import tempfile
import zipfile
from pathlib import Path, PurePosixPath

SCHEMA = 'JM.M001.VisualReleaseCold/CP29.v1'
MAX_ARCHIVE_BYTES = 100_000_000
MAX_ARCHIVE_MEMBERS = 1000
EXPECTED_EDITION_ROLES = ('CP07','CP08','CP09','CP17','CP18','INTAKE_V1','INTAKE_V2')


def digest_bytes(b):
    return hashlib.sha256(b).hexdigest()


def digest_file(path):
    h=hashlib.sha256()
    with open(path,'rb') as fd:
        for buf in iter(lambda:fd.read(1048576),b''):
            h.update(buf)
    return h.hexdigest()


def regular(path,proof):
    p=Path(path)
    st=p.lstat()
    if p.is_symlink() or not stat.S_ISREG(st.st_mode):
        raise ValueError('NOT_REGULAR_OR_SYMLINK')
    if st.st_size!=proof['bytes'] or digest_file(p)!=proof['sha256']:
        raise ValueError('ANCHOR_OR_PATCH_HASH_REFUSAL')
    after=p.lstat()
    if (st.st_ino,st.st_dev,st.st_size,st.st_mtime_ns,st.st_ctime_ns)!=(after.st_ino,after.st_dev,after.st_size,after.st_mtime_ns,after.st_ctime_ns):
        raise ValueError('CHANGED_ANCHOR_DURING_READ')
    return p


def safe_basename(n):
    return isinstance(n,str) and len(n)<160 and re.fullmatch(r'[A-Za-z0-9_.-]+\.zip',n) is not None


def zip_prove(data,expected_count=None):
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        infos=z.infolist()
        if len(infos)>MAX_ARCHIVE_MEMBERS or len(infos)!=len(set(i.filename for i in infos)):
            raise ValueError('ZIP_MEMBER_COUNT_OR_DUPLICATE')
        if any(i.file_size>MAX_ARCHIVE_BYTES for i in infos):
            raise ValueError('ZIP_MEMBER_SIZE_EXCEEDS_BOUND')
        if expected_count is not None and len(infos)!=expected_count:
            raise ValueError('ZIP_MEMBER_COUNT_MISMATCH')
        if z.testzip() is not None:
            raise ValueError('ZIP_CRC_REFUSAL')
        return len(infos)


def require_sha(h):
    if not isinstance(h,str) or re.fullmatch(r'[0-9a-f]{64}',h) is None:
        raise ValueError('INVALID_SHA_PIN')


def parse_pack(pack):
    pack=Path(pack)
    if pack.is_symlink() or not pack.is_file():raise ValueError('PACK_NOT_REGULAR')
    with zipfile.ZipFile(pack) as z:
        names=z.namelist()
        if len(names)!=len(set(names)) or not {'manifest.json','intake_v1_from_v2.zstpatch'}<=set(names):
            raise ValueError('PACK_MANIFEST_OR_DELTA_NOT_PRESENT')
        if any(n.startswith('/') or '..' in PurePosixPath(n).parts for n in names):
            raise ValueError('UNSAFE_PACK_MEMBER')
        if z.testzip() is not None:raise ValueError('PACK_CRC')
        data=z.read('manifest.json')
        if len(data)>250000:raise ValueError('MANIFEST_TOO_LONG')
        m=json.loads(data)
        patch=z.read('intake_v1_from_v2.zstpatch')
    if m.get('schema')!=SCHEMA or m.get('gate',{}).get('retirement_authorised') is not False:
        raise ValueError('INVALID_SCHEMA_OR_AUTHORITY')
    if tuple(m.get('editions_order',[]))!=EXPECTED_EDITION_ROLES:
        raise ValueError('EDITION_IDENTITIES_CHANGED')
    edition=m.get('editions')
    if not isinstance(edition,list) or len(edition)!=7 or set(x.get('role') for x in edition)!=set(EXPECTED_EDITION_ROLES):
        raise ValueError('EDITION_ROLES_MISSING_OR_DUPLICATED')
    names=set()
    for e in edition:
        if not safe_basename(e.get('name')) or e['name'] in names:
            raise ValueError('UNSAFE_OUTPUT_FILENAME')
        names.add(e['name'])
        if type(e.get('bytes')) is not int or not (1<=e['bytes']<=MAX_ARCHIVE_BYTES):
            raise ValueError('BAD_EDITION_SIZE')
        require_sha(e.get('sha256'))
        if type(e.get('zip_members')) is not int or not 1<=e['zip_members']<=MAX_ARCHIVE_MEMBERS:
            raise ValueError('BAD_MEMBER_COUNT')
        if e.get('purpose') not in ['source_archive','runnable_source_archive','processing_intake_source','latest_source_anchor']:
            raise ValueError('MISSING_OR_UNKNOWN_PURPOSE')
        if not isinstance(e.get('native_library_id'),str) or not e['native_library_id'].startswith('libfile_'):
            raise ValueError('LOST_NATIVE_ID_CUSTODY')
        if e['role'] in ('CP07','CP08','CP09','CP17'):
            n=e.get('cp18_entry')
            if not isinstance(n,str) or not n.startswith('JM_VISUAL_CREATION_CP18/protected/lineage/') or not n.endswith('.zip') or '..' in PurePosixPath(n).parts:
                raise ValueError('INVALID_NESTED_ENTRY')
        elif 'cp18_entry' in e:raise ValueError('UNEXPECTED_NESTED_ENTRY')
    anchors=m.get('anchors')
    if not isinstance(anchors,dict) or set(anchors)!= {'CP18','INTAKE_V2'}:raise ValueError('ANCHORS_INVALID')
    for role,a in anchors.items():
        require_sha(a.get('sha256'))
        if type(a.get('bytes')) is not int or a['bytes']<1:raise ValueError('INVALID_ANCHOR_BYTES')
        if (a['sha256'],a['bytes'])!=(next(x for x in edition if x['role']==role)['sha256'],next(x for x in edition if x['role']==role)['bytes']):
            raise ValueError('ANCHOR_NOT_SAME_AS_LIVE_EDITION')
    p=m.get('patch',{});require_sha(p.get('sha256'))
    if p.get('bytes')!=len(patch) or digest_bytes(patch)!=p['sha256']:
        raise ValueError('DELTA_PIN_REFUSAL')
    return m,patch


def restore(pack,cp18,v2,dest):
    m,patch=parse_pack(pack)
    cp18=regular(cp18,m['anchors']['CP18'])
    v2=regular(v2,m['anchors']['INTAKE_V2'])
    dest=Path(dest)
    if dest.is_symlink() or dest.exists():raise ValueError('NO_OVERWRITE_OUTPUT_DIRECTORY')
    if not dest.parent.is_dir() or dest.parent.is_symlink():raise ValueError('OUTPUT_PARENT_INVALID')
    entries={x['role']:x for x in m['editions']}
    if any(dest.resolve()==x.resolve() for x in (cp18,v2,Path(pack))):
        raise ValueError('OUTPUT_ALIASES_INPUT')
    work=Path(tempfile.mkdtemp(prefix='.jm-m001-cp29-',dir=dest.parent))
    try:
        with zipfile.ZipFile(cp18) as z:
            names=z.namelist()
            if len(names)!=len(set(names)) or z.testzip() is not None:
                raise ValueError('CP18_OUTER_CRC_OR_DUPLICATES')
            # Nothing is renamed within archives; output names retain native identity.
            for role in ('CP07','CP08','CP09','CP17'):
                e=entries[role]
                info=z.getinfo(e['cp18_entry'])
                if info.file_size!=e['bytes']:
                    raise ValueError('NESTED_ARCHIVE_SIZE_MISMATCH')
                b=z.read(info)
                if digest_bytes(b)!=e['sha256']:
                    raise ValueError('NESTED_ARCHIVE_SHA_REFUSAL')
                zip_prove(b,e['zip_members'])
                (work/e['name']).write_bytes(b)
        shutil.copyfile(cp18,work/entries['CP18']['name'])
        shutil.copyfile(v2,work/entries['INTAKE_V2']['name'])
        # Reuse proven CP25 whole-file exact delta engine for original intake V1.
        cp25file=Path(__file__).resolve().with_name('JM_M001_EXACT_DELTA_RESTORE_CP25.py')
        if not cp25file.is_file():raise ValueError('CP25_DEPENDENCY_MISSING')
        spec=importlib.util.spec_from_file_location('jm_m001_cp25_dep',cp25file)
        cp25=importlib.util.module_from_spec(spec);spec.loader.exec_module(cp25)
        patchpath=work/'intake_v1_from_v2.zstpatch';patchpath.write_bytes(patch)
        e=entries['INTAKE_V1']
        meta={'schema':cp25.SCHEMA,'gate':{'retirement_authorised':False},'base':m['anchors']['INTAKE_V2'],
              'target':{'bytes':e['bytes'],'sha256':e['sha256'],'zip_members':e['zip_members']},'delta':m['patch']}
        patch_manifest=work/'intake_cp25_manifest.json';patch_manifest.write_text(json.dumps(meta))
        cp25.restore(patch_manifest,v2,patchpath,work/e['name'])
        # Final release gate: compare each of seven original independent identities.
        count=0;total=0
        for e in m['editions']:
            p=regular(work/e['name'],e)
            zip_prove(p.read_bytes(),e['zip_members'])
            count+=1;total+=e['bytes']
        for internal in ('intake_v1_from_v2.zstpatch','intake_cp25_manifest.json'):(work/internal).unlink()
        os.rename(work,dest)  # no output existed, source and patches still intact
        return {'schema':SCHEMA,'status':'SEVEN_EXACT_RESTORES_PASS','original_editions':count,
                'original_bytes':total,'output_directory':str(dest),'native_mutations':0,
                'retirement_authorised':False,'quota_savings_claimed_bytes':0}
    finally:
        if work.exists():shutil.rmtree(work)


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    for name in ('pack','cp18','v2','output-dir'):ap.add_argument('--'+name,required=True)
    a=ap.parse_args()
    try:
        print(json.dumps(restore(a.pack,a.cp18,a.v2,getattr(a,'output_dir')),sort_keys=True,indent=2))
        return 0
    except (ValueError,OSError,KeyError,TypeError,zipfile.BadZipFile,ImportError) as e:
        print(json.dumps({'schema':SCHEMA,'status':'HOLD','error':str(e),
                          'native_mutations':0,'quota_savings_claimed_bytes':0}))
        return 2

if __name__=='__main__':raise SystemExit(main())
