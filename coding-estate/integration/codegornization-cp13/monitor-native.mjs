// CP13: run original, byte-frozen JM JangleMonitor against a live Godot
// CP10 before/after return already independently adjudicated by JudgeMaker.
// The native gameplay transition and laboratory adversarial deltas are distinct.
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname} from 'node:path';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
const here=new URL('./',import.meta.url);
const HASH='cdb57ae2376e219f253b2f57382d11d4b378b305c408a6468d6757d2a9e88302';
const sha=b=>createHash('sha256').update(b).digest('hex');
const source=await readFile(new URL('donors/JM_JangleMonitor.html',here));
assert.equal(sha(source),HASH,'FROZEN_JANGLEMONITOR_SOURCE_DRIFT');
const match=source.toString('utf8').match(/<script>([\s\S]*?)<\/script>/i);
assert.ok(match,'ORIGINAL_MONITOR_EXECUTOR_MISSING');
const JM=runInNewContext(match[1]+'\n;JMJangleMonitor;',{}, {timeout:1500});
assert.equal(typeof JM.monitor,'function');
const self=JM.selfTests();
assert.equal(self.passed,5,'ORIGINAL_JANGLEMONITOR_SELFTEST_FAILURE');
assert.equal(self.total,5);

const nativeFile=new URL('../codegornization-cp12/evidence/native-ko-return.json',here);
const judgeFile=new URL('../codegornization-cp12/evidence/judgemaker-verdict.json',here);
const native=JSON.parse(await readFile(nativeFile,'utf8'));
const judged=JSON.parse(await readFile(judgeFile,'utf8'));
const envelope=JSON.parse(await readFile(new URL('../codegornization-cp10/godot/packets/ko_aegis.json',here),'utf8'));
assert.equal(envelope.schema,'jm.ko-contact.transport/1');
const packetHash=sha(Buffer.from(envelope.payload,'utf8'));
assert.equal(envelope.payloadSHA256,packetHash,'KO_SOURCE_PACKET_TAMPER');
assert.equal(native.schema,'jm.ko-native-return/1','NOT_REAL_GODOT_RETURN');
assert.equal(native.sourceSHA256,packetHash,'NATIVE_RETURN_SOURCE_MISMATCH');
assert.equal(native.distinctIdentities?.left,'KOCODIFIER','KO_IDENTITY_NOT_ORIGINAL');
assert.equal(native.distinctIdentities?.right,'SLINGFALL','GAME_IDENTITY_NOT_ORIGINAL');
assert.equal(native.effect,'ALLY_SHIELD','WRONG_NATIVE_EFFECT');
assert.equal(native.contactIndex,1,'UNBOUNDED_REPLAY');
assert.equal(judged.schema,'jm.judgemaker-native-qualification/1');
assert.equal(judged.input?.sourcePacketSHA256,packetHash,'JUDGEMENT_SOURCE_MISMATCH');
assert.equal(judged.result?.verdict,'QUALIFIED','JUDGEMAKER_NOT_QUALIFIED');
assert.equal(judged.donor?.sha256,'f0dbce602b239e84c415350d16675127b27d771842b5cd12819432fee874dde6','JUDGEMAKER_SOURCE_NOT_EXACT');

const before=native.before, after=native.after;
assert.ok(before && after && typeof before.energy==='number' && typeof after.energy==='number','NATIVE_ENERGY_EVIDENCE_MISSING');
assert.equal(+(before.energy-after.energy).toFixed(4),12,'NATIVE_ENERGY_CHANGE_MISSING');
assert.ok(Array.isArray(before.shields) && Array.isArray(after.shields) && before.shields.length===1 && after.shields.length===1,'NATIVE_ACTOR_EVIDENCE_NOT_BOUNDED');
assert.equal(before.shields[0].id,after.shields[0].id,'ACTOR_ID_CHANGED');
assert.ok(typeof before.shields[0].shield==='number' && typeof after.shields[0].shield==='number' && before.shields[0].shield===0 && after.shields[0].shield>=6,'NATIVE_SHIELD_CHANGE_NOT_PROVEN');
assert.equal(native.appliedActors,1,'NATIVE_APPLIED_ACTOR_COUNT_DRIFT');
assert.ok(typeof native.engine==='string' && native.engine.startsWith('4.5.') && native.host==='Linux','THIS_CI_PROVES_GODOT_LINUX_ONLY');

// JangleMonitor receives a snapshot assembled strictly from a genuine Godot
// native before/after receipt. JudgeMaker has already adjudicated qualification.
const original={
  source:{packet:packetHash},
  identity:{ko:native.distinctIdentities.left,recipient:native.distinctIdentities.right},
  effect:native.effect,
  native:{energy:before.energy,heroId:before.shields[0].id,shield:before.shields[0].shield}
};
const invariants=[
  {path:'source.packet',mode:'equalsOriginal',hard:true,weight:4},
  {path:'identity.ko',mode:'equalsOriginal',hard:true,weight:4},
  {path:'identity.recipient',mode:'equalsOriginal',hard:true,weight:4},
  {path:'effect',mode:'equalsOriginal',hard:true,weight:3},
  {path:'native.heroId',mode:'equalsOriginal',hard:true,weight:3},
  {path:'native.energy',mode:'equalsOriginal',hard:false,weight:1},
  {path:'native.shield',mode:'equalsOriginal',hard:false,weight:1}
];
const nativeDeltas=[
  {op:'set',path:'native.energy',value:after.energy},
  {op:'set',path:'native.shield',value:after.shields[0].shield}
];
// ACTUAL consequence: gameplay changed but identity survived.
const live=JM.monitor(original,{invariants,disturbances:nativeDeltas});
assert.equal(live.trace.length,2,'NATIVE_DELTA_NOT_PROCESSED_BY_MONITOR');
assert.equal(live.trace[0].identity,'STRAINED','EXPECTED_SOFT_ENERGY_STRAIN');
assert.equal(live.trace[1].identity,'STRAINED','EXPECTED_SOFT_SHIELD_STRAIN');
assert.equal(live.softBoundary,1,'ORIGINAL_MONITOR_MISSED_STRAIN');
assert.equal(live.breakpoint,null,'LEGITIMATE_GAMEPLAY_INCORRECTLY_BROKE_IDENTITY');
assert.equal(live.identitySurvived,true,'IDENTITY_DID_NOT_SURVIVE');
assert.equal(live.final.native.energy,after.energy);
assert.equal(live.final.native.shield,after.shields[0].shield);
assert.equal(live.final.identity.recipient,'SLINGFALL');

// SYNTHETIC falsification is kept separate from native reality:
// forged identity cannot masquerade as the same legitimate recipient.
const cases=[
  {name:'synthetic-game-recipient-substitution',mut:{op:'set',path:'identity.recipient',value:'FORGED_GAME'},hard:'identity.recipient'},
  {name:'synthetic-ko-source-substitution',mut:{op:'set',path:'source.packet',value:'0'.repeat(64)},hard:'source.packet'},
  {name:'synthetic-ko-identity-substitution',mut:{op:'set',path:'identity.ko',value:'OTHER_KO'},hard:'identity.ko'},
  {name:'synthetic-actor-substitution',mut:{op:'set',path:'native.heroId',value:99999},hard:'native.heroId'},
  {name:'synthetic-effect-substitution',mut:{op:'set',path:'effect',value:'DAMAGE_ALL'},hard:'effect'}
];
const counterexamples=cases.map(c=>{
  const r=JM.monitor(original,{invariants,disturbances:[...nativeDeltas,c.mut]});
  assert.equal(r.softBoundary,1,c.name+'_SOFT_BOUNDARY_LOST');
  assert.equal(r.breakpoint,3,c.name+'_HARD_BREAK_NOT_DETECTED');
  assert.equal(r.identitySurvived,false,c.name+'_FALSE_SURVIVAL');
  assert.equal(r.trace[2].identity,'BROKEN',c.name+'_INCORRECT_FINAL_STATE');
  assert.ok(r.trace[2].checks.some(x=>x.path===c.hard&&!x.pass&&x.hard),c.name+'_MISSING_HARD_REASON');
  return {case:c.name,classification:'SYNTHETIC_NOT_NATIVE',breakpoint:r.breakpoint,hardInvariant:c.hard};
});
// Soft changes alone cannot silently be promoted to hard identity failure.
const softOnly=JM.monitor(original,{invariants,disturbances:nativeDeltas});
assert.equal(softOnly.identitySurvived,true);
assert.equal(softOnly.breakpoint,null);

// Missing true native consequence must fail closed before a monitor could
// treat mere source labels, precomputed arguments or a dashboard as contact.
for(const [label,fake] of [
 ['mere-identity-presence',{sourceSHA256:packetHash,distinctIdentities:native.distinctIdentities}],
 ['no-real-native-after',{...native,after:undefined}],
 ['unchanged-energy',{...native,after:{...after,energy:before.energy}}],
 ['unchanged-shield',{...native,after:{...after,shields:before.shields}}],
]){
  const valid=!!(fake.before && fake.after && typeof fake.before.energy==='number' && typeof fake.after.energy==='number'
    && Number((fake.before.energy-fake.after.energy).toFixed(4))===12
    && Array.isArray(fake.before.shields)&&Array.isArray(fake.after.shields)&&fake.before.shields.length===1
    && fake.after.shields.length===1
    && fake.before.shields[0].id===fake.after.shields[0].id
    && fake.after.shields[0].shield>fake.before.shields[0].shield
    && fake.after.shields[0].shield>=6);
  assert.equal(valid,false,'INVALID_NATIVE_EVIDENCE_ACCEPTED_'+label);
}
const receipt={
  schema:'jm.janglemonitor-native-identity/1',date:'2026-10-25',
  scope:'Godot Linux CI true native return → independently executed original JangleMonitor; not device owner contact',
  provenance:{jangleOriginalSHA256:HASH,koTypedPacketSHA256:packetHash,
    nativeReceiptSHA256:sha(Buffer.from(JSON.stringify(native),'utf8')),
    judgeOriginalSHA256:judged.donor.sha256,
    roles:['KO actual Node execution','Godot real native consequence','JudgeMaker distinct qualification','JangleMonitor distinct change-boundary analysis']},
  originalTests:{passed:self.passed,total:self.total},
  native:{before,after,host:native.host,engine:native.engine},
  actualContact:{identitySurvived:live.identitySurvived,softBoundary:live.softBoundary,hardBreakpoint:live.breakpoint,
    trace:live.trace,classification:'ACTUAL_GODOT_NATIVE_RETURN'},
  syntheticCounterexamples:counterexamples,
  negativeEvidenceCases:4,
  claim:'One more bounded independent body executes and analyzes real returned native consequence; synthetic falsification cases do not claim native occurrence.'
};
const output=new URL('evidence/jangle-native-identity.json',here);
await mkdir(dirname(fileURLToPath(output)),{recursive:true});
await writeFile(output,JSON.stringify(receipt,null,2)+'\n');
console.log('CP13 ORIGINAL JANGLEMONITOR × REAL GODOT RETURN PASS',JSON.stringify({originalTests:self.passed,actualSoftBoundary:live.softBoundary,actualHardBreakpoint:live.breakpoint,identitySurvived:live.identitySurvived,syntheticHardBreaks:counterexamples.length,negativeEvidenceHolds:4,original:HASH}));
