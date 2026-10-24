import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {Codifying,Kocodifying} from '../../sovereign-batch-two/direct/codifying-kocodifying-native.mjs';
import {JMLogic} from '../../sovereign-ten/direct/language-native.mjs';
const here=new URL('./',import.meta.url);
const sha=b=>createHash('sha256').update(b).digest('hex');
const donors={
  code:new URL('../../sovereign-batch-two/direct/codifying-kocodifying-native.mjs',here),
  logic:new URL('../../sovereign-ten/direct/language-native.mjs',here)
};
const fingerprints=Object.fromEntries(await Promise.all(Object.entries(donors).map(async ([name,url])=>[name,sha(await readFile(url))])));
const coSource=`cocode LiveContact {
 left KOCODIFIER
 right SLINGFALL
 bind left.route.intent <-> right.contact.intent
 conflict left
 recover rollback
}`;
const ko=Kocodifying.execute(coSource,'LiveContact',
 {identity:'KOCODIFIER',route:{intent:'ADAPT'},unrelated:'KO preserved'},
 {identity:'SLINGFALL',contact:{intent:'UNBOUND'},unrelated:'Native preserved'});
assert.equal(ko.runtime.status,'synced');
assert.equal(ko.runtime.right.contact.intent,'ADAPT');
assert.equal(ko.runtime.left.identity,'KOCODIFIER');
assert.equal(ko.runtime.right.identity,'SLINGFALL');
assert.equal(ko.runtime.left.unrelated,'KO preserved');
assert.equal(ko.runtime.right.unrelated,'Native preserved');
assert.equal(ko.ir.graphs[0].type,'BidirectionalBindingGraph');
const codex=`codex LiveAction {
 field action : text
 field cost : number
 field shield_seconds : number
 field heal : number
 field stun_seconds : number
 emit native_live_contact
}`;
const requests=[
 {action:'AEGIS',cost:12,shield_seconds:5,heal:0,stun_seconds:0},
 {action:'TRIAGE',cost:16,shield_seconds:3,heal:19,stun_seconds:0},
 {action:'COUNTER',cost:14,shield_seconds:0,heal:0,stun_seconds:1.8}
];
const records={};
for(const input of requests){
 const v=Codifying.execute(codex,'LiveAction',input);
 assert.equal(v.runtime.record.action,input.action);
 assert.equal(v.ir.type,'CodexSchemaSet');
 records[input.action]={...v.runtime.record,recordDigest:v.runtime.recordDigest,receipt:v.runtime.receipt};
}
const rule=`rule CounterRaider {
 when field.enemy_near == true
 then output.action = "COUNTER"
}
rule RepairWounded {
 when field.wounded == true
 then output.action = "TRIAGE"
}`;
const table={},cases=[];
for(const wounded of [false,true])for(const enemyNear of [false,true]){
 const facts={field:{wounded,enemy_near:enemyNear},output:{action:'AEGIS'}};
 const result=JMLogic.execute(rule,facts);
 const action=result.runtime.state.output.action;
 assert.ok(records[action]);
 assert.equal(result.ir.graphs.length,2);
 const key=(wounded?'1':'0')+(enemyNear?'1':'0');
 table[key]=action;
 cases.push({key,wounded,enemyNear,action,
  rules:result.runtime.decisions.map(x=>({name:x.ruleName,matched:x.matched})),
  jmlogicReceipt:result.runtime.receipt});
}
assert.deepEqual(table,{'10':'TRIAGE','11':'TRIAGE','00':'AEGIS','01':'COUNTER'});
const policy={schema:'jm.ko-live-decision-table/1',mode:'SECTOR',
 source:{codifying:fingerprints.code,kocodifying:fingerprints.code,jmlogic:fingerprints.logic,historicalOriginal:false},
 identities:{left:ko.runtime.left.identity,right:ko.runtime.right.identity},bindingReceipt:ko.runtime.receipt,
 compiledFrom:{jmLogicIR:'JMLDecisionGraphSet',coIR:'CoCodexBindingSet',codifyIR:'CodexSchemaSet',
  sourceTruth:'actual current executable donors ran in Node; native GDScript evaluates generated 4-row decision table, not original JS runtime'},
 fields:['wounded','enemy_near'],table,actions:records,
 cases:cases.map(({key,wounded,enemyNear,action,rules})=>({key,wounded,enemyNear,action,rules}))};
const bytes=JSON.stringify(policy),digest=sha(bytes);
await mkdir(new URL('./godot/packets/',here),{recursive:true});
await mkdir(new URL('./evidence/',here),{recursive:true});
await writeFile(new URL('./godot/packets/ko_live_policy.json',here),
 JSON.stringify({schema:'jm.ko-live.transport/1',payload:bytes,payloadSHA256:digest},null,2));
await writeFile(new URL('./godot/KO11Seal.gd',here),
 'extends RefCounted\nconst POLICY_SHA = "'+digest+'"\n'+
 'const SOURCE_CODE = "'+fingerprints.code+'"\n'+
 'const SOURCE_LOGIC = "'+fingerprints.logic+'"\n');
const receipt={schema:'jm.ko-cp11-live-donor-build/1',source:fingerprints,
 co:{executed:true,traceCount:ko.runtime.trace.length,identities:policy.identities},
 codify:{executed:true,records:Object.keys(records),digests:Object.values(records).map(x=>x.recordDigest)},
 jmlogic:{executed:true,IR:'JMLDecisionGraphSet',cases},policySHA256:digest,
 result:'4 OUT OF 4 ACTUAL DONOR POLICY COMBINATIONS COMPILED / RUNTIME NATIVE PROOF OPEN',
 historicalOriginal:false};
await writeFile(new URL('./evidence/ko11-source-execution.json',here),JSON.stringify(receipt,null,2));
console.log('JM KO11 ORIGINAL DONOR EXECUTION PASS',JSON.stringify({source:fingerprints,table,policySHA256:digest,counts:{ko:ko.runtime.trace.length,codifying:Object.keys(records).length,jmlogic:cases.length}}));
