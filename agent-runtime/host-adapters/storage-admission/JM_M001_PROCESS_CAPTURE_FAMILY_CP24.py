#!/usr/bin/env python3
"""JM M001 CP24: purpose-preserving historic capture-family checkpoint compacting.

Recipient of existing M27/M28 role-closure evidence, NOT a new registry or a
file deletion tool. Historic candidate pressure is NEVER inferred as current
active Library residency, role release, or account quota saving.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path

SCHEMA = 'JM.M001.ProcessCaptureFamily/CP24.v1'
DONORS = {
 'm27': ('JM_LIBRARY_ROOT_MEDIA_RELATIONAL_CHECKPOINT_M27_2026-10-02.md',
         'ef80f07b676213020b54114beb4e9cf04d31c59b3b176b6f70c77ba07dd5d2b8'),
 'm28': ('JM_LIBRARY_ROOT_MEDIA_RELATIONAL_CHECKPOINT_M28_2026-10-02.md',
         'b81946f3c3bdb84c6200339156ef7d8b3e6dbbd15f330388a693043dae22a51b')
}
FAMILIES = (
 ('STORAGE_PROOF__','m27',23,4570243,'PROCESS_TRACE_HISTORICAL_REVIEW'),
 ('CLOUD_PROOF__','m28',16,4658335,'PROCESS_TRACE_HISTORICAL_REVIEW'),
 ('HANDWRITTEN_NON_LYRIC','m28',8,3586066,'PROTECT_PRIMARY_HANDWRITTEN_SOURCE'),
 ('GAME_PROOF_4','m28',4,3473856,'PROTECT_DIRECT_GAMEPLAY_EVIDENCE'),
 ('JM_GAME_BLUEPRINT_ATLAS','m28',8,3214600,'PROTECT_VISUAL_LINEAGE_AND_QA')
)

def read_donors(directory):
    root=Path(directory).resolve(strict=True)
    verified={}
    for name,(filename,expected) in DONORS.items():
        p=root/filename
        if p.is_symlink() or not p.is_file() or p.resolve().parent != root:
            raise ValueError('SOURCE_PATH_NOT_SAFE:'+name)
        raw=p.read_bytes()
        if hashlib.sha256(raw).hexdigest() != expected:
            raise ValueError('SOURCE_CHANGED:'+name)
        verified[name]=raw.decode('utf-8')
    return verified

def compile_family_receipt(donors, observed_root_names=None):
    m27,m28=donors['m27'],donors['m28']
    required={
      'm27': ('23 images / 4,570,243 B', 'CANDIDATE RETIRE / STORAGE OPERATIONAL TRACE',
              'No deletion executed.', 'Owner approval is still required before mutation.'),
      'm28': ('16 / 4,658,335 B', '8 / 3,586,066 B', '4 / 3,473,856 B',
              '8 / 3,214,600 B', 'No deletion')
    }
    for key,markers in required.items():
        for marker in markers:
            if marker not in donors[key]:
                raise ValueError('DONOR_EVIDENCE_MISSING:'+key)
    if observed_root_names is not None:
        if not isinstance(observed_root_names,list) or any(
            not isinstance(n,str) or not n for n in observed_root_names):
            raise ValueError('ROOT_NAMES_INVALID')
    rootset=set(observed_root_names or [])
    groups=[]
    for name,source,count,amount,status in FAMILIES:
        out={'family':name,'historic_source':source,'historical_count':count,
             'historical_bytes':amount,'historical_decision':status,
             'current_native_residency_proven':False,
             'retirement_authorised':False,'new_quota_savings_bytes':0,
             'individual_carriers_proven_released':0,
             'role':('historical_review_only' if status.startswith('PROCESS_TRACE')
                     else 'preserve_independent_original_or_evidence')}
        if observed_root_names is not None and name.endswith('__'):
            actual=sum(n.startswith(name) for n in rootset)
            out['provided_root_filename_observations']=actual
            out['listing_trust']='SUPPLIED_NAMES_NOT_INDEPENDENT_PROVIDER_VERIFICATION'
            out['root_absence_does_not_prove_deletion']=True
        groups.append(out)
    candidates=sum(g['historical_bytes'] for g in groups if g['role']=='historical_review_only')
    protected=sum(g['historical_bytes'] for g in groups if g['role']!='historical_review_only')
    if candidates!=9228578 or protected!=10274522:
        raise ValueError('FAMILY_AGGREGATE_CHANGED')
    return {'schema':SCHEMA,'source_pins':{k:v[1] for k,v in DONORS.items()},
       'historic_candidate_count':39,'historic_candidate_pressure_bytes_not_savings':candidates,
       'protected_source_and_visual_count':20,'protected_source_bytes':protected,
       'families':groups,'native_mutations':0,'retirement_authorised':False,
       'quota_savings_claimed_bytes':0,
       'boundary':('Historic M27/M28 classification only. No individual source hashes or '
         'current provider identity/role releases furnished here. Family labels are '
         'NOT specific deletion targets. Owner-approved native recovery and fresh '
         'residency proof remain separate authority.')}

def main(argv=None):
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--sources',required=True,help='Folder holding untouched original M27/M28')
    p.add_argument('--root-names-json',help='Optional local names array, not provider authentication')
    p.add_argument('--output',help='New private receipt; existing path refused')
    args=p.parse_args(argv)
    try:
        donors=read_donors(args.sources)
        names=None
        if args.root_names_json:
            source=Path(args.root_names_json)
            if source.is_symlink() or not source.is_file():
                raise ValueError('ROOT_LIST_NOT_REGULAR')
            names=json.loads(source.read_text(encoding='utf-8'))
        data=compile_family_receipt(donors,names)
        payload=json.dumps(data,ensure_ascii=False,sort_keys=True,separators=(',',':'))+'\n'
        if args.output:
            with Path(args.output).open('x',encoding='utf-8') as f:f.write(payload)
        else:print(payload,end='')
        return 0
    except (OSError,ValueError,KeyError,UnicodeError,TypeError) as exc:
        print(json.dumps({'schema':SCHEMA,'status':'HOLD_INVALID',
                           'reason_type':type(exc).__name__,
                           'native_mutations':0,'quota_savings_claimed_bytes':0}))
        return 2

if __name__ == '__main__':
    raise SystemExit(main())
