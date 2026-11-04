// JM CP08: owner-recipient-key custody of the original CP06 full file-backed backup.
// Only X25519 PUBLIC key is required for sealing; private key is required for restore.
// Does not modify or replace JM Cloud Contact, CP06, or its five independent state organs.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createWholeColdBackup,restoreWholeColdBackup} from './whole-state-cold.mjs';

const SCHEMA='JM.CloudContact.RecipientSealedWholeFile/1';
const INFO=Buffer.from('JM.CP08.X25519.HKDF-SHA256.AES256GCM.WRAP/1');
const MAX_INNER=190*1024*1024,MAX_OUTER=260*1024*1024;
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
const fail=code=>{throw Error(code)};
const validObject=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
function safePath(location){
 if(typeof location!=='string'||!location.trim())fail('CP08_PATH_REQUIRED');
 const absolute=path.resolve(location),root=path.parse(absolute).root;
 let cursor=root;
 for(const p of absolute.slice(root.length).split(path.sep)){
  if(!p)continue;
  cursor=path.join(cursor,p);
  try{if(fs.lstatSync(cursor).isSymbolicLink())fail('CP08_SYMLINK_REFUSED')}
  catch(e){if(e.code==='ENOENT')break;throw e}
 }
 return absolute;
}
function fileRead(file,max=MAX_OUTER){
 const p=safePath(file),stat=fs.lstatSync(p);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size<1||stat.size>max)fail('CP08_FILE_REFUSED');
 return fs.readFileSync(p);
}
function publicKey(file){
 let key;try{key=crypto.createPublicKey(fileRead(file,32768))}catch{fail('CP08_INVALID_RECIPIENT_PUBLIC_KEY')}
 if(key.asymmetricKeyType!=='x25519')fail('CP08_X25519_RECIPIENT_REQUIRED');
 return key;
}
function privateKey(file){
 const p=safePath(file),mode=fs.lstatSync(p).mode;
 if(process.platform!=='win32'&&(mode&0o077)!==0)fail('CP08_UNSAFE_PRIVATE_KEY_PERMISSIONS');
 let key;try{key=crypto.createPrivateKey(fileRead(p,32768))}catch{fail('CP08_INVALID_RECIPIENT_PRIVATE_KEY')}
 if(key.asymmetricKeyType!=='x25519')fail('CP08_X25519_RECIPIENT_REQUIRED');
 return key;
}
const der=key=>key.export({format:'der',type:'spki'});
const recipientId=key=>hash(der(key));
function exclusive(location,bytes,mode=0o600){
 const p=safePath(location);
 if(fs.existsSync(p))fail('CP08_DESTINATION_EXISTS');
 fs.mkdirSync(path.dirname(p),{recursive:true,mode:0o700});safePath(p);
 const fd=fs.openSync(p,'wx',mode);
 try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd)}finally{fs.closeSync(fd)}
 const fdDir=fs.openSync(path.dirname(p),'r');try{fs.fsyncSync(fdDir)}finally{fs.closeSync(fdDir)}
}
function strictB64(value,size,field){
 if(typeof value!=='string'||!value.length||!/^[-A-Za-z0-9+/=]+$/.test(value))fail('CP08_BAD_ENCODING_'+field);
 const b=Buffer.from(value,'base64');
 if((size!==undefined&&b.length!==size)||b.toString('base64')!==value)fail('CP08_BAD_ENCODING_'+field);
 return b;
}
function envelopeRead(file){
 const raw=fileRead(file,MAX_OUTER);
 let e;try{e=JSON.parse(raw.toString('utf8'))}catch{fail('CP08_INVALID_ENVELOPE')}
 if(!validObject(e)||e.schema!==SCHEMA||e.cipher!=='AES-256-GCM+X25519'||typeof e.createdAt!=='string'||!Number.isFinite(Date.parse(e.createdAt))||!(/^[0-9a-f]{64}$/).test(e.recipientId)||!(/^[0-9a-f]{64}$/).test(e.innerSha256))fail('CP08_INVALID_HEADER');
 const fields=['schema','cipher','createdAt','recipientId','innerSha256','ephemeralPublicSpki','salt','iv','tag','wrappedKey','innerBase64'];
 if(JSON.stringify(Object.keys(e).sort())!==JSON.stringify(fields.sort()))fail('CP08_UNKNOWN_ENVELOPE_FIELD');
 const ephemeral= strictB64(e.ephemeralPublicSpki,undefined,'ephemeral');
 const salt=strictB64(e.salt,16,'salt'),iv=strictB64(e.iv,12,'iv'),tag=strictB64(e.tag,16,'tag'),wrapped=strictB64(e.wrappedKey,32,'wrapped');
 const inner=strictB64(e.innerBase64,undefined,'inner');
 if(inner.length<1||inner.length>MAX_INNER||hash(inner)!==e.innerSha256)fail('CP08_INNER_HASH_HOLD');
 let epk;try{epk=crypto.createPublicKey({key:ephemeral,format:'der',type:'spki'})}catch{fail('CP08_BAD_EPHEMERAL_KEY')}
 if(epk.asymmetricKeyType!=='x25519')fail('CP08_BAD_EPHEMERAL_KEY');
 return {e,inner,epk,salt,iv,tag,wrapped};
}
export function createRecipientKeys({privateFile,publicFile}){
 const priv=safePath(privateFile),pub=safePath(publicFile);
 if(priv===pub||fs.existsSync(priv)||fs.existsSync(pub))fail('CP08_KEY_DESTINATION_EXISTS');
 const {privateKey:sk,publicKey:pk}=crypto.generateKeyPairSync('x25519');
 const secret=sk.export({type:'pkcs8',format:'pem'}),publicPem=pk.export({type:'spki',format:'pem'});
 exclusive(priv,secret,0o600);
 try{exclusive(pub,publicPem,0o644)}catch(e){fs.rmSync(priv,{force:true});throw e}
 return {ok:true,recipientId:recipientId(pk),privateFile:priv,publicFile:pub,claim:'KEEP_PRIVATE_FILE_OFF_PRODUCER_AND_OUT_OF_REPOSITORY'};
}
export function inspectRecipientEnvelope({sealedFile}){
 const {e,inner}=envelopeRead(sealedFile);
 return {ok:true,scope:'PUBLIC_ENVELOPE_STRUCTURE_AND_DIGEST_ONLY',recipientId:e.recipientId,innerSha256:e.innerSha256,innerBytes:inner.length,sealedSha256:hash(fileRead(sealedFile,MAX_OUTER))};
}
export function sealWholeForRecipient({stateDir,publicFile,sealedFile,expectedRecipientId,quiesced=false,externalDatabaseConfigured=false}){
 if(quiesced!==true)fail('CP08_STOPPED_SERVICE_REQUIRED');
 if(externalDatabaseConfigured!==false||process.env.JM_MARKET_DATABASE_URL||process.env.DATABASE_URL)fail('CP08_EXTERNAL_DATABASE_HOLD');
 const recipient=publicKey(publicFile),id=recipientId(recipient);
 if(typeof expectedRecipientId!=='string'||!(/^[0-9a-f]{64}$/).test(expectedRecipientId)||expectedRecipientId!==id)fail('CP08_TRUSTED_RECIPIENT_PIN_REQUIRED');
 const destination=safePath(sealedFile),source=safePath(stateDir);
 if(destination===source||destination.startsWith(source+path.sep)||source.startsWith(destination+path.sep))fail('CP08_SOURCE_DEST_OVERLAP');
 if(fs.existsSync(destination))fail('CP08_DESTINATION_EXISTS');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'jm-cp08-seal-'));let key=crypto.randomBytes(32);
 try{
  const file=path.join(tmp,'original-CP06.archive.json');
  const cp06=createWholeColdBackup({stateDir,backupFile:file,masterKey:key,quiesced,externalDatabaseConfigured});
  const inner=fileRead(file,MAX_INNER),innerHash=hash(inner),{privateKey:ephemeralPrivate,publicKey:ephemeralPublic}=crypto.generateKeyPairSync('x25519');
  const shared=crypto.diffieHellman({privateKey:ephemeralPrivate,publicKey:recipient});
  const salt=crypto.randomBytes(16),iv=crypto.randomBytes(12),wrapKey=Buffer.from(crypto.hkdfSync('sha256',shared,salt,INFO,32));
  const createdAt=new Date().toISOString(),aad=Buffer.from(`${SCHEMA}\n${createdAt}\n${id}\n${innerHash}`);
  const cipher=crypto.createCipheriv('aes-256-gcm',wrapKey,iv);cipher.setAAD(aad);
  const wrapped=Buffer.concat([cipher.update(key),cipher.final()]);
  const e={schema:SCHEMA,cipher:'AES-256-GCM+X25519',createdAt,recipientId:id,innerSha256:innerHash,
   ephemeralPublicSpki:der(ephemeralPublic).toString('base64'),salt:salt.toString('base64'),iv:iv.toString('base64'),
   tag:cipher.getAuthTag().toString('base64'),wrappedKey:wrapped.toString('base64'),innerBase64:inner.toString('base64')};
  const bytes=Buffer.from(JSON.stringify(e)+'\n');if(bytes.length>MAX_OUTER)fail('CP08_SEALED_SIZE_HOLD');
  exclusive(destination,bytes);
  if(inspectRecipientEnvelope({sealedFile:destination}).innerSha256!==innerHash)fail('CP08_SEAL_READBACK_HOLD');
  return {ok:true,scope:'CP06_ALL_FILE_ORGANS_SEALED_FOR_INDEPENDENT_RECIPIENT',recipientId:id,
   sealedSha256:hash(bytes),innerSha256:innerHash,fileCount:cp06.files.length,
   externalDatabase:'NOT_INCLUDED',privateKeyOnProducer:false,publicKeyOnly:true};
 }finally{key.fill(0);fs.rmSync(tmp,{recursive:true,force:true})}
}
export function restoreWholeForRecipient({sealedFile,privateFile,restoreDir}){
 const destination=safePath(restoreDir),source=safePath(sealedFile);
 if(destination===source||destination.startsWith(source+path.sep)||source.startsWith(destination+path.sep))fail('CP08_SOURCE_DEST_OVERLAP');
 if(fs.existsSync(destination))fail('CP08_DESTINATION_EXISTS');
 const {e,inner,epk,salt,iv,tag,wrapped}=envelopeRead(sealedFile),sk=privateKey(privateFile);
 if(recipientId(crypto.createPublicKey(sk))!==e.recipientId)fail('CP08_RECIPIENT_MISMATCH');
 const shared=crypto.diffieHellman({privateKey:sk,publicKey:epk});
 const wrapKey=Buffer.from(crypto.hkdfSync('sha256',shared,salt,INFO,32));
 let key;try{
  const decipher=crypto.createDecipheriv('aes-256-gcm',wrapKey,iv);
  decipher.setAAD(Buffer.from(`${SCHEMA}\n${e.createdAt}\n${e.recipientId}\n${e.innerSha256}`));decipher.setAuthTag(tag);
  key=Buffer.concat([decipher.update(wrapped),decipher.final()]);
 }catch{fail('CP08_RECIPIENT_AUTHENTICATION_FAILED')}
 if(key.length!==32)fail('CP08_RECIPIENT_AUTHENTICATION_FAILED');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'jm-cp08-restore-'));
 try{
  const inFile=path.join(tmp,'original-CP06.archive.json');
  exclusive(inFile,inner);
  const result=restoreWholeColdBackup({backupFile:inFile,restoreDir:destination,masterKey:key});
  return {ok:true,scope:'RECIPIENT_PRIVATE_KEY_RESTORED_ORIGINAL_CP06_ORGANS',recipientId:e.recipientId,
   innerSha256:e.innerSha256,files:result.files,metadata:result.metadata,
   externalDatabase:'NOT_INCLUDED'};
 }finally{key.fill(0);fs.rmSync(tmp,{recursive:true,force:true})}
}
export function main(args=process.argv.slice(2)){
 const [action,...argv]=args;
 if(action==='keygen'){const r=createRecipientKeys({privateFile:argv[0],publicFile:argv[1]});console.log(JSON.stringify(r));return}
 if(action==='seal'){
  if(argv[4]!=='--stopped-service' || argv[5]!=='--file-only-no-postgres')fail('CP08_EXPLICIT_STOPPED_AND_DB_BOUNDARY_REQUIRED');
  console.log(JSON.stringify(sealWholeForRecipient({stateDir:argv[0],publicFile:argv[1],sealedFile:argv[2],expectedRecipientId:argv[3],quiesced:true,externalDatabaseConfigured:false})));return
 }
 if(action==='inspect'){console.log(JSON.stringify(inspectRecipientEnvelope({sealedFile:argv[0]})));return}
 if(action==='restore'){const r=restoreWholeForRecipient({sealedFile:argv[0],privateFile:argv[1],restoreDir:argv[2]});console.log(JSON.stringify({...r,metadata:undefined}));return}
 fail('CP08_USAGE: keygen <private.pem> <public.pem> | seal <stopped-state-dir> <public.pem> <new.sealed.json> <trusted-recipient-sha256> --stopped-service --file-only-no-postgres | inspect <sealed.json> | restore <sealed.json> <private.pem> <new-state-dir>');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))try{main()}catch(e){console.error(e.message);process.exitCode=1}
