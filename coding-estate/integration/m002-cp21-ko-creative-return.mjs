/** CP21: distinct real CP10 KO source execution feeds original CP17 creative recipients.
 * Integrity is not remote authentication. No Godot IPC, cloud, or owner-device claim.
 */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {executeCP17Media,returnCP17Edition} from './m002-cp17-multi-media-producer.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const hold=x=>{throw Error('CP21_'+x+'_HOLD')};
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const donor={
 codifier:sha(readFileSync(new URL('../sovereign-batch-two/direct/codifying-kocodifying-native.mjs',import.meta.url))),
 logic:sha(readFileSync(new URL('../sovereign-ten/direct/language-native.mjs',import.meta.url)))
};
export const CP21_SCOPE=Object.freeze({
 schema:'jm.m002.cp21.ko-creative/1',
 source:'separately executed pinned CP10 original emitter',
 recipient:'existing original CP17 actual media and returnCP17Edition',
 hold:'not a CP16-authorised CP19 packet; no physical phone, published private UI, cloud or main merge'
});
export function inspectKO(envelope,expectedSHA256){
 if(!obj(envelope)||envelope.schema!=='jm.ko-contact.transport/1'||
  typeof envelope.payload!=='string'||Buffer.byteLength(envelope.payload)>30000||
  !/^[a-f0-9]{64}$/.test(expectedSHA256||''))hold('TRANSPORT');
 const digest=sha(envelope.payload);
 if(envelope.payloadSHA256!==digest||digest!==expectedSHA256)hold('BYTES');
 let p;try{p=JSON.parse(envelope.payload)}catch{hold('JSON')}
 if(!obj(p)||p.schema!=='jm.ko-contact.typed/1'||!obj(p.source)||
  p.source.codifier!==donor.codifier||p.source.logic!==donor.logic||
  p.source.historicalKocodifyingOriginal!==false)hold('SOURCE');
 if(!obj(p.identities)||p.identities.left!=='KOCODIFIER'||
  p.identities.right!=='SLINGFALL'||!obj(p.binding)||p.binding.status!=='synced'||
  p.binding.ownerIntent!=='AEGIS'||p.binding.recipientIntent!=='AEGIS')hold('IDENTITIES');
 if(!obj(p.execution)||p.execution.Kocodifying!==true||
  p.execution.Codifying!==true||p.execution.JMLogic!==true||
  p.execution.allowed!==true)hold('DONOR_EXECUTION');
 if(!obj(p.contact)||p.contact.intent!=='AEGIS'||p.contact.effect!=='ALLY_SHIELD'||
  p.contact.energy!==12||p.contact.shield_seconds!==6||p.contact.uses!==1)hold('EFFECT');
 if(!obj(p.trace)||!obj(p.trace.codifying)||!obj(p.trace.kocodifying)||
  !obj(p.trace.jmlogic))hold('TRACE');
 return {digest,traceSHA256:sha(JSON.stringify(p.trace)),packet:p,sourceHashes:donor};
}
export function conductKOToCreative(envelope,{
 expectedSHA256,subject='JM Guardian',approve=false,existing={},
 expectedRevisions={book:0,music:0,cartoon:0}
}={}){
 const info=inspectKO(envelope,expectedSHA256);
 if(!obj(existing)||!obj(expectedRevisions)||
  !/^[A-Za-z][A-Za-z0-9 -]{1,27}$/.test(subject))hold('INPUT');
 const original=JSON.stringify(existing),store=structuredClone(existing);
 if(store.__koApplied!==undefined&&!Array.isArray(store.__koApplied))hold('LEDGER');
 if((store.__koApplied||[]).includes(info.digest))hold('DUPLICATE');
 const stations=info.packet.contact.shield_seconds/2;
 if(stations!==3)hold('STATIONS');
 const actions=['A','B','C'].map(id=>({kind:'claim',id}));
 actions.push({kind:'shock'});
 const items=[];
 for(const medium of ['book','music','cartoon']){
  const previous=store[medium]||null,revision=previous?.revision||0;
  if(expectedRevisions[medium]!==revision)hold('REVISION');
  const value=executeCP17Media({medium,choice:'protect',stations,actions,subject});
  if(value.status!=='REAL_MEDIA_MATERIALIZED'||!Buffer.isBuffer(value.bytes)||
   sha(value.bytes)!==value.sha256||value.editable.choice!=='protect')hold('MEDIA');
  let returned=null;
  if(approve){
   returned=returnCP17Edition(store,medium,value,{approve:true,
    expectedSha256:previous?.sha256||null});
   if(store[medium].revision!==revision+1||
     store[medium].sha256!==value.sha256)hold('READBACK');
  }
  items.push({medium,mime:value.mime,sha256:value.sha256,bytes:value.bytes,
   editable:value.editable,returned});
 }
 if(approve)store.__koApplied=[...(store.__koApplied||[]),info.digest];
 if(!approve&&JSON.stringify(store)!==original)hold('PREVIEW');
 if(JSON.stringify(existing)!==original)hold('MUTATED_SOURCE');
 return {schema:CP21_SCOPE.schema,status:approve?'LOCAL_APPROVED_RETURN':'PREVIEW_ONLY',
  koSHA256:info.digest,traceSHA256:info.traceSHA256,
  sourceHashes:info.sourceHashes,participants:['Codifying','Kocodifying','JMLogic','CP17'],
  effect:'ALLY_SHIELD',choice:'protect',media:items,store,boundary:CP21_SCOPE.hold};
}
