// CP14: execute the exact frozen JM JourMaze v1.0, with no rewritten route kernel.
// Actual native/KO/Judge/Jangle evidence determines admitted graph edges;
// hypothetical branch weights are policy choices, NOT observed probabilities.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';

const here=new URL('./',import.meta.url);
const sha=b=>createHash('sha256').update(b).digest('hex');
const HASH='56c5ff4f76a222eb32d6b01d955ed0fe45d5389e5c14cba12f8e7618157545db';
const MONITOR_SHA='cdb57ae2376e219f253b2f57382d11d4b378b305c408a6468d6757d2a9e88302';
const JUDGE_SHA='f0dbce602b239e84c415350d16675127b27d771842b5cd12819432fee874dde6';
const original=await readFile(new URL('donors/JM_JourMaze.html',here));
assert.equal(sha(original),HASH,'ORIGINAL_JOURMAZE_SOURCE_DRIFT');
const embedded=original.toString('utf8').match(/<script>([\s\S]*?)<\/script>/i);
assert.ok(embedded,'ORIGINAL_JOURMAZE_EXECUTOR_ABSENT');
const JM=runInNewContext(embedded[1]+'\n;JMJourMaze;',{}, {timeout:1500});
assert.equal(typeof JM.jourmaze,'function');
const self=JM.selfTests();
assert.equal(self.passed,5,'ORIGINAL_JOURMAZE_SELFTEST_HOLD');
assert.equal(self.total,5);

const json=async p=>JSON.parse(await readFile(new URL(p,here),'utf8'));
const native=await json('../codegornization-cp12/evidence/native-ko-return.json');
const judged=await json('../codegornization-cp12/evidence/judgemaker-verdict.json');
const monitored=await json('../codegornization-cp13/evidence/jangle-native-identity.json');
const envelope=await json('../codegornization-cp10/godot/packets/ko_aegis.json');
const clone=x=>JSON.parse(JSON.stringify(x));
const body=JSON.parse(envelope.payload);
const packetSHA=sha(Buffer.from(envelope.payload,'utf8'));
assert.equal(envelope.payloadSHA256,packetSHA,'TYPED_TRANSPORT_BYTES_CHANGED');

// Admission precedes JourMaze. A label, fabricated receipt or missing native
// evidence cannot become a route merely because JourMaze can find one.
function blockers(n=native,j=judged,m=monitored,p=body){
  const errors=[];
  const req=(ok,why)=>{if(!ok)errors.push(why);};
  req(envelope.schema==='jm.ko-contact.transport/1','PACKET_ENVELOPE');
  req(p?.schema==='jm.ko-contact.typed/1','PACKET_SCHEMA');
  req(p?.execution?.Codifying===true && p?.execution?.Kocodifying===true &&
      p?.execution?.JMLogic===true && p?.execution?.allowed===true,'ACTUAL_KO_EXECUTION_NOT_EVIDENCED');
  req(p?.identities?.left==='KOCODIFIER' && p?.identities?.right==='SLINGFALL','KO_IDENTITIES');
  req(p?.source?.historicalKocodifyingOriginal===false,'FALSE_HISTORICAL_ORIGINAL_CLAIM');
  req(n?.schema==='jm.ko-native-return/1'&&n?.sourceSHA256===packetSHA,'NATIVE_TYPED_SOURCE_JOIN');
  req(n?.distinctIdentities?.left==='KOCODIFIER' && n?.distinctIdentities?.right==='SLINGFALL','NATIVE_IDENTITIES');
  req(n?.effect==='ALLY_SHIELD' && n?.contactIndex===1 && n?.appliedActors===1,'NATIVE_OPERATION');
  req(n?.host==='Linux' && typeof n?.engine==='string' && n.engine.startsWith('4.5.'),'NATIVE_LINUX_PROOF_SCOPE');
  const before=n?.before,after=n?.after;
  req(typeof before?.energy==='number' && typeof after?.energy==='number' &&
      +(before.energy-after.energy).toFixed(4)===12,'NATIVE_ENERGY_CONSEQUENCE');
  req(Array.isArray(before?.shields)&&Array.isArray(after?.shields)&&
      before.shields.length===1 && after.shields.length===1 &&
      before.shields[0].id===after.shields[0].id &&
      before.shields[0].shield===0 && after.shields[0].shield>=6,'NATIVE_SHIELD_CONSEQUENCE');
  req(j?.schema==='jm.judgemaker-native-qualification/1'&&j?.donor?.sha256===JUDGE_SHA &&
      j?.input?.sourcePacketSHA256===packetSHA &&
      j?.result?.verdict==='QUALIFIED'&&j?.result?.score===1 &&
      j?.result?.confidence===1,'ORIGINAL_JUDGE_QUALIFICATION');
  req(m?.schema==='jm.janglemonitor-native-identity/1'&&
      m?.provenance?.jangleOriginalSHA256===MONITOR_SHA &&
      m?.provenance?.koTypedPacketSHA256===packetSHA &&
      m?.provenance?.judgeOriginalSHA256===JUDGE_SHA,'ORIGINAL_MONITOR_LINEAGE');
  req(JSON.stringify(m?.native?.before)===JSON.stringify(before)&&
      JSON.stringify(m?.native?.after)===JSON.stringify(after),'MONITOR_NOT_SAME_NATIVE_RETURN');
  req(m?.actualContact?.classification==='ACTUAL_GODOT_NATIVE_RETURN'&&
      m?.actualContact?.identitySurvived===true &&
      m?.actualContact?.hardBreakpoint===null &&
      m?.actualContact?.softBoundary===1,'MONITOR_IDENTITY_BOUNDARY');
  return errors;
}
assert.deepEqual(blockers(),[],'ACTUAL_UPSTREAM_EVIDENCE_NOT_ADMISSIBLE');

// Each edge is a possible evidence-verification ordering. Native state was
// only changed in CP10. Risk/cost values are *illustrative route policy scores*;
// routes do not imply new gameplay commands or physically executed alternatives.
const edges=[
 {from:'KO_EXECUTED',to:'TYPED_PACKET',cost:1,risk:0,loss:0,reversible:1},
 {from:'TYPED_PACKET',to:'GODOT_NATIVE_RETURN',cost:1,risk:0,loss:0,reversible:1},
 {from:'GODOT_NATIVE_RETURN',to:'JUDGE_QUALIFIED',cost:1,risk:2,loss:0,reversible:1},
 {from:'GODOT_NATIVE_RETURN',to:'SOURCE_RECHECK',cost:1,risk:0,loss:0,reversible:1},
 {from:'SOURCE_RECHECK',to:'JUDGE_QUALIFIED',cost:1,risk:0,loss:0,reversible:1},
 {from:'JUDGE_QUALIFIED',to:'JANGLE_IDENTITY_SURVIVED',cost:1,risk:0,loss:0,reversible:1},
 {from:'JANGLE_IDENTITY_SURVIVED',to:'SCOPED_CI_CONTACT',cost:1,risk:0,loss:0,reversible:1},
 // Synthetic planning branches, not native events:
 {from:'TYPED_PACKET',to:'DASHBOARD_ONLY',cost:1,risk:9,loss:9,reversible:0},
 {from:'JANGLE_IDENTITY_SURVIVED',to:'OWNER_FOLD_NOT_PROVEN',cost:1,risk:9,loss:9,reversible:0},
 {from:'JANGLE_IDENTITY_SURVIVED',to:'TYPED_PACKET',cost:1,risk:9,loss:9,reversible:0}
];
const common={start:'KO_EXECUTED',goal:'SCOPED_CI_CONTACT',maxDepth:8,edges,
  require:['GODOT_NATIVE_RETURN','JUDGE_QUALIFIED','JANGLE_IDENTITY_SURVIVED'],
  avoid:['DASHBOARD_ONLY','OWNER_FOLD_NOT_PROVEN']};
const safe=JM.jourmaze({...common,preference:'lowest_risk'});
const quick=JM.jourmaze({...common,preference:'shortest'});
const visited=r=>r?.nodes?.join('>');
assert.equal(safe.body,'JM JourMaze');
assert.equal(safe.routes.length,2,'ORIGINAL_MAZE_DID_NOT_FIND_TWO_VALID_ROUTES');
assert.ok(safe.bestRoute?.nodes.includes('SOURCE_RECHECK'),'LOWEST_RISK_DID_NOT_CHOOSE_AUDITED_BRANCH');
assert.ok(!quick.bestRoute?.nodes.includes('SOURCE_RECHECK'),'SHORTEST_DID_NOT_CHOOSE_DIRECT_BRANCH');
assert.ok(safe.bestRoute.nodes.length>quick.bestRoute.nodes.length,'BEST_ROUTE_COLLAPSED_INTO_SHORTEST');
for(const r of safe.routes){
  for(const point of common.require)assert.ok(r.nodes.includes(point),'REQUIRED_PROVEN_STAGE_MISSING_'+point);
  assert.ok(!r.nodes.includes('OWNER_FOLD_NOT_PROVEN')&&!r.nodes.includes('DASHBOARD_ONLY'),'FORBIDDEN_ROUTE_ADMITTED');
}
// Explicit constraints change possible route, not just display text.
const forcedDirect=JM.jourmaze({...common,avoid:[...common.avoid,'SOURCE_RECHECK'],preference:'lowest_risk'});
assert.equal(forcedDirect.routes.length,1,'AVOID_DID_NOT_REMOVE_AUDIT_BRANCH');
assert.equal(visited(forcedDirect.bestRoute),visited(quick.bestRoute),'CONSTRAINT_REROUTE_FAILED');
const blockedJudge=JM.jourmaze({...common,avoid:[...common.avoid,'JUDGE_QUALIFIED']});
assert.equal(blockedJudge.routes.length,0,'UNQUALIFIED_ROUTE_FALSELY_EARNED');
const blockedMonitor=JM.jourmaze({...common,avoid:[...common.avoid,'JANGLE_IDENTITY_SURVIVED']});
assert.equal(blockedMonitor.routes.length,0,'IDENTITY_UNMONITORED_FALSELY_EARNED');
const explored=JM.jourmaze({...common,avoid:[],preference:'lowest_risk'});
assert.ok(explored.deadends.some(route=>route.includes('DASHBOARD_ONLY')),'DASHBOARD_DEADEND_NOT_RECOGNISED');
assert.ok(explored.deadends.some(route=>route.includes('OWNER_FOLD_NOT_PROVEN')),'OWNER_GATE_DEADEND_NOT_RECOGNISED');
assert.ok(explored.cycles.some(c=>c.to==='TYPED_PACKET'),'CYCLE_NOT_DETECTED');
const ownerAsked=JM.jourmaze({...common,goal:'OWNER_FOLD_ACCEPTED',avoid:[],require:[]});
assert.equal(ownerAsked.routes.length,0,'UNPROVEN_OWNER_CONTACT_ROUTE_HALLUCINATED');
assert.equal(ownerAsked.bestRoute,null,'OWNER_ROUTE_FALSELY_SELECTED');

// Input falsification: in these isolated synthetic variants, NO admissible
// graph should be built from mere membership/labels/receipts.
const negativeInputs=[
 ['KO_EXECUTOR_LABEL_ONLY',null,null,null,{schema:'jm.ko-contact.typed/1',execution:{Codifying:true}}],
 ['NO_NATIVE_STATE',{...native,after:undefined}],
 ['NO_EFFECT',{...native,after:{...native.after,energy:native.before.energy}}],
 ['FALSE_SHIELD',{...native,after:{...native.after,shields:native.before.shields}}],
 ['FORGED_SOURCE',{...native,sourceSHA256:'0'.repeat(64)}],
 ['BAD_JUDGE',native,{...judged,result:{...judged.result,verdict:'NOT_QUALIFIED'}}],
 ['BROKEN_IDENTITY',native,judged,{...monitored,actualContact:{...monitored.actualContact,identitySurvived:false,hardBreakpoint:3}}],
 ['FABRICATED_OWNER_SCOPE',{...native,host:'Android'}],
 ['WRONG_NATIVE_MONITOR_JOIN',native,judged,{...monitored,native:{...monitored.native,after:{...native.after,energy:2}}}]
];
const held=[];
for(const [name,n,j,m,p] of negativeInputs){
  const reasons=blockers(n??native,j??judged,m??monitored,p??body);
  assert.ok(reasons.length>0,'FAKE_NATIVE_EVIDENCE_PROMOTED_'+name);
  held.push({name,classification:'SYNTHETIC_FALSIFICATION',reasons});
}
const receipt={
 schema:'jm.jourmaze-native-evidence-route/1',
 created:'2026-10-25',
 donor:{identity:'JM JourMaze',originalSHA256:HASH,version:'1.0',execution:'original frozen JS kernel executed independently in Node VM',selfTests:{passed:self.passed,total:self.total}},
 upstream:{nativeSchema:native.schema,host:native.host,engine:native.engine,
  nativeSourcePacketSHA256:packetSHA,nativeBefore:native.before,nativeAfter:native.after,
  judgedBy:'JM JudgeMaker',judgeVerdict:judged.result.verdict,
  monitoredBy:'JM JangleMonitor',jangleIdentitySurvived:monitored.actualContact.identitySurvived},
 route:{scope:'EARNED_LINUX_CI_CONTACT_ONLY',policy:'lowest_risk',policyWeights:'ILLUSTRATIVE_ORDINAL_NOT_EMPIRICAL_PROBABILITY',
  required:common.require,avoided:common.avoid,viableRoutes:safe.routes.length,
  chosen:safe.bestRoute,shortestComparison:quick.bestRoute,branchpoints:safe.branches,
  observedDeadendExploration:explored.deadends,
  observedCyclesInModel:explored.cycles,forcedDirect:forcedDirect.bestRoute,
  noJudgeRoutes:blockedJudge.routes.length,noIdentityRoutes:blockedMonitor.routes.length,
  ownerDeviceRoutes:ownerAsked.routes.length},
 falsification:{held,ownerDeviceClaim:'HOLD',diagramBranchesAreActualGameEvents:false},
 boundary:'True native KO recipient effect ran in Godot Linux; original JourMaze executes separately on returned evidence; graph/planning alternatives were evaluated, not physically enacted, Android Fold owner contact unproven.'
};
const output=new URL('evidence/jourmaze-proof-routes.json',here);
await mkdir(dirname(fileURLToPath(output)),{recursive:true});
await writeFile(output,JSON.stringify(receipt,null,2)+'\n');
console.log('CP14 ORIGINAL JOURMAZE × REAL NATIVE EVIDENCE PASS',JSON.stringify({
 originalTests:self.passed,viableRoutes:safe.routes.length,
 lowestRisk:visited(safe.bestRoute),shortest:visited(quick.bestRoute),
 deadends:explored.deadends.length,cycles:explored.cycles.length,
 falsificationHolds:held.length,ownerRoutes:ownerAsked.routes.length,
 source:HASH}));
