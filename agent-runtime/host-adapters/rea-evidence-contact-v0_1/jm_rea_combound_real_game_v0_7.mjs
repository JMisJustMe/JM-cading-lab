/* JM × REA v0.7 — protected COMBOUND v2.3 source contact and native JM proof.
   Private FLAZ HTML is NEVER committed, copied or overwritten by this adapter. */
import crypto from 'node:crypto';
import {JM32} from '../../../coding-estate/sovereign-ten/direct/language-native.mjs';
import {TraceBoxRuntime} from '../../../coding-estate/sovereign-ten/direct/route-proof-native.mjs';

export const COMBOUND_FLAZ_SHA256='53b6c3d87ebecd647cc59f679d20ca4a0f52cfb7053e8e5bb114b711d1c5e428';
export const COMBOUND_V23_VISUAL_DESCENDANT_SHA256='66a05d8cf1fbb6e42ba71a9b44b087ed152969940888228800f281ce68a336b1';
export const ORIGINAL_SCOPE='const creature23=creature21;\ncreature21=function(u){';
export const CORRECT_SCOPE='const creature23=drawUnit;\ndrawUnit=function(u){';
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const gate=(x,code)=>{if(!x)throw Error('JM_REA_REAL_GAME_HOLD:'+code);};

export function sourceContact(source,{requireExact=true}={}){
 const raw=Buffer.isBuffer(source)?source:Buffer.from(source,'utf8');
 const digest=sha(raw);
 if(requireExact)gate(digest===COMBOUND_FLAZ_SHA256,'PROTECTED_FLAZ_SHA256');
 const text=raw.toString('utf8');
 gate(text.split(ORIGINAL_SCOPE).length===2,'ORIGINAL_SCOPE_NOT_UNIQUE');
 gate(!text.includes(CORRECT_SCOPE),'ALREADY_ALTERED');
 const corrected=text.replace(ORIGINAL_SCOPE,CORRECT_SCOPE);
 const candidateHash=sha(Buffer.from(corrected,'utf8'));
 if(requireExact)gate(candidateHash===COMBOUND_V23_VISUAL_DESCENDANT_SHA256,'DESCENDANT_SHA256');
 const status={parent_sha256:digest,descendant_sha256:candidateHash,changed_exactly_one_scope:true,
   physics_authority:'INHERITED_UNCHANGED',old_scope:ORIGINAL_SCOPE,new_scope:CORRECT_SCOPE,
   protected_source_was_modified:false,proof:'STATIC_SCOPE_GUARD_ONLY'};
 return {status,candidate_in_memory:corrected};
}

const POLICY=[
 'policy ComboundRealGameContact {',
 ' clause PreserveEvidence {',
 '  when evidence.sourceExact == true',
 '  oblige verdict.sourceContacted = true',
 ' }',
 ' clause NoOwnerDevicePromotion {',
 '  when evidence.ownerDevice != true',
 '  sanction verdict.promotable = false',
 ' }',
 ' clause NotREAProven {',
 '  when evidence.reaOriginalImport != true',
 '  sanction verdict.reaOriginalImportProven = false',
 ' }',
 '}'
].join('\n');
export function validateRealGameReceipt(receipt){
 gate(receipt?.schema==='JM.REA.COMBOUND_REAL_GAME_CONTACT/0.7','RECEIPT_SCHEMA');
 gate(receipt.protected_sha256===COMBOUND_FLAZ_SHA256,'PARENT_IDENTITY');
 gate(receipt.candidate_in_memory_sha256===COMBOUND_V23_VISUAL_DESCENDANT_SHA256,'DESCENDANT_IDENTITY');
 gate(receipt.verified_preserved===true && receipt.scope_diff_occurrences===1,'PROTECTED_BODY_WROTE_OR_BAD_PATCH');
 gate(receipt.claim_boundary==='HEADLESS_CHROMIUM_CONTROLLER_AND_RENDER_SMOKE__NOT_OWNER_DEVICE_OR_FULL_MATCH','RECEIPT_SCOPE');
 gate(receipt.passed===2&&receipt.total===2&&receipt.modes?.length===2,'CONTACT_COUNTS');
 const trace=new TraceBoxRuntime();trace.create('JM_COMBOUND_REAL_GAME');
 for(const mode of ['CLASSIC','ARCADE']){
   const result=receipt.modes.find(x=>x.style===mode);
   gate(result?.pass===true&&!result?.holds?.length,'GAME_MODE_'+mode);
   gate(result.fighters===24&&result.draw_calls===24,'ROSTER_VISUAL_'+mode);
   gate(result.candidate_errors?.length===0,'DESCENDANT_ERRORS_'+mode);
   gate(result.source_error?.some(e=>e==='creature21 is not defined'),'ABSENT_ORIGINAL_REGRESSION_'+mode);
   gate(/^[a-f0-9]{64}$/.test(result.game_state_sha256) &&
     /^[a-f0-9]{64}$/.test(result.shot_state_sha256),'STATE_DIGEST_'+mode);
   gate(result.observed_power>0 && Number.isFinite(result.observed_velocity[0]) &&
     Number.isFinite(result.observed_velocity[1]),'SHOT_NOT_CONTACTED_'+mode);
   trace.append('JM_COMBOUND_REAL_GAME',{mode,kind:'CONTROLLED_CHROMIUM_PARITY',
     protected_digest:receipt.protected_sha256,descendant_digest:receipt.candidate_in_memory_sha256,
     initial_state_digest:result.game_state_sha256,shot_digest:result.shot_state_sha256,
     fighters:result.fighters,render_calls:result.draw_calls});
 }
 const judgement=JM32.execute(POLICY,{evidence:{sourceExact:true,ownerDevice:false,reaOriginalImport:false},
   verdict:{sourceContacted:false,promotable:false,reaOriginalImportProven:false}});
 gate(judgement.runtime.state.verdict.sourceContacted===true &&
   judgement.runtime.state.verdict.promotable===false &&
   judgement.runtime.state.verdict.reaOriginalImportProven===false,'JM32_POLICY_GATE');
 gate(trace.query('JM_COMBOUND_REAL_GAME',{kind:'CONTROLLED_CHROMIUM_PARITY'}).length===2,
   'JM_TRACEBOX_READBACK');
 return {schema:'JM.REA.COMBOUND.NativeEvidenceBridge/0.7',
   source_hash:COMBOUND_FLAZ_SHA256,descendant_hash:COMBOUND_V23_VISUAL_DESCENDANT_SHA256,
   native_jm_bodies:['JM32','TraceBoxRuntime'],trace_events:trace.replay('JM_COMBOUND_REAL_GAME').length,
   matched_modes:2,judgement:judgement.runtime.state.verdict,
   boundary:'IMPORTED_LOCAL_BROWSER_RECEIPT__NOT_NEW_REA_DECOMPILATION_OR_OWNER_DEVICE_CONTACT'};
}
