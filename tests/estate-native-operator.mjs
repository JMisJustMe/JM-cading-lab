// JM Estate native operator regression: run within the existing repository.
// node tests/estate-native-operator.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {assembleRegistry,loadNativeRegistry,executeNativeContact,probePublicContact} from '../navigator/estate-integration/native-operator.mjs';
const root='coding-estate/integration';
const manifest=JSON.parse(fs.readFileSync(path.join(root,'REGISTRY.json'),'utf8'));
const parts=manifest.parts.map(rel=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8')));
const registry=assembleRegistry(manifest,parts);
assert.equal(registry.bodies.length,100);
assert.throws(()=>assembleRegistry(manifest,parts.slice(1)),/REGISTRY_PARTS_INCOMPLETE/);
assert.throws(()=>assembleRegistry({...manifest,count:101},parts),/REGISTRY_COUNT_MISMATCH/);
const response=(body,status=200)=>({ok:status>=200&&status<300,status,json:async()=>body});
const hydrated=await loadNativeRegistry(async url=>{
  const rel=new URL(url).pathname.split('/coding-estate/integration/')[1];
  assert.ok(rel&&!rel.includes('..'));
  return response(JSON.parse(fs.readFileSync(path.join(root,rel),'utf8')));
});
assert.equal(hydrated.bodies.length,100);
await assert.rejects(()=>executeNativeContact('',registry),/CONTACT_REQUIRED_OR_TOO_LONG/);
await assert.rejects(()=>executeNativeContact('x'.repeat(2001),registry),/CONTACT_REQUIRED_OR_TOO_LONG/);
const native=await executeNativeContact('build a touch visual game with drag aim, browser and android delivery',registry);
assert.equal(native.passed,true);
assert.equal(native.schema,'jm.ailatheo.creation-execution/0.3');
assert.equal(native.executedBodies.length,6);
assert.equal(native.receipts.length,9);
assert.equal(native.buildGates.status,'PASS');
assert.equal(native.delivery.recoverable,true);
assert.match(native.carrier.html,/VISIBLE CONSEQUENCE/);
assert.match(native.carrier.html,/<html/);
assert.deepEqual(['tracebox','dings','source-ledger','onebody-delivery','zionfolder'].filter(id=>!native.plan.route.some(r=>r.id===id)),[]);
const live=await probePublicContact(async url=>{
  assert.match(String(url),/\/api\/estate-contact\?route=%2Fready$/);
  return response({ok:true,ready:true});
});
assert.equal(live.state,'PUBLIC_READ_RESPONSE');
await assert.rejects(()=>probePublicContact(async()=>response({ok:false,error:'DOWN'},503)),/PUBLIC_CONTACT_HTTP_503/);
const page=fs.readFileSync('navigator/estate-integration/index.html','utf8');
for(const marker of ['id="jmOperatorForm"','id="jmOperatorPreview"','sandbox="allow-scripts"','src="./native-operator.mjs"','id="routes"','id="trace"']){
  assert.ok(page.includes(marker),'INTEGRATION_MARKER_MISSING:'+marker);
}
console.log(JSON.stringify({state:'LOCAL_SOURCE_REGRESSION_PASS',regressionChecks:16,registryBodies:registry.bodies.length,executedBodies:native.executedBodies.length,receipts:native.receipts.length,visibleScene:true,publicProbeMockOnly:true,cloudWritePerformed:false,deviceProof:false},null,2));
