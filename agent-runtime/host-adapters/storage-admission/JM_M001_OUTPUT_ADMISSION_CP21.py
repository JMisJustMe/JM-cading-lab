#!/usr/bin/env python3
"""JM M001 CP21: fail-closed output-stage recipient of original Carrier Admission v0.1.

No upload, native Library mutation, implicit owner role release or quota claim.
Never treats identical bytes as identical purpose. Use at build time BEFORE
another generated package enters ChatGPT Library, not as a retrofit to its UI.

Example:
    python JM_M001_OUTPUT_ADMISSION_CP21.py --candidate output.zip --keeper saved.zip --donor JM_M001_Carrier_Admission_Gate_v0_1.py --intended cold --created-at 2026-10-28T00:00:00Z
"""
import argparse
import hashlib
import importlib.util
import json
import re
import zipfile
from datetime import datetime, timezone
from pathlib import Path

SCHEMA = 'JM.M001.OutputAdmission/CP21.v1'
DONOR_SHA256 = '8c5b8a17aae5cfa990573e0f10f7d751236c54b5df152fd88704c0ceaba778a6'
INTENTS = ('native_live', 'cold', 'temporary', 'review')
HIGH_BYTES = 8_000_000

def load_donor(path):
    p = Path(path)
    if not p.is_file() or p.is_symlink():
        raise ValueError('DONOR_NOT_REGULAR')
    b = p.read_bytes()
    sha = hashlib.sha256(b).hexdigest()
    if sha != DONOR_SHA256 and not (not b.endswith(b'\n') and hashlib.sha256(b+b'\n').hexdigest() == DONOR_SHA256):
        raise ValueError('DONOR_SHA_MISMATCH')
    spec = importlib.util.spec_from_file_location('jm_original_m001_admission', p)
    obj = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(obj)
    return obj

def run(candidate, donor, *, keeper=None, intended='review', created_at=None,
        direct_link_required=False, reserved_future_use=False):
    out = {'schema':SCHEMA, 'status':'HOLD_INVALID', 'native_library_write_authorised':False,
           'native_retirement_authorised':False, 'quota_savings_claimed_bytes':0,
           'native_mutations':0, 'direct_link_loss_accepted':False,
           'proposed_route':'HOLD', 'reasons':[], 'candidate_sha256':None,
           'candidate_bytes':0, 'keeper_relation':None, 'age_hours':None}
    if intended not in INTENTS:
        out['reasons'].append('UNKNOWN_INTENT'); return out
    try:
        p=Path(candidate)
        snap=donor._regular(p)
        crc=donor._crc_check(p)
        sha=donor._digest(p)
        if donor._regular(p)!=snap:
            raise ValueError('CANDIDATE_CHANGED_DURING_READ')
        out.update(candidate_sha256=sha,candidate_bytes=snap[2],candidate_crc=crc)
        if keeper is not None:
            comp=donor.assess(p,Path(keeper))
            out['keeper_relation']=comp['state']
            if comp['state']=='HOLD_INVALID':
                raise ValueError('KEEPER_OR_SOURCE_NOT_PROVED:'+','.join(comp['errors'])[:120])
        if created_at is not None:
            t=datetime.fromisoformat(created_at.replace('Z','+00:00'))
            if t.tzinfo is None:
                raise ValueError('CREATED_AT_MUST_HAVE_TZ')
            now=datetime.now(timezone.utc)
            age=(now-t.astimezone(timezone.utc)).total_seconds()/3600
            out['age_hours']=round(age,3)
            if age<0: raise ValueError('FUTURE_CREATED_AT')
            if age<96: out['reasons'].append('96H_NATIVE_RETIREMENT_HOLD')
        if reserved_future_use: out['reasons'].append('RESERVED_FUTURE_USE_KEEP')
        if direct_link_required: out['reasons'].append('DIRECT_NATIVE_LINK_KEEP')
        if out['keeper_relation']=='SAME_BYTES_ROLE_HOLD':
            out.update(status='REUSE_REVIEW_HOLD',proposed_route='USE_EXISTING_KEEPER_IF_DISTINCT_ROLES_ALLOW')
            out['reasons'].append('EQUAL_BYTES_NOT_EQUAL_PURPOSE')
        elif intended in ('cold','temporary') or re.search(r'NOT_FOR_LIBRARY',p.name,re.I):
            out.update(status='COLD_FIRST',proposed_route='VERIFIED_PRIVATE_PROVIDER_BEFORE_NATIVE')
            out['reasons'].append('COLD_OR_TEMPORARY_RECIPIENT')
        elif out['candidate_bytes'] >= HIGH_BYTES:
            out.update(status='HIGH_BYTE_REVIEW',proposed_route='COLD_FIRST_UNLESS_EXPLICIT_NATIVE_ROLE')
            out['reasons'].append('HIGH_BYTE_ADMISSION_OVER_8MB')
        elif intended == 'native_live':
            out.update(status='NATIVE_ROLE_REVIEW',proposed_route='NATIVE_CARRIER_ONLY_AFTER_PROVEN_USE_ROLE')
            out['reasons'].append('NATIVE_ROLE_NOT_AUTOMATICALLY_AUTHENTICATED')
        else:
            out.update(status='REVIEW',proposed_route='SELECT_MINIMUM_PURPOSEFUL_CARRIAGE')
        return out
    except (OSError, ValueError, TypeError, RuntimeError, AttributeError, zipfile.BadZipFile) as e:
        out['reasons'].append('INVALID:'+str(e)[:200]); return out

def main(argv=None):
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--candidate',required=True)
    p.add_argument('--donor',required=True)
    p.add_argument('--keeper')
    p.add_argument('--intended',choices=INTENTS,default='review')
    p.add_argument('--created-at')
    p.add_argument('--direct-link-required',action='store_true')
    p.add_argument('--reserved-future-use',action='store_true')
    args=p.parse_args(argv)
    try:
        donor=load_donor(args.donor)
        result=run(args.candidate,donor,keeper=args.keeper,intended=args.intended,created_at=args.created_at,
                   direct_link_required=args.direct_link_required,reserved_future_use=args.reserved_future_use)
    except (OSError, ValueError) as exc:
        result={'schema':SCHEMA, 'status':'HOLD_INVALID', 'reasons':[str(exc)],
                'native_library_write_authorised':False,'native_retirement_authorised':False,
                'native_mutations':0,'quota_savings_claimed_bytes':0}
    print(json.dumps(result,indent=2,sort_keys=True))
    return 2 if result['status']=='HOLD_INVALID' else 0

if __name__=='__main__':
    raise SystemExit(main())