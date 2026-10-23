/**
 * CP19 manual portable return from *actual authorised CP16 localhost recovery*.
 * Creative: CP18 source-qualified return -> existing owner-private CP17 browser editor.
 * Game/comic: CP16 native typed current state -> existing protected CP15 browser importers.
 * No autonomous device connectivity, server deployment, editor publication or signature.
 */
import {createHash} from 'node:crypto';
import {prepareCP18Return} from './m002-cp18-authorised-creative-return.mjs';
const sha=x=>createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
const media=['book','music','cartoon'],typed=['game','comic'];
const hex=/^[a-f0-9]{64}$/;
const hold=why=>{throw Error('CP19_'+why+'_HOLD')};
const CL='RECOVERED_CP16_LOCAL_REPLAY_SCOPED_NO_EXTERNAL_ATTESTATION';
export const CP19_SCOPE=Object.freeze({
 schema:'jm.m002.cp19.original-app-return/1',
 originals:'CP16 actual FIVE//FLIP and illustrated comic; CP17 independent book/music/cartoon private studio',
 receipt:'CP16 replay verified on creator localhost; browser download + explicit owner import; SHA is integrity not signature',
 excluded:'No automatic remote read, private original code publication, physical phone proof, full merger or hosted cloud durability'});

export function packCP19Creative(draft){
 const m=draft?.medium,source=draft?.materialized;
 if(draft.schema!=='jm.m002.cp18.authorised-creative-return/1'||draft.status!=='REVIEW_ONLY'||
   !media.includes(m)||source?.medium!==m||source.status!=='REAL_MEDIA_MATERIALIZED'||
   !Buffer.isBuffer(source.bytes)||!hex.test(source.sha256||'')||
   sha(source.bytes)!==source.sha256||draft.returnedSha256!==source.sha256||
   !hex.test(draft.sourceSha256||'')||!hex.test(draft.sourceReceipt||'')||
   !hex.test(draft.traceSha256||'')||
   !Number.isInteger(source.source?.kernel)||source.source.kernel<2||source.source.kernel>4||
   source.source.subject!==draft.originalSubject||source.source.choice!==draft.originalChoice)
  hold('CREATIVE_SOURCE');
 const body={schema:'jm.m002.cp19.creative-packet-body/1',operationId:draft.operationId,
  medium:m,choice:draft.originalChoice,originalSubject:draft.originalSubject,
  cp16Revision:draft.revision,cp16SourceSha256:draft.sourceSha256,
  cp16Receipt:draft.sourceReceipt,cp13TraceSha256:draft.traceSha256,
  materializedSha256:draft.returnedSha256,earnedStations:source.source.kernel,
  sourceClaim:CL,nativeEditable:structuredClone(source.editable)};
 const raw=JSON.stringify(body);
 if(raw.length>80000)hold('CREATIVE_PACKET_SIZE');
 return {schema:'jm.m002.cp19.portable-creative-packet/1',body:raw,sha256:sha(raw)};
}
async function cp16Recovered(port,bearer,operationId){
 const draft=await prepareCP18Return({port,bearer,operationId,medium:'book'});
 let response;
 try{const r=await fetch('http://127.0.0.1:'+port+'/v1/recover/'+operationId,{
   headers:{authorization:'Bearer '+bearer},redirect:'error',signal:AbortSignal.timeout(90000)});
   if(!r.ok)hold('RECOVERY_SOURCE');response=await r.json();
 }catch(e){hold('LOCAL_RETURN_'+String(e.message).slice(0,50))}
 if(response?.status!=='ACTUAL_CP14_REPLAY_AND_CUSTODY_PASS'||
   response.operationId!==operationId||response.receipt!==draft.sourceReceipt||
   response.sha256!==draft.sourceSha256||response.envelope?.sha256!==draft.sourceSha256||
   sha(response.envelope.body)!==draft.sourceSha256)hold('SOURCE_BINDING');
 const cp14=JSON.parse(response.envelope.body),envelope=cp14.federationEnvelope;
 if(sha(envelope.body)!==envelope.sha256)hold('NATIVE_DIGEST');
 const native=JSON.parse(envelope.body);
 if(native.lastTraceSha256!==draft.traceSha256||
   native.knowledge.instructionsExecuted!==false)hold('ORIGINAL_NATIVE_TRACE');
 return {native,revision:response.revision,cp16Receipt:response.receipt,cp16Sha256:response.sha256};
}
export async function prepareCP19Transfer({port,bearer,operationId,medium}){
 if(media.includes(medium)){
  return packCP19Creative(await prepareCP18Return({port,bearer,operationId,medium}));
 }
 if(!typed.includes(medium))hold('UNKNOWN_MEDIUM');
 const {native,revision}=await cp16Recovered(port,bearer,operationId);
 const value=native.finalReceivers?.[medium];
 if(medium==='game'){
  const e=value?.events?.[0],actions={protect:'GUARD_FIELD',explore:'ROUTE_LEAP',amplify:'RESONANCE_BLAST'};
  if(value?.schema!=='jm.m002.cp11.game-host/1'||value?.events?.length!==1||
    e?.type!=='CP11_COMPOSITION_EXECUTED'||e.source!=='CP10_NATIVE_COMPOSITION'||
    e.actor!==value.selected||e.action!==actions[e.choice]||
    !value.allies?.some(a=>a.id===value.selected))hold('GAME_SOURCE');
 }else{
  const pages=value?.pages;
  if(value?.schema!=='jm.m002.cp11.comic-host/1'||!Array.isArray(pages)||
    pages.length<3||pages.length>6||
    pages.some(p=>!p.layerCommands?.some(c=>c.op==='figure')||
      !p.layerCommands?.some(c=>c.op==='speech'&&c.text===p.caption)))
   hold('COMIC_SOURCE');
 }
 return {schema:'jm.m002.cp14.recipient-export/1',kind:medium,revision,
   value:structuredClone(value),sha256:sha(value)};
}
