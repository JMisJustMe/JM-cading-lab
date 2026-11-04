// JM ECOSTATE CP04: encrypted COLD recovery for preserved Cloud Contact state.
// The original Cloud Contact server/source remains unchanged.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const SCHEMA='JM.CloudContact.EncryptedColdBackup/1';
const AAD=Buffer.from(SCHEMA,'utf8');
const STATE='state.json';
const SIGNING='receipt-signing-key.pem';
const MAX_FILE=32*1024*1024;
const MAX_BACKUP=48*1024*1024;
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const fail=why=>{throw Error(why)};
function guardParents(location){
  const absolute=path.resolve(location);let cursor=path.parse(absolute).root;
  for(const part of absolute.slice(cursor.length).split(path.sep)){
    cursor=path.join(cursor,part);
    try{if(fs.lstatSync(cursor).isSymbolicLink())fail('UNSAFE_SYMLINK_PATH')}
    catch(err){if(err.code==='ENOENT')break;throw err}
  }
  return absolute;
}
function assertKey(value){
  const key=Buffer.isBuffer(value)?value:Buffer.from(value||'','base64');
  if(key.length!==32)fail('OWNER_256_BIT_BACKUP_KEY_REQUIRED');
  return key;
}
function derive(key,salt){return Buffer.from(crypto.hkdfSync('sha256',key,salt,AAD,32))}
function signerFingerprint(pem){
  let publicDER;
  try{publicDER=crypto.createPublicKey(crypto.createPrivateKey(pem)).export({type:'spki',format:'der'})}
  catch{fail('INVALID_RECEIPT_SIGNING_KEY')}
  return hash(publicDER);
}
function stateSummary(bytes){
  let data;
  try{data=JSON.parse(bytes.toString('utf8'))}catch{fail('INVALID_CLOUD_STATE_JSON')}
  if(!data||typeof data!=='object'||Array.isArray(data)||!data.spaces||typeof data.spaces!=='object'||Array.isArray(data.spaces))fail('INVALID_CLOUD_STATE_SCHEMA');
  return Object.keys(data.spaces).length;
}
function readSecret(file){
  guardParents(file);
  const st=fs.lstatSync(file);
  if(!st.isFile()||st.isSymbolicLink()||st.size<=0||st.size>MAX_FILE)fail('INVALID_COLD_SOURCE_FILE');
  return fs.readFileSync(file);
}
function snapshot(directory){
  const dir=guardParents(directory),st=fs.lstatSync(dir);
  if(!st.isDirectory()||st.isSymbolicLink())fail('INVALID_STATE_DIRECTORY');
  const state=readSecret(path.join(dir,STATE)),signer=readSecret(path.join(dir,SIGNING));
  const spaces=stateSummary(state),fingerprint=signerFingerprint(signer);
  // Double-read narrows accidental concurrent writes; the caller MUST stop all writers.
  if(!crypto.timingSafeEqual(Buffer.from(hash(readSecret(path.join(dir,STATE)))) , Buffer.from(hash(state))) ||
     !crypto.timingSafeEqual(Buffer.from(hash(readSecret(path.join(dir,SIGNING)))) , Buffer.from(hash(signer))))fail('COLD_SNAPSHOT_MUTATED');
  return {state,signer,spaces,fingerprint};
}
function writeExclusive(file,data){
  const dest=guardParents(file);fs.mkdirSync(path.dirname(dest),{recursive:true,mode:0o700});
  guardParents(dest);
  let fd;
  try{fd=fs.openSync(dest,'wx',0o600)}catch(e){if(e.code==='EEXIST')fail('COLD_BACKUP_ALREADY_EXISTS');throw e}
  try{fs.writeFileSync(fd,data);fs.fsyncSync(fd)}finally{fs.closeSync(fd)}
  const parent=fs.openSync(path.dirname(dest),'r');try{fs.fsyncSync(parent)}finally{fs.closeSync(parent)}
}
function openBundle(backupFile,key){
  const file=guardParents(backupFile),st=fs.lstatSync(file);
  if(!st.isFile()||st.isSymbolicLink()||st.size>MAX_BACKUP)fail('INVALID_BACKUP_CARRIER');
  let envelope;
  try{envelope=JSON.parse(fs.readFileSync(file,'utf8'))}catch{fail('INVALID_BACKUP_FORMAT')}
  if(envelope?.schema!==SCHEMA||envelope.cipher!=='aes-256-gcm'||typeof envelope.createdAt!=='string')fail('INVALID_BACKUP_HEADER');
  const salt=Buffer.from(envelope.salt||'','base64'),iv=Buffer.from(envelope.iv||'','base64'),tag=Buffer.from(envelope.tag||'','base64'),ciphertext=Buffer.from(envelope.ciphertext||'','base64');
  if(salt.length!==16||iv.length!==12||tag.length!==16||!ciphertext.length||ciphertext.length>MAX_BACKUP)fail('INVALID_BACKUP_ENCODING');
  let bytes;
  try{
    const decipher=crypto.createDecipheriv('aes-256-gcm',derive(key,salt),iv);
    decipher.setAAD(Buffer.from(`${SCHEMA}\n${envelope.createdAt}`));decipher.setAuthTag(tag);
    bytes=Buffer.concat([decipher.update(ciphertext),decipher.final()]);
  }catch{fail('BACKUP_AUTHENTICATION_FAILED')}
  let payload;
  try{payload=JSON.parse(bytes.toString('utf8'))}catch{fail('INVALID_BACKUP_PAYLOAD')}
  if(payload?.schema!==SCHEMA||typeof payload.state!=='string'||typeof payload.signingKey!=='string'||!payload.meta)fail('INVALID_BACKUP_PAYLOAD');
  const state=Buffer.from(payload.state,'base64'),signer=Buffer.from(payload.signingKey,'base64');
  if(!state.length||!signer.length||state.length>MAX_FILE||signer.length>MAX_FILE)fail('INVALID_BACKUP_CONTENTS');
  const spaces=stateSummary(state),fingerprint=signerFingerprint(signer);
  if(payload.meta.stateSha256!==hash(state)||payload.meta.signingSha256!==hash(signer)||payload.meta.signerFingerprint!==fingerprint||payload.meta.spaces!==spaces)fail('INVALID_BACKUP_INTEGRITY');
  return {state,signer,summary:{ok:true,scope:'COLD_ENCRYPTED_BUNDLE_VERIFIED',spaces,signerFingerprint:fingerprint,stateSha256:hash(state),createdAt:envelope.createdAt}};
}
export function createColdBackup({stateDir,backupFile,masterKey}){
  const source=guardParents(stateDir),dest=guardParents(backupFile);
  if(dest===source||dest.startsWith(source+path.sep)||source.startsWith(dest+path.sep))fail('SOURCE_BACKUP_OVERLAP');
  if(fs.existsSync(dest))fail('COLD_BACKUP_ALREADY_EXISTS');
  const key=assertKey(masterKey),s=snapshot(source),createdAt=new Date().toISOString();
  const payload={schema:SCHEMA,state:s.state.toString('base64'),signingKey:s.signer.toString('base64'),meta:{stateSha256:hash(s.state),signingSha256:hash(s.signer),signerFingerprint:s.fingerprint,spaces:s.spaces}};
  const salt=crypto.randomBytes(16),iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',derive(key,salt),iv);
  cipher.setAAD(Buffer.from(`${SCHEMA}\n${createdAt}`));
  const ciphertext=Buffer.concat([cipher.update(JSON.stringify(payload),'utf8'),cipher.final()]);
  const envelope={schema:SCHEMA,cipher:'aes-256-gcm',createdAt,salt:salt.toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:ciphertext.toString('base64')};
  writeExclusive(dest,JSON.stringify(envelope)+'\n');
  const verified=openBundle(dest,key);
  if(verified.summary.stateSha256!==hash(s.state)||verified.summary.signerFingerprint!==s.fingerprint)fail('BACKUP_READBACK_HOLD');
  return {ok:true,backupSha256:hash(fs.readFileSync(dest)),...verified.summary};
}
export function verifyColdBackup({backupFile,masterKey}){return openBundle(backupFile,assertKey(masterKey)).summary}
export function restoreColdBackup({backupFile,restoreDir,masterKey}){
  const destination=guardParents(restoreDir),source=guardParents(backupFile);
  if(destination===source||destination.startsWith(source+path.sep)||source.startsWith(destination+path.sep))fail('SOURCE_RESTORE_OVERLAP');
  if(fs.existsSync(destination))fail('RESTORE_DESTINATION_EXISTS');
  const {state,signer,summary}=openBundle(source,assertKey(masterKey));
  const parent=path.dirname(destination);guardParents(parent);
  fs.mkdirSync(parent,{recursive:true,mode:0o700});
  const stage=fs.mkdtempSync(path.join(parent,'.jm-cp04-restore-'));
  try{
    fs.chmodSync(stage,0o700);
    writeExclusive(path.join(stage,STATE),state);
    writeExclusive(path.join(stage,SIGNING),signer);
    if(fs.existsSync(destination))fail('RESTORE_DESTINATION_EXISTS');
    fs.renameSync(stage,destination);
    const fd=fs.openSync(parent,'r');try{fs.fsyncSync(fd)}finally{fs.closeSync(fd)}
  }finally{if(fs.existsSync(stage))fs.rmSync(stage,{recursive:true,force:true})}
  const check=snapshot(destination);
  if(hash(check.state)!==summary.stateSha256||check.fingerprint!==summary.signerFingerprint)fail('RESTORE_READBACK_HOLD');
  return {ok:true,scope:'COLD_RESTORE_TO_NEW_DIRECTORY',spaces:check.spaces,signerFingerprint:check.fingerprint,stateSha256:hash(check.state)};
}
export async function cli(args=process.argv.slice(2)){
  const [command,...rest]=args;
  const masterKey=process.env.JM_CP04_BACKUP_KEY_B64;
  const values={masterKey};
  if(command==='backup')return console.log(JSON.stringify(createColdBackup({...values,stateDir:rest[0],backupFile:rest[1]})));
  if(command==='verify')return console.log(JSON.stringify(verifyColdBackup({...values,backupFile:rest[0]})));
  if(command==='restore')return console.log(JSON.stringify(restoreColdBackup({...values,backupFile:rest[0],restoreDir:rest[1]})));
  fail('USAGE: backup <stopped-state-dir> <new-encrypted-file> | verify <encrypted-file> | restore <encrypted-file> <new-directory>');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))cli().catch(error=>{console.error(error.message);process.exitCode=1});
