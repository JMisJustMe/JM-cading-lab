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

// Public knowledge metadata → existing OneBody IR → executed portable return.
// Private lyrics and raw Evernote content are outside this public adapter.
export async function executePublicCatalogueSource({identity,content,sha256}){
 if(typeof identity!=='string'||!identity.trim()||identity.length>240||typeof content!=='string'||content.length>65536||!/^[a-f0-9]{64}$/.test(sha256||''))throw Error('CATALOGUE_SOURCE_CONTRACT_HOLD');
 const exact=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(content)))].map(x=>x.toString(16).padStart(2,'0')).join('');
 if(exact!==sha256)throw Error('CATALOGUE_SOURCE_HASH_HOLD');
 const catalogue=JSON.parse(content);
 if(catalogue.schema!=='JM.LyricPublicCatalogue/1.2'||catalogue.private_full_note_text_published!==false||catalogue.private_full_lyric_corpus_published!==false)throw Error('PUBLIC_CATALOGUE_BOUNDARY_HOLD');
 const counts=catalogue.counts;
 if(!counts||Object.values(counts).some(n=>!Number.isSafeInteger(n)||n<0))throw Error('CATALOGUE_COUNTS_HOLD');
 const {createOneBodyIR,executeOneBodyIR}=await import('../everybody/role-qualified-61/native/onebody-ir.mjs');
 const ir=createOneBodyIR({bodyId:'jm-lyrics-public-source-contact',bodyName:'JM Lyrics public catalogue source contact',sourceAuthority:identity+' / sha256:'+exact,
  nodes:[{id:'catalogue',kind:'source',value:exact},{id:'return',kind:'proof',value:'PUBLIC_METADATA_ONLY'}],
  links:[{from:'catalogue',to:'return',kind:'source-to-portable-return'}],
  operations:[...Object.entries(counts).map(([name,value])=>({op:'SET',name,value})),
   {op:'ASSERT',name:'canonical_source_units',value:counts.canonical_source_units},
   {op:'TRACE',value:{source:identity,sha256:exact,privateCorpus:false}},
   {op:'DING',value:'PUBLIC_CATALOGUE_METADATA_EXECUTED'}]});
 const execution=executeOneBodyIR(ir);
 if(!execution.receipt.ok)throw Error('CATALOGUE_EXECUTION_HOLD');
 return {schema:'jm.public-catalogue.portable-contact/1',source:{identity,sha256:exact},portable:execution.portable,receipt:execution.receipt,
  boundary:'Public metadata executed through recovered OneBody forward IR only. No private corpus import, lyric generation, historical IR recovery, publication or device claim.'};
}
