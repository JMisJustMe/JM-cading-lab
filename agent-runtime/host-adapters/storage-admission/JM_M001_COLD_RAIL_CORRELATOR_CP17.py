#!/usr/bin/env python3
"""JM M001 CP17 -- read-only native/cold metadata correlation.

An additive *discovery* recipient for M001 CP13 purpose/access and CP16
provider-byte contact; neither replaces nor imports their proof authority.

Matching names/sizes are merely contact leads. They NEVER prove exact bytes,
role redundancy, future-use release, connector-origin authentication, or
permission to Trash an original Library identity. No network or mutation.
"""
from __future__ import annotations
import argparse
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

SCHEMA = 'JM.M001.ColdRailCorrelator/CP17.1'
MAX_ITEMS = 20000
MAX_NAME = 512
HEX_ID = re.compile(r'^libfile_[0-9a-f]{32}$')
DROPBOX_ID = re.compile(r'^id:[A-Za-z0-9_-]+$')


def name_check(value):
    if not isinstance(value, str) or not (1 <= len(value) <= MAX_NAME):
        raise ValueError('INVALID_FILENAME')
    if value != unicodedata.normalize('NFC', value):
        raise ValueError('NON_NFC_NAME')
    if '/' in value or '\\' in value or value in ('.','..'):
        raise ValueError('UNSAFE_OR_PATH_NAME')
    if any(ord(ch) < 32 or ord(ch) == 127 for ch in value):
        raise ValueError('CONTROL_IN_FILENAME')
    return value


def validate(rows, expected_rail):
    if not isinstance(rows, list) or len(rows) > MAX_ITEMS:
        raise ValueError('UNBOUNDED_OR_NONARRAY_INVENTORY')
    out=[]
    seen=set()
    for j, row in enumerate(rows):
        if not isinstance(row, dict):
            raise ValueError('NONOBJECT_INVENTORY_ROW')
        name = name_check(row.get('name'))
        size = row.get('bytes')
        if type(size) is not int or not 0 <= size < 10**13:
            raise ValueError('SIZE_UNTRUSTED')
        native = row.get('id')
        if not isinstance(native,str):
            raise ValueError('IDENTITY_NOT_STRING')
        pattern = HEX_ID if expected_rail=='library' else DROPBOX_ID
        if not pattern.fullmatch(native):
            raise ValueError('RAIL_NATIVE_ID_INVALID')
        if native in seen:raise ValueError('DUPLICATED_SAME_RAIL_IDENTITY')
        seen.add(native)
        out.append({'name':name,'bytes':size,'id':native,'rail':expected_rail,'row':j})
    return out


def correlate(library,provider):
    lib=validate(library,'library')
    db=validate(provider,'dropbox')
    by_l=defaultdict(list); by_d=defaultdict(list)
    for row in lib:by_l[row['name']].append(row)
    for row in db:by_d[row['name']].append(row)
    findings=[]
    matched_lib=set(); matched_db=set()
    for name in sorted(by_l.keys() & by_d.keys()):
        ls=by_l[name]; ds=by_d[name]
        # Ambiguous multi-identities are not silently paired, even if sizes match.
        if len(ls)!=1 or len(ds)!=1:
            kind='AMBIGUOUS_MULTIPLE_IDENTITIES_KEEP_ALL'
        elif ls[0]['bytes'] != ds[0]['bytes']:
            kind='SAME_NAME_DIFFERENT_BYTES_KEEP_BOTH'
        else:
            kind='SAME_NAME_SIZE_CANDIDATE_NEEDS_SHA_CONTACT'
        for l in ls:matched_lib.add(l['id'])
        for d in ds:matched_db.add(d['id'])
        findings.append({'name':name,'signal':kind,
            'library': [{'id':x['id'],'bytes':x['bytes']} for x in ls],
            'provider':[{'id':x['id'],'bytes':x['bytes']} for x in ds],
            'next_proof': 'CP16 exact native/provider byte contact, then CP13 purpose/access/owner release separately' if kind.endswith('SHA_CONTACT') else 'Keep every separately purposed body; investigate exact content and role',
            'decision':'KEEP_ALL', 'retirement_authorised':False,
            'credited_reclaimed_bytes':0})
    return {'schema':SCHEMA,'library_count':len(lib),'provider_count':len(db),
        'same_name_groups':len(findings),
        'same_name_size_leads':sum(x['signal']=='SAME_NAME_SIZE_CANDIDATE_NEEDS_SHA_CONTACT' for x in findings),
        'same_name_different_size_holds':sum(x['signal']=='SAME_NAME_DIFFERENT_BYTES_KEEP_BOTH' for x in findings),
        'ambiguous_groups':sum(x['signal']=='AMBIGUOUS_MULTIPLE_IDENTITIES_KEEP_ALL' for x in findings),
        'library_unmatched':len(lib)-len(matched_lib),
        'provider_unmatched':len(db)-len(matched_db),
        'native_mutations':0, 'reclaimed_bytes':0,
        'provider_origin_authenticated':False,
        'findings':findings,
        'boundary':'Read-only, untrusted metadata correlation; exact bytes, intended uses, owner/download route release and actual quota remain separate.'}


def main():
    p=argparse.ArgumentParser(description='M001 CP17 read-only Library/Dropbox metadata correlator')
    p.add_argument('--library', required=True)
    p.add_argument('--dropbox', required=True)
    p.add_argument('--output', required=True)
    a=p.parse_args()
    src=[Path(a.library).resolve(),Path(a.dropbox).resolve()]
    dest=Path(a.output).resolve()
    if dest in src or dest.exists() or dest.is_symlink():
        raise SystemExit('OUTPUT_MUST_BE_NEW_AND_DISTINCT')
    data=correlate(json.loads(src[0].read_text()),json.loads(src[1].read_text()))
    # Exclusive file creation; no rewrite of input or existing output.
    with dest.open('x') as stream:
        json.dump(data,stream,indent=2,ensure_ascii=False,sort_keys=True)
        stream.write('\n')
    print(json.dumps({k:v for k,v in data.items() if k not in ('findings','boundary')}))

if __name__=='__main__': main()
