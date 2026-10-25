// CP12: run the exact frozen JudgeMaker source against an actual Godot-native
// CP10 before/after return. This script neither ports nor replaces JudgeMaker.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';

const folder=fileURLToPath(new URL('./',import.meta.url));
const nativePath=resolve(process.argv[2]||new URL('./evidence/native-ko-return.json',import.meta.url).pathname);
const sha=b=>createHash('sha256').update(b).digest('hex');
const source=await readFile(new URL('./donors/JM_JudgeMaker.html',import.meta.url));
const originalSHA='f0dbce602b239e84c415350d16675127b27d771842b5cd12819432fee874dde6';
assert.equal(sha(source),originalSHA,'FOUNDING_JUDGEMAKER_SOURCE_DRIFT');
const match=source.toString('utf8').match(/<script>([\s\S]*?)<\/script>/i);
assert.ok(match,'JUDGEMAKER_EXECUTOR_MISSING');
const JMJudgeMaker=runInNewContext(match[1]+'\n;JMJudgeMaker;',{}, {timeout:1500});
assert.equal(typeof JMJudgeMaker.judge,'function');
const self=JMJudgeMaker.selfTests();
assert.equal(self.passed,5,'JUDGEMAKER_ORIGINAL_SELFTEST_FAILURE');
assert.equal(self.total,5);

const envelope=JSON.parse(await readFile(new URL('../codegornization-cp10/godot/packets/ko_aegis.json',import.meta.url),'utf8'));
assert.equal(envelope.schema,'jm.ko-contact.transport/1');
const sourcePayloadSHA=sha(Buffer.from(envelope.payload,'utf8'));
assert.equal(envelope.payloadSHA256,sourcePayloadSHA,'KO_PACKET_INTEGRITY_FAILED');
const native=JSON.parse(await readFile(nativePath,'utf8'));

function candidate(r){
  let spentEnergy,shieldsImproved;
  if(typeof r?.before?.energy==='number'&&typeof r?.after?.energy==='number')
    spentEnergy=+(r.before.energy-r.after.energy).toFixed(4);
  if(Array.isArray(r?.before?.shields)&&Array.isArray(r?.after?.shields)&&r.before.shields.length>0){
    const after=new Map(r.after.shields.map(h=>[h.id,h.shield]));
    shieldsImproved=r.before.shields.every(h=>typeof after.get(h.id)==='number'&&
      after.get(h.id)>=6&&after.get(h.id)>=h.shield)&&
      r.before.shields.some(h=>after.get(h.id)>h.shield);
  }
  return {schema:r?.schema,sourceSHA256:r?.sourceSHA256,participants:r?.participants,
    identities:r?.distinctIdentities,effect:r?.effect,contactIndex:r?.contactIndex,
    appliedActors:r?.appliedActors,spentEnergy,shieldsImproved,host:r?.host,engine:r?.engine};
}
// JudgeMaker's founding native qualification grammar/engine performs every verdict.
const qualification={name:'native KO AEGIS returned consequence',threshold:1,criteria:[
  {path:'schema',op:'equals',value:'jm.ko-native-return/1',required:true},
  {path:'sourceSHA256',op:'equals',value:sourcePayloadSHA,required:true},
  {path:'participants',op:'contains',value:'Codifying',required:true},
  {path:'participants',op:'contains',value:'Kocodifying',required:true},
  {path:'participants',op:'contains',value:'JMLogic',required:true},
  {path:'participants',op:'contains',value:'SLINGFALL_GODOT',required:true},
  {path:'identities.left',op:'equals',value:'KOCODIFIER',required:true},
  {path:'identities.right',op:'equals',value:'SLINGFALL',required:true},
  {path:'effect',op:'equals',value:'ALLY_SHIELD',required:true},
  {path:'contactIndex',op:'equals',value:1,required:true},
  {path:'appliedActors',op:'gte',value:1,required:true},
  {path:'spentEnergy',op:'equals',value:12,required:true},
  {path:'shieldsImproved',op:'equals',value:true,required:true},
  {path:'host',op:'truthy',required:true},
  {path:'engine',op:'truthy',required:true}
]};
assert.equal(JMJudgeMaker.metaJudge(qualification).verdict,'QUALIFIED');
const actual=JMJudgeMaker.judge(candidate(native),qualification);
assert.equal(actual.verdict,'QUALIFIED','REAL_NATIVE_RETURN_NOT_QUALIFIED');

const clone=x=>JSON.parse(JSON.stringify(x));
const negatives=[
  ['forged-source',()=>{const n=clone(native);n.sourceSHA256='0'.repeat(64);return n;},'NOT_QUALIFIED'],
  ['zero-energy-effect',()=>{const n=clone(native);n.after.energy=n.before.energy;return n;},'NOT_QUALIFIED'],
  ['fake-shields',()=>{const n=clone(native);n.after.shields=n.after.shields.map(s=>({...s,shield:0}));return n;},'NOT_QUALIFIED'],
  ['missing-native-after',()=>{const n=clone(native);delete n.after;return n;},'INSUFFICIENT_EVIDENCE'],
  ['wrong-recipient',()=>{const n=clone(native);n.distinctIdentities.right='OTHER';return n;},'NOT_QUALIFIED'],
  ['mere-executor-presence',()=>({execution:{Codifying:true,Kocodifying:true,JMLogic:true}}),'INSUFFICIENT_EVIDENCE']
];
const hold=[];
for(const [label,alter,expected] of negatives){
  const r=JMJudgeMaker.judge(candidate(alter()),qualification);
  assert.equal(r.verdict,expected,'JUDGE_FALSE_PROMOTION_'+label);
  hold.push({case:label,verdict:r.verdict});
}
const record={schema:'jm.judgemaker-native-qualification/1',date:'2026-10-25',
  donor:{body:'JM JudgeMaker',file:'donors/JM_JudgeMaker.html',sha256:originalSHA,
    execution:'original frozen v1.0 JavaScript in isolated Node VM',selfTests:self},
  input:{type:'actual Godot CP10 native before/after return generated in CI',
    schema:native.schema,sourcePacketSHA256:sourcePayloadSHA,
    nativeHost:native.host,engine:native.engine,contactIndex:native.contactIndex},
  result:{verdict:actual.verdict,score:actual.score,confidence:actual.confidence,
    reasons:actual.trace},
  negatives:hold,claim:'Distinct JudgeMaker adjudication of a real Godot native contact; no in-game JudgeMaker runtime, Android owner contact or Estate-wide integration.'};
const output=new URL('./evidence/judgemaker-verdict.json',import.meta.url);
await mkdir(dirname(fileURLToPath(output)),{recursive:true});
await writeFile(output,JSON.stringify(record,null,2)+'\n');
console.log('CP12 JUDGEMAKER ORIGINAL EXECUTION → NATIVE RETURN PASS',JSON.stringify({verdict:actual.verdict,negatives:hold.length,source:originalSHA}));
