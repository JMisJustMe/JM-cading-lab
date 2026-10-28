// JM CP10 — one authenticated checkpoint of the unchanged Cloud Contact v0.5.1
// file-state and CP09 Market PostgreSQL donor. No replacement server, no live deployment.
// Runs only after external stop/maintenance gate; no implicit authority over live writers.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {WHOLE_STATE_CARRIERS} from './whole-state-cold.mjs';
import {createMarketPgBackup,restoreMarketPgBackup} from './market-postgres-cold.mjs';

const SCHEMA='JM.CloudContact.CP10.CoordinatedCheckpoint/1';
const INFO=Buffer.from('JM.CP10.CoordinatedFileAndPG.X25519.HKDF.AES256GCM/1');
const DONOR='0921217d95285bcb21cda7a995d02f7ec0725810';
const REQUIRE=['state.json','receipt-signing-key.pem','game-state.json','mesh-state.json','market-state.json','zezu-state.json'];
const OPTIONAL=['state.json.bak','JM_ZEZU_LIVE_RETURN_PROOF_CURRENT.json'];
const MAX_FILE=32*1024*1024,MAX_PLAIN=330*1024*1024,MAX_OUTER=470*1024*1024;
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const fail=x=>{throw Error('CP10_'+x)};
const insist=(x,why)=>{if(!x)fail(why)};
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const hex64=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function safe(p){insist(typeof p==='string'&&p.trim().length>0,'PATH_REQUIRED');const a=path.resolve(p);let cur=path.parse(a).root;for(const c of a.slice(cur.length).split(path.sep)){if(!c)continue;cur=path.join(cur,c);try{insist(!fs.lstatSync(cur).isSymbolicLink(),'SYMLINK_REFUSED')}catch(e){if(e.code==='ENOENT')break;throw e}}return a}
function read(file,max=MAX_OUTER){const f=safe(file),st=fs.lstatSync(f);insist(st.isFile()&&!st.isSymbolicLink()&&st.size>0&&st.size<=max,'BAD_FILE');return fs.readFileSync(f)}
function exclusive(file,b,mode=0o600){const p=safe(file);insist(!fs.existsSync(p),'DESTINATION_EXISTS');fs.mkdirSync(path.dirname(p),{recursive:true,mode:0o700});safe(p);const fd=fs.openSync(p,'wx',mode);try{fs.writeFileSync(fd,b);fs.fsyncSync(fd)}finally{fs.closeSync(fd)};const pd=fs.openSync(path.dirname(p),'r');try{fs.fsyncSync(pd)}finally{fs.closeSync(pd)}}
function pub(file){let k;try{k=crypto.createPublicKey(read(file,32768))}catch{fail('BAD_PUBLIC_KEY')}insist(k.asymmetricKeyType==='x25519','RECIPIENT_KEY_TYPE');return k}
function priv(file){const p=safe(file),st=fs.lstatSync(p);insist(process.platform==='win32'||(st.mode&0o077)===0,'INSECURE_PRIVATE_PERMISSIONS');let k;try{k=crypto.createPrivateKey(read(p,32768))}catch{fail('BAD_PRIVATE_KEY')}insist(k.asymmetricKeyType==='x25519','RECIPIENT_KEY_TYPE');return k}
const recipientId=k=>hash(k.export({type:'spki',format:'der'}));
function b64(s,max,field){insist(typeof s==='string'&&s.length>0&&s.length<=Math.ceil(max*4/3)+8&&/^[A-Za-z0-9+/]+={0,2}$/.test(s),'BAD_B64_'+field);const b=Buffer.from(s,'base64');insist(b.length>0&&b.length<=max&&b.toString('base64')===s,'BAD_B64_'+field);return b}
function validateBody(name,raw){
 if(name==='receipt-signing-key.pem'){
  let key;try{key=crypto.createPrivateKey(raw)}catch{fail('INVALID_SIGNER')};insist(key.asymmetricKeyType==='ec','INVALID_SIGNER');return {signerSha256:hash(crypto.createPublicKey(key).export({format:'der',type:'spki'}))};
 }
 let j;try{j=JSON.parse(raw)}catch{fail('INVALID_JSON')};insist(obj(j)&&typeof j.schema==='string','INVALID_STATE');
 if(name==='JM_ZEZU_LIVE_RETURN_PROOF_CURRENT.json'){insist(j.schema==='zezu.nwona.live-server-return-proof/0.9'&&j.status==='PASS'&&Array.isArray(j.cases),'INVALID_ZEZU_PROOF');return {schema:j.schema}}
 const col={
  'state.json':'spaces','state.json.bak':'spaces','game-state.json':'players','mesh-state.json':'authusers',
  'market-state.json':'snapshots','zezu-state.json':'records'
 }[name];insist(col!==undefined,'UNKNOWN_CARRIER');
 insist((name==='market-state.json'?Array.isArray(j[col]):obj(j[col])),'INVALID_STATE_SCHEMA');
 // CP10 is specifically the PostgreSQL-owned descendant, never masquerade as file-only.
 if(name==='market-state.json')insist(j.persistence?.mode==='postgres'&&j.persistence?.durable===true,'MARKET_POSTGRES_MODE_REQUIRED');
 return {schema:j.schema};
}
function inventory(directory){
 const root=safe(directory),st=fs.lstatSync(root);insist(st.isDirectory()&&!st.isSymbolicLink(),'STATE_DIRECTORY_REQUIRED');
 const names=fs.readdirSync(root).sort();insist(names.every(n=>Object.hasOwn(WHOLE_STATE_CARRIERS,n)),'UNKNOWN_STATE_CARRIER');
 for(const n of REQUIRE)insist(names.includes(n),'MISSING_'+n.replace(/[^a-z]/gi,'_').toUpperCase());
 let total=0;const raw={},manifest={};
 for(const n of names){const b=read(path.join(root,n),MAX_FILE);total+=b.length;insist(total<=112*1024*1024,'STATE_TOO_LARGE');const meta=validateBody(n,b);raw[n]=b.toString('base64');manifest[n]={kind:WHOLE_STATE_CARRIERS[n],bytes:b.length,sha256:hash(b),...meta};}
 for(const n of names)insist(hash(read(path.join(root,n),MAX_FILE))===manifest[n].sha256,'STATE_MUTATED');
 return {raw,manifest};
}
function validatePayload(p){
 insist(obj(p)&&p.schema===SCHEMA&&p.donorCommit===DONOR&&obj(p.files)&&obj(p.manifest)&&obj(p.pg)&&p.pg.schema==='JM.CloudContact.CP09.PgCarrier/1','INVALID_PAYLOAD');
 const names=Object.keys(p.files).sort(),metanames=Object.keys(p.manifest).sort();insist(eq(names,metanames),'BAD_MANIFEST_NAMES');
 for(const n of REQUIRE)insist(names.includes(n),'MISSING_ORGAN');insist(names.every(n=>Object.hasOwn(WHOLE_STATE_CARRIERS,n)),'UNKNOWN_STATE_CARRIER');
 let total=0,actual={};const files={};for(const n of names){const b=b64(p.files[n],MAX_FILE,'file');total+=b.length;insist(total<=112*1024*1024,'STATE_TOO_LARGE');const meta=validateBody(n,b);insist(obj(p.manifest[n])&&p.manifest[n].sha256===hash(b)&&p.manifest[n].bytes===b.length&&p.manifest[n].kind===WHOLE_STATE_CARRIERS[n],'FILE_DIGEST_MISMATCH');insist(meta.schema===undefined||p.manifest[n].schema===meta.schema,'FILE_SCHEMA_MISMATCH');files[n]=b;actual[n]=p.manifest[n];}
 const pg=b64(p.pg.sealedBase64,190*1024*1024,'pg');insist(hex64(p.pg.sha256)&&hash(pg)===p.pg.sha256,'PG_ARCHIVE_DIGEST_MISMATCH');
 insist(typeof p.checkpointId==='string'&&/^[a-f0-9]{32}$/.test(p.checkpointId),'CHECKPOINT_ID');
 return {files,manifest:actual,pg,pgSha256:p.pg.sha256,checkpointId:p.checkpointId};
}
function checkEnvelope(sealedFile){const bytes=read(sealedFile),v=(()=>{try{return JSON.parse(bytes)}catch{fail('INVALID_ENVELOPE')}})();
 const keys=['schema','donorCommit','checkpointId','recipientId','createdAt','ephemeralPublic','salt','iv','tag','ciphertext'];
 insist(obj(v)&&eq(Object.keys(v).sort(),keys.sort())&&v.schema===SCHEMA&&v.donorCommit===DONOR&&/^[0-9a-f]{32}$/.test(v.checkpointId||'')&&hex64(v.recipientId)&&typeof v.createdAt==='string'&&Number.isFinite(Date.parse(v.createdAt)),'INVALID_ENVELOPE');
 return {v,epk:b64(v.ephemeralPublic,4096,'epk'),salt:b64(v.salt,16,'salt'),iv:b64(v.iv,12,'iv'),tag:b64(v.tag,16,'tag'),ct:b64(v.ciphertext,MAX_PLAIN,'ct'),fileHash:hash(bytes)};
}
function decrypt(sealedFile,privateFile,expectedSha){insist(hex64(expectedSha),'INDEPENDENT_ARCHIVE_PIN_REQUIRED');const e=checkEnvelope(sealedFile);insist(e.fileHash===expectedSha,'INDEPENDENT_ARCHIVE_PIN_REQUIRED');const privateKey=priv(privateFile);insist(recipientId(crypto.createPublicKey(privateKey))===e.v.recipientId,'WRONG_RECIPIENT');let epk;try{epk=crypto.createPublicKey({key:e.epk,format:'der',type:'spki'})}catch{fail('BAD_EPHEMERAL_KEY')}insist(epk.asymmetricKeyType==='x25519','BAD_EPHEMERAL_KEY');const shared=crypto.diffieHellman({privateKey,publicKey:epk}),key=Buffer.from(crypto.hkdfSync('sha256',shared,e.salt,INFO,32));let bytes;
 try{const d=crypto.createDecipheriv('aes-256-gcm',key,e.iv);d.setAAD(Buffer.from(`${SCHEMA}\n${e.v.createdAt}\n${e.v.recipientId}\n${e.v.checkpointId}\n${DONOR}`));d.setAuthTag(e.tag);bytes=Buffer.concat([d.update(e.ct),d.final()]);}catch{fail('AUTHENTICATION_FAILED')}finally{key.fill(0)}
 insist(bytes.length<=MAX_PLAIN,'BAD_PAYLOAD_SIZE');let payload;try{payload=JSON.parse(bytes)}catch{fail('BAD_PAYLOAD_JSON')};const result=validatePayload(payload);insist(result.checkpointId===e.v.checkpointId,'CHECKPOINT_MISMATCH');return {...result,archiveSha256:e.fileHash,recipientId:e.v.recipientId};}
export function inspectCoordinatedCheckpoint({sealedFile}){const e=checkEnvelope(sealedFile);return {ok:true,scope:'STRUCTURAL_INSPECTION_NOT_DECRYPTED',checkpointId:e.v.checkpointId,recipientId:e.v.recipientId,sealedSha256:e.fileHash};}
export function sealCoordinatedCheckpoint({stateDir,pgSourceUrl,publicFile,expectedRecipientId,sealedFile,quiesced=false}){
 insist(quiesced===true,'STOPPED_ALL_WRITERS_REQUIRED');const src=safe(stateDir),dst=safe(sealedFile);insist(dst!==src&&!dst.startsWith(src+path.sep)&&!src.startsWith(dst+path.sep),'SOURCE_OVERLAP');insist(!fs.existsSync(dst),'DESTINATION_EXISTS');const key=pub(publicFile);insist(hex64(expectedRecipientId)&&recipientId(key)===expectedRecipientId,'RECIPIENT_PIN_REQUIRED');
 const before=inventory(src),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'jm-cp10-seal-'));
 try{const pgFile=path.join(tmp,'market.pg.sealed');const pgResult=createMarketPgBackup({sourceUrl:pgSourceUrl,recipientPublicFile:publicFile,expectedRecipientId,sealedFile:pgFile,quiesced:true});const after=inventory(src);insist(eq(before.manifest,after.manifest),'SOURCE_CHANGED_DURING_PG_SNAPSHOT');
  const checkpointId=crypto.randomBytes(16).toString('hex'),payload={schema:SCHEMA,checkpointId,donorCommit:DONOR,files:before.raw,manifest:before.manifest,pg:{schema:'JM.CloudContact.CP09.PgCarrier/1',sealedBase64:read(pgFile,190*1024*1024).toString('base64'),sha256:pgResult.sealedSha256,tables:pgResult.tables}};
  const plain=Buffer.from(JSON.stringify(payload));insist(plain.length<=MAX_PLAIN,'CAPACITY');const {privateKey:ek,publicKey:epk}=crypto.generateKeyPairSync('x25519');const iv=crypto.randomBytes(12),salt=crypto.randomBytes(16),keyBytes=Buffer.from(crypto.hkdfSync('sha256',crypto.diffieHellman({privateKey:ek,publicKey:key}),salt,INFO,32)),createdAt=new Date().toISOString();
  try{const cipher=crypto.createCipheriv('aes-256-gcm',keyBytes,iv);cipher.setAAD(Buffer.from(`${SCHEMA}\n${createdAt}\n${expectedRecipientId}\n${checkpointId}\n${DONOR}`));const ct=Buffer.concat([cipher.update(plain),cipher.final()]);const e={schema:SCHEMA,donorCommit:DONOR,checkpointId,recipientId:expectedRecipientId,createdAt,ephemeralPublic:epk.export({type:'spki',format:'der'}).toString('base64'),salt:salt.toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:ct.toString('base64')};exclusive(dst,Buffer.from(JSON.stringify(e)+'\n'));const inspect=inspectCoordinatedCheckpoint({sealedFile:dst});insist(inspect.recipientId===expectedRecipientId,'SEALED_READBACK');return {ok:true,scope:'COORDINATED_STOPPED_FILE_AND_PG_RECIPIENT_ARCHIVE',checkpointId,donorCommit:DONOR,fileCount:Object.keys(before.raw).length,files:before.manifest,pgTables:pgResult.tables,pgSealedSha256:pgResult.sealedSha256,sealedSha256:inspect.sealedSha256,recipientId:expectedRecipientId,limitations:['STOPPED_WRITERS_ATTESTED_NOT_ENFORCED','NO_ATOMIC_FILE_PLUS_DATABASE_SNAPSHOT','NO_LIVE_PRODUCTION_OR_OWNER_OFFSITE_PROOF']};}finally{keyBytes.fill(0)}
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}
}
export function preflightCoordinatedCheckpoint({sealedFile,privateFile,expectedSealedSha256}){const p=decrypt(sealedFile,privateFile,expectedSealedSha256);return {ok:true,checkpointId:p.checkpointId,fileCount:Object.keys(p.files).length,pgSealedSha256:p.pgSha256,recipientId:p.recipientId,scope:'DECRYPTED_AND_VALIDATED_NOT_RESTORED'};}
export function restoreCoordinatedCheckpoint({sealedFile,privateFile,expectedSealedSha256,pgTargetUrl,restoreDir}){
 const target=safe(restoreDir),archive=safe(sealedFile);insist(target!==archive&&!target.startsWith(archive+path.sep)&&!archive.startsWith(target+path.sep),'SOURCE_OVERLAP');insist(!fs.existsSync(target),'FILE_TARGET_NOT_EMPTY');
 const p=decrypt(sealedFile,privateFile,expectedSealedSha256),stage=fs.mkdtempSync(path.join(os.tmpdir(),'jm-cp10-stage-'));
 try{const pgArchive=path.join(stage,'postgres.sealed');exclusive(pgArchive,p.pg);
  // CP09 restores only into an EXISTING EMPTY database. This must be an isolated
  // recovery DB; PG restore success cannot publish a live server automatically.
  const pg=restoreMarketPgBackup({targetUrl:pgTargetUrl,sealedFile:pgArchive,privateFile,expectedSealedSha256:p.pgSha256});
  // FILE release comes AFTER DB integrity readback. If publication fails,
  // checkpoint stays HOLD (never start service against half-restored target).
  const parent=path.dirname(target);fs.mkdirSync(parent,{recursive:true,mode:0o700});safe(parent);const staged=fs.mkdtempSync(path.join(parent,'.jm-cp10-files-'));
  try{fs.chmodSync(staged,0o700);for(const [name,b] of Object.entries(p.files))exclusive(path.join(staged,name),b);const checked=inventory(staged);insist(eq(checked.manifest,p.manifest),'FILE_RESTORE_READBACK');insist(!fs.existsSync(target),'FILE_TARGET_NOT_EMPTY');fs.renameSync(staged,target);const fd=fs.openSync(parent,'r');try{fs.fsyncSync(fd)}finally{fs.closeSync(fd)}}finally{if(fs.existsSync(staged))fs.rmSync(staged,{recursive:true,force:true})}
  return {ok:true,scope:'COORDINATED_RECOVERY_IN_ISOLATED_DB_AND_NEW_FILE_DIR',checkpointId:p.checkpointId,recipientId:p.recipientId,sealedSha256:p.archiveSha256,pgScope:pg.scope,pgTables:pg.tables,fileCount:Object.keys(p.files).length,signerFingerprint:p.manifest['receipt-signing-key.pem'].signerSha256,limitations:['NO_LIVE_ACTIVATION','NO_ATOMIC_CROSS_STORE_TRANSACTION','NO_INDEPENDENT_OFFSITE_OWNER_CUSTODY']};
 }finally{fs.rmSync(stage,{recursive:true,force:true})}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const [action,...a]=process.argv.slice(2);if(action==='seal'&&a.length===4){console.log(JSON.stringify(sealCoordinatedCheckpoint({stateDir:a[0],publicFile:a[1],expectedRecipientId:a[2],sealedFile:a[3],pgSourceUrl:process.env.JM_CP10_SOURCE_URL,quiesced:process.env.JM_CP10_ALL_WRITERS_STOPPED==='YES'})));}
 else if(action==='preflight'&&a.length===3)console.log(JSON.stringify(preflightCoordinatedCheckpoint({sealedFile:a[0],privateFile:a[1],expectedSealedSha256:a[2]})));
 else if(action==='restore'&&a.length===4)console.log(JSON.stringify(restoreCoordinatedCheckpoint({sealedFile:a[0],privateFile:a[1],expectedSealedSha256:a[2],restoreDir:a[3],pgTargetUrl:process.env.JM_CP10_TARGET_URL})));
 else fail('USAGE seal <stopped-state-dir> <recipient-public.pem> <trusted-fingerprint> <new-sealed-file> | preflight <sealed> <private> <archive-sha256> | restore <sealed> <private> <archive-sha256> <new-state-dir>');}catch(e){console.error(e.message);process.exitCode=1}
}
