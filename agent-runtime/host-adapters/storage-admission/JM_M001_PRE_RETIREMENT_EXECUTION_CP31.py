#!/usr/bin/env python3
"""JM M001 CP31: enforce original CP13 purpose/access decisions BEFORE a native mutation.

READ ONLY. No deletion, re-upload, role release or native-ID change. A CP13
REVIEW_READY decision NEVER confers host permission. This receipt identifies
which exact independent owner action/host approval is still necessary.
"""
from __future__ import annotations
import argparse
import hashlib
import importlib.util
import json
import os
from datetime import datetime, timezone
from pathlib import Path

SCHEMA='JM.M001.PreRetirementExecution/CP31.v1'
CP13_SHA='5ec96f4c5bfc8a8d6b34d62e0d96c5558c8bffaac83ac631633c666f739d04fb'
REQUIRED=('direct_link_released','purpose_released','reserved_future_use_released',
          'recipient_route_released','source_frozen_role_released','current_head_safe',
          'lineage_and_flaz_reentry_verified')


def load_cp13(path):
    path=Path(path)
    if not path.is_file() or path.is_symlink(): raise ValueError('CP13_NOT_REGULAR')
    raw=path.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=CP13_SHA:
        if raw.endswith(b'\n') or hashlib.sha256(raw+b'\n').hexdigest()!=CP13_SHA:
            raise ValueError('CP13_SOURCE_PIN_MISMATCH')
    spec=importlib.util.spec_from_file_location('jm_m001_preexisting_cp13',str(path))
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    if tuple(module.NECESSARY)!=REQUIRED: raise ValueError('CP13_PURPOSE_SET_CHANGED')
    return module


def assess(inp, donor_path, cp13_path, now=None):
    """Return immutable report; block every native mutation regardless of flags."""
    if not isinstance(inp,dict) or not isinstance(inp.get('records'),list) or not inp['records']:
        raise ValueError('NONEMPTY_EVIDENCE_RECORDS_REQUIRED')
    if len(inp['records'])>100: raise ValueError('OVERBROAD_BATCH_REFUSED')
    cp13=load_cp13(cp13_path)
    gate=cp13.run(inp,donor_path,now=now or datetime.now(timezone.utc))
    # A CP13 decision is bound to its exact original row, not merely its
    # position. Refuse incomplete, reordered or substituted host evidence.
    if not isinstance(gate,dict) or not isinstance(gate.get('records'),list) or len(gate['records'])!=len(inp['records']):
        raise ValueError('CP13_RECORD_CARDINALITY_MISMATCH')
    # Bind the entire upstream custody summary to the expected read-only
    # CP13 contract; a mismatched summary cannot be called a valid receipt.
    if (gate.get('schema')!=cp13.SCHEMA or gate.get('record_count')!=len(inp['records'])
            or gate.get('native_mutations')!=0 or gate.get('retirement_authorised_count')!=0
            or gate.get('review_ready_count')!=sum(
                r.get('decision')=='REVIEW_READY_NEEDS_HOST_AUTHORIZATION'
                for r in gate['records'] if isinstance(r,dict))):
        raise ValueError('CP13_SUMMARY_OR_READ_ONLY_CONTRACT_MISMATCH')
    for row,proof in zip(inp['records'],gate['records']):
        if (not isinstance(row,dict) or not isinstance(proof,dict)
                or proof.get('schema')!=cp13.SCHEMA
                or proof.get('root_native_id')!=row.get('root_native_id')
                or proof.get('house_native_id')!=row.get('house_native_id')
                or proof.get('label')!=str(row.get('label',''))):
            raise ValueError('CP13_RECORD_IDENTITY_OR_ORDER_MISMATCH')
    out=[]
    seen=set()
    for row,proof in zip(inp['records'],gate['records']):
        ident=proof.get('root_native_id')
        holds=list(proof['hold_reasons'])
        if ident in seen: holds.append('REPEATED_ROOT_IDENTITY_REFUSED')
        seen.add(ident)
        if row.get('proposed_operation')!='delete_reversible':
            holds.append('OPERATION_NOT_SPECIFIED_AS_REVERSIBLE_TRASH')
        # Important: any owner-declared release remains only a CLAIM unless
        # the native host independently verifies it; CP13 is review-only.
        if proof['decision']=='REVIEW_READY_NEEDS_HOST_AUTHORIZATION':
            holds.append('HOST_MUST_INDEPENDENTLY_VERIFY_OWNER_RELEASE_AND_NATIVE_LINK_TRANSFER')
        out.append({'label':proof.get('label'),'root_native_id':ident,
                    'source_cp13_decision':proof['decision'],
                    'decision':'HOLD_NO_MUTATION','hold_reasons':holds,
                    'native_action_authorised':False,
                    'original_native_id_restored':False,
                    'gross_retirement_claimed_bytes':0,
                    'account_quota_savings_claimed_bytes':0})
    return {'schema':SCHEMA,'cp13_source_sha256':CP13_SHA,
            'record_count':len(out),'hold_count':len(out),
            'review_ready_requires_host_proof':gate['review_ready_count'],
            'retirement_authorised_count':0,'native_mutations':0,
            'gross_retirement_claimed_bytes':0,'measured_quota_savings_bytes':0,
            'records':out,
            'boundary':'READ_ONLY; do not call Library delete until evidence is authenticated by an independent host and precise owner native-ID role release is earned. This tool NEVER authorises deletion.'}


def _read_report_exact(path, written_stat):
    """Independently reopen the created report; never trust write acknowledgement."""
    flags=os.O_RDONLY | getattr(os,'O_NOFOLLOW',0)
    fd=os.open(path,flags)
    with os.fdopen(fd,'rb') as f:
        checked=os.fstat(f.fileno())
        if (checked.st_dev,checked.st_ino)!=(written_stat.st_dev,written_stat.st_ino):
            raise ValueError('REPORT_READBACK_IDENTITY_CHANGED')
        return f.read()


def write_once_verified(path, encoded):
    """Private, exclusive report write; verify the exact bytes before claiming success.

    On a failed readback, retain the anomalous file for owner-led investigation;
    never overwrite a pre-existing receipt or the evidence input.
    """
    path=Path(path)
    raw=encoded.encode('utf-8')
    flags=os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os,'O_NOFOLLOW',0)
    fd=os.open(path,flags,0o600)
    with os.fdopen(fd,'wb') as f:
        f.write(raw)
        f.flush()
        os.fsync(f.fileno())
        created=os.fstat(f.fileno())
    if _read_report_exact(path,created)!=raw:
        raise ValueError('REPORT_READBACK_MISMATCH')


def main(argv=None):
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--input',required=True)
    p.add_argument('--donor',required=True)
    p.add_argument('--cp13',default=str(Path(__file__).with_name('JM_M001_PURPOSE_AND_ACCESS_OVERLAY_CP13.py')))
    p.add_argument('--output')
    a=p.parse_args(argv)
    try:
        result=assess(json.loads(Path(a.input).read_text()),a.donor,a.cp13)
        encoded=json.dumps(result,indent=2,sort_keys=True)+'\n'
        if a.output:
            source=Path(a.input);dst=Path(a.output)
            if dst.is_symlink() or source.resolve()==dst.resolve() or dst.exists():
                raise ValueError('OUTPUT_OVERWRITE_OR_SYMLINK_REFUSED')
            write_once_verified(dst,encoded)
        print(encoded)
        return 3 # A review result is NEVER a successful deletion-admission exit.
    except (ValueError,OSError,TypeError,KeyError,AssertionError) as exc:
        print(json.dumps({'schema':SCHEMA,'decision':'HOLD_INVALID',
                          'error':str(exc)[:180],'native_mutations':0,
                          'retirement_authorised_count':0}))
        return 4
if __name__=='__main__':raise SystemExit(main())
