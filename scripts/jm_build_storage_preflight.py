#!/usr/bin/env python3
"""JM M001 production build-entry recipient for the existing CP21 output admission.

Checks ADDED git files only, not authorial ancestors. Does not upload/delete
native Library files. Detects newly introduced cold-only or >8MB sources and
requires explicit human/provider route review before PR admission; does not
pretend a self-written file or SHA is a valid owner role release.
"""
import argparse
import hashlib
import importlib.util
import json
import re
import stat
import subprocess
import sys
from pathlib import Path

HIGH_BYTES = 8_000_000
COLD_ONLY = re.compile(r'(?:NOT[_ -]?FOR[_ -]?LIBRARY|COLD[_ -]?ONLY|DISPOSABLE[_ -]?WORKING|TEMP[_ -]?BACKUP)', re.I)


def added_files(repo: Path, base: str, head: str) -> list[str]:
    if not re.fullmatch(r'[0-9a-fA-F]{40}', base):
        raise ValueError('BASE_SHA_INVALID')
    proc = subprocess.run(['git', 'diff', '--diff-filter=A', '--name-only', '-z', base, head, '--'],
                          cwd=repo, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    return [s.decode('utf-8', errors='surrogateescape') for s in proc.stdout.split(b'\0') if s]


def load_cp21(repo: Path):
    source = repo / 'agent-runtime/host-adapters/storage-admission/JM_M001_OUTPUT_ADMISSION_CP21.py'
    spec = importlib.util.spec_from_file_location('jm_m001_existing_cp21', source)
    cp21 = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(cp21)
    donor = cp21.load_donor(repo / 'agent-runtime/host-adapters/storage-admission/JM_M001_Carrier_Admission_Gate_v0_1.py')
    return cp21, donor


def preflight(repo: Path, paths: list[str], cp21, donor) -> dict:
    repo = repo.resolve(strict=True)
    items=[]
    for path in paths:
        source=repo/path
        if source.is_symlink():
            raise ValueError('NEW_SYMLINK_REFUSED:'+path)
        p=source.resolve()
        if not p.is_relative_to(repo):
            raise ValueError('OUTSIDE_REPO')
        if not p.is_file():
            # Git submodules/dangling entries don't permit byte-level admission.
            raise ValueError('ADDED_ITEM_NOT_REGULAR_FILE:'+path)
        st=p.stat()
        if not stat.S_ISREG(st.st_mode):
            raise ValueError('ADDED_ITEM_NOT_REGULAR_FILE:'+path)
        high=st.st_size>=HIGH_BYTES
        cold=bool(COLD_ONLY.search(p.name))
        if not(high or cold):
            continue
        out=cp21.run(p, donor, intended='cold' if cold else 'review')
        status=out.get('status','HOLD_INVALID')
        if out.get('native_library_write_authorised') is not False or out.get('native_retirement_authorised') is not False:
            raise ValueError('DONOR_PERMISSION_ESCALATION_REFUSED')
        items.append({'path':path,'bytes':st.st_size,'sha256':out.get('candidate_sha256'),
                      'cold_only':cold,'high_byte':high,'cp21_status':status,
                      'decision':'HOLD_FOR_ROLE_AND_RECOVERY_PROOF',
                      'requires':'Use existing cold/provider custody or prove separate authorised live delivery purpose. ' 
                                 'Do not bypass original link/recipient/FLAZ duties.'})
    return {'schema':'JM.M001.BuildEntryCP21/1','scanned_added_count':len(paths),
            'held_candidates':len(items),'native_library_write_authorised':False,
            'native_mutations':0,'quota_savings_claimed_bytes':0,'items':items,
            'status':'HOLD' if items else 'PASS_NO_NEW_COLD_OR_HIGH_BYTE_CARRIERS',
            'boundary':'Only new committed GitHub files; cannot intercept ChatGPT Library uploads in other chats.'}


def main(argv=None):
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--base',required=True)
    p.add_argument('--head',default='HEAD')
    p.add_argument('--repo',default='.')
    a=p.parse_args(argv)
    repo=Path(a.repo).resolve()
    try:
        cp21,donor=load_cp21(repo)
        added=added_files(repo,a.base,a.head)
        result=preflight(repo,added,cp21,donor)
        print(json.dumps(result,sort_keys=True,indent=2))
        return 1 if result['status']=='HOLD' else 0
    except (OSError,ValueError,RuntimeError,subprocess.CalledProcessError) as exc:
        print(json.dumps({'schema':'JM.M001.BuildEntryCP21/1','status':'HOLD_INVALID',
                          'native_mutations':0,'reason':str(exc)[:300]}))
        return 2

if __name__=='__main__':
    raise SystemExit(main())
