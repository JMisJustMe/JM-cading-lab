// JM CP12 forward — run the ORIGINAL frozen JudgeMaker on three REAL CP11
// native receipts. The adapter is new; the donor JudgeMaker kernel is not.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname} from 'node:path';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
const here=new URL('./',import.meta.url);
const sha=x=>createHash('sha256').update(x).digest('hex');
const originalSHA='f0dbce602b239e84c415350d16675127b27d771842b5cd12819432fee874dde6';
const original=await readFile(new URL('donors/JM_JudgeMaker.html',here));
assert.equal(sha(original),originalSHA,'JUDGEMAKER_FOUNDING_SOURCE_DRIFT');
const match=original.toString('utf8').match(/<script>([\s\S]*?)<\/script>/i);
assert.ok(match,'JUDGEMAKER_ORIGINAL_EXECUTOR_NOT_FOUND');
const JudgeMaker=runInNewContext(match[1]+'\n;JMJudgeMaker;',{}, {timeout:1500});
assert.equal(typeof JudgeMaker.judge,'function');
assert.equal(typeof JudgeMaker.metaJudge,'function');
const self=JudgeMaker.selfTests();
assert.equal(self.total,5);
assert.equal(self.passed,5);
const cp11=new URL('../codegornization-cp11/',here);
const envelope=JSON.parse(await readFile(new URL('godot/packets/ko_live_policy.json',cp11),'utf8'));
assert.equal(envelope.schema,'jm.ko-live.transport/1');
assert.equal(envelope.payloadSHA256,sha(envelope.payload));
const policy=JSON.parse(envelope.payload);
const evidenceBytes=await readFile(new URL('evidence/cp11-converged-native-return.json',cp11));
const evidence=JSON.parse(evidenceBytes.toString('utf8'));
assert.equal(evidence.schema,'jm.ko-converged-native-evidence/1');
assert.equal(evidence.compiledPolicySHA256,envelope.payloadSHA256);
assert.equal(evidence.failures,0);
assert.equal(evidence.nativeReturns.length,3);
assert.ok(evidence.checks>=25);
const reverse=JSON.parse(await readFile(new URL('evidence/cp11-converged-ko-reverse-proof.json',cp11),'utf8'));
assert.equal(reverse.state,'SOURCE_KO_TO_LIVE_GODOT_TO_SOURCE_KO_PASS');
assert.equal(reverse.policySHA256,envelope.payloadSHA256);
assert.equal(reverse.nativeEvidenceSHA256,sha(evidenceBytes));
const expected=['AEGIS','TRIAGE','COUNTER'];
const qualifications=[];
function effect(r,action){
 const before=r?.before?.targets,after=r?.after?.targets;
 if(!Array.isArray(before)||!Array.isArray(after)||before.length===0||before.length!==after.length)return undefined;
 return before.every(b=>{
  const a=after.find(x=>x.id===b.id);
  if(!a)return false;
  if(action==='AEGIS')return a.shield>=5 && a.shield>b.shield;
  if(action==='TRIAGE')return a.hp>b.hp && a.hp<=b.hp+19 && a.shield>=3;
  if(action==='COUNTER')return a.stun>=1.8 && a.stun>b.stun;
  return false;
 });
}
function candidate(r,action){
 let spentEnergy;
 if(typeof r?.before?.energy==='number'&&typeof r?.after?.energy==='number')
  spentEnergy=+(r.before.energy-r.after.energy).toFixed(4);
 return {schema:r?.schema,policySHA256:r?.compiledPolicySHA256,
  selected:r?.selected,executors:r?.executors,
  identities:r?.identities,nativeExecutor:r?.nativeExecutor,
  beforeEnergy:r?.before?.energy,afterEnergy:r?.after?.energy,
  spentEnergy,targetCount:r?.after?.targets?.length,
  actualEffect:effect(r,action),index:r?.index,engine:r?.engine,
  historicalOriginal:r?.historicalOriginal};
}
function criteria(action){
 const cost=policy.actions[action].cost;
 const q={name:'real CP11 native KO '+action+' returned consequence',
  threshold:1,criteria:[
   {path:'schema',op:'equals',value:'jm.ko-live-native-return/1',required:true},
   {path:'policySHA256',op:'equals',value:envelope.payloadSHA256,required:true},
   {path:'selected',op:'equals',value:action,required:true},
   {path:'executors',op:'contains',value:'Codifying',required:true},
   {path:'executors',op:'contains',value:'Kocodifying',required:true},
   {path:'executors',op:'contains',value:'JMLogic',required:true},
   {path:'identities.left',op:'equals',value:'KOCODIFIER',required:true},
   {path:'identities.right',op:'equals',value:'SLINGFALL',required:true},
   {path:'nativeExecutor',op:'equals',value:'Godot bounded decision-table',required:true},
   {path:'beforeEnergy',op:'equals',value:100,required:true},
   {path:'spentEnergy',op:'equals',value:cost,required:true},
   {path:'targetCount',op:'gte',value:1,required:true},
   {path:'actualEffect',op:'equals',value:true,required:true},
   {path:'index',op:'equals',value:1,required:true},
   {path:'engine',op:'truthy',required:true},
   {path:'historicalOriginal',op:'equals',value:false,required:true}
  ]};
 assert.equal(JudgeMaker.metaJudge(q).verdict,'QUALIFIED');
 return q;
}
const clone=x=>JSON.parse(JSON.stringify(x));
for(let i=0;i<expected.length;i++){
 const action=expected[i];
 const r=evidence.nativeReturns[i];
 const q=criteria(action);
 const candidateData=candidate(r,action);
 const actual=JudgeMaker.judge(candidateData,q);
 assert.equal(actual.verdict,'QUALIFIED','JUDGEMAKER_NATIVE_'+action+'_HOLD');
 const bad=[
  ['tampered-policy',()=>{let x=clone(r);x.compiledPolicySHA256='0'.repeat(64);return x;}],
  ['no-energy-spend',()=>{let x=clone(r);x.after.energy=x.before.energy;return x;}],
  ['no-actual-effect',()=>{let x=clone(r);for(let a of x.after.targets){let b=x.before.targets.find(b=>b.id===a.id);a.hp=b.hp;a.shield=b.shield;a.stun=b.stun;}return x;}],
  ['wrong-recipient',()=>{let x=clone(r);x.identities.right='OTHER';return x;}],
  ['missing-return',()=>{let x=clone(r);delete x.after;return x;}],
  ['only-body-names',()=>({executors:['Codifying','Kocodifying','JMLogic']})]
 ];
 const holds=[];
 for(const [name,mutate] of bad){
  const verdict=JudgeMaker.judge(candidate(mutate(),action),q);
  assert.notEqual(verdict.verdict,'QUALIFIED','FALSE_POSITIVE_JUDGEMAKER_'+action+'_'+name);
  assert.ok(['NOT_QUALIFIED','INSUFFICIENT_EVIDENCE'].includes(verdict.verdict));
  holds.push({case:name,verdict:verdict.verdict});
 }
 qualifications.push({action,actual:{verdict:actual.verdict,score:actual.score,
    confidence:actual.confidence,trace:actual.trace},negativeHolds:holds,
    sourcePolicySHA256:r.compiledPolicySHA256});
}
const proof={schema:'jm.cp12.original-judgemaker-converged-native/1',
 judgeMaker:{identity:'JM JudgeMaker v1.0 original founding body',sha256:originalSHA,
  execution:'exact original JavaScript in isolated Node VM',selfTests:self},
 inherited:{cp11Head:'43898a42847d1e1c173f879d3e10ec80df62654d',
  cp11NativeEvidenceSHA256:sha(evidenceBytes),
  cp11ReverseSourceReturn:reverse.state,
  policySHA256:envelope.payloadSHA256},
 qualified:qualifications,earned:'3 DISTINCT REAL GODOT NATIVE RETURNS QUALIFIED BY ORIGINAL JUDGEMAKER',
 holds:{device:'PHYSICAL_FOLD_NOT_TESTED',androidJudgeMaker:'NOT_RUNNING_INSIDE_ANDROID',
  originalHistoricalKocodifying:'NOT_CLAIMED',mainMerge:'NOT_MERGED'}};
const out=new URL('evidence/cp12-converged-judgemaker-verdicts.json',here);
await mkdir(dirname(fileURLToPath(out)),{recursive:true});
await writeFile(out,JSON.stringify(proof,null,2)+'\n');
console.log('CP12 ORIGINAL JUDGEMAKER CONVERGED PASS',JSON.stringify({qualified:qualifications.map(q=>q.action),
 negatives:qualifications.reduce((n,x)=>n+x.negativeHolds.length,0),source:originalSHA}));
