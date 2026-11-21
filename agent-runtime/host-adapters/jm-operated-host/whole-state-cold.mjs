// JM ECOSTATE CP06: encrypted stopped-state bundle for existing hosted Cloud Contact v0.5.1.
// Additive to CP04, preserves each sovereign organ in its own original file.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const SCHEMA='JM.CloudContact.HostedWholeFileState/1';
const REQUIRED=Object.freeze({
  'state.json':'cloud',
  'receipt-signing-key.pem':'signer',
  'game-state.json':'game',
  'mesh-state.json':'mesh',
  'market-state.json':'market',
  'zezu-state.json':'zezu'
});
const OPTIONAL=Object.freeze({'state.json.bak':'cloud-fallback','JM_ZEZU_LIVE_RETURN_PROOF_CURRENT.json':'zezu-proof'});
const MAX_FILE=32*1024*1024,MAX_TOTAL=112*1024*1024,MAX_CARRIER=180*1024*1024;
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const fail=c=>{throw Error(c)};
const isObject=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
function safePath(p){
  const dest=path.resolve(p);let cursor=path.parse(dest).root;
  for(const part of dest.slice(cursor.length).split(path.sep)){
    cursor=path.join(cursor,part);
    try{if(fs.lstatSync(cursor).isSymbolicLink())fail('CP06_SYMLINK_REFUSED')}catch(e){if(e.code==='ENOENT')break;throw e}
  }return dest;
}
function secretKey(raw){
  const b=Buffer.isBuffer(raw)?raw:Buffer.from(raw||'','base64');
  if(b.length!==32)fail('CP06_OWNER_KEY_REQUIRED');return b;
}
function validate(kind,bytes){
  if(kind==='signer'){
    try{const priv=crypto.createPrivateKey(bytes);return {signerFingerprint:digest(crypto.createPublicKey(priv).export({type:'spki',format:'der'}))}}
    catch{fail('CP06_BAD_SIGNING_IDENTITY')}
  }
  let j;try{j=JSON.parse(bytes.toString('utf8'))}catch{fail('CP06_INVALID_JSON_'+kind)}
  if(!isObject(j))fail('CP06_INVALID_SCHEMA_'+kind);
  if(kind==='zezu-proof'){if(j.schema!=='zezu.nwona.live-server-return-proof/0.9'||j.status!=='PASS'||!Array.isArray(j.cases))fail('CP06_ZEZU_PROOF_HOLD');return{schema:j.schema}}
  const sets={cloud:'spaces', 'cloud-fallback':'spaces',game:'players',mesh:'authusers',market:'snapshots',zezu:'records'};
  const field=sets[kind];
  if(!(''+j.schema).length||!field||!((kind==='market')?Array.isArray(j[field]):isObject(j[field])))fail('CP06_INVALID_SCHEMA_'+kind);
  if(kind==='market'&&(j.persistence?.durable===true||j.persistence?.mode==='postgres'))fail('CP06_EXTERNAL_DATABASE_HOLD');
  return {schema:j.schema};
}
function inventory(stateDir){
  const home=safePath(stateDir),st=fs.lstatSync(home);
  if(!st.isDirectory()||st.isSymbolicLink())fail('CP06_INVALID_STATE_DIRECTORY');
  const names=fs.readdirSync(home);
  for(const n of names)if(!Object.hasOwn(REQUIRED,n)&&!Object.hasOwn(OPTIONAL,n))fail('CP06_UNINVENTORIED_CARRIER');
  for(const n of Object.keys(REQUIRED))if(!names.includes(n))fail('CP06_MISSING_ORGAN_'+REQUIRED[n].toUpperCase());
  let total=0;
  const files={};const metadata={};
  for(const n of names.sort()){
    const file=safePath(path.join(home,n)),st=fs.lstatSync(file);
    if(!st.isFile()||st.isSymbolicLink()||st.size<=0||st.size>MAX_FILE)fail('CP06_INVALID_CARRIER');
    total+=st.size;if(total>MAX_TOTAL)fail('CP06_TOTAL_CAPACITY');
    const body=fs.readFileSync(file),kind=REQUIRED[n]||OPTIONAL[n];
    metadata[n]={kind,bytes:body.length,sha256:digest(body),...validate(kind,body)};
    // Guard against ordinary accidental writes while capturing a STOPPED service.
    if(digest(fs.readFileSync(file))!==metadata[n].sha256)fail('CP06_SNAPSHOT_MUTATION');
    files[n]=body.toString('base64');
  }
  return {files,metadata,total};
}
function openEnvelope(archive,masterKey){
  const src=safePath(archive),st=fs.lstatSync(src);
  if(!st.isFile()||st.isSymbolicLink()||st.size>MAX_CARRIER||st.size<=0)fail('CP06_INVALID_ARCHIVE');
  let env;try{env=JSON.parse(fs.readFileSync(src,'utf8'))}catch{fail('CP06_INVALID_FORMAT')}
  if(env?.schema!==SCHEMA||env.cipher!=='aes-256-gcm'||typeof env.createdAt!=='string'||!Number.isFinite(Date.parse(env.createdAt)))fail('CP06_INVALID_HEADER');
  for(const [field,size] of [['salt',16],['iv',12],['tag',16]]){
    if(typeof env[field]!=='string'||Buffer.from(env[field],'base64').length!==size)fail('CP06_INVALID_ENCODING');
  }
  const salt=Buffer.from(env.salt,'base64'),iv=Buffer.from(env.iv,'base64'),tag=Buffer.from(env.tag,'base64');
  if(typeof env.ciphertext!=='string'||env.ciphertext.length>MAX_CARRIER*2)fail('CP06_INVALID_CIPHERTEXT');
  const data=Buffer.from(env.ciphertext,'base64');if(!data.length||data.length>MAX_CARRIER)fail('CP06_INVALID_CIPHERTEXT');
  let plain;try{
    const derived=Buffer.from(crypto.hkdfSync('sha256',secretKey(masterKey),salt,Buffer.from(SCHEMA),32));
    const decipher=crypto.createDecipheriv('aes-256-gcm',derived,iv);decipher.setAAD(Buffer.from(SCHEMA+'\n'+env.createdAt));decipher.setAuthTag(tag);
    plain=Buffer.concat([decipher.update(data),decipher.final()]);
  }catch{fail('CP06_AUTHENTICATION_FAILED')}
  if(plain.length>MAX_CARRIER)fail('CP06_PAYLOAD_CAPACITY');
  let payload;try{payload=JSON.parse(plain.toString('utf8'))}catch{fail('CP06_BAD_PAYLOAD')}
  if(payload?.schema!==SCHEMA||!isObject(payload.files)||!isObject(payload.metadata))fail('CP06_BAD_PAYLOAD');
  const names=Object.keys(payload.files).sort();
  for(const n of Object.keys(REQUIRED))if(!names.includes(n))fail('CP06_MISSING_RESTORED_ORGAN');
  const expectedNames=Object.keys(payload.metadata).sort();
  if(JSON.stringify(names)!==JSON.stringify(expectedNames)||names.some(n=>!Object.hasOwn(REQUIRED,n)&&!Object.hasOwn(OPTIONAL,n)))fail('CP06_BAD_MANIFEST');
  const buffers={};let total=0;
  for(const n of names){
    if(typeof payload.files[n]!=='string')fail('CP06_BAD_FILE_ENCODING');
    const b=Buffer.from(payload.files[n],'base64');total+=b.length;
    if(!b.length||b.length>MAX_FILE||total>MAX_TOTAL||b.toString('base64')!==payload.files[n])fail('CP06_BAD_FILE_ENCODING');
    const meta=payload.metadata[n];if(!isObject(meta)||meta.sha256!==digest(b)||meta.bytes!==b.length||meta.kind!==(REQUIRED[n]||OPTIONAL[n]))fail('CP06_MANIFEST_MISMATCH');
    validate(meta.kind,b);buffers[n]=b;
  }
  return {buffers,metadata:payload.metadata,createdAt:env.createdAt};
}
function exclusive(file,buf){
  const p=safePath(file),fd=fs.openSync(p,'wx',0o600);
  try{fs.writeFileSync(fd,buf);fs.fsyncSync(fd)}finally{fs.closeSync(fd)}
}
function syncDir(dir){const fd=fs.openSync(dir,'r');try{fs.fsyncSync(fd)}finally{fs.closeSync(fd)}}
export function createWholeColdBackup({stateDir,backupFile,masterKey,quiesced=false,externalDatabaseConfigured=false}){
  if(quiesced!==true)fail('CP06_STOPPED_SERVICE_REQUIRED');
  if(externalDatabaseConfigured!==false)fail('CP06_EXTERNAL_DATABASE_HOLD');
  const source=safePath(stateDir),dest=safePath(backupFile);
  if(dest===source||dest.startsWith(source+path.sep)||source.startsWith(dest+path.sep))fail('CP06_SOURCE_DEST_OVERLAP');
  if(fs.existsSync(dest))fail('CP06_ARCHIVE_ALREADY_EXISTS');
  const key=secretKey(masterKey),snap=inventory(source),createdAt=new Date().toISOString();
  const plain=Buffer.from(JSON.stringify({schema:SCHEMA,files:snap.files,metadata:snap.metadata}));
  if(plain.length>MAX_CARRIER)fail('CP06_PAYLOAD_CAPACITY');
  const salt=crypto.randomBytes(16),iv=crypto.randomBytes(12);
  const derived=Buffer.from(crypto.hkdfSync('sha256',key,salt,Buffer.from(SCHEMA),32));
  const cipher=crypto.createCipheriv('aes-256-gcm',derived,iv);cipher.setAAD(Buffer.from(SCHEMA+'\n'+createdAt));
  const ciphertext=Buffer.concat([cipher.update(plain),cipher.final()]);
  const out=JSON.stringify({schema:SCHEMA,cipher:'aes-256-gcm',createdAt,salt:salt.toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:ciphertext.toString('base64')})+'\n';
  fs.mkdirSync(path.dirname(dest),{recursive:true,mode:0o700});safePath(dest);exclusive(dest,Buffer.from(out));syncDir(path.dirname(dest));
  const restored=openEnvelope(dest,key);
  if(JSON.stringify(restored.metadata)!==JSON.stringify(snap.metadata))fail('CP06_ARCHIVE_READBACK_HOLD');
  return {ok:true,scope:'STOPPED_FILE_BACKED_ORGANS_ONLY',files:Object.keys(snap.files).sort(),archiveSha256:digest(Buffer.from(out)),metadata:snap.metadata,externalDatabase:'NOT_CAPTURED',secretCustody:'EXTERNAL'};
}
export function verifyWholeColdBackup({backupFile,masterKey}){
  const x=openEnvelope(backupFile,masterKey);return {ok:true,files:Object.keys(x.buffers).sort(),metadata:x.metadata,createdAt:x.createdAt};
}
export function restoreWholeColdBackup({backupFile,restoreDir,masterKey}){
  const dest=safePath(restoreDir),source=safePath(backupFile);
  if(dest===source||dest.startsWith(source+path.sep)||source.startsWith(dest+path.sep))fail('CP06_SOURCE_DEST_OVERLAP');
  if(fs.existsSync(dest))fail('CP06_RESTORE_DEST_EXISTS');
  const x=openEnvelope(source,masterKey),parent=path.dirname(dest);
  fs.mkdirSync(parent,{recursive:true,mode:0o700});safePath(parent);
  const stage=fs.mkdtempSync(path.join(parent,'.jm-cp06-restore-'));
  try{
    fs.chmodSync(stage,0o700);
    for(const n of Object.keys(x.buffers).sort())exclusive(path.join(stage,n),x.buffers[n]);
    syncDir(stage);if(fs.existsSync(dest))fail('CP06_RESTORE_DEST_EXISTS');
    fs.renameSync(stage,dest);syncDir(parent);
  }finally{if(fs.existsSync(stage))fs.rmSync(stage,{recursive:true,force:true})}
  const back=inventory(dest);
  if(JSON.stringify(back.metadata)!==JSON.stringify(x.metadata))fail('CP06_RESTORE_READBACK_HOLD');
  return {ok:true,scope:'STOPPED_FILE_BACKED_ORGANS_RESTORED',files:Object.keys(back.files).sort(),metadata:back.metadata};
}
export const WHOLE_STATE_CARRIERS=Object.freeze({...REQUIRED,...OPTIONAL});
