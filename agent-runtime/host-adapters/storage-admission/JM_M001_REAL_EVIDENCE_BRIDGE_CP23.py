#!/usr/bin/env python3
"""JM M001 CP23: pinned CP05 donor evidence -> CP22 lineage ledger.

Only historic, owner-controlled manifests read as local files. This does not
extract new media, contact the Library provider, release distinct uses, or
write/delete original sources. Never upload private JSON to public GitHub.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path

SCHEMA = 'JM.M001.RealEvidenceBridge/CP23.v1'
PINS = {
    'graph': ('JM_MAGNIFYING_GLASS_CP04_PURPOSE_GRAPH.json',
              '7fa33c2ce04e9cf82de7df90a40e3c40038d36be9cb3192a8417b6e0b18a76fa'),
    'media': ('JM_MEDIA_CP02_IMAGE_PROOF_MANIFEST_2026-10-27.json',
              '887ef1b92fa46181ca91c95728f7679b9605b53fac0873463bc7cdab59b4ebb2'),
    'cold': ('JM_MEDIA_CP12_COMPLETED_RUNS_MANIFEST_2026-10-27.json',
             '3b29b11ddcb2b1b92cb29ae462007c563747d4030c60fe5bca189a83dcf73431'),
}

def pin_read(root):
    root = Path(root).resolve(strict=True)
    out = {}
    for k, (filename, expected) in PINS.items():
        path = root / filename
        if path.is_symlink() or not path.is_file() or path.resolve().parent != root:
            raise ValueError('UNSAFE_OR_MISSING_PINNED_SOURCE:'+k)
        raw = path.read_bytes()
        if hashlib.sha256(raw).hexdigest() != expected:
            raise ValueError('PIN_CHANGED:'+k)
        out[k] = json.loads(raw)
    return out

def make_manifest(s):
    g, media, cold = s['graph'], s['media'], s['cold']
    if g.get('protocol') != 'JM.MagnifyingGlass.PurposeGraph/1.0':
        raise ValueError('GRAPH_PROTOCOL_CHANGED')
    graph_content = dict(g)
    digest = graph_content.pop('graph_sha256', None)
    if digest != hashlib.sha256(json.dumps(graph_content,sort_keys=True,separators=(',',':')).encode()).hexdigest():
        raise ValueError('GRAPH_INTERNAL_HASH_MISMATCH')
    if len(g.get('results', [])) != 5 or g.get('total_protected_bytes') != 121982683 or g.get('retirement_eligible_count') != 0:
        raise ValueError('GRAPH_CASE_OR_PROTECTION_CHANGED')
    if media.get('checkpoint') != 'JM_MEDIA_CP02_LOSSLESS_CONTACT_2026-10-27' or media.get('image_count') != 25 or media.get('project_count') != 7 or media.get('actual_library_reclaimed_bytes') != 0:
        raise ValueError('MEDIA_SOURCE_CHANGED')
    if sum(r['original_bytes'] for r in media['entries']) != 71586381:
        raise ValueError('MEDIA_TOTAL_MISMATCH')
    if cold.get('schema') != 'JM.MEDIA.CP12.FullRuns/1.0' or len(cold.get('originals',[])) != 4 or sum(r['bytes'] for r in cold['originals']) != 111404919 or cold.get('economics',{}).get('this_run_library_reclaimed_bytes') != 0:
        raise ValueError('COLD_EDITION_OR_CUSTODY_CHANGED')

    records = []
    for i, case in enumerate(g['results']):
        if case.get('verdict') != 'HOLD_PROTECTED_INDEPENDENT_PURPOSE' or case.get('retirement_eligible') is not False or case.get('reclaim_credit_bytes') != 0:
            raise ValueError('INDEPENDENT_PURPOSE_REGRESSED')
        if case['root_contact']['sha256'] != case['expected_sha256'] or case['root_contact']['bytes'] != case['root_bytes']:
            raise ValueError('ROOT_CONTACT_REGRESSED')
        roles = {r['kind']:r for r in case['roles']}
        if not all(x in roles for x in ('root_delivery','house_lineage','reserved_or_unobserved')):
            raise ValueError('ROLE_SET_INCOMPLETE')
        for carrier_type in ('root','house'):
            role = 'root_delivery' if carrier_type == 'root' else 'house_lineage'
            identity = case[carrier_type+'_id']
            if roles[role].get('carrier_id') != identity:
                raise ValueError('ROLE_ID_MISMATCH')
            records.append({'carrier_id':identity,'body_id':case['project'],
                'version':'CP04_VERSION_NOT_INDIVIDUALLY_RESOLVED',
                'event_id':'CP04_CASE_'+str(i+1),
                'event_summary':case['project']+' / protected '+carrier_type+' carrier',
                'kind':'version','purpose':'recovery_anchor',
                'bytes':case['root_bytes'],'sha256':case['expected_sha256'],
                'separate_uses':[role+':'+roles[role]['status'],
                    'independently_protected_root_house','unobserved_future_use_not_ruled_out'],
                'extracted_facts':['relationship:'+case['byte_relationship'],
                    'historical_contact:'+case[carrier_type+'_contact']['status']],
                'proof_refs':['CP04_GRAPH_SHA256:'+PINS['graph'][1]],
                'recovery_refs':[],'extraction_complete':False,
                'structured_custody_verified':False,'use_review':'not_cleared'})
    for r in media['entries']:
        sid = hashlib.sha256((r['project']+'\0'+r['name']).encode()).hexdigest()
        records.append({'carrier_id':'JM.CP02.MEDIA.'+sid,'body_id':r['project'],
            'version':'CP02_ORIGINAL_VERSION_UNRESOLVED','event_id':'CP02_MEDIA_'+sid[:16],
            'event_summary':r['name'],'kind':'image','purpose':'creative_original',
            'bytes':r['original_bytes'],'sha256':r['original_sha256'],
            'separate_uses':['creative_visual_original','future_recipient_uses_not_exhausted'],
            'extracted_facts':['format:'+r['original_format'],
                'pixel_sha256:'+r['pixel_sha256'],
                'optimisation_candidate_not_source_replacement'],
            'proof_refs':['CP02_MANIFEST_SHA256:'+PINS['media'][1]],
            'recovery_refs':[],'extraction_complete':False,
            'structured_custody_verified':False,'use_review':'not_cleared'})
    for r in cold['originals']:
        records.append({'carrier_id':r['library_original_id'],
            'body_id':'JM.WebsiteEdition.'+r['name'],
            'version':r['name'],'event_id':'CP12_EDITION_ORIGINAL',
            'event_summary':r['protected_role'],'kind':'version','purpose':'recovery_anchor',
            'bytes':r['bytes'],'sha256':r['sha256'],
            'separate_uses':['independent_website_edition','original_download_role_not_released'],
            'extracted_facts':['zip_members:'+str(r['zip_members']),
                'historical_provider_recovery_claim:'+str(r['recovered_from_drive_exact_sha256'])],
            'proof_refs':['CP12_MANIFEST_SHA256:'+PINS['cold'][1]],
            'recovery_refs':[],'extraction_complete':False,
            'structured_custody_verified':False,'use_review':'not_cleared'})
    if len(records) != 39 or len({x['carrier_id'] for x in records}) != 39:
        raise ValueError('LOSS_OF_DISTINCT_CARRIER_IDENTITY')
    return {'schema':'JM.M001.PostprocessInput/1','records':records}

def run(source_dir, cp22_source):
    p = Path(cp22_source)
    if p.is_symlink() or not p.is_file():
        raise ValueError('CP22_SOURCE_MISSING_OR_UNSAFE')
    spec = importlib.util.spec_from_file_location('jm_m001_existing_cp22',p)
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    if module.SCHEMA != 'JM.M001.PostprocessRetention/CP22.v1':
        raise ValueError('CP22_SCHEMA_CHANGED')
    out = module.compile_manifest(make_manifest(pin_read(source_dir)))
    if out['carrier_count'] != 39 or out['review_count'] != 0 or out['native_mutations'] != 0 or out['retirement_authorised'] is not False or out['quota_savings_claimed_bytes'] != 0:
        raise ValueError('RETENTION_GATE_REGRESSED')
    return {'schema':SCHEMA,'contact_scope':'PINNED_HISTORICAL_DONORS_NOT_FRESH_PROVIDER_CONTACT',
        'source_pins':{k:v[1] for k,v in PINS.items()},
        'cp22':out,'native_mutations':0,'quota_savings_claimed_bytes':0}

def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--sources',required=True)
    p.add_argument('--cp22',default=str(Path(__file__).with_name('JM_M001_POSTPROCESS_RETENTION_CP22.py')))
    p.add_argument('--output',help='New local private receipt, refusing overwrite')
    a = p.parse_args(argv)
    try:
        result = run(a.sources,a.cp22)
        if a.output:
            with Path(a.output).open('x',encoding='utf-8') as f:
                json.dump(result,f,sort_keys=True,ensure_ascii=False,separators=(',',':'))
                f.write('\n')
        # Avoid printing private ids and artifact names from the source manifests.
        out = result['cp22']
        print(json.dumps({'schema':SCHEMA,'pinned_sources':3,'carriers':out['carrier_count'],
            'lineages':out['lineage_count'],'review_only':out['review_count'],
            'native_mutations':0,'quota_savings_claimed_bytes':0},sort_keys=True))
        return 0
    except (OSError,ValueError,KeyError,TypeError,ImportError,json.JSONDecodeError) as e:
        print(json.dumps({'schema':SCHEMA,'status':'HOLD_INVALID',
            'reason_type':type(e).__name__,'native_mutations':0,
            'quota_savings_claimed_bytes':0}))
        return 2

if __name__ == '__main__':
    raise SystemExit(main())
