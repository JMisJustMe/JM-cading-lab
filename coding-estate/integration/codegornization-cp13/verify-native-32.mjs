// JM CP13 — 32 INDEPENDENT genuine Godot native process returns.
// Execute actual preserved original JudgeMaker, JangleMonitor and JourMaze.
// These founding JS bodies execute in Node, NOT Godot or owner's Fold.
import assert from 'node:assert/strict';
import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
import {dirname} from 'node:path';

const here=new URL('./',import.meta.url);
const cp11=new URL('../codegornization-cp11/',here);
const cp12=new URL('../codegornization-cp12-converged/',here);
const sha=x=>createHash('sha256').update(x).digest('hex');
const donorSpecs=[
 ['JudgeMaker',new URL('donors/JM_JudgeMaker.html',cp12),'f0dbce602b239e84c415350d16675127b27d771842b5cd12819432fee874dde6','JMJudgeMaker'],
 ['JangleMonitor',new URL('donors/JM_JangleMonitor.html',here),'cdb57ae2376e219f253b2f57382d11d4b378b305c408a6468d6757d2a9e88302','JMJangleMonitor'],
 ['JourMaze',new URL('donors/JM_JourMaze.html',here),'56c5ff4f76a222eb32d6b01d955ed0fe45d5389e5c14cba12f8e7618157545db','JMJourMaze']
];
const originals={};
for(const [name,path,expected,variable] of donorSpecs){
 const bytes=await readFile(path);
 assert.equal(sha(bytes),expected,'FOUNDING_ORIGINAL_SOURCE_DRIFT_'+name);
 const code=bytes.toString('utf8').match(/<script>([\s\S]*?)<\/script>/i);
 assert.ok(code,'FOUNDING_BODY_EXECUTOR_ABSENT_'+name);
 const body=runInNewContext(code[1]+'\n;'+variable+';',{}, {timeout:1500});
 assert.equal(typeof body.selfTests,'function');
 const tests=body.selfTests();
 assert.equal(tests.passed,5,'FOUNDING_SELFTEST_HOLD_'+name);
 assert.equal(tests.total,5);
 originals[name]={body,sha256:expected,selfTests:tests};
}
const Judge=originals.JudgeMaker.body;
const Jangle=originals.JangleMonitor.body;
const Jour=originals.JourMaze.body;
const env=JSON.parse(await readFile(new URL('godot/packets/ko_live_policy.json',cp11)));
assert.equal(env.schema,'jm.ko-live.transport/1');
assert.equal(sha(env.payload),env.payloadSHA256);
const policy=JSON.parse(env.payload);
const codeSha=sha(await readFile(new URL('../../sovereign-batch-two/direct/codifying-kocodifying-native.mjs',cp11)));
const logicSha=sha(await readFile(new URL('../../sovereign-ten/direct/language-native.mjs',cp11)));
assert.equal(policy.source.codifying,codeSha);
assert.equal(policy.source.kocodifying,codeSha);
assert.equal(policy.source.jmlogic,logicSha);
assert.equal(policy.source.historicalOriginal,false);
const records=await readdir(new URL('evidence/native-32/',here));
const nativeFiles=records.filter(x=>/^sweep-\d\d\.json$/.test(x)).sort();
assert.equal(nativeFiles.length,32,'NOT_EXACTLY_32_REAL_NATIVE_PROCESS_RETURNS');
const ctx=[];
const qualified=[];
function realConsequence(r,action){
 if(!r?.after?.targets?.length||!r?.before?.targets?.length)return false;
 const before=r.before.targets,after=r.after.targets;
 return before.length===after.length&&before.every(b=>{
  const a=after.find(x=>x.id===b.id);
  if(!a)return false;
  if(action==='AEGIS')return a.shield>=5&&a.shield>b.shield && a.hp===b.hp;
  if(action==='TRIAGE')return a.hp>b.hp&&a.hp<=b.hp+19&&a.shield>=3;
  if(action==='COUNTER')return a.stun>=1.8&&a.stun>b.stun && a.hp===b.hp;
  return false;
 });
}
function candidate(r,action){
 const before=r?.before,after=r?.after;
 return {schema:r?.schema,policySHA:r?.compiledPolicySHA256,
 action:r?.selected,nativeExecutor:r?.nativeExecutor,
 identityLeft:r?.identities?.left,identityRight:r?.identities?.right,
 sourceHistorical:r?.historicalOriginal,
 beforeEnergy:before?.energy,afterEnergy:after?.energy,
 spentEnergy:typeof before?.energy==='number'&&typeof after?.energy==='number'?
  +(before.energy-after.energy).toFixed(4):undefined,
 actualEffect:realConsequence(r,action),index:r?.index,engine:r?.engine};
}
function judgeContract(action){
 return {name:'Native KO 32-sweep '+action,threshold:1,criteria:[
  {path:'schema',op:'equals',value:'jm.ko-live-native-return/1',required:true},
  {path:'policySHA',op:'equals',value:env.payloadSHA256,required:true},
  {path:'action',op:'equals',value:action,required:true},
  {path:'nativeExecutor',op:'equals',value:'Godot bounded decision-table',required:true},
  {path:'identityLeft',op:'equals',value:'KOCODIFIER',required:true},
  {path:'identityRight',op:'equals',value:'SLINGFALL',required:true},
  {path:'sourceHistorical',op:'equals',value:false,required:true},
  {path:'beforeEnergy',op:'equals',value:100,required:true},
  {path:'spentEnergy',op:'equals',value:policy.actions[action].cost,required:true},
  {path:'actualEffect',op:'equals',value:true,required:true},
  {path:'index',op:'equals',value:1,required:true},
  {path:'engine',op:'truthy',required:true}
 ]};
}
for(let i=0;i<32;i++){
 const file='sweep-'+String(i).padStart(2,'0')+'.json';
 assert.equal(nativeFiles[i],file,'NATIVE_RUN_INDEX_DUPLICATED_OR_MISSING');
 const raw=await readFile(new URL('evidence/native-32/'+file,here));
 const entry=JSON.parse(raw);
 assert.equal(entry.schema,'jm.cp13.native-32-sweep/1');
 assert.equal(entry.runIndex,i);
 assert.equal(entry.variant,Math.floor(i/4));
 assert.equal(entry.caseId,i%4);
 assert.equal(entry.failures,0);
 assert.ok(entry.checks>=15,'INSUFFICIENT_NATIVE_ASSERTION_COUNT');
 assert.equal(entry.tamperHeld,true);
 assert.equal(entry.duplicateHeld,true);
 assert.equal(entry.originalPolicySHA256,env.payloadSHA256);
 assert.deepEqual(entry.actualFacts,entry.expectedFacts);
 const f=entry.actualFacts;
 const sourceKey=(f.wounded?'1':'0')+(f.enemy_near?'1':'0');
 const action=policy.table[sourceKey];
 assert.equal(entry.expectedAction,action);
 assert.equal(entry.selectedAction,action);
 const r=entry.nativeReturn;
 assert.equal(r.compiledPolicySHA256,env.payloadSHA256);
 assert.equal(r.selected,action);
 assert.equal(r.before.energy,100);
 assert.equal(r.before.energy-r.after.energy,policy.actions[action].cost);
 assert.ok(realConsequence(r,action),'REAL_GAME_CONSEQUENCE_MISSING');
 assert.equal(r.identities.left,'KOCODIFIER');
 assert.equal(r.identities.right,'SLINGFALL');
 assert.match(entry.traceAfter,/NATIVE RETURN RECORDED/);
 // JudgeMaker is the only original body qualified to adjudicate the claim.
 const contract=judgeContract(action);
 assert.equal(Judge.metaJudge(contract).verdict,'QUALIFIED');
 const actualVerdict=Judge.judge(candidate(r,action),contract);
 assert.equal(actualVerdict.verdict,'QUALIFIED','JUDGEMAKER_FALSE_HOLD_'+file);
 const falsified=JSON.parse(JSON.stringify(r)); falsified.after.energy=100;
 const negative=Judge.judge(candidate(falsified,action),contract);
 assert.notEqual(negative.verdict,'QUALIFIED','JUDGEMAKER_FALSE_CROWN_'+file);
 // JangleMonitor's real founding monitor preserves immutable identities
 // despite real changing game energy; simulated source tamper must break it.
 const source={sourceSHA:env.payloadSHA256,identityLeft:r.identities.left,
  identityRight:r.identities.right,action,returnSchema:r.schema,
  mutable:{energy:r.before.energy,targets:r.before.targets.length}};
 const invariants=[
  {path:'sourceSHA',mode:'equalsOriginal',hard:true,weight:5},
  {path:'identityLeft',mode:'equalsOriginal',hard:true},
  {path:'identityRight',mode:'equalsOriginal',hard:true},
  {path:'action',mode:'equalsOriginal',hard:true},
  {path:'returnSchema',mode:'equalsOriginal',hard:true},
  {path:'mutable.energy',mode:'equalsOriginal',hard:false}
 ];
 const lawful=Jangle.monitor(source,{invariants,disturbances:[
  {op:'set',path:'mutable.energy',value:r.after.energy},
  {op:'set',path:'mutable.targets',value:r.after.targets.length}
 ]});
 assert.equal(lawful.identitySurvived,true,'JANGLE_LAWFUL_IDENTITY_HOLD_'+file);
 assert.equal(lawful.breakpoint,null);
 assert.equal(lawful.softBoundary,1);
 assert.equal(lawful.final.mutable.energy,r.after.energy);
 const tampered=Jangle.monitor(source,{invariants,disturbances:[
  {op:'set',path:'sourceSHA',value:'0'.repeat(64)}
 ]});
 assert.equal(tampered.identitySurvived,false,'JANGLE_FAILED_TO_DETECT_IDENTITY_BREAK');
 assert.equal(tampered.breakpoint,1);
 // JourMaze's exact original route grammar gives legal return/custody paths.
 // Intentional alternative "UNVERIFIED" is present in the graph but avoided.
 const actionNode='VERIFIED_'+action;
 const journeyArgs={start:'NATIVE_RETURN',goal:'CUSTODY',
  avoid:['UNVERIFIED'],require:[actionNode],preference:'minimum_loss',
  edges:[
   {from:'NATIVE_RETURN',to:'JUDGEMAKER',cost:1,loss:0,risk:0,reversible:1},
   {from:'JUDGEMAKER',to:'JANGLE',cost:1,loss:0,risk:0,reversible:1},
   {from:'JANGLE',to:actionNode,cost:1,loss:0,risk:0,reversible:1},
   {from:actionNode,to:'TRACE',cost:1,loss:0,risk:0,reversible:1},
   {from:'TRACE',to:'CUSTODY',cost:1,loss:0,risk:0,reversible:1},
   {from:'JANGLE',to:'UNVERIFIED',cost:1,loss:10,risk:20,reversible:0},
   {from:'UNVERIFIED',to:'CUSTODY',cost:1,loss:10,risk:20,reversible:0},
   {from:'JANGLE',to:'NATIVE_RETURN',cost:2,loss:0,risk:0,reversible:1}
  ]};
 const journey=Jour.jourmaze(journeyArgs);
 assert.ok(journey.bestRoute,'JOURMAZE_NO_ACTUAL_VERIFIED_ROUTE_'+file);
 assert.ok(journey.bestRoute.nodes.includes(actionNode));
 assert.equal(journey.bestRoute.nodes.at(-1),'CUSTODY');
 assert.ok(journey.cycles.length>0,'JOURMAZE_LIVE_CYCLE_NOT_DETECTED');
 const forbidden=Jour.jourmaze({...journeyArgs,avoid:[actionNode,'UNVERIFIED']});
 assert.equal(forbidden.bestRoute,null,'JOURMAZE_FALSE_PROMOTION_WITH_REQUIRED_ROUTE_BLOCKED');
 const admissible=actualVerdict.verdict==='QUALIFIED'&&lawful.identitySurvived&&
  !!journey.bestRoute&&journey.bestRoute.nodes.includes(actionNode);
 assert.ok(admissible,'ORIGINAL_63_64_DECISION_DID_NOT_AUTHORISE_REAL_RETURN');
 ctx.push({run:i,nativeProofSHA256:sha(raw),variant:entry.variant,facts:f,action,
  native:{cost:r.before.energy-r.after.energy,targets:r.after.targets.length},
  judgeMaker:{verdict:actualVerdict.verdict,negative:negative.verdict},
  jangleMonitor:{identitySurvived:lawful.identitySurvived,softBoundary:lawful.softBoundary,
   alteredSourceBreakpoint:tampered.breakpoint,lawfulTrace:lawful.trace},
  jourMaze:{bestRoute:journey.bestRoute.nodes,alternatives:journey.routes.length,
   cycles:journey.cycles.length,blockedRoute:forbidden.bestRoute===null},
  authorisedForCustody:admissible});
 qualified.push(entry.selectedAction);
 console.log('JM CP13 SWEEP '+String(i+1).padStart(2,'0')+'/32 PASS',action,
  'JUDGEMAKER QUALIFIED / JANGLE PRESERVED + TAMPER BREAK / JOURMAZE CUSTODY');
}
assert.deepEqual([...new Set(qualified)].sort(),['AEGIS','COUNTER','TRIAGE']);
assert.equal(ctx.length,32);
assert.equal(ctx.filter(x=>x.authorisedForCustody).length,32);
const receipt={schema:'jm.cp13.original-63-64-native-32-proof/1',
 state:'32_DISTINCT_NATIVE_PROCESS_RETURNS_QUALIFIED_AND_ROUTED',
 sourceHead:'CP12 original JudgeMaker green parent 546f20f4b796089d3b8c250b9cca032162f9246a',
 donorSources:donorSpecs.map(([name,,digest])=>({name,sha256:digest,originalSelfTests:'5/5'})),
 originalDonorHost:'Node 22 independent from Godot Linux',
 nativeHost:'Godot 4.5.2 Linux headless, separate processes; not physical Samsung Fold',
 inheritedKO:{codifyingSHA256:codeSha,jmlogicSHA256:logicSha,policySHA256:env.payloadSHA256},
 summary:{nativeIndependentProcessRuns:32,admitted:ctx.length,negativeJudgeMakerHolds:32,
  negativeJangleBreakpoints:32,negativeJourMazeRouteBlocks:32,threeActionTypes:[...new Set(qualified)]},
 cases:ctx,
 proofBoundaries:{nativeJSOnAndroid:'NOT PROVEN',physicalFold32:'NOT TESTED',
  senderAuthentication:'NOT PROVEN',production:'NOT DEPLOYED',wholeEstate:'NOT CLAIMED'}};
const out=new URL('evidence/CP13_32_RUN_ORIGINAL_BODIES_RECEIPT.json',here);
await mkdir(dirname(fileURLToPath(out)),{recursive:true});
await writeFile(out,JSON.stringify(receipt,null,2)+'\n');
console.log('JM CP13 32/32 INDEPENDENT REAL NATIVE GODOT RETURNS + ORIGINAL JUDGEMAKER/JANGLE/JOURMAZE',JSON.stringify(receipt.summary));
