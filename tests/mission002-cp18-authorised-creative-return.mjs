import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createTrustedEstateServer} from '../coding-estate/integration/m002-cp16-trusted-host.mjs';
import {makeCP16Fixture} from './fixtures/m002-cp16-provenance.mjs';
import {prepareCP18Return,applyCP18Return,initialCP18State,CP18_SCHEMA}
 from '../coding-estate/integration/m002-cp18-authorised-creative-return.mjs';

let checks=0;const ok=(v,msg)=>{assert.ok(v,msg);checks++};
const eq=(a,b,msg)=>{assert.deepEqual(a,b,msg);checks++};
const held=(fn,re)=>{assert.throws(fn,re);checks++};
const heldAsync=async(fn,re)=>{await assert.rejects(fn,re);checks++};
const sha=b=>createHash('sha256').update(b).digest('hex');
const f=makeCP16Fixture();
let service;
try{
 service=createTrustedEstateServer(f.config);
 const address=await service.listen(0),port=address.port;
 const base='http://127.0.0.1:'+port;
 const invoke=async(cmd)=>{
  const response=await fetch(base+'/v1/execute',{method:'POST',
   headers:{authorization:'Bearer '+f.config.bearer,'content-type':'application/json'},
   body:JSON.stringify(cmd)});
  return {code:response.status,value:await response.json()};
 };
 const operationId=randomUUID();
 const first=await invoke({operationId,expectedRevision:0,sourceIds:['alpha','beta'],
   question:'habit',top:3,request:f.request});
 eq(first.code,201,'ORIGINAL_CP16_NOT_EXECUTED');
 eq(first.value.status,'CP14_EXECUTED_LOCAL_COMMITTED','CP14_PYTHON_NOT_EXECUTED');
 const original=initialCP18State();
 eq(original.schema,CP18_SCHEMA,'CP18_STATE_SCHEMA');
 const drafts={};
 for(const medium of ['book','music','cartoon']){
  const d=await prepareCP18Return({port,bearer:f.config.bearer,operationId,medium});
  eq(d.status,'REVIEW_ONLY','CP18_PREMATURE_MUTATION');
  eq(d.materialized.status,'REAL_MEDIA_MATERIALIZED','NO_CP17_CREATIVE_OUTPUT');
  eq(d.materialized.medium,medium,'MEDIA_REPLACED');
  eq(sha(d.materialized.bytes),d.returnedSha256,'BINARY_NOT_REAL');
  eq(d.originalSubject,'JM Krix','ORIGINAL_IDENTITY_LOST');
  eq(d.originalChoice,'explore','ORIGINAL_CHOICE_LOST');
  eq(d.sourceSha256,first.value.sha256,'SOURCE_REPLAY_NOT_JOINED');
  drafts[medium]=d;
 }
 ok(drafts.book.materialized.bytes.toString().includes('<html'),'NO_PRINTABLE_BOOK');
 eq(drafts.music.materialized.bytes.toString('utf8',0,4),'RIFF','NO_ACTUAL_PCM_WAV');
 ok(drafts.cartoon.materialized.bytes.toString().includes('<animate'),'NO_ANIMATED_SVG');
 eq(Object.keys(original.editions).length,0,'PREVIEW_MUTATED_RECIPIENT');
 held(()=>applyCP18Return(drafts.book,original),/CP18_OWNER_APPROVAL_HOLD/);
 eq(Object.keys(original.editions).length,0,'DENIAL_MUTATED_RECIPIENT');
 await heldAsync(()=>prepareCP18Return({port,bearer:'x'.repeat(40),operationId,medium:'book'}),
  /CP18_LOCAL_SOURCE_REPLAY_HOLD/);
 await heldAsync(()=>prepareCP18Return({port,bearer:f.config.bearer,operationId,medium:'film'}),
  /CP18_LOCAL_SCOPE_HOLD/);
 await heldAsync(()=>prepareCP18Return({port:80,bearer:f.config.bearer,operationId,medium:'book'}),
  /CP18_LOCAL_SCOPE_HOLD/);
 let state=original;
 for(const medium of ['book','music','cartoon']){
  const before=JSON.stringify(state);
  const applied=applyCP18Return(drafts[medium],state,{approve:true});
  eq(applied.status,'CP18_APPROVED_CREATIVE_STATE_RETURN','EDIT_NOT_APPLIED');
  eq(applied.changed,true,'NO_REAL_OUTPUT_CHANGE');
  eq(applied.nextState.editions[medium].revision,1,'NO_REVISIONS');
  eq(JSON.stringify(state),before,'ORIGINAL_STATE_MUTATED');
  eq(applied.entry.sourceSha256,first.value.sha256,'SOURCE_CUSTODY_LOST');
  state=applied.nextState;
 }
 eq(state.history.length,3,'THREE_MEDIA_NOT_RETURNED');
 eq(Object.keys(state.editions).sort(),['book','cartoon','music'],'MEDIA_COLLISION');
 held(()=>applyCP18Return(drafts.book,state,{approve:true}),/CP18_REPLAY_HOLD/);
 const bad=structuredClone(drafts.book);bad.materialized.bytes[44]^=0xff;
 held(()=>applyCP18Return(bad,original,{approve:true}),/CP18_DRAFT_INTEGRITY_HOLD/);
 const corrupted=structuredClone(state);corrupted.history[0].medium='game';
 held(()=>applyCP18Return(drafts.book,corrupted,{approve:true}),/CP18_HISTORY_CHAIN_HOLD/);
 const persisted=join(f.dir,'cp18-durable-return.json');
 writeFileSync(persisted,JSON.stringify(state));
 state=JSON.parse(readFileSync(persisted,'utf8'));
 eq(state.tip.length,64,'NO_REOPEN_CHAIN');
 eq(state.editions.music.revision,1,'MUSIC_DISAPPEARED_ON_RESTART');
 const secondId=randomUUID();
 const second=await invoke({operationId:secondId,expectedRevision:1,sourceIds:['alpha','beta'],
  question:'habit',top:3,request:{...f.request,choice:'protect'}});
 eq(second.code,201,'CP16_SECOND_COMMAND_NOT_EXECUTED');
 const next=await prepareCP18Return({port,bearer:f.config.bearer,operationId:secondId,medium:'book'});
 eq(next.originalChoice,'protect','SECOND_SOURCE_CHOICE_LOST');
 held(()=>applyCP18Return(next,state,{approve:true}),/CP17_EXISTING_EDITION_CONFLICT_HOLD/);
 const approved=applyCP18Return(next,state,{
  approve:true,expectedSha256:state.editions.book.sha256});
 eq(approved.nextState.editions.book.revision,2,'CONFLICT_APPROVAL_NO_REVISION');
 eq(approved.nextState.editions.cartoon.sha256,state.editions.cartoon.sha256,
  'INDEPENDENT_CREATIVE_EDITION_REGRESSED');
 eq(approved.nextState.history.length,4,'SECOND_REVISION_RECEIPT_LOST');
 writeFileSync(persisted,JSON.stringify(approved.nextState));
 const reread=JSON.parse(readFileSync(persisted,'utf8'));
 eq(reread.history.at(-1).afterSha256,reread.editions.book.sha256,
  'DURABLE_READBACK_MISMATCH');
 const alpha=join(f.config.sourceRoot,'alpha.md'),untouched=readFileSync(alpha,'utf8');
 writeFileSync(alpha,untouched+'\n# New source changed after CP16 commit\n');
 await heldAsync(()=>prepareCP18Return({port,bearer:f.config.bearer,operationId:secondId,medium:'music'}),
   /CP18_LOCAL_SOURCE_REPLAY_HOLD/);
 writeFileSync(alpha,untouched);
 const restored=await prepareCP18Return({port,bearer:f.config.bearer,operationId:secondId,medium:'music'});
 eq(restored.originalChoice,'protect','SOURCE_RESTORE_FAILED');
 console.log(JSON.stringify({schema:'jm.m002.cp18.test-report/1',status:'PASS',
  checks,scopedRuntime:'ACTUAL_CP16_LOCAL_HTTP_AND_PYTHON_PLUS_CP17_NATIVE_PRODUCER',
  recoveredOperation:operationId,returnedMedia:['book','music','cartoon'],
  revisedBook:2,historyEntries:4,sourceDriftRejected:true,
  noMutationWithoutApproval:true,physicalSamsung:'NOT_TESTED',productionCloud:'NOT_TESTED',
  independentCP17PrivateBrowserApps:'UNMODIFIED'}));
}finally{if(service)await service.close();f.dispose()}
