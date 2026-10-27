#!/usr/bin/env python3
"""JM M001 CP15 independent provider-byte contact, read-only.

Additive to the existing M001 CP13 Purpose/Access overlay. The caller supplies
locally materialized files and provider metadata captured by a connector.
The script verifies physical bytes and safety bounds but CANNOT authenticate
connector-origin claims from JSON alone. No release or delete operations exist.
"""
import argparse,hashlib,importlib.util,json,os,re,stat
from pathlib import Path
SCHEMA='JM.M001.ProviderContact/CP15.1'
OVERLAY_SHA='5ec96f4c5bfc8a8d6b34d62e0d96c5558c8bffaac83ac631633c666f739d04fb'
NATIVE=re.compile(r'^libfile_[0-9a-f]{32}$')
DROPBOX=re.compile(r'^id:[A-Za-z0-9_-]+$')
SHA=re.compile(r'^[0-9a-f]{64}$')
MAX=256*1024*1024

def _read_only_regular(path):
    p=Path(path)
    if p.is_symlink() or not p.is_file():raise ValueError('NON_REGULAR_OR_SYMLINK')
    st=p.stat()
    if not stat.S_ISREG(st.st_mode) or st.st_size>MAX:raise ValueError('SIZE_OR_TYPE_REFUSED')
    return p,st

def parent_import(overlay,donor):
    p,st=_read_only_regular(overlay)
    if hashlib.sha256(p.read_bytes()).hexdigest()!=OVERLAY_SHA:raise ValueError('CP13_OVERLAY_SHA_MISMATCH')
    spec=importlib.util.spec_from_file_location('jm_cp13_protected_overlay',p)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    return module,module.donor_import(donor)

def evaluate(row, overlay,donor):
    out={'schema':SCHEMA,'family':str(row.get('family','')),'decision':'HOLD',
         'contact':'INVALID','retirement_authorised':False,'native_mutations':0,
         'credited_library_reclaim_bytes':0,'evidence_origin':'UNAUTHENTICATED_LOCAL_INPUT',
         'hold_reasons':[]}
    reasons=out['hold_reasons']
    try:
        a,ast=_read_only_regular(row['library_snapshot_path'])
        b,bst=_read_only_regular(row['provider_readback_path'])
        if os.path.samefile(a,b) or a.resolve()==b.resolve():raise ValueError('NOT_INDEPENDENT_FILE_OBJECTS')
        if not NATIVE.fullmatch(str(row['library_native_id'])):raise ValueError('NATIVE_ID_INVALID')
        if not DROPBOX.fullmatch(str(row['provider_file_id'])):raise ValueError('DROPBOX_ID_INVALID')
        if not SHA.fullmatch(str(row['expected_sha256'])):raise ValueError('EXPECTED_HASH_INVALID')
        if ast.st_size!=bst.st_size or ast.st_size!=row['expected_bytes']:raise ValueError('BYTE_COUNT_MISMATCH')
        prov=row.get('provider_metadata')
        if not isinstance(prov,dict) or prov.get('id')!=row['provider_file_id'] or prov.get('size')!=bst.st_size or prov.get('is_downloadable') is not True:
            raise ValueError('PROVIDER_METADATA_CLAIM_INCOMPLETE')
        proof=donor.assess(str(a),str(b))
        if proof['state']!='SAME_BYTES_ROLE_HOLD' or proof.get('whole_byte_equality') is not True:raise ValueError('DONOR_REJECTED_BYTES')
        if proof['candidate_sha256']!=row['expected_sha256'] or proof['keeper_sha256']!=row['expected_sha256']:raise ValueError('HASH_MISMATCH')
        out.update({'contact':'EXACT_FILE_BYTES','source_sha256':proof['candidate_sha256'],'provider_readback_sha256':proof['keeper_sha256'],
                    'bytes':ast.st_size,'separate_file_objects':True,'source_type':'snapshot',
                    'provider_metadata_ref':row['provider_file_id']})
        reasons.append('COLD_BYTES_MATCH_BUT_CONNECTOR_ORIGIN_NOT_CRYPTOGRAPHICALLY_AUTHENTICATED_BY_LOCAL_SCRIPT')
        reasons.append('CURRENT_LIBRARY_RESIDENCY_AND_ALL_PURPOSE_ROLES_REQUIRE_HOST_GATES')
        reasons.append('ORIGINAL_NATIVE_DOWNLOAD_ID_ROLE_NOT_RELEASED')
    except (KeyError,ValueError,TypeError,OSError,AssertionError) as e:
        reasons.append('CONTACT_REFUSED:'+str(e)[:150])
    return out

def run(records,overlay_path,donor_path):
    overlay,donor=parent_import(overlay_path,donor_path)
    if not isinstance(records,list) or len(records)>100:raise ValueError('BOUNDED_RECORD_ARRAY_REQUIRED')
    rows=[evaluate(x,overlay,donor) for x in records]
    return {'schema':SCHEMA,'count':len(rows),'exact_contact_count':sum(r['contact']=='EXACT_FILE_BYTES' for r in rows),
            'held_count':len(rows),'native_mutations':0,'account_quota_bytes_claimed':0,
            'records':rows,'boundary':'Local byte contact; provider origin bound only to externally authenticated connector session; no native retirement authority.'}

def main():
    p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--overlay',required=True);p.add_argument('--donor',required=True);p.add_argument('--output',required=True)
    a=p.parse_args();x=run(json.loads(Path(a.input).read_text())['records'],a.overlay,a.donor)
    Path(a.output).write_text(json.dumps(x,indent=2,sort_keys=True)+'\n')
    print(json.dumps({'exact_contacts':x['exact_contact_count'],'held':x['held_count'],'native_mutations':0}))
if __name__=='__main__':main()
