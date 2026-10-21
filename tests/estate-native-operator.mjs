// JM Estate native operator regression: run within the existing repository.
// node tests/estate-native-operator.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {assembleRegistry,loadNativeRegistry,executeNativeContact,probePublicContact} from '../navigator/estate-integration/native-operator.mjs';
import {runNativeOperatorLane} from '../navigator/estate-integration/execution-lanes.mjs';
import {saveLocalReturn,recoverLocalReturn,RETURN_SLOT} from '../navigator/estate-integration/return-checkpoint.mjs';
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
const plan=runNativeOperatorLane('route','build a visual game with android delivery',registry);
assert.equal(plan.state,'PLAN_ONLY');
assert.equal(plan.changed,false);
assert.ok(plan.result.route.some(x=>x.id==='tracebox'));
const compiled=runNativeOperatorLane('compile-js','source = green.✓',registry);
assert.equal(compiled.state,'EMITTED_SOURCE');
assert.equal(compiled.result.target,'javascript');
assert.match(compiled.result.output.body,/green/);
assert.ok(compiled.result.receiptDigest);
const rust=runNativeOperatorLane('compile-rust','source = blue.✓',registry);
assert.equal(rust.result.target,'rust');
assert.match(rust.result.output.body,/blue/);
assert.notEqual(compiled.result.output.body,rust.result.output.body);
assert.throws(()=>runNativeOperatorLane('compile-js','unclosed source',registry),/Fullstopped|Fullstop/i);
const gamecore=runNativeOperatorLane('gamecore','RUN EXISTING GAMECORE CONTACT',registry);
assert.equal(gamecore.state,'NATIVE_GAMECORE_STATE_CHANGED');
assert.equal(gamecore.result.game.changed,true);
assert.equal(gamecore.result.rendererContact.gpu3D,'NOT_TESTED');
const os=runNativeOperatorLane('os','RUN EXISTING OS CONTACT',registry);
assert.equal(os.state,'NATIVE_OS_CONTACT_EXECUTED');
assert.equal(os.result.receipts.length,4);
assert.throws(()=>runNativeOperatorLane('unknown','test',registry),/OPERATOR_LANE_NOT_SUPPORTED/);
assert.throws(()=>runNativeOperatorLane('route','test',{...registry,bodies:[]}),/REGISTRY_VALIDATION_HOLD/);

const live=await probePublicContact(async url=>{
  assert.match(String(url),/\/api\/estate-contact\?route=%2Fready$/);
  return response({ok:true,ready:true});
});
assert.equal(live.state,'PUBLIC_READ_RESPONSE');
await assert.rejects(()=>probePublicContact(async()=>response({ok:false,error:'DOWN'},503)),/PUBLIC_CONTACT_HTTP_503/);
const local=new Map();
const store={getItem:key=>local.get(key)||null,setItem:(key,v)=>local.set(key,v)};
const snapshot={schema:'jm.estate.operator.local-return/0.2',mode:'compile-js',input:'source = green.✓',summary:JSON.stringify(compiled.result)};
await assert.rejects(()=>recoverLocalReturn(store),/LOCAL_RETURN_ABSENT/);
const saved=await saveLocalReturn(store,snapshot);
assert.equal(saved.state,'LOCAL_RETURN_READBACK_VERIFIED');
assert.equal(saved.value.input,snapshot.input);
assert.match(saved.sha256,/^[a-f0-9]{64}$/);
const tampered=JSON.parse(store.getItem(RETURN_SLOT));tampered.body=tampered.body.replace('green','red');
store.setItem(RETURN_SLOT,JSON.stringify(tampered));
await assert.rejects(()=>recoverLocalReturn(store),/LOCAL_RETURN_HASH_MISMATCH/);
await assert.rejects(()=>saveLocalReturn(store,{...snapshot,mode:'unauthorised'}),/RETURN_MODE_HOLD/);
await assert.rejects(()=>saveLocalReturn(store,{...snapshot,summary:'x'.repeat(26001)}),/RETURN_SUMMARY_HOLD/);

const page=fs.readFileSync('navigator/estate-integration/index.html','utf8');
for(const marker of ['id="jmOperatorForm"','id="jmOperatorPreview"','id="jmOperatorSave"','id="jmOperatorRecover"','sandbox="allow-scripts"','src="./native-operator.mjs"','id="routes"','id="trace"']){
  assert.ok(page.includes(marker),'INTEGRATION_MARKER_MISSING:'+marker);
}
console.log(JSON.stringify({state:'LOCAL_SOURCE_REGRESSION_PASS',regressionScope:'native,route,compile-js,compile-rust,gamecore,os,relay-HOLD,canonical-door',registryBodies:registry.bodies.length,executedBodies:native.executedBodies.length,receipts:native.receipts.length,nativeLanes:6,visibleScene:true,publicProbeMockOnly:true,localReadbackVerified:true,tamperRejected:true,cloudWritePerformed:false,deviceProof:false},null,2));
