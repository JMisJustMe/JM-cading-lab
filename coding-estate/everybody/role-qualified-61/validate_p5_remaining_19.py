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
pending=p5['pending_ids']

need(coverage['pending_phase']=='P5_REMAINING_19_MATURATION','Coverage pending phase mismatch')
need(coverage['pending_ids']==pending,'Coverage/P5 pending ID mismatch')
need(len(current)==42 and len(set(current))==42,'P5 baseline must be 42 unique crowned IDs')
need(len(pending)==19 and len(set(pending))==19,'P5 must contain 19 unique pending IDs')
need(set(current).isdisjoint(pending),'P5 overlaps crowned set')
need(set(ids)-set(current)==set(pending),'P5 is not exact complement of crowned set')
need(set(current)|set(pending)==set(ids),'42 + 19 must equal the exact 61 census')

groups=p5['groups']
group_ids=[]
for group in groups.values():
    group_ids.extend(group['ids'])
    for key in ('implementation','selftest'):
        path=ROOT/group[key]
        need(path.is_file(),f'Missing P5 {key}: {group[key]}')
need(len(group_ids)==19 and len(set(group_ids))==19,'P5 groups overlap or do not total 19')
need(set(group_ids)==set(pending),'P5 groups do not equal pending set')

source=groups['source_aware_final_five']['source_authorities']
need(source['gameforge']['sha256']=='a2d814c947a80cd00d9bfae7086e004179c8d3b6c9876a922a4b3e8b3b2d2adb','GameForge authority mismatch')
need(source['glyphforge']['sha256']=='93e03de9c71e46907681e3c30eec11bf63c1c5f89b10fb9ae2a8343aa8b964d3','GlyphForge authority mismatch')
need(source['playform']['sha256']=='60da0d1f303a1e17d3580d3261123bbdd51f9f7022199fee0f502fa60e70839d','PLAYFORM authority mismatch')
need(source['glyphplay']['boundary']=='PROTECTED_LINEAGE_NODE_NOT_SOURCE_AUTHORITY','GlyphPlay source boundary weakened')
need('MMZG' in ' '.join(p5['identity_boundaries']) and 'MorseMinus' in ' '.join(p5['identity_boundaries']),'MorseMinus/MMZG distinction missing')

print(json.dumps({
  'schema':'jm.p5-remaining-19-validation/1.0',
  'passed':True,
  'baselineCrowned':len(current),
  'pending':len(pending),
  'target':len(ids),
  'groups':{name:len(group['ids']) for name,group in groups.items()},
  'exactComplement':True,
  'sourceAuthorityHashesBound':True
},indent=2))
