/**
 * JM ECOSTATE Mission 002 CP13 — Federation Execution & Return v0.1
 *
 * Inherits real CP10 5-medium composition, CP11 typed receivers,
 * CP12 game↔comic exchange, and existing native operator execution lanes.
 * Node-native host adapter; no cloud, browser APK, real file sync or
 * original unrecovered THEOGRAPHY authority is claimed.
 *
 * Each recipient retains its OWN typed state. All-or-none result envelope.
 * SHA-256 detects byte drift; exact re-execution checks against ORIGINAL
 * input + JM code, not producer authenticity or factual source truth.
 */
import {createHash} from 'node:crypto';
import {executeCP10Composition} from './m002-cp10-multi-mechanism.mjs';
import {executeCP11Recipients} from './m002-cp11-real-recipient-effects.mjs';
import {prepareCP12Exchange,returnCP12Exchange} from './m002-cp12-cross-receiver-production.mjs';
import {runNativeOperatorLane,NATIVE_CHAIN_EXAMPLE} from '../../navigator/estate-integration/execution-lanes.mjs';
import {validateRegistry} from './router-core.mjs';

const sha = data => createHash('sha256').update(typeof data==='string'?data:JSON.stringify(data)).digest('hex');
const clone = v => structuredClone(v);
const media=['game','comic','book','music','cartoon'];
const coding=['compile-js','native-chain'];
const operations=['os','embodied','gamecore'];
export const FABRIC_TARGETS=Object.freeze([...media,...coding,...operations]);
export const CP13_BOUNDARY=Object.freeze({
 schema:'jm.m002.cp13.federated-execution/1',
 inherited:['CP10 independent native 5-medium mechanisms','CP11 original typed game/comic recipients',
  'CP12 genuine game↔comic handoff','JM native operator coding/language/OS/GameCore'],
 knowledge:'HELD external evidence cards may be fingerprinted, never interpreted as code or authority',
 host:'Node local execution only, independent recipients retained',
 excludes:['physical Samsung','APK CP13','cloud durability','model training',
  'browser-original FIVE//FLIP gameplay','published book/audio/cartoon','independent THEOGRAPHY runtime']
});
const family=t=>media.includes(t)?'creative':coding.includes(t)?'coding':'systems';
function checkRequest(q,receivers,registry){
 if(!q||q.approval!=='EXPLICIT_LOCAL_EXECUTION_REQUEST'||
   !['protect','explore','amplify'].includes(q.choice)||
   typeof q.subject!=='string'||!Number.isInteger(q.stations)||
   q.stations<2||q.stations>4||!Array.isArray(q.actions)||q.actions.length>80)
  throw Error('CP13_EXECUTION_INPUT_HOLD');
 if(!Array.isArray(q.targets)||q.targets.length<2||q.targets.length>FABRIC_TARGETS.length||
   new Set(q.targets).size!==q.targets.length||
   q.targets.some(t=>!FABRIC_TARGETS.includes(t))||
   new Set(q.targets.map(family)).size<2)
  throw Error('CP13_MULTIFAMILY_TARGET_HOLD');
 if(q.inputs && (typeof q.inputs!=='object'||Array.isArray(q.inputs)||
    Object.keys(q.inputs).some(k=>!coding.includes(k)&&k!=='embodied')))throw Error('CP13_PROGRAM_INPUT_HOLD');
 const reg=validateRegistry(registry);
 if(!reg.valid)throw Error('CP13_REGISTRY_HOLD');
 if(!receivers||typeof receivers!=='object'||Array.isArray(receivers))throw Error('CP13_RECEIVERS_HOLD');
 for(const t of q.targets.filter(t=>media.includes(t))){
  const r=receivers[t];
  if(!r||typeof r!=='object')throw Error('CP13_RECEIVER_MISSING_'+t);
  if(['book','music','cartoon'].includes(t)&&
    (r.schema!=='jm.m002.cp13.'+t+'-host/1'||!Number.isInteger(r.revision)||
     r.revision<0||typeof r.owner!=='string'||!Array.isArray(r[t==='book'?'chapters':t==='music'?'measures':'shots'])))
   throw Error('CP13_RECEIVER_SCHEMA_HOLD_'+t);
 }
}
function knowledgeReceipt(k){
 if(k==null)return {status:'NOT_SUPPLIED'};
 if(k.schema!=='JM.KnowledgeCapabilityRecipient/0.2'||k.state!=='HELD'||
   k.source_integrity!=='CANONICAL_ORIGINAL_REPLAY_PASS'||k.promotion!=='NOT_ALLOWED'||
   k.agent_executed!==false||!Array.isArray(k.cards)||k.cards.length>20||
   k.cards.some(c=>typeof c.quote_UNTRUSTED_DATA!=='string'||c.quote_UNTRUSTED_DATA.length>5000))
  throw Error('CP13_KNOWLEDGE_EVIDENCE_HOLD');
 return {status:'QUARANTINED_DATA_ONLY_UNVERIFIED_BY_NODE',
  digest:sha(k),cards:k.cards.length,sourceTruth:'NOT_PROVEN',
  instructionsExecuted:false,pythonSourceReplay:'NOT_RUN_BY_CP13'};
}
const composition=(request,medium)=>executeCP10Composition({
 medium,choice:request.choice,subject:request.subject,stations:request.stations,actions:request.actions
});
function mutateCreative(target,original,artifact){
 const state=clone(original),change=[];
 if(target==='book'){
  if(artifact.schema!=='jm.cp10.book-scenes/1')throw Error('CP13_BOOK_ARTIFACT_HOLD');
  state.chapters.push({chapter:state.chapters.length+1,subject:artifact.scenes[0].actor,
   scenes:clone(artifact.scenes),status:'EDITABLE_DRAFT'});
  change.push({kind:'BOOK_CHAPTER_ADDED',scenes:artifact.scenes.length});
 } else if(target==='music'){
  if(artifact.schema!=='jm.cp10.music-cues/1')throw Error('CP13_MUSIC_ARTIFACT_HOLD');
  state.measures.push({sequence:state.measures.length+1,tempo:artifact.tempo,
   score:clone(artifact.measures),status:'SCORE_NOT_AUDIO'});
  change.push({kind:'SCORED_MUSIC_SEQUENCE',beats:artifact.measures.length});
 } else if(target==='cartoon'){
  if(artifact.schema!=='jm.cp10.cartoon-beats/1')throw Error('CP13_CARTOON_ARTIFACT_HOLD');
  state.shots.push({sequence:state.shots.length+1,beats:clone(artifact.beats),
   status:'STORYBOARD_NOT_RENDERED_FILM'});
  change.push({kind:'CARTOON_STORYBOARD_ADDED',shots:artifact.beats.length});
 } else throw Error('CP13_UNKNOWN_CREATIVE_ADAPTER');
 state.revision++;
 if(sha(original)===sha(state))throw Error('CP13_NO_RECIPIENT_CHANGE');
 return {state,change};
}
function executeCore(q,receivers,registry){
 checkRequest(q,receivers,registry);
 const sourceReceivers=clone(receivers),initial=sha(sourceReceivers),input=sha(q);
 const next=clone(sourceReceivers),events=[],readOnly={},recorded={};
 const info=knowledgeReceipt(q.knowledge);
 let previous=sha({schema:CP13_BOUNDARY.schema,input,initial});
 const record=(target,kind,before,after,detail={})=>{
  const entry={sequence:events.length+1,target,family:family(target),kind,
   beforeSha256:before,afterSha256:after,previous,detail};
  entry.digest=sha(entry);
  events.push(entry);previous=entry.digest;
 };
 // Real original CP12 twin receiver exchange, never synthetic shared states.
 const twin=q.targets.includes('game')&&q.targets.includes('comic');
 if(twin){
  const made=prepareCP12Exchange({choice:q.choice,subject:q.subject,
   stations:q.stations,actions:q.actions,game:next.game,comic:next.comic});
  if(made.status!=='EXECUTED_TWO_REAL_RECIPIENTS')return {status:'HELD_NO_MUTATION',reason:'CP12_CONTACT_NOT_EARNED'};
  const recovered=returnCP12Exchange(made.envelope,{game:next.game,comic:next.comic});
  for(const target of ['game','comic']){
   const before=sha(next[target]),value=recovered[target],after=sha(value);
   if(after===before)throw Error('CP13_CP12_NO_CHANGE_'+target);
   next[target]=value;
   record(target,'CP12_ORIGINAL_TYPED_RECEIVER',before,after,{exchangeSha256:made.envelope.sha256});
  }
  recorded.cp12=made.envelope.sha256;
 }
 for(const target of q.targets){
  if(twin&&(target==='game'||target==='comic'))continue;
  if(media.includes(target)){
   const before=sha(next[target]);
   let result;
   if(target==='game'||target==='comic'){
    const received=executeCP11Recipients({medium:target,choice:q.choice,subject:q.subject,
     stations:q.stations,actions:q.actions},next[target]);
    if(received.status!=='ACTUAL_RECIPIENT_MUTATION')
     return {status:'HELD_NO_MUTATION',reason:'CP11_CONTACT_NOT_EARNED'};
    result={state:received.recipient,change:received.changes};
   } else {
    const produced=composition(q,target);
    if(produced.status!=='NATIVE_COMPOSITION_EXECUTED')
     return {status:'HELD_NO_MUTATION',reason:'CP10_CONTACT_NOT_EARNED'};
    result=mutateCreative(target,next[target],produced.artifact);
   }
   const after=sha(result.state);
   if(after===before)throw Error('CP13_NO_CHANGE_'+target);
   next[target]=result.state;
   record(target,'ORIGINAL_JM_MEDIUM_MUTATION',before,after,{changes:result.change.length});
  }else{
   const inputs={
    'compile-js':q.inputs?.['compile-js']??'source = continuity.✓',
    'native-chain':q.inputs?.['native-chain']??NATIVE_CHAIN_EXAMPLE,
    'embodied':q.inputs?.embodied??'open gate',
    os:'RUN EXISTING OS CONTACT',gamecore:'RUN EXISTING GAMECORE CONTACT'
   };
   const output=runNativeOperatorLane(target,inputs[target],registry);
   if(!output.changed||!output.executedBodies?.length||
     !['EMITTED_SOURCE','NATIVE_PROGRAM_CHAIN_EXECUTED','NATIVE_OS_CONTACT_EXECUTED',
       'EMBODIED_ROUTE_EXECUTED','NATIVE_GAMECORE_STATE_CHANGED'].includes(output.state))
    throw Error('CP13_NATIVE_EXECUTION_HOLD_'+target);
   readOnly[target]={status:output.state,result:output.result,
    executedBodies:output.executedBodies,scope:output.boundary};
   record(target,'EXISTING_OPERATOR_REAL_EXECUTION',sha(inputs[target]),
    sha(readOnly[target]),{source:target,existingBodies:output.executedBodies.length});
  }
 }
 if(sha(sourceReceivers)!==initial||sha(q)!==input||events.length!==q.targets.length)
  throw Error('CP13_ATOMIC_OR_SOURCE_MUTATION_HOLD');
 const body={schema:'jm.m002.cp13.federated-body/1',inputSha256:input,
  initialReceiversSha256:initial,finalReceivers:next,events,
  nativeExecution:readOnly,sourceLineage:CP13_BOUNDARY.inherited,
  CP12ExchangeSha256:recorded.cp12||null,knowledge:info,
  lastTraceSha256:previous,authority:'HELD_LOCAL_EXECUTION_NOT_DEPLOYED'};
 return {status:'EXECUTED_MULTIFAMILY',body};
}
export function executeEstateFederation({request,receivers,registry}){
 const built=executeCore(request,receivers,registry);
 if(built.status!=='EXECUTED_MULTIFAMILY')
  return {schema:'jm.m002.cp13.result/1',status:built.status,reason:built.reason,
   envelope:null,mutations:0};
 const raw=JSON.stringify(built.body),envelope={schema:'jm.m002.cp13.envelope/1',
  body:raw,sha256:sha(raw)};
 return {schema:'jm.m002.cp13.result/1',status:'EXECUTED_MULTIFAMILY',
  envelope,mutations:built.body.events.length,
  families:[...new Set(built.body.events.map(e=>e.family))],
  lastTraceSha256:built.body.lastTraceSha256};
}
export function recoverEstateFederation(envelope,{request,receivers,registry,seen=[]}){
 if(envelope?.schema!=='jm.m002.cp13.envelope/1'||
   typeof envelope.body!=='string'||envelope.body.length>750000||
   !/^[a-f0-9]{64}$/.test(envelope.sha256||'')||sha(envelope.body)!==envelope.sha256)
  throw Error('CP13_ENVELOPE_HASH_HOLD');
 if(seen.includes(envelope.sha256))throw Error('CP13_ALREADY_RETURNED_HOLD');
 const rerun=executeEstateFederation({request,receivers,registry});
 if(rerun.status!=='EXECUTED_MULTIFAMILY'||rerun.envelope.body!==envelope.body)
  throw Error('CP13_INDEPENDENT_SOURCE_REPLAY_HOLD');
 const body=JSON.parse(envelope.body);
 if(body.events.length!==request.targets.length||
   body.events.at(-1)?.digest!==body.lastTraceSha256||
   sha(receivers)!==body.initialReceiversSha256)throw Error('CP13_TRACE_OR_STALE_HOLD');
 return {schema:'jm.m002.cp13.return/1',status:'EXACT_JM_EXECUTION_REPLAY_PASS',
  finalReceivers:clone(body.finalReceivers),nativeExecution:clone(body.nativeExecution),
  events:clone(body.events),knowledge:clone(body.knowledge),trace:body.lastTraceSha256,
  seen:[...seen,envelope.sha256],scope:CP13_BOUNDARY};
}
