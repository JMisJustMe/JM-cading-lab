import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyRouteConsequences,invalidBytecodeProof,loopProtection} from './jm_rea_route_verify_v0_5.mjs';
import {independentRouteRun} from './jm_rea_route_consequence_v0_5.mjs';
import {RouteScript,RouteVM,RouteOS} from '../../../coding-estate/sovereign-ten/direct/route-proof-native.mjs';

test('actual native JM route script + bytecode + OS state consequences match independent interpreter',()=>{
 const r=verifyRouteConsequences();
 assert.equal(r.cases,120);
 assert.equal(r.failed,0);
 assert.equal(r.passed,120);
 assert.equal(r.trace_events,120);
 assert.equal(r.scenario_families.length,7);
 assert.ok(r.state_digest_examples.length>0);
 assert.equal(r.gate.executed,true);
 assert.equal(r.gate.promotable,false);
 assert.equal(r.claims.full_jm32_1da_2_2_1_compiler,false);
 assert.equal(r.claims.owner_device,false);
});
test('deliberately damaged independent state reconstruction exposes divergence',()=>{
 const r=verifyRouteConsequences({replica:(...args)=>{
  const out=independentRouteRun(...args);
  out.state.drift='intentionally-broken';
  return out;
 }});
 assert.equal(r.passed,0);
 assert.equal(r.failed,120);
 assert.equal(r.mismatches.length,16);
 assert.equal(r.gate.promotable,false);
});
test('actual native RouteVM checksum rejects forged bytecode',()=>{
 const r=invalidBytecodeProof();
 assert.deepEqual(r,{rejected:true,code:'RVM_BAD_CHECKSUM'});
});
test('native and independent runners both bound infinite routes',()=>{
 const r=loopProtection();
 assert.equal(r.both_protected,true);
 assert.equal(r.original,'RS_ROUTE_LOOP');
});
test('native RouteScript rejects unknown route targets before state execution',()=>{
 const src=['route Unknown {','start:','  goto nonexistant','}'].join('\n');
 assert.throws(()=>RouteScript.parse(src),e=>e.code==='RS_UNKNOWN_TARGET');
});
test('native RouteOS refuses to mount a route under incorrect service name',()=>{
 const src=['route Original {','start:','  end','}'].join('\n');
 const graph=RouteScript.lower(RouteScript.parse(src)).graphs[0],bytecode=RouteVM.compile(graph);
 const os=new RouteOS();
 assert.throws(()=>os.registerRoute('Renamed',bytecode,graph),e=>e.code==='ROS_ROUTE_IDENTITY');
});
