import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assembleRegistry} from '../navigator/estate-integration/native-operator.mjs';
import {runNativeOperatorLane,ESTATE_FABRIC_OPERATOR_EXAMPLE}
 from '../navigator/estate-integration/execution-lanes.mjs';
import {saveLocalReturn,recoverLocalReturn,RETURN_SLOT}
 from '../navigator/estate-integration/return-checkpoint.mjs';
let count=0;
const ok=(x,msg)=>{assert.ok(x,msg);count++};
const eq=(a,b,msg)=>{assert.deepEqual(a,b,msg);count++};
const hold=(f,pattern)=>{assert.throws(f,pattern);count++};
const manifest=JSON.parse(fs.readFileSync('coding-estate/integration/REGISTRY.json','utf8'));
const parts=manifest.parts.map(path=>JSON.parse(fs.readFileSync('coding-estate/integration/'+path,'utf8')));
const registry=assembleRegistry(manifest,parts);
const before=JSON.stringify(registry),input=ESTATE_FABRIC_OPERATOR_EXAMPLE;
const out=runNativeOperatorLane('estate-fabric',input,registry);
eq(out.state,'NATIVE_MULTIFAMILY_EXECUTED','NOT_EXECUTING_FABRIC');
eq(out.changed,true,'ONLY_ROUTING_NO_EXEC');
eq(out.mode,'estate-fabric','INCORRECT_OPERATOR_MODE');
eq(out.result.operationCount,4,'DID_NOT_EXECUTE_FOUR_JM_ORGANS');
eq(out.familyCount,4,'DID_NOT_CROSS_FAMILIES');
eq(out.result.operations.map(x=>x.family),['language','coding','systems','game'],'CROSSED_FAMILY_COLLAPSE');
ok(out.result.operations.every(x=>x.inputDigest&&x.resultDigest&&x.executedBodies.length),'MISSING_ACTUAL_JM_RETURN');
eq(out.result.operations[0].returned.state.gate.verified,true,'NATIVE_CHAIN_NOT_EXECUTED');
ok(out.result.operations[1].returned.source.includes('federation'),'CADING_NOT_EMITTING_REAL_SOURCE');
eq(out.result.operations[2].returned.receipts.length,4,'OS_RECEIPTS_NOT_REAL');
eq(out.result.operations[3].returned.game.changed,true,'GAMECORE_NOT_MUTATING_REAL_NATIVE_STATE');
eq(JSON.stringify(registry),before,'REGISTRY_SOURCE_MUTATED');
const same=runNativeOperatorLane('estate-fabric',input,registry);
eq(same.result.resultDigest,out.result.resultDigest,'NATIVE_MULTI_RECOVERY_NON_DETERMINISTIC');
hold(()=>runNativeOperatorLane('estate-fabric','{}',registry),/OPERATOR_FABRIC_SCOPE_HOLD/);
hold(()=>runNativeOperatorLane('estate-fabric','not-json',registry),/OPERATOR_FABRIC_JSON_HOLD/);
hold(()=>runNativeOperatorLane('estate-fabric',JSON.stringify({operations:[
 {mode:'route',input:'write to server'},{mode:'os',input:'RUN EXISTING OS CONTACT'}]}),registry),/OPERATOR_FABRIC_SCOPE_HOLD/);
hold(()=>runNativeOperatorLane('estate-fabric',JSON.stringify({operations:[
 {mode:'os',input:'one'},{mode:'os',input:'two'}]}),registry),/OPERATOR_FABRIC_SCOPE_HOLD/);
hold(()=>runNativeOperatorLane('estate-fabric',JSON.stringify({operations:[
 {mode:'compile-js',input:'source = x.✓'},{mode:'compile-rust',input:'source = y.✓'}]}),registry),/OPERATOR_FABRIC_SCOPE_HOLD/);
hold(()=>runNativeOperatorLane('estate-fabric',JSON.stringify({operations:[
 {mode:'native-chain',input:'bad program'},{mode:'os',input:'RUN EXISTING OS CONTACT'}]}),registry),/NATIVE_CHAIN_JSON_REQUIRED/);
const page=fs.readFileSync('navigator/estate-integration/index.html','utf8');
ok(page.includes('<option value="estate-fabric">'),'MISSING_REAL_OPERATOR_ENTRY');
const storeMap=new Map(),store={getItem:key=>storeMap.get(key)||null,setItem:(key,v)=>storeMap.set(key,v)};
const value={schema:'jm.estate.operator.local-return/0.2',mode:'estate-fabric',input,
 summary:'Four verified native JM lanes returned; browser-local owner checkpoint.'};
const saved=await saveLocalReturn(store,value);
eq(saved.state,'LOCAL_RETURN_READBACK_VERIFIED','OPERATOR_FABRIC_SAVE_HOLD');
eq((await recoverLocalReturn(store)).value,value,'OPERATOR_FABRIC_RECOVERY_HOLD');
const changed=JSON.parse(store.getItem(RETURN_SLOT));
changed.body=changed.body.replace('Four verified','Four forged');
store.setItem(RETURN_SLOT,JSON.stringify(changed));
await assert.rejects(()=>recoverLocalReturn(store),/LOCAL_RETURN_HASH_MISMATCH/);count++;
console.log(JSON.stringify({schema:'jm.m002.cp13.operator-multifamily-proof/1',
 status:'EXISTING_BROWSER_OPERATOR_MULTI_EXECUTION_PASS',checks:count,
 families:4,originalBodiesExecuted:true,localReturnReadback:true,forgeryHeld:true,
 noHostedServiceWrites:true,physicalAndroid:'HOLD'}));
