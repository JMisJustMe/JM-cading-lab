/** Additive CP22: real CP21 KO contact and original CP17 media into owner-private CP19 studio review packets.
 * Hashes check integrity, not remote identity or approval. No owner-private HTML is published.
 */
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {conductKOToCreative,inspectKO} from './m002-cp21-ko-creative-return.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const hold=x=>{throw Error('CP22_'+x+'_HOLD')};
const PIN='06c008bf0fb7eb8c1c0f1492db6e63808a95cafd';
export const CP22_SCHEMA='jm.m002.cp22.ko-owner-media/1';
export function buildCP22OwnerPackets(transport,{expectedSHA256,subject='JM Guardian'}={}){
 const info=inspectKO(transport,expectedSHA256);
 if(subject!=='JM Guardian')hold('SUBJECT_SCOPE');
 const creative=conductKOToCreative(transport,{expectedSHA256,subject,approve:false});
 if(creative.status!=='PREVIEW_ONLY'||creative.media.length!==3||
   Object.keys(creative.store).length!==0)hold('NATIVE_PREVIEW');
 const packets=creative.media.map(item=>{
  if(!['book','music','cartoon'].includes(item.medium)||!Buffer.isBuffer(item.bytes)||
     sha(item.bytes)!==item.sha256||item.editable?.schema!=='jm.m002.cp17.'+item.medium+'-work/1'||
     item.editable.subject!==subject||item.editable.choice!=='protect')hold('NATIVE_MEDIA');
  const packet={schema:CP22_SCHEMA,originalCP10:PIN,
   nativeProducer:'CP21_ORIGINAL_CP17_EXECUTION',
   koTransport:transport,koSHA256:info.digest,
   sourceHashes:info.sourceHashes,subject,medium:item.medium,mime:item.mime,
   mediaSHA256:item.sha256,mediaLength:item.bytes.length,
   mediaBase64:item.bytes.toString('base64'),editable:item.editable};
  if(sha(Buffer.from(packet.mediaBase64,'base64'))!==item.sha256)hold('READBACK');
  return packet;
 });
 if(new Set(packets.map(x=>x.medium)).size!==3)hold('DUPLICATE_MEDIA');
 return {schema:'jm.m002.cp22.export-result/1',
  result:'ACTUAL_CP17_MEDIA_BUNDLES_FOR_REVIEW_NOT_APPLIED',
  koSHA256:info.digest,packets,
  boundary:'Private original CP19 owner UI must separately review, choose actor and approve each. No device/cloud attestation.'};
}
export function writeCP22OwnerPackets(transport,{expectedSHA256,subject='JM Guardian',outdir}={}){
 if(typeof outdir!=='string'||!/^[-a-zA-Z0-9_./]{1,200}$/.test(outdir)||
  outdir.includes('..'))hold('PATH');
 const result=buildCP22OwnerPackets(transport,{expectedSHA256,subject});
 mkdirSync(outdir,{recursive:true});
 const receipt={schema:'jm.m002.cp22.export-receipt/1',koSHA256:result.koSHA256,
  sourceBranch:PIN,approval:'OWNER_REVIEW_REQUIRED',files:[]};
 for(const packet of result.packets){
  const name='JM_CP22_KO_'+packet.medium.toUpperCase()+'_REVIEW.json';
  const bytes=Buffer.from(JSON.stringify(packet,null,2)+'\n');
  writeFileSync(outdir+'/'+name,bytes,{flag:'wx'});
  if(!readFileSync(outdir+'/'+name).equals(bytes))hold('DISK_READBACK');
  receipt.files.push({name,packetSha256:sha(bytes),mediaSha256:packet.mediaSHA256,
   mediaBytes:packet.mediaLength,sourceKO:packet.koSHA256});
 }
 writeFileSync(outdir+'/OPEN_FIRST_RECEIPT.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
 return receipt;
}
