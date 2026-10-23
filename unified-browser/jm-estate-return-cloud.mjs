/**
 * Mission 002 CP15 — encrypted, sharded Estate return over the ORIGINAL
 * JM Cloud Workspace / RouteVault signed contact client.
 *
 * No new cloud service. No automatic dispatch. Caller explicitly stages and
 * commits. Credential is never persisted by this module. A recovery bundle
 * transfers only checkpoint pointers: user separately supplies the scoped
 * bearer and encryption passphrase. Supports a second independent client
 * readback, but does not claim physical phone/laptop or permanent cloud DB.
 */
import {createCloudWorkspaceClient,digest} from './jm-cloud-workspace-client.mjs';

export const CP15_SCHEMA='jm.m002.cp15.encrypted-estate-return/1';
const CHUNK='JM.CP15.CIPHER.CHUNK/1:';
const MANIFEST='JM.CP15.SIGNED.MANIFEST/1:';
const PART_SIZE=6900;
const MAX_PARTS=26;
const MAX_PLAIN_BYTES=125000;
const ITERATIONS=210000;
const aad=new TextEncoder().encode(CP15_SCHEMA);
const encoder=new TextEncoder(),decoder=new TextDecoder();
const fail=reason=>{throw Error('CP15_'+reason+'_HOLD')};
const b64 = buf=>{
 let s='';const bytes=new Uint8Array(buf);
 for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));
 return btoa(s).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
};
const deb64 = text=>{
 if(typeof text!=='string'||!/^[A-Za-z0-9_-]+$/.test(text)||text.length>200000)fail('BASE64');
 const data=atob(text.replaceAll('-','+').replaceAll('_','/')+'='.repeat((4-text.length%4)%4));
 return Uint8Array.from(data,c=>c.charCodeAt(0));
};
const deep=x=>JSON.parse(JSON.stringify(x));
function hex(s){return typeof s==='string'&&/^[a-f0-9]{64}$/.test(s)}
function credential(secret){
 if(typeof secret!=='string'||!/^[A-Za-z0-9_.-]{20,2048}$/.test(secret))fail('SCOPED_CREDENTIAL');
}
function passphrase(secret){
 if(typeof secret!=='string'||secret.length<20||secret.length>400)fail('PASSPHRASE_LENGTH');
}
async function key(secret,salt){
 const material=await crypto.subtle.importKey('raw',encoder.encode(secret),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:ITERATIONS,hash:'SHA-256'},
  material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function validateValue(value){
 if(!value||typeof value!=='object'||Array.isArray(value))fail('VALUE_SCHEMA');
 if(value.schema==='jm.estate.operator.local-return/0.2'){
  if(typeof value.mode!=='string'||typeof value.input!=='string'||typeof value.summary!=='string'||
    value.summary.length>26000||value.input.length>2000)fail('OPERATOR_RETURN');
 }else if(['jm.m002.cp13.envelope/1','jm.m002.cp14.envelope/1'].includes(value.schema)){
  if(typeof value.body!=='string'||!hex(value.sha256)||
    await digest(value.body)!==value.sha256)fail('JM_ORIGINAL_ENVELOPE');
 }else fail('UNDECLARED_RECIPIENT');
 const raw=JSON.stringify(value);
 if(encoder.encode(raw).length>MAX_PLAIN_BYTES)fail('PAYLOAD_SIZE');
 return raw;
}
function validateCheckpoint(cp){
 if(!cp||!/^ws_[A-Za-z0-9_-]{8,64}$/.test(cp.workspaceId||'')||
   typeof cp.operationId!=='string'||cp.operationId.length>140)fail('CHECKPOINT_FORMAT');
}
function validateJournal(j){
 if(!j||j.schema!==CP15_SCHEMA||!/^[-a-f0-9]{36}$/.test(j.transferId||'')||
   !hex(j.cipherSha256)||typeof j.cipher!=='string'||j.cipher.length>190000||
   !Array.isArray(j.parts)||j.parts.length<1||j.parts.length>MAX_PARTS||
   typeof j.salt!=='string'||typeof j.iv!=='string'||j.iterations!==ITERATIONS)fail('JOURNAL_FORMAT');
 if(j.parts.some((p,i)=>p.index!==i||typeof p.data!=='string'||p.data.length>PART_SIZE||
    !hex(p.digest)))fail('JOURNAL_PART');
 return j;
}
function checkpointCopy(value){if(value==null)return null;validateCheckpoint(value);return deep(value)}
export function createEstateReturnCloud({request,token,onJournal=()=>{},journal=null}){
 if(typeof request!=='function')fail('REQUEST_REQUIRED');
 credential(token);
 let current=journal?validateJournal(deep(journal)):null;
 const retain=j=>{onJournal(deep(j));current=deep(j);return current;};
 const workspace=onCheckpoint=>createCloudWorkspaceClient({request,token,onCheckpoint});
 const withCp=cp=>createCloudWorkspaceClient({request,token,checkpoint:cp});
 const intent=(j,p)=>CHUNK+j.transferId+':'+p.index+'/'+j.parts.length+':'+p.data;
 async function stage(value,secret){
  if(current)fail('PENDING_TRANSFER_RECOVER_FIRST');
  passphrase(secret);
  const raw=await validateValue(value);
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad},
    await key(secret,salt),encoder.encode(raw));
  const cipher=b64(encrypted),parts=[];
  for(let i=0;i<cipher.length;i+=PART_SIZE){
   const data=cipher.slice(i,i+PART_SIZE);
   parts.push({index:parts.length,data,digest:await digest(data),checkpoint:null});
  }
  if(parts.length>MAX_PARTS)fail('TOO_MANY_PARTS');
  const j={schema:CP15_SCHEMA,transferId:crypto.randomUUID(),state:'STAGED_CIPHERTEXT_ONLY',
   salt:b64(salt),iv:b64(iv),iterations:ITERATIONS,cipher,cipherSha256:await digest(cipher),
   parts,manifestCheckpoint:null};
  retain(j);
  return {state:j.state,parts:parts.length,cipherSha256:j.cipherSha256};
 }
 function manifest(j){
  return {schema:'jm.m002.cp15.transfer-manifest/1',transferId:j.transferId,
   cipherSha256:j.cipherSha256,salt:j.salt,iv:j.iv,iterations:j.iterations,
   parts:j.parts.map(p=>({index:p.index,digest:p.digest,checkpoint:checkpointCopy(p.checkpoint)})),
   statement:'Encrypted bytes and signed recipient receipts; runtime-file storage only; no device or long-term cloud claim'};
 }
 function bundle(j){
  if(!j?.manifestCheckpoint)fail('MANIFEST_NOT_COMMITTED');
  return {schema:'jm.m002.cp15.private-recovery/1',transferId:j.transferId,
   cipherSha256:j.cipherSha256,manifestCheckpoint:checkpointCopy(j.manifestCheckpoint)};
 }
 async function push(secret){
  if(!current)fail('NO_STAGED_TRANSFER');
  passphrase(secret);
  const j=validateJournal(deep(current));
  if(await digest(j.cipher)!==j.cipherSha256||
     j.parts.map(p=>p.data).join('')!==j.cipher)fail('LOCAL_CIPHER_DRIFT');
  // Verify the exact remembered passphrase BEFORE any remote mutation. This
  // prevents an accidental wrong-key upload which the owner could not restore.
  try{
   await crypto.subtle.decrypt({name:'AES-GCM',iv:deb64(j.iv),additionalData:aad},
     await key(secret,deb64(j.salt)),deb64(j.cipher));
  }catch{fail('PRE_UPLOAD_PASSPHRASE')}
  for(const p of j.parts){
   if(await digest(p.data)!==p.digest)fail('LOCAL_PART_DRIFT');
   const expected=intent(j,p);
   if(p.checkpoint){
    const prior=await withCp(p.checkpoint).recover();
    if(prior.content?.intent!==expected)fail('REMOTE_CHUNK_DRIFT');
    p.checkpoint=prior.checkpoint;retain(j);
   }else{
    const client=workspace(cp=>{j.parts[p.index].checkpoint=cp;retain(j)});
    const sent=await client.saveIntent(expected);
    if(sent.content?.intent!==expected)fail('CHUNK_READBACK');
    j.parts[p.index].checkpoint=client.checkpoint();retain(j);
   }
  }
  const expectedManifest=MANIFEST+b64(encoder.encode(JSON.stringify(manifest(j))));
  if(encoder.encode(expectedManifest).length>15000)fail('MANIFEST_TOO_LARGE');
  if(j.manifestCheckpoint){
   const got=await withCp(j.manifestCheckpoint).recover();
   if(got.content?.intent!==expectedManifest)fail('MANIFEST_DRIFT');
   j.manifestCheckpoint=got.checkpoint;retain(j);
  }else{
   const client=workspace(cp=>{j.manifestCheckpoint=cp;retain(j)});
   const got=await client.saveIntent(expectedManifest);
   if(got.content?.intent!==expectedManifest)fail('MANIFEST_READBACK');
   j.manifestCheckpoint=client.checkpoint();retain(j);
  }
  j.state='CLOUD_SIGNED_READBACK';retain(j);
  const recovery=bundle(j);
  const proved=await pull(recovery,secret);
  if(proved.cipherSha256!==j.cipherSha256)fail('FULL_READBACK');
  return {state:'CLOUD_SIGNED_AND_DECRYPTED_READBACK',parts:j.parts.length,
   cipherSha256:j.cipherSha256,recovery,scope:'Original JM signed RouteVault receipt. No proof of permanent server durability or physical device.'};
 }
 async function pull(recovery,secret){
  passphrase(secret);
  if(recovery?.schema!=='jm.m002.cp15.private-recovery/1'||
    !/^[-a-f0-9]{36}$/.test(recovery.transferId||'')||
    !hex(recovery.cipherSha256))fail('RECOVERY_BUNDLE');
  const got=await withCp(recovery.manifestCheckpoint).recover();
  const text=got.content?.intent;
  if(typeof text!=='string'||!text.startsWith(MANIFEST))fail('MANIFEST_ORIGIN');
  let m;try{m=JSON.parse(decoder.decode(deb64(text.slice(MANIFEST.length))))}catch{fail('MANIFEST_JSON')}
  if(m.schema!=='jm.m002.cp15.transfer-manifest/1'||
    m.transferId!==recovery.transferId||m.cipherSha256!==recovery.cipherSha256||
    !Array.isArray(m.parts)||m.parts.length<1||m.parts.length>MAX_PARTS||
    m.iterations!==ITERATIONS)fail('MANIFEST_SCOPE');
  const parts=[];
  for(let i=0;i<m.parts.length;i++){
   const p=m.parts[i];
   if(p.index!==i||!hex(p.digest))fail('REMOTE_PART_ORDER');
   const r=await withCp(p.checkpoint).recover();
   const prefix=CHUNK+m.transferId+':'+i+'/'+m.parts.length+':';
   if(typeof r.content?.intent!=='string'||!r.content.intent.startsWith(prefix))
    fail('REMOTE_PART_RECIPIENT');
   const section=r.content.intent.slice(prefix.length);
   if(await digest(section)!==p.digest)fail('REMOTE_CIPHER_DRIFT');
   parts.push(section);
  }
  const cipher=parts.join('');
  if(await digest(cipher)!==m.cipherSha256)fail('REMOTE_COMPLETE_HASH');
  let plain;
  try{
   plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:deb64(m.iv),additionalData:aad},
    await key(secret,deb64(m.salt)),deb64(cipher));
  }catch{fail('DECRYPT_OR_KEY')}
  let value;
  try{value=JSON.parse(decoder.decode(plain))}catch{fail('DECRYPTED_JSON')}
  await validateValue(value);
  return {state:'CLOUD_SIGNED_AND_DECRYPTED_READBACK',value,cipherSha256:m.cipherSha256,
   parts:parts.length,trace:{transferId:m.transferId,signerPinnedByOriginalJMCloudClient:true},
   boundary:'Distinct client signed receipt + encrypted byte return. The route is neither a permanent cloud database nor an Android-device proof.'};
 }
 return Object.freeze({stage,push,pull,journal:()=>current?deep(current):null,
  recoveryBundle:()=>bundle(current)});
}
