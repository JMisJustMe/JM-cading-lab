// In-repository regression for additive M002 CP3 graft.
// This invokes the actual PR395 source-aware native operator and save/recover,
// not a mock. Original Python source was run before these fixed capsules existed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {verifyOriginalCompilerWorldCapsule,executeOriginalCompilerWorldCapsule} from '../coding-estate/integration/sovereign-compiler-world-contact.mjs';
import {assembleRegistry} from '../navigator/estate-integration/native-operator.mjs';
import {loadGameForgeDonor,makeGameForgeWorld,readWorldBoot} from '../coding-estate/integration/gameforge-world-carrier.mjs';
import {saveLocalReturn,recoverLocalReturn,RETURN_SLOT} from '../navigator/estate-integration/return-checkpoint.mjs';
const h=x=>createHash('sha256').update(x).digest('hex');
const defs=[
 {engine:'CbVM',profile:'32_Cb::CbPy/1.0',body:'humanimals',hazards:5,targetX:640,
  native:'89a29baaab5297b75f45b327e4bcb8dcb24b707cbde8a056a37449dceb6f5993',
  jm:'fd0192a3113e9f88a688ff0fa629f3e70eb6592a49b2e77cf16d42d04f3121fe',
  sourceSha:'53d4e65fc88961b84461de8c1fbcb617b17d463ca68a590ed4535ebb3318dc3c',
  capsuleSha:'869e019e8c10eaf2ffbc05af28544a8e8ac8e8f6ddb785602778a5df792db1dc'},
 {engine:'CbShape',profile:'32_Cb::CbJson/1.0',body:'tboys',hazards:6,targetX:600,
  native:'c732487fa5af9c754b6bb403bd24261f799dc4853026725b189b22e68e8716db',
  jm:'7ad4efd0aa0fca01dc3eeedfc5655f54dc34d01510e4556f98c99214093c93ff',
  sourceSha:'20e88d8e3b48e4672febe78a37361914f13e2c25edf1a5c208a2a17bf0a903b6',
  capsuleSha:'429cbbe79e8c3aa4eb7de128a8a1c0fa519ae751d1228947343364e39f15c18f'}
];
function capsule(d){
 const q={
  flowtalk:'utterance "enter the '+d.body+' arena"\nas intent enterWorld(target="'+d.body+'")\nrespond {\n world.spaces = 3\n world.body = "'+d.body+'"\n world.hazards = '+d.hazards+'\n world.targetX = '+d.targetX+'\n world.allowed = true\n}',
  caden:'kading WorldCadence {\n cadence Enter {\n beat enter when world.allowed == true do world.ready = true\n recover denied do world.denied = true\n }\n}',
  jmvm:'machine WorldCheck {\n instruction ASSERT world.ready == true\n instruction SET world.verified = true\n instruction DING "WORLD_VERIFIED"\n instruction HALT\n}'
 };
 const content=JSON.stringify(q);
 assert.equal(h(content),d.sourceSha,'ORIGINAL_CAPSULE_BYTES_DIVERGED:'+d.engine);
 return {schema:'jm.m002.pr395.native-source-capsule/1',
   producer:{engine:d.engine,profile:d.profile,
    native_source_sha256:'03a237debc9f1d26efb213171cd759e35572450313a2a5636ebce46efcceeab1',
    jm_zipapp_sha256:'404aa48d9e89b4423ef8346c79c81de39ff2007c5bc370b86e458e43d8e7f78f',
    jm_original_program_sha256:'701443a7443fc4c87bad69e51aef89ba567ec4693581ba70ee34d07d6d2ccd6c',
    native_return_sha256:d.native,jm_executed_program_sha256:d.jm,
    upstream_receipt_sha256:'6ad0ba3a8097b07d8cb86d09786ed0da0f19b806134d7654cf22278487cd3338',
    attestation:'ORIGINAL_PYTHON_SUBPROCESSES_VERIFIED_LOCALLY_NOT_BROWSER_OR_PROVIDER'},
   expectedWorld:{spaces:3,body:d.body,hazards:d.hazards,targetX:d.targetX,entered:true},
   source:{identity:'JM M002 CP3 / '+d.engine+' / '+d.native.slice(0,12),content,sha256:d.sourceSha},
   receiver:{operation:'executeSourceAwareCreation',mode:'native-world',target:'PR395 candidate native operator',
    expectedState:'WORLD_RECEIVER_EXECUTED_RENDER_PENDING',
    boundary:'Pending execution with exact GitHub PR source; local producer proof alone is not PR395 native execution.'},
   capsule_sha256:d.capsuleSha};
}
const m=JSON.parse(fs.readFileSync('coding-estate/integration/REGISTRY.json','utf8'));
const reg=assembleRegistry(m,m.parts.map(p=>JSON.parse(fs.readFileSync('coding-estate/integration/'+p,'utf8'))));
const fileRequest=async url=>({ok:true,text:async()=>fs.readFileSync(new URL(url),'utf8')});
const donor=await loadGameForgeDonor(fileRequest);
const out=[];let assertions=0;
for(const d of defs){
 const c=capsule(d);
 const bound=await verifyOriginalCompilerWorldCapsule(c);assert.equal(bound.engine,d.engine);assertions++;
 const v=await executeOriginalCompilerWorldCapsule(c,reg);
 const world=v.operator.execution.result.receiver.world;
 assert.deepEqual(world,c.expectedWorld);assertions++;
 assert.equal(v.status,'NATIVE_WORLD_RECEIVER_EXECUTED_RENDER_PENDING');assertions++;
 assert.ok(v.operator.execution.result.chain.stages.length===3);assertions++;
 assert.ok(Object.values(v.operator.execution.result.receiver.receipts).every(Boolean));assertions++;
 const html=makeGameForgeWorld(donor,world,'jm-m002-'+d.engine);
 assert.deepEqual(readWorldBoot(html).world,world);assertions++;
 const map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
 const ret={schema:'jm.estate.operator.local-return/0.2',mode:'native-world',input:c.source.content,summary:'M002 '+d.engine+' native receiver',scene:html};
 const save=await saveLocalReturn(storage,ret);assert.equal(save.state,'LOCAL_RETURN_READBACK_VERIFIED');assertions++;
 const reread=await recoverLocalReturn(storage);assert.deepEqual(readWorldBoot(reread.value.scene).world,world);assertions++;
 const tampered=JSON.parse(map.get(RETURN_SLOT));tampered.body+=' ';map.set(RETURN_SLOT,JSON.stringify(tampered));
 await assert.rejects(()=>recoverLocalReturn(storage),/LOCAL_RETURN_HASH_MISMATCH/);assertions++;
 await assert.rejects(()=>verifyOriginalCompilerWorldCapsule({...c,expectedWorld:{...c.expectedWorld,targetX:700}}),/CAPSULE_SHA256_HOLD/);assertions++;
 await assert.rejects(()=>verifyOriginalCompilerWorldCapsule({...c,source:{...c.source,content:c.source.content+' '}}),/SOURCE_SHA256_HOLD/);assertions++;
 out.push({engine:d.engine,world,sourceSha256:c.source.sha256,receiptDigest:v.operator.execution.result.receiptDigest});
}
assert.notDeepEqual(out[0].world,out[1].world);assertions++;
assert.notEqual(out[0].sourceSha256,out[1].sourceSha256);assertions++;
console.log(JSON.stringify({schema:'jm.m002.cp4.pr395.actual-receiver/1',status:'PASS',assertions,outputs:out,source:'ACTUAL_PR395_REPO',browser:'SEPARATE_GATE',physicalAndroid:'HOLD'}));
