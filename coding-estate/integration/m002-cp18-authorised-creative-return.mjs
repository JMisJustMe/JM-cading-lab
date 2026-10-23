/**
 * JM Mission 002 CP18 — bounded local CP16 -> CP17 creative return.
 * Does NOT merge branches, touch private owner apps, or infer source truth.
 * A local authorised CP16 recovery reruns original Python + native execution.
 * CP18 reconstructs only earned CP10 mechanics; untrusted source prose stays inert.
 */
import {createHash} from 'node:crypto';
import {executeCP10Composition} from './m002-cp10-multi-mechanism.mjs';
import {executeCP17Media,returnCP17Edition} from './m002-cp17-multi-media-producer.mjs';

export const CP18_SCHEMA='jm.m002.cp18.authorised-creative-return/1';
const hex=/^[a-f0-9]{64}$/;
const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const sha=x=>createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
const hold=x=>{throw Error('CP18_'+x+'_HOLD')};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const media=['book','music','cartoon'];
const clone=x=>structuredClone(x);

function checkTrace(body) {
 if(body?.schema!=='jm.m002.cp13.federated-body/1'||!hex.test(body.lastTraceSha256||'')||
   !hex.test(body.inputSha256||'')||!hex.test(body.initialReceiversSha256||'')||
   !Array.isArray(body.events)||body.events.length<5||body.events.length>10||
   body.knowledge?.instructionsExecuted!==false||
   body.knowledge?.sourceTruth!=='NOT_PROVEN')hold('NATIVE_SOURCE');
 let previous=sha({schema:'jm.m002.cp13.federated-execution/1',
   input:body.inputSha256,initial:body.initialReceiversSha256});
 for(const [i,e] of body.events.entries()){
  const {digest,...contents}=e;
  if(e.sequence!==i+1||e.previous!==previous||digest!==sha(contents)||
    !['creative','coding','systems'].includes(e.family))hold('TRACE_CHAIN');
  previous=digest;
 }
 if(previous!==body.lastTraceSha256)hold('TRACE_TIP');
 if(media.some(m=>!body.events.some(e=>e.target===m&&e.family==='creative')||
     !body.finalReceivers?.[m]))hold('THREE_SOURCE_MEDIA');
}

function deriveSpec(native) {
 const book=native.finalReceivers.book;
 const chapter=book?.chapters?.at(-1),scenes=chapter?.scenes;
 if(book.schema!=='jm.m002.cp13.book-host/1'||!Array.isArray(scenes)||
   scenes.length<2||scenes.length>40)hold('BOOK_SOURCE');
 const subject=scenes[0]?.actor,choice=scenes[0]?.choice;
 if(typeof subject!=='string'||!['protect','explore','amplify'].includes(choice)||
   scenes.some(s=>s.actor!==subject||s.choice!==choice))hold('IDENTITY_CHOICE');
 let earned=[],reentries=0;
 const actions=[];
 for(const [i,s] of scenes.entries()){
  if(s.step!==i+1||!Array.isArray(s.earned)||s.recovered!==s.reentries||
     s.input!==(s.source==='REENTER_PRESERVE'?'shock':'claim'))hold('CONTACT_SHAPE');
  if(s.source==='CONTACT_EARNED'){
   const added=s.earned.filter(id=>!earned.includes(id));
   if(added.length!==1||s.earned.length!==earned.length+1||
     !same(s.earned,[...earned,added[0]])||
     added[0]!==String.fromCharCode(65+earned.length))hold('CONTACT_ID');
   earned=[...s.earned];actions.push({kind:'claim',id:added[0]});
  }else if(s.source==='REENTER_PRESERVE'){
   reentries++;
   if(reentries>1||!same(s.earned,earned))hold('REENTRY_TRACE');
   actions.push({kind:'shock'});
  }else hold('NON_RECONSTRUCTIBLE_CONTACT');
  if(s.recovered!==reentries||s.gate!==(earned.length===scenes.at(-1).earned.length))
   {
    // Earlier incomplete station sets may become final only once the last scene
    // is reached; enforce the actual final gate in the source recomposition below.
    if(s.recovered!==reentries)hold('REENTRY_COUNT');
   }
 }
 if(earned.length<2||earned.length>4||!scenes.at(-1).gate)hold('UNFINISHED_GATE');
 const spec={subject,choice,stations:earned.length,actions};
 for(const medium of media){
  const recomposed=executeCP10Composition({...spec,medium});
  if(recomposed.status!=='NATIVE_COMPOSITION_EXECUTED')hold('MECHANISM_REPLAY');
  const published=medium==='book'?native.finalReceivers.book.chapters.at(-1)?.scenes:
    medium==='music'?native.finalReceivers.music.measures.at(-1)?.score:
    native.finalReceivers.cartoon.shots.at(-1)?.beats;
  const generated=medium==='book'?recomposed.artifact.scenes:
    medium==='music'?recomposed.artifact.measures:recomposed.artifact.beats;
  if(!same(published,generated))hold('ORIGINAL_MEDIA_REPLAY_'+medium.toUpperCase());
 }
 return spec;
}

function verifyResponse(data,operationId) {
 if(!data||data.ok!==true||data.status!=='ACTUAL_CP14_REPLAY_AND_CUSTODY_PASS'||
   data.operationId!==operationId||!Number.isSafeInteger(data.revision)||data.revision<1||
   !hex.test(data.receipt||'')||!hex.test(data.sha256||''))hold('AUTHORISED_HOST_RESPONSE');
 const envelope=data.envelope;
 if(envelope?.schema!=='jm.m002.cp14.envelope/1'||envelope.sha256!==data.sha256||
   typeof envelope.body!=='string'||sha(envelope.body)!==envelope.sha256)hold('CP14_ENVELOPE');
 let cp14;try{cp14=JSON.parse(envelope.body)}catch{hold('CP14_JSON')}
 if(cp14.schema!=='jm.m002.cp14.return-body/1'||
   cp14.state!=='LOCAL_MULTI_SOURCE_REPLAY'||
   cp14.originalPython?.sourceIntegrity!=='CANONICAL_ORIGINAL_REPLAY_PASS'||
   cp14.originalPython?.quarantinedSourceText!==true||
   cp14.originalPython?.sourceTruth!=='NOT_ESTABLISHED'||
   cp14.promotionsAllowed!==false||
   cp14.publicMesh?.attestation!=='CALLER_OBSERVATION_NOT_SIGNED_OR_MUTATING')hold('KNOWLEDGE_AUTHORITY');
 const fed=cp14.federationEnvelope;
 if(fed?.schema!=='jm.m002.cp13.envelope/1'||typeof fed.body!=='string'||
   sha(fed.body)!==fed.sha256)hold('CP13_ENVELOPE');
 let native;try{native=JSON.parse(fed.body)}catch{hold('CP13_JSON')}
 checkTrace(native);
 return {spec:deriveSpec(native),bodySha256:envelope.sha256,
   traceSha256:native.lastTraceSha256,knowledgeEvidenceSha256:cp14.originalPython.evidenceSha256};
}

export async function prepareCP18Return({port,bearer,operationId,medium}){
 if(!Number.isSafeInteger(port)||port<1025||port>65535||!uuid.test(operationId||'')||
   typeof bearer!=='string'||bearer.length<32||!media.includes(medium))
  hold('LOCAL_SCOPE');
 const url='http://127.0.0.1:'+port+'/v1/recover/'+operationId;
 // Deliberately no caller-provided URL, proxy, origin, cookie or public hostname.
 let res;try{res=await fetch(url,{method:'GET',headers:{authorization:'Bearer '+bearer},
   redirect:'error',signal:AbortSignal.timeout(90000)})}catch{hold('LOCAL_CONTACT')}
 if(!res.ok)hold('LOCAL_SOURCE_REPLAY');
 let response;try{response=await res.json()}catch{hold('RETURN_JSON')}
 const authority=verifyResponse(response,operationId);
 const materialized=executeCP17Media({...authority.spec,medium});
 if(materialized.status!=='REAL_MEDIA_MATERIALIZED'||
   sha(materialized.bytes)!==materialized.sha256||materialized.length<100)
  hold('MATERIALIZATION');
 return {schema:CP18_SCHEMA,status:'REVIEW_ONLY',operationId,revision:response.revision,
   sourceReceipt:response.receipt,sourceSha256:authority.bodySha256,
   traceSha256:authority.traceSha256,medium,
   originalSubject:authority.spec.subject,originalChoice:authority.spec.choice,
   returnedSha256:materialized.sha256,materialized,
   boundary:'Original CP16 localhost rerun; no source-truth claim, no automatic recipient mutation'};
}

export function initialCP18State(){
 return {schema:CP18_SCHEMA,editions:{},history:[],tip:'0'.repeat(64)};
}
function checkState(state){
 if(state?.schema!==CP18_SCHEMA||!state.editions||
   Array.isArray(state.editions)||!Array.isArray(state.history)||
   !hex.test(state.tip||'')||state.history.length>200)hold('STATE_SHAPE');
 let tip='0'.repeat(64),seen=new Set();
 for(const [i,event] of state.history.entries()){
  const {digest,...contents}=event;
  if(event.sequence!==i+1||event.parent!==tip||digest!==sha(contents)||
   seen.has(event.operationId+':'+event.medium))hold('HISTORY_CHAIN');
  seen.add(event.operationId+':'+event.medium);tip=digest;
 }
 if(tip!==state.tip)hold('HISTORY_TIP');
}
export function applyCP18Return(draft,state,{approve=false,expectedSha256=null}={}){
 checkState(state);
 if(!approve)hold('OWNER_APPROVAL');
 if(draft?.schema!==CP18_SCHEMA||draft.status!=='REVIEW_ONLY'||
   !uuid.test(draft.operationId||'')||!media.includes(draft.medium)||
   !hex.test(draft.sourceReceipt||'')||!hex.test(draft.sourceSha256||'')||
   !hex.test(draft.traceSha256||'')||
   draft.returnedSha256!==draft.materialized?.sha256||
   draft.materialized?.medium!==draft.medium||
   !Buffer.isBuffer(draft.materialized?.bytes)||
   sha(draft.materialized.bytes)!==draft.returnedSha256)hold('DRAFT_INTEGRITY');
 if(state.history.some(x=>x.operationId===draft.operationId&&x.medium===draft.medium))
   hold('REPLAY');
 const next=clone(state);
 const applied=returnCP17Edition(next.editions,draft.medium,draft.materialized,{
   approve:true,expectedSha256});
 const entry={sequence:next.history.length+1,parent:next.tip,
   operationId:draft.operationId,cp16Revision:draft.revision,medium:draft.medium,
   sourceSha256:draft.sourceSha256,sourceReceipt:draft.sourceReceipt,
   traceSha256:draft.traceSha256,materializedSha256:draft.returnedSha256,
   beforeSha256:applied.before?.sha256||null,afterSha256:applied.after.sha256,
   editionRevision:applied.after.revision,
   stateChanged:applied.before?.sha256!==applied.after.sha256};
 entry.digest=sha(entry);
 next.history.push(entry);next.tip=entry.digest;
 checkState(next);
 return {status:'CP18_APPROVED_CREATIVE_STATE_RETURN',changed:entry.stateChanged,
   medium:draft.medium,operationId:draft.operationId,entry,nextState:next};
}
