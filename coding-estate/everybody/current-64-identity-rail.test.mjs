import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {reconcileCodingEstate} from './current-64-identity-rail.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const json = relative => JSON.parse(readFileSync(join(here,relative),'utf8'));
function sources() {
  const parts=['body-registry.json','body-registry-extension-01.json','body-registry-extension-02.json'].map(json);
  return {
    federation: {schema:'jm.everybody.registry-federation/1.1',bodies:parts.flatMap(p=>p.bodies)},
    current:json('../JM_CODING_ESTATE_CURRENT_64.json'),
    policy:json('../JM_CODING_BODY_ACTIVATION_POLICY_v0_1.json')
  };
}
function clone(x){return structuredClone(x)}
test('actual source: 100 distinct native identities',()=>{
  const s=sources(), ids=s.federation.bodies.map(b=>b.id);
  assert.equal(ids.length,100);assert.equal(new Set(ids).size,100);
});
test('actual source: reconciles 100 / 64 / 12 without identity collapse',()=>{
  const s=sources(),r=reconcileCodingEstate(s.federation,s.current,s.policy);
  assert.deepEqual(r.counts,{
    native:100,currentCoding:64,baselineSelected:12,currentAvailable:52,
    linked:60,nativeOnly:40,currentWithoutFixture:4,adjacentNonCode:44
  });
});
test('four current seats without 100-native fixture are explicitly held',()=>{
  const s=sources(),r=reconcileCodingEstate(s.federation,s.current,s.policy);
  assert.deepEqual(r.unmounted.map(x=>x.name),[
    'JM Visualang','JM JudgeMaker','JM JangleMonitor','JM JourMaze'
  ]);
  assert.deepEqual(r.unmounted.filter(x=>x.baseline==='BASELINE_ROUTE_SELECTED').map(x=>x.codeId),[62,63,64]);
});
test('selected route does not claim OS execution or historical native proof',()=>{
  const s=sources(),r=reconcileCodingEstate(s.federation,s.current,s.policy);
  assert.match(r.proofBoundary,/Not proof of independent process execution/);
  assert.match(r.proofBoundary,/historical grammar recovery/);
});
test('fail closed on wrong federation schema',()=>{
  const s=sources();s.federation.schema='wrong';
  assert.throws(()=>reconcileCodingEstate(s.federation,s.current,s.policy),/federation schema/);
});
test('fail closed on wrong current schema',()=>{
  const s=sources();s.current.schema='wrong';
  assert.throws(()=>reconcileCodingEstate(s.federation,s.current,s.policy),/current64 schema/);
});
test('fail closed on wrong policy schema',()=>{
  const s=sources();s.policy.schema='wrong';
  assert.throws(()=>reconcileCodingEstate(s.federation,s.current,s.policy),/activation policy schema/);
});
test('fail closed on duplicate native IDs',()=>{
  const s=sources();s.federation.bodies[1].id=s.federation.bodies[0].id;
  assert.throws(()=>reconcileCodingEstate(s.federation,s.current,s.policy),/collision/);
});
test('fail closed on missing current seat',()=>{
  const s=sources();s.current.identities.pop();
  assert.throws(()=>reconcileCodingEstate(s.federation,s.current,s.policy),/64 coding identities/);
});
test('fail closed on duplicate current slug',()=>{
  const s=sources();s.current.identities[1].slug=s.current.identities[0].slug;
  assert.throws(()=>reconcileCodingEstate(s.federation,s.current,s.policy),/duplicated/);
});
test('fail closed on out of order code IDs',()=>{
  const s=sources();s.current.identities[12].code_id=63;
  assert.throws(()=>reconcileCodingEstate(s.federation,s.current,s.policy),/out of order/);
});
test('fail closed on foreign policy selection',()=>{
  const s=sources();s.policy.baseline_active[0].code_id=999;
  assert.throws(()=>reconcileCodingEstate(s.federation,s.current,s.policy),/baseline selection/);
});
test('fail closed on repeated policy selection',()=>{
  const s=sources();s.policy.baseline_active[1].code_id=s.policy.baseline_active[0].code_id;
  assert.throws(()=>reconcileCodingEstate(s.federation,s.current,s.policy),/baseline selection/);
});
test('fail closed on fabricated policy source path',()=>{
  const s=sources();s.policy.current64_registry='other-authority.json';
  assert.throws(()=>reconcileCodingEstate(s.federation,s.current,s.policy),/policy source boundary/);
});
test('fail closed on adjacent organ/count inflation',()=>{
  const s=sources();s.current.counts.adjacent_non_code_organs=45;
  assert.throws(()=>reconcileCodingEstate(s.federation,s.current,s.policy),/count boundary/);
});
