#!/usr/bin/env python3
import json
from pathlib import Path

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]

def load(name): return json.loads((HERE/name).read_text(encoding='utf-8'))
def need(ok,msg):
    if not ok: raise SystemExit(msg)

census=load('JM_61_ROLE_QUALIFIED_CODING_CENSUS.json')
coverage=load('MATURATION_COVERAGE.json')
p5=load('P5_REMAINING_19_MATURATION.json')
ids=[row[2] for row in census['identity']]
current=coverage['current_crowned_ids']
p5_ids=p5.get('crowned_ids',p5.get('pending_ids',[]))

need(len(ids)==61 and len(set(ids))==61,'Role-qualified census must be 61 unique identities')
need(len(p5_ids)==19 and len(set(p5_ids))==19,'P5 must contain 19 unique identities')

groups=p5['groups']
group_ids=[]
for group in groups.values():
    group_ids.extend(group['ids'])
    for key in ('implementation','selftest'):
        path=ROOT/group[key]
        need(path.is_file(),f'Missing P5 {key}: {group[key]}')
need(len(group_ids)==19 and len(set(group_ids))==19,'P5 groups overlap or do not total 19')
need(set(group_ids)==set(p5_ids),'P5 groups do not equal P5 identity set')

if p5['status']=='IMPLEMENTED_CI_PENDING_NO_CROWN':
    pending=coverage['pending_ids']
    need(coverage['pending_phase']=='P5_REMAINING_19_MATURATION','Coverage pending phase mismatch')
    need(pending==p5_ids,'Coverage/P5 pending ID mismatch')
    need(len(current)==42 and len(set(current))==42,'P5 pending baseline must be 42 unique crowned IDs')
    need(set(current).isdisjoint(pending),'P5 overlaps crowned set')
    need(set(ids)-set(current)==set(pending),'P5 is not exact complement of crowned set')
    mode='pending'
elif p5['status']=='CI_PROVEN_CURRENT_NATIVE_DING_CROWNED':
    need(coverage['pending_phase'] is None and coverage['pending_ids']==[],'Crowned P5 must have no pending coverage')
    need(coverage['current_crowned_count']==61 and len(current)==61 and len(set(current))==61,'Crowned coverage must be 61 unique IDs')
    need(set(current)==set(ids),'Crowned coverage must equal exact 61 census')
    need(coverage['remaining_count']==0,'Crowned P5 must leave zero remaining')
    need(coverage['coverage_basis'].get('P5_REMAINING_19_MATURATION')==p5_ids,'P5 crowned coverage group mismatch')
    need(p5.get('coverage_after_ding')==61 and p5.get('remaining_after_ding')==0,'P5 seal counts mismatch')
    proof=p5.get('ci_proof',{})
    need(proof.get('conclusion')=='success' and proof.get('run_id')==33045638498,'P5 CI proof missing or wrong')
    mode='crowned'
else:
    raise SystemExit(f"Unsupported P5 status: {p5['status']}")

source=groups['source_aware_final_five']['source_authorities']
need(source['gameforge']['sha256']=='a2d814c947a80cd00d9bfae7086e004179c8d3b6c9876a922a4b3e8b3b2d2adb','GameForge authority mismatch')
need(source['glyphforge']['sha256']=='93e03de9c71e46907681e3c30eec11bf63c1c5f89b10fb9ae2a8343aa8b964d3','GlyphForge authority mismatch')
need(source['playform']['sha256']=='60da0d1f303a1e17d3580d3261123bbdd51f9f7022199fee0f502fa60e70839d','PLAYFORM authority mismatch')
need(source['glyphplay']['boundary']=='PROTECTED_LINEAGE_NODE_NOT_SOURCE_AUTHORITY','GlyphPlay source boundary weakened')
need('MMZG' in ' '.join(p5['identity_boundaries']) and 'MorseMinus' in ' '.join(p5['identity_boundaries']),'MorseMinus/MMZG distinction missing')

print(json.dumps({
  'schema':'jm.p5-remaining-19-validation/1.1',
  'passed':True,
  'mode':mode,
  'crowned':len(current),
  'p5Identities':len(p5_ids),
  'remaining':coverage['remaining_count'],
  'groups':{name:len(group['ids']) for name,group in groups.items()},
  'sourceAuthorityHashesBound':True
},indent=2))
