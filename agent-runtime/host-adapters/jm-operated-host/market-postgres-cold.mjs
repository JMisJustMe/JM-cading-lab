// JM CP09 — bounded PostgreSQL Market state custody. Additive to CP06 and CP08.
// Operates exclusively with an explicitly quiesced database and an empty restore destination.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const SCHEMA='JM.CloudContact.MarketPostgresRecipientArchive/1';
const INFO=Buffer.from('JM.CP09.MARKET.PG.X25519.HKDF.AES256GCM/1');
const TABLES=['jm_market_pulse_snapshots','jm_quick_flip_proof_outcomes','jm_quick_flip_durability_witnesses'];
const COLUMN_SPEC={
 jm_market_pulse_snapshots:[['id','bigint'],['fetched_at','timestamp with time zone'],['symbol','text'],['payload','jsonb']],
 jm_quick_flip_proof_outcomes:[['id','bigint'],['created_at','timestamp with time zone'],['symbol','text'],['receipt_hash','text'],['payload','jsonb']],
 jm_quick_flip_durability_witnesses:[['id','uuid'],['created_at','timestamp with time zone'],['previous_id','uuid'],['payload','jsonb']]
};
const MAX_DUMP=128*1024*1024,MAX_ENVELOPE=190*1024*1024;
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const insist=(ok,code)=>{if(!ok)throw Error(code)};
const isObj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const allowedKeys=(v,keys)=>isObj(v)&&JSON.stringify(Object.keys(v).sort())===JSON.stringify([...keys].sort());
function checkPath(file){
 insist(typeof file==='string'&&file.length>0,'CP09_PATH_REQUIRED');
 const absolute=path.resolve(file),root=path.parse(absolute).root;let cursor=root;
 for(const part of absolute.slice(root.length).split(path.sep)){
  if(!part)continue;cursor=path.join(cursor,part);
  try{insist(!fs.lstatSync(cursor).isSymbolicLink(),'CP09_SYMLINK_REFUSED')}catch(e){if(e.code==='ENOENT')break;throw e}
 }return absolute;
}
function readFile(file,limit=32768){const p=checkPath(file),s=fs.lstatSync(p);insist(s.isFile()&&!s.isSymbolicLink()&&s.size>0&&s.size<=limit,'CP09_FILE_REFUSED');return fs.readFileSync(p)}
function writeNew(file,data){const p=checkPath(file);insist(!fs.existsSync(p),'CP09_DESTINATION_EXISTS');fs.mkdirSync(path.dirname(p),{recursive:true,mode:0o700});checkPath(p);const fd=fs.openSync(p,'wx',0o600);try{fs.writeFileSync(fd,data);fs.fsyncSync(fd)}finally{fs.closeSync(fd)}const d=fs.openSync(path.dirname(p),'r');try{fs.fsyncSync(d)}finally{fs.closeSync(d)}}
function recipientPublic(file){let key;try{key=crypto.createPublicKey(readFile(file))}catch{throw Error('CP09_INVALID_PUBLIC_KEY')}insist(key.asymmetricKeyType==='x25519','CP09_X25519_REQUIRED');return key}
function recipientPrivate(file){const p=checkPath(file);insist(process.platform==='win32'||(fs.lstatSync(p).mode&0o077)===0,'CP09_PRIVATE_KEY_PERMISSIONS');let key;try{key=crypto.createPrivateKey(readFile(p))}catch{throw Error('CP09_INVALID_PRIVATE_KEY')}insist(key.asymmetricKeyType==='x25519','CP09_X25519_REQUIRED');return key}
const pubBytes=k=>k.export({format:'der',type:'spki'});
const keyId=k=>sha(pubBytes(k));
export function validateDbConnection(url){
 insist(typeof url==='string'&&url.length>0,'CP09_DATABASE_URL_REQUIRED');
 let u;try{u=new URL(url)}catch{throw Error('CP09_DATABASE_URL_INVALID')}
 insist(['postgresql:','postgres:'].includes(u.protocol)&&u.hostname&&u.username&&u.password,'CP09_DATABASE_URL_INVALID');
 insist(!u.search&&!u.hash&&u.pathname.length>1,'CP09_DATABASE_URL_AMBIGUOUS');
 const name=decodeURIComponent(u.pathname.slice(1));
 insist(/^[a-z][a-z0-9_]{2,62}$/.test(name)&&!['postgres','template0','template1'].includes(name),'CP09_PROTECTED_DATABASE_NAME');
 const host=u.hostname.replace(/^\[|\]$/g,'');
 const local=['127.0.0.1','localhost','::1'].includes(host);
 const env={PGHOST:host,PGPORT:u.port||'5432',PGUSER:decodeURIComponent(u.username),PGDATABASE:name,PGPASSWORD:decodeURIComponent(u.password),PGSSLMODE:local?'disable':'verify-full',PGCONNECT_TIMEOUT:'8'};
 return {name,host,env};
}
function command(exe,args,db,{input,maxBuffer=MAX_DUMP}={}){
 const env={PATH:process.env.PATH||'/usr/bin:/bin',HOME:os.tmpdir(),LANG:'C',...db.env};
 const r=spawnSync(exe,args,{env,input,encoding:null,timeout:35000,maxBuffer,windowsHide:true,shell:false});
 // Do not relay stderr: libpq failures can contain private network/database information.
 if(r.error||r.status!==0)throw Error('CP09_'+exe.toUpperCase().replace(/[^A-Z]/g,'_')+'_FAILED');
 return r.stdout||Buffer.alloc(0);
}
function query(db,sql){return command('psql',['--no-psqlrc','--no-align','--tuples-only','--set=ON_ERROR_STOP=1','--command',sql],db,{maxBuffer:12*1024*1024}).toString('utf8').trim()}
function schemaRows(db){const sql="SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('"+TABLES.join("','")+"') ORDER BY table_name,ordinal_position";
 return query(db,sql).split('\n').filter(Boolean).map(x=>x.split('|'))}
export function validateMarketSchema(rows){
 insist(Array.isArray(rows),'CP09_SCHEMA_REQUIRED');
 const actual=Object.fromEntries(TABLES.map(t=>[t,rows.filter(x=>x[0]===t).map(x=>x.slice(1))]));
 insist(rows.length===TABLES.reduce((n,t)=>n+COLUMN_SPEC[t].length,0),'CP09_MARKET_SCHEMA_MISMATCH');
 for(const t of TABLES)insist(JSON.stringify(actual[t])===JSON.stringify(COLUMN_SPEC[t]),'CP09_MARKET_SCHEMA_MISMATCH');
 return true;
}
const describe=(db)=>{
 validateMarketSchema(schemaRows(db));
 const o={};for(const t of TABLES){
  const data=command('psql',['--no-psqlrc','--no-align','--tuples-only','--set=ON_ERROR_STOP=1','--command',`COPY (SELECT row_to_json(t)::text FROM public.${t} t ORDER BY ${t==='jm_quick_flip_durability_witnesses'?'created_at,id':'id'}) TO STDOUT`],db,{maxBuffer:MAX_DUMP});
  const n=Number(query(db,`SELECT COUNT(*) FROM public.${t}`));
  insist(Number.isSafeInteger(n)&&n>=0,'CP09_INVALID_ROW_COUNT');o[t]={rows:n,sha256:sha(data)};
 }return o;
};
function envelope(file){const bytes=readFile(file,MAX_ENVELOPE);let v;try{v=JSON.parse(bytes.toString('utf8'))}catch{throw Error('CP09_BAD_ENVELOPE')}
 insist(allowedKeys(v,['schema','createdAt','recipientId','ephemeralPublicSpki','salt','iv','tag','ciphertext']),'CP09_BAD_ENVELOPE');
 insist(v.schema===SCHEMA&&Number.isFinite(Date.parse(v.createdAt))&&/^[0-9a-f]{64}$/.test(v.recipientId),'CP09_BAD_ENVELOPE');
 function dec(field,n){insist(typeof v[field]==='string'&&/^[A-Za-z0-9+/]+={0,2}$/.test(v[field]),'CP09_BAD_ENCODING');const b=Buffer.from(v[field],'base64');insist(b.toString('base64')===v[field]&&(!n||b.length===n),'CP09_BAD_ENCODING');return b}
 const iv=dec('iv',12),salt=dec('salt',16),tag=dec('tag',16),ct=dec('ciphertext'),spki=dec('ephemeralPublicSpki');
 insist(ct.length>0&&ct.length<MAX_ENVELOPE,'CP09_BAD_CIPHERTEXT');let ephemeral;try{ephemeral=crypto.createPublicKey({key:spki,format:'der',type:'spki'})}catch{throw Error('CP09_BAD_EPHEMERAL_KEY')}
 insist(ephemeral.asymmetricKeyType==='x25519','CP09_BAD_EPHEMERAL_KEY');return {v,iv,salt,tag,ct,ephemeral};
}
const aad=(createdAt,id)=>Buffer.from(`${SCHEMA}\n${createdAt}\n${id}`);
export function inspectMarketPgEnvelope({sealedFile}){const x=envelope(sealedFile);return{ok:true,scope:'STRUCTURE_ONLY_NOT_AUTHENTICATION',recipientId:x.v.recipientId,sealedSha256:sha(readFile(sealedFile,MAX_ENVELOPE))}}
export function createMarketPgBackup({sourceUrl,recipientPublicFile,expectedRecipientId,sealedFile,quiesced=false}){
 insist(quiesced===true,'CP09_STOPPED_WRITES_REQUIRED');const source=validateDbConnection(sourceUrl),recipient=recipientPublic(recipientPublicFile),id=keyId(recipient);
 insist(typeof expectedRecipientId==='string'&&id===expectedRecipientId,'CP09_TRUSTED_RECIPIENT_PIN_REQUIRED');
 const dest=checkPath(sealedFile);insist(!fs.existsSync(dest),'CP09_DESTINATION_EXISTS');
 // Double snapshot and PostgreSQL MVCC pg_dump. Quiescence is operator-declared, not independently enforced here.
 const before=describe(source);
 const args=['--format=custom','--no-owner','--no-privileges','--schema=public',...TABLES.flatMap(t=>['--table=public.'+t])];
 const dump=command('pg_dump',args,source);insist(dump.length>100&&dump.length<=MAX_DUMP,'CP09_INVALID_PG_DUMP');
 const after=describe(source);insist(JSON.stringify(before)===JSON.stringify(after),'CP09_SOURCE_MUTATED_DURING_BACKUP');
 const meta={schema:'JM.CloudContact.MarketPostgresPayload/1',tables:before,pgDumpSha256:sha(dump),databaseName:source.name,donorCommit:'0921217d95285bcb21cda7a995d02f7ec0725810'};
 const payload=Buffer.from(JSON.stringify({meta,dumpBase64:dump.toString('base64')}));
 insist(payload.length<=MAX_ENVELOPE-16384,'CP09_ARCHIVE_TOO_LARGE');
 const {privateKey:sk,publicKey:pk}=crypto.generateKeyPairSync('x25519');
 const createdAt=new Date().toISOString(),salt=crypto.randomBytes(16),iv=crypto.randomBytes(12),shared=crypto.diffieHellman({privateKey:sk,publicKey:recipient});
 const key=Buffer.from(crypto.hkdfSync('sha256',shared,salt,INFO,32));
 try{
  const c=crypto.createCipheriv('aes-256-gcm',key,iv);c.setAAD(aad(createdAt,id));
  const ct=Buffer.concat([c.update(payload),c.final()]);
  const wrapper={schema:SCHEMA,createdAt,recipientId:id,ephemeralPublicSpki:pubBytes(pk).toString('base64'),salt:salt.toString('base64'),iv:iv.toString('base64'),tag:c.getAuthTag().toString('base64'),ciphertext:ct.toString('base64')};
  writeNew(dest,Buffer.from(JSON.stringify(wrapper)+'\n'));
  const review=inspectMarketPgEnvelope({sealedFile:dest});insist(review.recipientId===id,'CP09_ENVELOPE_READBACK_HOLD');
  return{ok:true,scope:'MARKET_THREE_POSTGRES_TABLES_ENCRYPTED',recipientId:id,sealedSha256:review.sealedSha256,pgDumpSha256:meta.pgDumpSha256,tables:before,externalPersistentStorage:'NOT_PROVED'};
 }finally{key.fill(0)}
}
export function restoreMarketPgBackup({targetUrl,sealedFile,privateFile,expectedSealedSha256,expectEmpty=true}){
 insist(expectEmpty===true,'CP09_EMPTY_TARGET_REQUIRED');
 const dest=validateDbConnection(targetUrl),raw=readFile(sealedFile,MAX_ENVELOPE);
 insist(/^[0-9a-f]{64}$/.test(expectedSealedSha256||'')&&sha(raw)===expectedSealedSha256,'CP09_OUT_OF_BAND_ARCHIVE_PIN_REQUIRED');
 const {v,iv,salt,tag,ct,ephemeral}=envelope(sealedFile),sk=recipientPrivate(privateFile);
 insist(keyId(crypto.createPublicKey(sk))===v.recipientId,'CP09_WRONG_RECIPIENT');
 const key=Buffer.from(crypto.hkdfSync('sha256',crypto.diffieHellman({privateKey:sk,publicKey:ephemeral}),salt,INFO,32));
 let payload;try{const d=crypto.createDecipheriv('aes-256-gcm',key,iv);d.setAAD(aad(v.createdAt,v.recipientId));d.setAuthTag(tag);payload=JSON.parse(Buffer.concat([d.update(ct),d.final()]).toString('utf8'))}catch{throw Error('CP09_AUTHENTICATION_FAILED')}finally{key.fill(0)}
 insist(allowedKeys(payload,['meta','dumpBase64'])&&payload.meta?.schema==='JM.CloudContact.MarketPostgresPayload/1','CP09_BAD_PAYLOAD');
 insist(allowedKeys(payload.meta,['schema','tables','pgDumpSha256','databaseName','donorCommit'])&&payload.meta.donorCommit==='0921217d95285bcb21cda7a995d02f7ec0725810','CP09_BAD_PAYLOAD');
 const dump=Buffer.from(payload.dumpBase64||'','base64');insist(dump.length>100&&dump.length<=MAX_DUMP&&dump.toString('base64')===payload.dumpBase64&&sha(dump)===payload.meta.pgDumpSha256,'CP09_DUMP_HASH_MISMATCH');
 insist(allowedKeys(payload.meta.tables,TABLES)&&TABLES.every(t=>Number.isSafeInteger(payload.meta.tables[t]?.rows)&&/^[0-9a-f]{64}$/.test(payload.meta.tables[t]?.sha256)),'CP09_MANIFEST_INVALID');
 // Destination must already exist and be empty; no DROP/CLEAN flags, no CREATE DATABASE.
 const count=Number(query(dest,"SELECT COUNT(*) FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S','f')"));
 insist(count===0,'CP09_RESTORE_TARGET_NOT_EMPTY');
 const listing=command('pg_restore',['--list'],dest,{input:dump,maxBuffer:1024*1024}).toString('utf8');
 for(const line of listing.split('\n')){
  if(!/^\d+;/.test(line))continue;
  const m=line.match(/;\s+\d+\s+\d+\s+(TABLE DATA|TABLE|SEQUENCE OWNED BY|SEQUENCE SET|SEQUENCE|DEFAULT|CONSTRAINT|INDEX)\s+public\s+(\S+)/);
  insist(!!m,'CP09_UNEXPECTED_PG_OBJECT');
  const name=m[2];insist(TABLES.includes(name)||TABLES.some(t=>name.startsWith(t+'_')&&(name.endsWith('_seq')||name.endsWith('_pkey')||name.endsWith('_receipt_hash_key'))),'CP09_UNEXPECTED_PG_OBJECT');
 }
 command('pg_restore',['--exit-on-error','--single-transaction','--no-owner','--no-privileges','--dbname='+dest.name],dest,{input:dump,maxBuffer:1024*1024});
 const actual=describe(dest);insist(JSON.stringify(actual)===JSON.stringify(payload.meta.tables),'CP09_POST_RESTORE_HASH_HOLD');
 return {ok:true,scope:'ISOLATED_EMPTY_POSTGRES_DATABASE_RESTORED',sourceDbName:payload.meta.databaseName,targetDbName:dest.name,sealedSha256:sha(raw),tables:actual,donorCommit:payload.meta.donorCommit,notProved:['REMOTE_HOST','OWNER_KEY_CUSTODY','PRODUCTION_RESTORE','SOURCE_WRITE_QUIESCENCE','FULL_POSTGRES_CLUSTER','LIVE_SERVER_API_RECONTACT']};
}
function cli(args=process.argv.slice(2)){
 const [action,...rest]=args;
 if(action==='backup'&&rest.length===4&&rest[3]==='--writes-stopped')return console.log(JSON.stringify(createMarketPgBackup({sourceUrl:process.env.JM_CP09_SOURCE_URL,recipientPublicFile:rest[0],expectedRecipientId:rest[1],sealedFile:rest[2],quiesced:true})));
 if(action==='restore'&&rest.length===4&&rest[3]==='--empty-target')return console.log(JSON.stringify(restoreMarketPgBackup({targetUrl:process.env.JM_CP09_TARGET_URL,sealedFile:rest[0],privateFile:rest[1],expectedSealedSha256:rest[2],expectEmpty:true})));
 throw Error('CP09_USAGE: backup <recipient-public.pem> <trusted-sha256> <new-archive.json> --writes-stopped | restore <archive.json> <recipient-private.pem> <independently-verified-archive-sha256> --empty-target; database URLs in JM_CP09_SOURCE_URL/JM_CP09_TARGET_URL env only');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))try{cli()}catch(e){console.error(e.message);process.exitCode=1}
