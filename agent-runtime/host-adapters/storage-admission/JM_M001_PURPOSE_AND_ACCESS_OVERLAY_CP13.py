#!/usr/bin/env python3
"""JM M001 additive PURPOSE/ACCESS/RECOVERY overlay CP13. Read-only.

Inherits the exact protected JM_M001_Carrier_Admission_Gate_v0_1.py.
Never deletes, renames, overwrites, releases owner links, claims new Fold
proof, changes source authority, or promotes a candidate to current head.

Input JSON is an evidence inventory rather than authenticated release proof:
all declared affirmative flags must be evidence-backed at the host, and this
program can only return REVIEW_READY_NEEDS_HOST_AUTHORIZATION, never permit an
actual deletion. Positive test fixtures are synthetic, not release evidence.
"""
import argparse
import hashlib
import importlib.util
import json
import re
import stat
from datetime import datetime, timedelta, timezone
from pathlib import Path

SCHEMA='JM.M001.PurposeAccessOverlay/CP13.v1'
DONOR_SHA='8c5b8a17aae5cfa990573e0f10f7d751236c54b5df152fd88704c0ceaba778a6'
NECESSARY=['direct_link_released','purpose_released','reserved_future_use_released',
           'recipient_route_released','source_frozen_role_released',
           'current_head_safe','lineage_and_flaz_reentry_verified']
HEX64=re.compile(r'^[0-9a-f]{64}$')
LIBID=re.compile(r'^libfile_[0-9a-f]{32}$')

def donor_import(path):
    p=Path(path)
    if not p.is_file() or p.is_symlink():
        raise ValueError('DONOR_NOT_REGULAR')
    raw=p.read_bytes()
    # GitHub's text carrier may omit ONE terminal LF from the exact Library
    # source. This does not broaden source authority: the byte stream with
    # precisely one added LF must match the protected canonical SHA-256.
    exact=(hashlib.sha256(raw).hexdigest()==DONOR_SHA)
    exact_terminal_lf=(not raw.endswith(b'\n') and
                       hashlib.sha256(raw+b'\n').hexdigest()==DONOR_SHA)
    if not (exact or exact_terminal_lf):
        raise ValueError('DONOR_SHA_MISMATCH')
    spec=importlib.util.spec_from_file_location('jm_m001_protected_gate_cp13',p)
    mod=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

def dt_parse(s):
    d=datetime.fromisoformat(str(s).replace('Z','+00:00'))
    if d.tzinfo is None: raise ValueError('UTC_AGE_TIMESTAMP_REQUIRED')
    return d.astimezone(timezone.utc)

def evaluate(row, donor, now):
    out={'schema':SCHEMA,'label':str(row.get('label','')),'root_native_id':row.get('root_native_id'),
         'house_native_id':row.get('house_native_id'),
         'decision':'HOLD','retirement_authorised':False,'native_mutations':0,
         'claimed_quota_savings_bytes':0,'hold_reasons':[],'proofs':{}}
    holds=out['hold_reasons']
    try:
        a=row['root_path']; b=row['house_path']; expected=row['sha256']
        assert isinstance(expected,str) and HEX64.fullmatch(expected), 'EXPECTED_SHA_UNTRUSTED'
        if not LIBID.fullmatch(str(row.get('root_native_id',''))) or not LIBID.fullmatch(str(row.get('house_native_id',''))):
            raise ValueError('LIBRARY_IDENTITIES_REQUIRED')
        if row['root_native_id']==row['house_native_id']:
            raise ValueError('SEPARATE_NATIVE_IDS_REQUIRED')
        scanned=donor.assess(a,b)
        out['proofs']['protected_m001_result']=scanned['state']
        out['proofs']['source_sha256']=scanned.get('candidate_sha256')
        out['proofs']['house_sha256']=scanned.get('keeper_sha256')
        out['proofs']['same_bytes']=scanned['whole_byte_equality']
        out['proofs']['ZIP_CRC_ROOT']=scanned.get('crc_candidate')
        out['proofs']['ZIP_CRC_HOUSE']=scanned.get('crc_keeper')
        if (scanned['state']!='SAME_BYTES_ROLE_HOLD' or not scanned['whole_byte_equality'] or
            scanned.get('candidate_sha256')!=expected or scanned.get('keeper_sha256')!=expected):
            holds.append('SOURCE_HOUSE_HASH_OR_BYTES_NOT_PROVED')
        out['bytes']=Path(a).stat().st_size
        if row.get('root_expected_bytes')!=out['bytes']:
            holds.append('ROOT_EXPECTED_BYTES_MISMATCH')
    except (Exception) as e:
        holds.append('SOURCE_PROOF_INVALID:'+str(e)[:140])
        return out
    try:
        created=dt_parse(row['root_created_at'])
        age=(now-created).total_seconds()/3600
        out['proofs']['root_age_hours']=round(age,3)
        if age<96: holds.append('96H_PRESERVATION_WINDOW_OPEN')
    except Exception:
        holds.append('CREATED_AT_UNPROVED')
    if row.get('root_active_library_verified') is not True:
        holds.append('ROOT_LIVE_RESIDENCY_NOT_AUTHENTICATED')
    if row.get('house_active_library_verified') is not True:
        holds.append('HOUSE_LIVE_RESIDENCY_NOT_AUTHENTICATED')
    # Separate original hash restoration from a declaration that a cloud copy exists.
    cp=row.get('independent_cold_download_path')
    if not cp:
        holds.append('INDEPENDENT_PROVIDER_DOWNLOAD_NOT_PRESENT')
    else:
        try:
            p=Path(cp)
            if not p.is_file() or p.is_symlink(): raise ValueError('NONREGULAR_COLD_PAYLOAD')
            coldsha=donor._digest(p)
            coldbytes=p.stat().st_size
            if coldsha!=row['sha256'] or coldbytes!=row['root_expected_bytes']:
                raise ValueError('COLD_ORIGINAL_DIGEST_MISMATCH')
            if p.resolve() in {Path(row['root_path']).resolve(),Path(row['house_path']).resolve()}:
                raise ValueError('COLD_NOT_DISTINCT_LOCAL_PATH')
            out['proofs']['cold_sha256']=coldsha
            # This bit must be supported by connector evidence, not path content alone.
            if row.get('independent_provider_origin_authenticated') is not True:
                holds.append('COLD_PROVIDER_PROVENANCE_UNAUTHENTICATED')
        except (Exception) as e:
            holds.append('COLD_RESTORE_INVALID:'+str(e)[:140])
    roles=row.get('role_release_evidence',{})
    for key in NECESSARY:
        if roles.get(key) is not True:
            holds.append('ROLE_HOLD:'+key)
    if (not isinstance(row.get('explicit_authorization_evidence'),dict) or
        row['explicit_authorization_evidence'].get('exact_root_native_id')!=row.get('root_native_id') or
        row['explicit_authorization_evidence'].get('acknowledged_native_link_loss') is not True or
        row['explicit_authorization_evidence'].get('authority')!='owner_explicit_specific_release'):
        holds.append('NO_EXACT_OWNER_NATIVE_ROLE_RELEASE')
    if not holds:
        out['decision']='REVIEW_READY_NEEDS_HOST_AUTHORIZATION'
        out['proofs']['candidate_gross_bytes_not_quota_savings']=out['bytes']
    return out

def run(inp, donor_path, now=None):
    g=donor_import(donor_path)
    now=now or datetime.now(timezone.utc)
    rows=inp['records']
    if not isinstance(rows,list): raise ValueError('RECORDS_NOT_LIST')
    results=[evaluate(x,g,now) for x in rows]
    return {'schema':SCHEMA,'evaluated_at':now.isoformat(),'donor_sha256':DONOR_SHA,
            'record_count':len(results),'review_ready_count':sum(x['decision']=='REVIEW_READY_NEEDS_HOST_AUTHORIZATION' for x in results),
            'hold_count':sum(x['decision']=='HOLD' for x in results),
            'retirement_authorised_count':0,'native_mutations':0,'new_account_quota_savings_bytes':0,
            'records':results,'boundary':'READ_ONLY; even review-ready is not permission to move a Library native ID to Trash.'}

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--input',required=True)
    p.add_argument('--donor',required=True)
    p.add_argument('--output',required=True)
    a=p.parse_args()
    result=run(json.loads(Path(a.input).read_text()),a.donor)
    Path(a.output).write_text(json.dumps(result,indent=2,sort_keys=True)+'\n')
    print(json.dumps({'count':result['record_count'],'hold':result['hold_count'],'review_ready':result['review_ready_count'], 'native_mutations':0}))
if __name__=='__main__':main()
