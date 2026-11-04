// Source-bound continuation of the existing native world lane. No source eval,
// automatic semantic interpretation, external AI, publication or authority crown.
import {Codifying} from '../sovereign-batch-two/direct/codifying-kocodifying-native.mjs';
import {JMLogic} from '../sovereign-ten/direct/language-native.mjs';
import {runNativeOperatorLane} from '../../navigator/estate-integration/execution-lanes.mjs';
const grammar=`codex Source {
 field identity: text
 field content: text
 field sha256: text
 emit identity
 emit sha256
}`;
const decision=`rule ExactSource {
 when source.verified == true
 then creation.allowed = true
 recover {
 creation.allowed = false
 }
}`;
export async function executeSourceAwareCreation(source,registry){
 const typed=Codifying.execute(grammar,'Source',source).runtime;
 const record=typed.record;
 if(!record.identity.trim()||record.identity.length>240||!record.content.trim()||record.content.length>2000||!/^[a-f0-9]{64}$/.test(record.sha256))throw Error('CREATION_SOURCE_CONTRACT_HOLD');
 const bytes=new TextEncoder().encode(record.content);
 const exact=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
 const logic=JMLogic.execute(decision,{source:{verified:exact===record.sha256}}).runtime;
 if(logic.state.creation.allowed!==true)throw Error('CREATION_SOURCE_HASH_HOLD');
 const execution=runNativeOperatorLane('native-world',record.content,registry);
 return {schema:'jm.source-aware.creation-return/1',source:{identity:record.identity,sha256:exact,bytes:bytes.length},
   sourceMaterialisation:typed.recordDigest,decision:logic.decisions,execution,
   boundary:'Exact caller-selected native program → Codifying → JMLogic → existing native world chain. Hash proves byte identity, not authorship, canonical authority or interpretation of unrelated prose. Rendering, device and publication require separate proof.'};
}
