#!/usr/bin/env python3
"""JM UFC append-only encrypted archive custody. Never transmits plaintext/keys.

Run against a dedicated capsule inbox, not an arbitrary Estate folder. Requires the
independently saved sidecar checksum receipt. Verifies copied ciphertext readback.
No deletes, no moves, no network service dependencies. Operates only on declared
inbox and destination; actual cloud availability is the storage provider's duty.
"""
import argparse
import hashlib
import json
import os
import shutil
import sys
import tempfile
from pathlib import Path

MAGICS=(b'JMUFC01\n',b'JMUFCW02\n')

def digest(data):return hashlib.sha256(data).hexdigest()

def copy_exclusive_verified(data:bytes,target:Path):
    if target.exists():
        if digest(target.read_bytes())!=digest(data):raise RuntimeError('HOLD: target exists with different bytes '+str(target))
        return 'ALREADY_VERIFIED'
    target.parent.mkdir(parents=True,exist_ok=True)
    with target.open('xb') as out:
        out.write(data);out.flush();os.fsync(out.fileno())
    if digest(target.read_bytes())!=digest(data):
        target.unlink(missing_ok=True)
        raise RuntimeError('HOLD: readback mismatch')
    return 'NEW_VERIFIED'

def copy_one(archive:Path,destination:Path):
    if archive.suffix!='.jmufc' or not archive.is_file() or archive.is_symlink():raise ValueError('Only regular .jmufc source files')
    # Python exports <name>.jmufc.receipt.json; Android/browser exports <name>.receipt.json.
    matches=[p for p in (Path(str(archive)+'.receipt.json'),archive.with_suffix('.receipt.json')) if p.is_file()]
    if len(matches)!=1:raise RuntimeError('HOLD: expected exactly one sidecar receipt (missing/ambiguous)')
    receipt_file=matches[0]
    if receipt_file.is_symlink():raise RuntimeError('HOLD: symlink receipt disallowed')
    if archive.stat().st_size>300*1024*1024:raise RuntimeError('HOLD: archive exceeds bounded copy size')
    raw=archive.read_bytes();receipt_raw=receipt_file.read_bytes()
    if len(receipt_raw)>512*1024 or not any(raw.startswith(m) for m in MAGICS):raise RuntimeError('HOLD: malformed carrier/receipt')
    receipt=json.loads(receipt_raw)
    if receipt.get('encrypted_archive_sha256')!=digest(raw):raise RuntimeError('HOLD: ciphertext SHA mismatch')
    if not isinstance(receipt.get('capsule_id'),str) or not isinstance(receipt.get('root_hash'),str):raise RuntimeError('HOLD: incomplete receipt')
    # Digest identity prevents arbitrary filename collisions or mistaken creation identity.
    stem=receipt['capsule_id']+'--'+digest(raw)[:16]
    folder=destination/stem
    # A successful idempotent retry must never delete/change an existing good item.
    stored=folder/(stem+'.jmufc');stored_receipt=folder/(stem+'.receipt.json')
    stored_status=copy_exclusive_verified(raw,stored)
    receipt_status=copy_exclusive_verified(receipt_raw,stored_receipt)
    return {'source':archive.name,'capsule_id':receipt['capsule_id'],'sha256':digest(raw),'archive':str(stored),
            'receipt':str(stored_receipt),'archive_status':stored_status,'receipt_status':receipt_status,
            'proof_boundary':'CIPHERTEXT_CHECKSUM_AND_READBACK_ONLY; full decryption requires secret'}

def run(inbox:Path,destination:Path):
    inbox=inbox.resolve(); destination=destination.resolve()
    if not inbox.is_dir():raise RuntimeError('HOLD: inbox not found')
    if not destination.is_dir():raise RuntimeError('HOLD: destination not mounted / not accessible')
    if inbox==destination or inbox in destination.parents or destination in inbox.parents:raise RuntimeError('HOLD: recursive/overlapping storage scope')
    results=[]; failures=[]
    for path in sorted(inbox.glob('*.jmufc')):
        try:results.append(copy_one(path,destination))
        except (OSError,ValueError,RuntimeError,json.JSONDecodeError) as exc:failures.append({'source':path.name,'error':str(exc)})
    return {'format':'JM.UFC.CustodyReceipt/1','success':not failures,'copied_or_checked':len(results),'failed':len(failures),'results':results,'holds':failures}

if __name__=='__main__':
    p=argparse.ArgumentParser(description='Evidence-based copy of encrypted capsules to independent custody')
    p.add_argument('--inbox',required=True,type=Path)
    p.add_argument('--destination',required=True,type=Path)
    a=p.parse_args()
    try:
        r=run(a.inbox,a.destination);print(json.dumps(r,indent=2));sys.exit(0 if r['success'] else 2)
    except (OSError,ValueError,RuntimeError) as exc:
        print('UFC CUSTODY HOLD:',exc,file=sys.stderr);sys.exit(2)
