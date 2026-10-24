import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {Codifying,Kocodifying} from '../../sovereign-batch-two/direct/codifying-kocodifying-native.mjs';
import {JMLogic} from '../../sovereign-ten/direct/language-native.mjs';

const here=new URL('./',import.meta.url);
const sha=b=>createHash('sha256').update(b).digest('hex');
const donors={
  codifier:new URL('../../sovereign-batch-two/direct/codifying-kocodifying-native.mjs',here),
  logic:new URL('../../sovereign-ten/direct/language-native.mjs',here)
};
const sourceHashes={};
for(const [body,url] of Object.entries(donors))sourceHashes[body]=sha(await readFile(url));

// ORIGINAL EXECUTION: genuine reconstructed Kocodifying donor.
// Binding keeps the two identity objects separate and synchronises only intent.
const koSource=`cocode KOToSlingfall {
  left KOCODIFIER
  right SLINGFALL
  bind left.route.intent <-> right.contact.intent
  conflict left
  recover rollback
}`;
const owner={identity:'KOCODIFIER',route:{intent:'AEGIS'},untouched:'owner-source'};
const recipient={identity:'SLINGFALL',contact:{intent:'UNBOUND'},untouched:'native-identity'};
const ko=Kocodifying.execute(koSource,'KOToSlingfall',owner,recipient);
assert.equal(ko.runtime.status,'synced');
assert.equal(ko.runtime.right.contact.intent,'AEGIS');
assert.equal(ko.runtime.left.identity,'KOCODIFIER');
assert.equal(ko.runtime.right.identity,'SLINGFALL');
assert.equal(ko.runtime.left.untouched,'owner-source');
assert.equal(ko.runtime.right.untouched,'native-identity');
assert.ok(ko.runtime.trace.length>0 && ko.runtime.receipt);

// ORIGINAL EXECUTION: genuine current Codifying donor materialises typed game contract.
const codex=`codex NativeContact {
  field intent : text
  field effect : text
  field energy : number
  field shield_seconds : number
  field uses : number
  emit native_contact
}`;
const typed=Codifying.execute(codex,'NativeContact',{
  intent:ko.runtime.right.contact.intent,effect:'ALLY_SHIELD',energy:12,
  shield_seconds:6,uses:1
});
assert.equal(typed.runtime.record.effect,'ALLY_SHIELD');
assert.ok(typed.runtime.receipt && typed.runtime.trace.length>0);

// ORIGINAL EXECUTION: genuine JMLogic current body determines whether
// the typed requested effect is permitted. It fails closed on other intents.
const rule=`rule AllowNativeAegis {
  when contact.intent == "AEGIS"
  then action.allowed = true
  recover {
    action.allowed = false
  }
}`;
const facts={contact:{intent:typed.runtime.record.intent},action:{allowed:false}};
const logic=JMLogic.execute(rule,facts);
assert.equal(logic.runtime.decisions[0].matched,true);
assert.equal(logic.runtime.state.action.allowed,true);
assert.ok(logic.runtime.receipt && logic.runtime.trace.length>0);
const denied=JMLogic.execute(rule,{contact:{intent:'DAMAGE_ALL'},action:{allowed:false}});
assert.equal(denied.runtime.state.action.allowed,false);

// Native packet transport is intentionally typed and bounded.
// JavaScript KO donors run in Node build stage, not on device.
const packet={
  schema:'jm.ko-contact.typed/1',
  source:{codifier:sourceHashes.codifier,logic:sourceHashes.logic,historicalKocodifyingOriginal:false},
  identities:{left:ko.runtime.left.identity,right:ko.runtime.right.identity},
  binding:{status:ko.runtime.status,ownerIntent:ko.runtime.left.route.intent,recipientIntent:ko.runtime.right.contact.intent},
  execution:{Kocodifying:true,Codifying:true,JMLogic:true,allowed:logic.runtime.state.action.allowed},
  contact:typed.runtime.record,
  trace:{kocodifying:ko.runtime.receipt,codifying:typed.runtime.receipt,jmlogic:logic.runtime.receipt}
};
const payload=JSON.stringify(packet),digest=sha(payload);
const envelope={schema:'jm.ko-contact.transport/1',payload,payloadSHA256:digest};
await mkdir(new URL('./godot/packets/',here),{recursive:true});
await mkdir(new URL('./evidence/',here),{recursive:true});
await writeFile(new URL('./godot/packets/ko_aegis.json',here),JSON.stringify(envelope,null,2));
await writeFile(new URL('./godot/KOSeal.gd',here),
  'extends RefCounted\nconst SOURCE_CODIFIER = "'+sourceHashes.codifier+'"\n'+
  'const SOURCE_LOGIC = "'+sourceHashes.logic+'"\n'+
  'const PACKET_SHA = "'+digest+'"\n');
const receipt={schema:'jm.ko-executed-to-native/1',sourceHashes,
  claim:'Three real current KO/JM donor executors executed in Node; native effect awaits Godot contact.',
  kocodifying:{status:ko.runtime.status,graphType:ko.ir.graphs[0].type,identityLeft:ko.runtime.left.identity,identityRight:ko.runtime.right.identity,traceCount:ko.runtime.trace.length},
  codifying:{schema:typed.ir.type,recordDigest:typed.runtime.recordDigest,traceCount:typed.runtime.trace.length},
  jmlogic:{rule:logic.runtime.decisions[0].ruleName,matched:logic.runtime.decisions[0].matched,traceCount:logic.runtime.trace.length,negativeDenied:!denied.runtime.state.action.allowed},
  payloadSHA256:digest,packetBytes:Buffer.byteLength(payload),status:'KO_DONORS_EXECUTED'};
await writeFile(new URL('./evidence/ko-native-builder.json',here),JSON.stringify(receipt,null,2));
console.log('KO ORIGINAL EXECUTION PASS',JSON.stringify(receipt));
