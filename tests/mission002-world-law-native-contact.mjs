import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {assembleRegistry} from '../navigator/estate-integration/native-operator.mjs';
import {executeWorldLawContact,WORLD_LAW_SOURCE} from '../coding-estate/integration/world-law-native-contact.mjs';
import {loadGameForgeDonor,makeGameForgeWorld,readWorldBoot} from '../coding-estate/integration/gameforge-world-carrier.mjs';
import {saveLocalReturn,recoverLocalReturn,RETURN_SLOT} from '../navigator/estate-integration/return-checkpoint.mjs';

let checks=0;
const yes=(v,label)=>{assert.ok(v,label);checks++};
const same=(a,b,label)=>{assert.deepEqual(a,b,label);checks++};
const rejects=async(fn,match)=>{await assert.rejects(fn,match);checks++};
const manifest=JSON.parse(fs.readFileSync('coding-estate/integration/REGISTRY.json','utf8'));
const registry=assembleRegistry(manifest,manifest.parts.map(p=>JSON.parse(fs.readFileSync('coding-estate/integration/'+p,'utf8'))));
const readLocal=async url=>({ok:true,text:async()=>fs.readFileSync(new URL(url),'utf8')});
const donor=await loadGameForgeDonor(readLocal);
const cases=[
 {kind:'bridge',body:'humanimals',hazards:5,targetX:640,
  complete:['right','reach','right','right','reach','free',...Array(10).fill('right'),...Array(10).fill('right')],
  incomplete:['right','reach',...Array(12).fill('right')],completeReentry:2,completeUnits:26},
 {kind:'arena',body:'tboys',hazards:6,targetX:600,
  complete:['right','right','up','reach','free','up',...Array(4).fill('right'),'down','down','reach','free',
    ...Array(3).fill('right'),'up',...Array(6).fill('right'),'down'],
  incomplete:['right','right','up','reach','free','right','right'],completeReentry:3,completeUnits:25}
];
const receipt={schema:'jm.m002.cp6.world-law-proof/1',sources:{
  doc:WORLD_LAW_SOURCE.file,docSha256:WORLD_LAW_SOURCE.sha256,
  originalTheographyRuntime:'HOLD_NOT_RECOVERED'},
  results:[],unearnedDenials:[],rollback:'Remove only new additive module/test and CI step; PR399 remains unchanged.',
  boundaries:{AndroidDevice:'NOT_TESTED_WITH_NEW_SOURCE',newRenderedGame:'NOT_TESTED',
              sourceGate:'SOURCE_INFORMED_NOT_ORIGINAL_THEOGRAPHY_ENGINE'}};
for(const spec of cases){
 const negativeBefore=JSON.stringify(spec.incomplete);
 const denied=await executeWorldLawContact({kind:spec.kind,actions:spec.incomplete,registry});
 same(JSON.stringify(spec.incomplete),negativeBefore,'IMMUTABLE_DENIED_ACTIONS');
 same(denied.status,'DENIED_NO_NATIVE_WORLD_MUTATION','DENIED_BEFORE_OPERATOR');
 same(denied.worldLaw.allowed,false,'ACTUAL_NATIVE_JMLOGIC_DENIAL');
 same(denied.recipient,null,'ZERO_RECEIVER_ON_DENIAL');
 same(denied.source,null,'ZERO_NATIVE_SCRIPT_ON_DENIAL');
 yes(denied.mechanism.world.completed===false,'REAL_UNEARNED_WORLD_STATE');
 yes(denied.mechanism.oneBody.ok===true,'DENIED_PATH_ONEBODY_STILL_EXECUTES');
 yes(denied.worldLaw.decisions[0].matched===false,'JMLOGIC_RECOVERY_BRANCH_ACTUALLY_USED');
 const before=JSON.stringify(spec.complete);
 const allowed=await executeWorldLawContact({kind:spec.kind,actions:spec.complete,registry});
 same(JSON.stringify(spec.complete),before,'IMMUTABLE_ALLOWED_ACTIONS');
 same(allowed.status,'ALLOWED_NATIVE_WORLD_EXECUTED','ACTUAL_NATIVE_OPERATOR_INVOCATION');
 same(allowed.worldLaw.allowed,true,'JMLOGIC_PERMITTED');
 yes(allowed.worldLaw.decisions[0].matched===true,'JMLOGIC_ALLOW_MATCH');
 same(allowed.mechanism.world.completed,true,'REAL_CONSEQUENCE_BEFORE_OPERATOR');
 same(allowed.mechanism.world.earned,[true,true],'TWO_EARNED_CONTACTS');
 same(allowed.mechanism.world.reentries,spec.completeReentry,'RECOVERY_PRESERVES_EARNED');
 same(allowed.mechanism.trace.length,spec.completeUnits,'EXACT_ACTION_COUNT');
 same(allowed.recipient.world,{spaces:3,body:spec.body,hazards:spec.hazards,targetX:spec.targetX,entered:true},'SOURCE_DRIVES_REAL_GAMECORE_WORLD');
 same(allowed.recipient.executionState,'WORLD_RECEIVER_EXECUTED_RENDER_PENDING','NATIVE_EXECUTION_NOT_RENDER_PROOF');
 yes(Object.values(allowed.recipient.receipts).length>=4&&Object.values(allowed.recipient.receipts).every(Boolean),'REAL_RECEIVER_DINGS');
 yes(/^[a-f0-9]{64}$/.test(allowed.source.sha256),'SOURCE_SHA256_BOUND');
 const scene=makeGameForgeWorld(donor,allowed.recipient.world,'jm-m002-cp6-'+spec.kind);
 same(readWorldBoot(scene).world,allowed.recipient.world,'REUSED_EXISTING_GAMEFORGE_RENDERER_BOOT');
 const storageMap=new Map();
 const storage={getItem:k=>storageMap.get(k)||null,setItem:(k,v)=>storageMap.set(k,v)};
 const payload={schema:'jm.estate.operator.local-return/0.2',mode:'native-world',
   input:JSON.stringify(spec.complete),summary:'M002 CP6 governed '+spec.kind+' world',scene};
 const saved=await saveLocalReturn(storage,payload);
 same(saved.state,'LOCAL_RETURN_READBACK_VERIFIED','EXISTING_OPERATOR_SAVE_READBACK');
 const recovered=await recoverLocalReturn(storage);
 same(readWorldBoot(recovered.value.scene).world,allowed.recipient.world,'EXACT_WORLD_RECOVERY');
 const tampered=JSON.parse(storageMap.get(RETURN_SLOT));tampered.body+=' ';
 storageMap.set(RETURN_SLOT,JSON.stringify(tampered));
 await rejects(()=>recoverLocalReturn(storage),/LOCAL_RETURN_HASH_MISMATCH/);
 receipt.results.push({kind:spec.kind,receiverWorld:allowed.recipient.world,
   receiptDigest:allowed.recipient.stateDigest,sourceSha256:allowed.source.sha256,
   earned:allowed.mechanism.world.earned,reentries:allowed.mechanism.world.reentries,
   sourceIdentity:allowed.source.identity,steps:allowed.mechanism.trace.length,
   sourceLaw:'SOURCE_INFORMED_RULE_WITH_ORIGINAL_THEOGRAPHY_HOLD'});
 receipt.unearnedDenials.push({kind:spec.kind,reason:denied.worldLaw.reason,nativeInvoked:false,
    state:denied.mechanism.world});
}
yes(receipt.results[0].sourceSha256!==receipt.results[1].sourceSha256,'DISTINCT_WORLD_SOURCE');
yes(receipt.results[0].receiptDigest!==receipt.results[1].receiptDigest,'DISTINCT_NATIVE_RECEIPTS');
await rejects(()=>executeWorldLawContact({kind:'fake',actions:['right'],registry}),/WORLD_LAW_KIND_HOLD/);
await rejects(()=>executeWorldLawContact({kind:'bridge',actions:['fake'],registry}),/TWO_CURRENT_SELECTION_HOLD/);
await rejects(()=>executeWorldLawContact({kind:'bridge',actions:['right'],registry:{}}),/WORLD_LAW_REGISTRY_HOLD/);
receipt.checks=checks;receipt.status='PASS_REPO_HOST_NATIVE_OPERATOR';
fs.mkdirSync('qa/m002-world-law',{recursive:true});
fs.writeFileSync('qa/m002-world-law/CP6_PROOF_RECEIPT.json',JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt));
