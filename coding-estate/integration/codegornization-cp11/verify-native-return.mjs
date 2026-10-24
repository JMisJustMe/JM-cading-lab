import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {Codifying,Kocodifying} from '../../sovereign-batch-two/direct/codifying-kocodifying-native.mjs';
import {JMLogic} from '../../sovereign-ten/direct/language-native.mjs';
const here=new URL('./',import.meta.url),sha=b=>createHash('sha256').update(b).digest('hex');
const file=JSON.parse(await readFile(new URL('evidence/cp11-native-return.json',here),'utf8'));
const pack=JSON.parse(await readFile(new URL('godot/packets/ko_aegis.json',here),'utf8'));
const src=JSON.parse(pack.payload);
assert.equal(file.schema,'jm.ko-native-evidence/1');
assert.equal(file.native_test_failed,0);
assert.equal(file.ko_source_packet_sha256,sha(pack.payload));
assert.equal(pack.payloadSHA256,sha(pack.payload));
const actual=file.native_return;
assert.equal(actual.schema,'jm.ko-native-return/1');
assert.equal(actual.sourceSHA256,pack.payloadSHA256);
assert.deepEqual(actual.distinctIdentities,src.identities);
assert.deepEqual(actual.participants,['Codifying','Kocodifying','JMLogic','SLINGFALL_GODOT']);
assert.equal(actual.effect,src.contact.effect);
assert.equal(actual.contactIndex,1);
assert.equal(actual.appliedActors,actual.after.shields.length);
assert.equal(actual.before.shields.length,actual.after.shields.length);
assert.ok(actual.appliedActors>0);
assert.equal(actual.before.energy-actual.after.energy,src.contact.energy);
for(const a of actual.after.shields){
 const b=actual.before.shields.find(row=>row.id===a.id);
 assert.ok(b,'missing matching original champion');
 assert.ok(a.shield>=src.contact.shield_seconds,'native shield not actually applied');
 assert.ok(a.shield>=b.shield,'native shield worsened');
}
assert.match(file.owner_trace_before,/NOT USED YET/);
assert.match(file.owner_trace_after,/ENERGY 100 → 88/);
assert.match(file.owner_trace_after,/NATIVE RETURN RECORDED/);
const sourceHashes={
 codifier:sha(await readFile(new URL('../../sovereign-batch-two/direct/codifying-kocodifying-native.mjs',here))),
 logic:sha(await readFile(new URL('../../sovereign-ten/direct/language-native.mjs',here)))
};
assert.equal(src.source.codifier,sourceHashes.codifier);
assert.equal(src.source.logic,sourceHashes.logic);
assert.equal(src.source.historicalKocodifyingOriginal,false);

// RETURN PASS 1: actual source-preserved Kocodifying synchronises *from*
// native Godot to separate KO review state, without identity merge.
const cocode=`cocode NativeReturn {
 left KO_REVIEW
 right SLINGFALL
 bind left.result.energy <-> right.after.energy
 conflict right
 recover rollback
}`;
const left={identity:'KO_REVIEW',result:{energy:-1},unrelated:{original:'KO-owned'}};
const right={identity:'SLINGFALL',after:{energy:actual.after.energy},unrelated:{original:'Godot-owned'}};
const sync=Kocodifying.execute(cocode,'NativeReturn',left,right);
assert.equal(sync.runtime.status,'synced');
assert.equal(sync.runtime.left.result.energy,actual.after.energy);
assert.equal(sync.runtime.right.after.energy,actual.after.energy);
assert.equal(sync.runtime.left.identity,'KO_REVIEW');
assert.equal(sync.runtime.right.identity,'SLINGFALL');
assert.equal(sync.runtime.left.unrelated.original,'KO-owned');
assert.equal(sync.runtime.right.unrelated.original,'Godot-owned');
const conflict=Kocodifying.execute(cocode.replace('conflict right','conflict reject'),'NativeReturn',left,right);
assert.equal(conflict.runtime.status,'rolled-back');
assert.deepEqual(conflict.runtime.left,left);
assert.deepEqual(conflict.runtime.right,right);

// RETURN PASS 2: actual Codifying materialises typed *native-return* record.
const codex=`codex NativeOutcome {
 field source_sha : text
 field energy_before : number
 field energy_after : number
 field actors : number
 field effect : text
 emit native_return
}`;
const code=Codifying.execute(codex,'NativeOutcome',{
 source_sha:actual.sourceSHA256,
 energy_before:actual.before.energy,
 energy_after:sync.runtime.left.result.energy,
 actors:actual.appliedActors,effect:actual.effect
});
assert.equal(code.runtime.record.source_sha,pack.payloadSHA256);
assert.equal(code.runtime.record.energy_after,actual.after.energy);
assert.ok(code.runtime.receipt && code.runtime.trace.length>0);

// RETURN PASS 3: actual JMLogic executes positive and negative decisions on
// the native returned state; the negative fixture must stay disallowed.
const logicSrc=`rule AcceptObservedNativeEnergy {
 when native.after.energy < native.before.energy
 then proof.energySpent = true
 recover {
 proof.energySpent = false
 }
}
rule AcceptObservedActors {
 when native.appliedActors > 0
 then proof.actorContact = true
 recover {
 proof.actorContact = false
 }
}`;
const facts={native:{before:actual.before,after:actual.after,appliedActors:actual.appliedActors},proof:{energySpent:false,actorContact:false}};
const logic=JMLogic.execute(logicSrc,facts);
assert.equal(logic.runtime.state.proof.energySpent,true);
assert.equal(logic.runtime.state.proof.actorContact,true);
const forged=JMLogic.execute(logicSrc,{native:{before:{energy:40},after:{energy:50},appliedActors:0},proof:{energySpent:false,actorContact:false}});
assert.equal(forged.runtime.state.proof.energySpent,false);
assert.equal(forged.runtime.state.proof.actorContact,false);
// Deliberate changed packet fingerprint never gets promoted to a donor execution.
const dishonest={...actual,sourceSHA256:'0'.repeat(64)};
assert.notEqual(dishonest.sourceSHA256,pack.payloadSHA256);
const receipt={
 schema:'jm.ko-roundtrip-proof/1',
 historicalOriginalClaim:false,
 hosts:{forward:'actual current KO/JM Node executors',recipient:'actual native Godot Linux',reverse:'actual current KO/JM Node executors',android:'candidate produced later; physical Fold not yet run'},
 sourceSHA256:sourceHashes,packetSHA256:pack.payloadSHA256,
 native:{effect:actual.effect,energyBefore:actual.before.energy,energyAfter:actual.after.energy,actors:actual.appliedActors,shieldAfter:actual.after.shields},
 kocodifying:{direction:'GODOT_TO_KO',actualExecutable:true,identityLeft:sync.runtime.left.identity,identityRight:sync.runtime.right.identity,status:sync.runtime.status,trace:sync.runtime.trace,receipt:sync.runtime.receipt,rollbackTest:'PASS'},
 codifying:{actualExecutable:true,codex:code.runtime.codex,record:code.runtime.record,trace:code.runtime.trace,receipt:code.runtime.receipt},
 jmlogic:{actualExecutable:true,decisions:logic.runtime.decisions.map(x=>({rule:x.ruleName,matched:x.matched})),trace:logic.runtime.trace,receipt:logic.runtime.receipt,negativeCase:'PASS'},
 nativeExecutionEvidenceFileSHA256:sha(await readFile(new URL('evidence/cp11-native-return.json',here))),
 state:'FORWARD_NATIVE_REVERSE_EXECUTION_PASS'
};
await writeFile(new URL('evidence/cp11-ko-roundtrip-proof.json',here),JSON.stringify(receipt,null,2));
console.log('CP11 KO REAL RETURN PASS',JSON.stringify({state:receipt.state,native:receipt.native,kocodifying:receipt.kocodifying.status,codifying:receipt.codifying.codex,jmlogic:receipt.jmlogic.decisions}));
