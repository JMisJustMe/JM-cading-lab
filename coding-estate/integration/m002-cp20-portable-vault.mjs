/* CP20 encrypted manual transfer: additive, no cloud, no private owner files. */
import {webcrypto as crypto,createHash} from 'node:crypto';
export const CP20_SCHEMA='jm.m002.cp20.manual-vault/1';
const context='JM-M002-CP20-ORIGINAL-RECIPIENT-HAND-CARRIED-V1';
const scope='PASSPHRASE_HELD_MANUAL_TRANSFER_NOT_PUBLIC_SENDER_ATTESTATION';
const E=new TextEncoder(),D=new TextDecoder('utf-8',{fatal:true});
const sha=x=>createHash('sha256').update(x).digest('hex');
const hold=x=>{throw Error('CP20_'+x+'_HOLD')};
const b64=b=>Buffer.from(b).toString('base64');
const dec=s=>{if(typeof s!=='string'||s.length>210000||!/^[A-Za-z0-9+/]*={0,2}$/.test(s))hold('B64');return Buffer.from(s,'base64')};
const header=()=>({schema:CP20_SCHEMA,context,iterations:210000,kdf:'PBKDF2-SHA256',cipher:'AES-256-GCM'});
async function validate(raw){
 if(typeof raw!=='string'||!raw.length||Buffer.byteLength(raw)>140000)hold('PACKET_SIZE');
 let p;try{p=JSON.parse(raw)}catch{hold('PACKET_JSON')}
 if(p?.schema==='jm.m002.cp19.portable-creative-packet/1'){
  if(typeof p.body!=='string'||p.body.length>80000||sha(E.encode(p.body))!==p.sha256)hold('CREATIVE_DIGEST');
  let body;try{body=JSON.parse(p.body)}catch{hold('CREATIVE_BODY')}
  if(body.schema!=='jm.m002.cp19.creative-packet-body/1'||
    !['book','music','cartoon'].includes(body.medium)||
    body.nativeEditable?.schema!=='jm.m002.cp17.'+body.medium+'-work/1'||
    body.nativeEditable.subject!==body.originalSubject||body.nativeEditable.choice!==body.choice||
    body.sourceClaim!=='RECOVERED_CP16_LOCAL_REPLAY_SCOPED_NO_EXTERNAL_ATTESTATION')hold('CREATIVE_SHAPE');
  return body.medium;
 }
 if(p?.schema==='jm.m002.cp14.recipient-export/1'&&['game','comic'].includes(p.kind)){
  if(!Number.isInteger(p.revision)||p.revision<1||sha(JSON.stringify(p.value))!==p.sha256||
    p.value?.schema!=='jm.m002.cp11.'+p.kind+'-host/1')hold('TYPED_SOURCE');
  return p.kind;
 }
 hold('UNKNOWN_PACKET');
}
async function key(pass,salt){
 if(typeof pass!=='string'||pass.length<12||pass.length>256)hold('PASSPHRASE_LENGTH');
 const k=await crypto.subtle.importKey('raw',E.encode(pass),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:210000,hash:'SHA-256'},k,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function sealCP20(raw,pass){
 await validate(raw);
 const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const h=header(),inner={schema:'jm.m002.cp20.inner/1',packetRaw:raw,sha256:sha(E.encode(raw))};
 const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:E.encode(JSON.stringify(h)),tagLength:128},await key(pass,salt),E.encode(JSON.stringify(inner)));
 return {header:h,salt:b64(salt),iv:b64(iv),ciphertext:b64(new Uint8Array(encrypted)),scope};
}
export async function openCP20(packet,pass){
 if(typeof packet==='string'){try{packet=JSON.parse(packet)}catch{hold('VAULT_JSON')}}
 if(!packet||JSON.stringify(packet.header)!==JSON.stringify(header())||packet.scope!==scope)hold('HEADER');
 const salt=dec(packet.salt),iv=dec(packet.iv),data=dec(packet.ciphertext);
 if(salt.length!==16||iv.length!==12||data.length>210000||data.length<17)hold('CRYPTO_SHAPE');
 let inner;try{
  const result=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:E.encode(JSON.stringify(header())),tagLength:128},await key(pass,salt),data);
  inner=JSON.parse(D.decode(result));
 }catch(e){if(String(e.message||'').startsWith('CP20_'))throw e;hold('AUTHENTICATION')}
 if(inner?.schema!=='jm.m002.cp20.inner/1'||sha(E.encode(inner.packetRaw))!==inner.sha256)hold('INNER_INTEGRITY');
 const kind=await validate(inner.packetRaw);
 return {kind,packetRaw:inner.packetRaw,sha256:inner.sha256,scope:'SHARED_SECRET_NOT_REMOTE_SENDER_IDENTITY'};
}