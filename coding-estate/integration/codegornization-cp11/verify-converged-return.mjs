import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Codifying,Kocodifying} from '../../sovereign-batch-two/direct/codifying-kocodifying-native.mjs';
import {JMLogic} from '../../sovereign-ten/direct/language-native.mjs';

const here=new URL('./',import.meta.url);
const read=async name=>readFile(new URL(name,here),'utf8');
const sha=v=>createHash('sha256').update(v).digest('hex');
const envelope=JSON.parse(await read('godot/packets/ko_live_policy.json'));
assert.equal(envelope.schema,'jm.ko-live.transport/1');
assert.equal(sha(envelope.payload),envelope.payloadSHA256);
const policy=JSON.parse(envelope.payload);
const codeSHA=sha(await read('../../sovereign-batch-two/direct/codifying-kocodifying-native.mjs'));
const logicSHA=sha(await read('../../sovereign-ten/direct/language-native.mjs'));
assert.equal(policy.source.codifying,codeSHA);
assert.equal(policy.source.kocodifying,codeSHA);
assert.equal(policy.source.jmlogic,logicSHA);
assert.equal(policy.source.historicalOriginal,false);
const seal=await read('godot/KO11Seal.gd');
assert.ok(seal.includes(envelope.payloadSHA256) && seal.includes(codeSHA) && seal.includes(logicSHA));
const native=JSON.parse(await read('evidence/cp11-converged-native-return.json'));
assert.equal(native.schema,'jm.ko-converged-native-evidence/1');
assert.equal(native.failures,0);
assert.ok(native.checks>=20);
assert.equal(native.compiledPolicySHA256,envelope.payloadSHA256);
assert.deepEqual(native.policyTable,policy.table);
assert.equal(native.nativeReturns.length,3);
assert.match(native.traceBefore,/NOT USED YET/);
assert.match(native.traceAfter,/NATIVE RETURN RECORDED/);
assert.match(native.traceFinal,/COUNTER/);
const actions=['AEGIS','TRIAGE','COUNTER'];
const cases=[];
const codex=[
 'codex NativeKO11Outcome {',
 ' field action : text',
 ' field before_energy : number',
 ' field after_energy : number',
 ' field target_count : number',
 ' field policy_sha : text',
 ' emit ko_native_outcome','}'
].join('\n');
const cocode=[
 'cocode NativeKO11Return {',
 ' left KO_REVIEW',
 ' right SLINGFALL',
 ' bind left.result.energy <-> right.after.energy',
 ' conflict right',
 ' recover rollback','}'
].join('\n');
const jmSource=[
 'rule RealEnergyChange {',
 ' when native.after.energy < native.before.energy',
 ' then verified.energy = true',
 '}',
 'rule RealTargets {',
 ' when native.target_count > 0',
 ' then verified.targets = true',
 '}'
].join('\n');
function inspectReturn(r,expected){
 assert.equal(r.schema,'jm.ko-live-native-return/1');
 assert.equal(r.compiledPolicySHA256,envelope.payloadSHA256);
 assert.deepEqual(r.executors,['Kocodifying','Codifying','JMLogic']);
 assert.equal(r.nativeExecutor,'Godot bounded decision-table');
 assert.equal(r.historicalOriginal,false);
 assert.equal(r.selected,expected);
 assert.deepEqual(r.identities,policy.identities);
 const f=r.liveFacts;
 const key=(f.wounded?'1':'0')+(f.enemy_near?'1':'0');
 assert.equal(policy.table[key],expected);
 const spec=policy.actions[expected];
 assert.equal(r.before.energy-r.after.energy,spec.cost);
 assert.equal(r.before.energy,100);
 assert.equal(r.index,1);
 assert.equal(r.before.targets.length,r.after.targets.length);
 assert.ok(r.after.targets.length>0);
 for(const before of r.before.targets){
  const after=r.after.targets.find(x=>x.id===before.id);
  assert.ok(after,'Native recipient dropped a target');
  if(expected==='AEGIS'){assert.ok(after.shield>=5 && after.shield>=before.shield);assert.equal(after.hp,before.hp);}
  if(expected==='TRIAGE'){assert.ok(after.hp>before.hp && after.hp<=before.hp+19 && after.shield>=3);}
  if(expected==='COUNTER'){assert.ok(after.stun>=1.8 && after.stun>=before.stun);assert.equal(after.hp,before.hp);}
 }
 return {key,spec,targets:r.after.targets.length};
}
for(let i=0;i<actions.length;i++){
 const r=native.nativeReturns[i],expected=actions[i];
 const checked=inspectReturn(r,expected);
 const left={identity:'KO_REVIEW',result:{energy:-1},other:'KO-owned'};
 const right={identity:'SLINGFALL',after:{energy:r.after.energy},other:'SLINGFALL-owned'};
 const sync=Kocodifying.execute(cocode,'NativeKO11Return',left,right);
 assert.equal(sync.runtime.status,'synced');
 assert.equal(sync.runtime.left.result.energy,r.after.energy);
 assert.equal(sync.runtime.left.identity,'KO_REVIEW');
 assert.equal(sync.runtime.right.identity,'SLINGFALL');
 assert.equal(sync.runtime.right.other,'SLINGFALL-owned');
 const refuse=Kocodifying.execute(cocode.replace('conflict right','conflict reject'),'NativeKO11Return',left,right);
 assert.equal(refuse.runtime.status,'rolled-back');
 const code=Codifying.execute(codex,'NativeKO11Outcome',{
  action:expected,before_energy:r.before.energy,
  after_energy:sync.runtime.left.result.energy,
  target_count:checked.targets,policy_sha:r.compiledPolicySHA256
 });
 assert.equal(code.runtime.record.action,expected);
 assert.equal(code.runtime.record.after_energy,r.after.energy);
 assert.ok(code.runtime.receipt);
 const logic=JMLogic.execute(jmSource,{native:{before:r.before,after:r.after,target_count:checked.targets},verified:{energy:false,targets:false}});
 assert.equal(logic.runtime.state.verified.energy,true);
 assert.equal(logic.runtime.state.verified.targets,true);
 assert.ok(logic.runtime.receipt);
 cases.push({action:expected,facts:r.liveFacts,key:checked.key,
   nativeAfterEnergy:r.after.energy,nativeTargetCount:checked.targets,
   kocodifying:{status:sync.runtime.status,receipt:sync.runtime.receipt},
   codifying:{record:code.runtime.record,receipt:code.runtime.receipt},
   jmlogic:{decisions:logic.runtime.decisions,receipt:logic.runtime.receipt}});
}
const fake=JSON.parse(JSON.stringify(native.nativeReturns[0]));
fake.compiledPolicySHA256='0'.repeat(64);
assert.throws(()=>inspectReturn(fake,'AEGIS'));
const manipulated=JSON.parse(JSON.stringify(native.nativeReturns[1]));
manipulated.after.energy=100;
assert.throws(()=>inspectReturn(manipulated,'TRIAGE'));
const unearned=JMLogic.execute(jmSource,{native:{before:{energy:100},after:{energy:110},target_count:0},verified:{energy:false,targets:false}});
assert.equal(unearned.runtime.state.verified.energy,false);
assert.equal(unearned.runtime.state.verified.targets,false);
const receipt={schema:'jm.ko-cp11-converged-native-return/1',
 state:'SOURCE_KO_TO_LIVE_GODOT_TO_SOURCE_KO_PASS',
 hosts:{donors:'actual current KO source in Node',native:'Godot Linux CI',android:'signed APK candidate only',fold:'NOT TESTED'},
 ancestorHeads:{nativeLive:'7039ce413fb505a971ee5a31b5b9e325e85a601b',
   nativeRoundtrip:'f87e2d53e2fc3a3663be1512d56fe399fb82975e',
   cp10:'06c008bf0fb7eb8c1c0f1492db6e63808a95cafd'},
 source:{codeSHA,logicSHA,historicalKocodifyingOriginal:false},
 policySHA256:envelope.payloadSHA256,nativeEvidenceSHA256:sha(await read('evidence/cp11-converged-native-return.json')),
 cases,negativeTests:['SOURCE_HASH_TAMPER_HOLD','NATIVE_ENERGY_TAMPER_HOLD','JMLOGIC_FAKE_CONTACT_REJECTED'],
 ownerPhysicalFold:'HOLD',judgeMaker:'SEPARATE_CP12_NOT_INTEGRATED'};
await writeFile(new URL('evidence/cp11-converged-ko-reverse-proof.json',here),JSON.stringify(receipt,null,2));
console.log('JM CP11 CONVERGED REAL EXECUTION PASS',JSON.stringify({cases:cases.map(x=>x.action),policy:receipt.policySHA256,negative:receipt.negativeTests}));
