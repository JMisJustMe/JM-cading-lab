// JM CP05: actual pinned hosted Cloud Contact v0.5.1, COLD AES-GCM recovery contact.
// Additive evidence adapter. Does not mutate donor source, host, main or production.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {JMNodeSupervisor} from './supervisor.mjs';
import {createColdBackup,verifyColdBackup,restoreColdBackup} from './cold-backup.mjs';

const pinnedCommit='0921217d95285bcb21cda7a995d02f7ec0725810';
const serverFile='JM_CLOUD_CONTACT_SERVER_v0_5_1_HOSTED_DESCENDANT.mjs';
const stateFile='state.json', signFile='receipt-signing-key.pem';
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const freshPort=()=>new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const n=s.address().port;s.close(()=>resolve(n))})});
const safeRoot=source=>{
 const root=path.resolve(source);
 assert.equal(fs.realpathSync(root),root,'DONOR_SOURCE_ROOT_SYMLINK');
 for(const part of [serverFile,'profiles/JM_CLOUD_PROFILE_MANIFEST_HOSTED_v0_5_1.json','mesh/JM_SERVICE_MESH_PROFILE_v0_1.mjs','game/JM_GAME_LIVE_PROFILE_v0_3.mjs']){
  const f=path.join(root,part);assert.ok(fs.lstatSync(f).isFile()&&!fs.lstatSync(f).isSymbolicLink(),'DONOR_FILE_MISSING: '+part);
 }
 return root;
};
export async function proveHostedRecovery(source){
 const donor=safeRoot(source),scratch=fs.mkdtempSync(path.join(os.tmpdir(),'jm-cp05-hosted-'));
 const secret=crypto.randomBytes(32).toString('hex'),admin=crypto.randomBytes(32).toString('hex'),key=crypto.randomBytes(32);
 const spaceId='cp05_actual_hosted_001',checks=[];
 const record=(name,detail={})=>checks.push({name,pass:true,...detail});
 let supervisor=null;
 const config=stateDir=>({
  JM_CLOUD_MODE:'production',JM_CLOUD_ADMIN_TOKEN:admin,JM_CLOUD_SERVER_SECRET:secret,
  JM_CLOUD_ORIGINS:'https://jm-cp05.invalid',JM_CLOUD_DATA:path.join(stateDir,stateFile),
  JM_CLOUD_RECEIPT_SIGNING_KEY:path.join(stateDir,signFile),
  JM_CLOUD_PROFILE_DIR:path.join(donor,'profiles'),
  JM_CLOUD_PROFILE_MANIFEST:path.join(donor,'profiles/JM_CLOUD_PROFILE_MANIFEST_HOSTED_v0_5_1.json'),
  JM_GAME_DATA:path.join(stateDir,'game-state.json'),
  JM_SERVICE_MESH_DATA:path.join(stateDir,'mesh-state.json'),
  JM_MARKET_DATA:path.join(stateDir,'market-state.json'),
  JM_ZEZU_HISTORY_DATA:path.join(stateDir,'zezu-state.json'),
  JM_ZEZU_ADMISSION_MANIFEST:path.join(donor,'zezu/JM_ZEZU_HISTORY_ADMISSION_MANIFEST_CURRENT.json'),
  JM_CLOUD_TURN_URLS:'',JM_CLOUD_TURN_SHARED_SECRET:''
 });
 const start=async stateDir=>{
  const port=await freshPort();
  supervisor=new JMNodeSupervisor({entry:path.join(donor,serverFile),cwd:donor,port,env:config(stateDir),timeoutMs:18000,maxRestarts:1});
  await supervisor.start();return 'http://127.0.0.1:'+port;
 };
 const call=async (base,route,opts={})=>{
  const resp=await fetch(base+route,{redirect:'manual',signal:AbortSignal.timeout(4500),...opts,
   headers:{...(opts.auth?{Authorization:'Bearer '+admin}:{}),...(opts.body?{'Content-Type':'application/json'}:{}),...opts.headers}});
  const body=await resp.json();assert.ok(resp.status>=200&&resp.status<300,'HTTP_HOLD: '+route+' '+resp.status);
  return body;
 };
 const snapshot=async(base,stateDir)=>{
  const spaces=await call(base,'/v5/spaces',{auth:true});
  assert.ok(spaces.spaces.some(s=>s.spaceId===spaceId),'SPACE_MISSING');
  const receipt=(await call(base,'/v5/spaces/'+spaceId+'/receipt',{auth:true})).receipt;
  const keyInfo=await call(base,'/receipt-key');
  return {receiptHash:receipt.receiptHash,keyId:keyInfo.keyId,
   publicSig:receipt.publicSig,stateSha256:hash(fs.readFileSync(path.join(stateDir,stateFile))),
   signingSha256:hash(fs.readFileSync(path.join(stateDir,signFile)))};
 };
 try{
  record('pinned_hosted_source_identified',{sourceCommit:pinnedCommit});
  const oldDir=path.join(scratch,'first','state'),backup=path.join(scratch,'vault','cold.json');
  const base=await start(oldDir);
  const ready=await call(base,'/ready');
  assert.equal(ready.ready,true);assert.equal(ready.version,'0.5.1-hosted');
  assert.ok(ready.receiptSigning);assert.ok(ready.profileCount>=1);
  record('genuine_hosted_v051_ready',{version:ready.version,profileCount:ready.profileCount});
  const created=await call(base,'/v5/spaces',{auth:true,method:'POST',body:JSON.stringify({spaceId,label:'JM CP05 disposable recovery test',kind:'recovery',members:[{id:'runner',type:'client',capabilities:['*']}]})});
  assert.equal(created.space.spaceId,spaceId);
  const before=await snapshot(base,oldDir);
  record('actual_cloud_api_persisted_space_and_signing_receipt');
  await supervisor.stop();supervisor=null;
  const archive=createColdBackup({stateDir:oldDir,backupFile:backup,masterKey:key});
  assert.equal(archive.spaces,1);assert.equal(archive.stateSha256,before.stateSha256);
  assert.equal(verifyColdBackup({backupFile:backup,masterKey:key}).signerFingerprint,archive.signerFingerprint);
  const raw=fs.readFileSync(backup,'utf8');
  assert.ok(!raw.includes(spaceId)&&!raw.includes('PRIVATE KEY'),'ENCRYPTED_BACKUP_LEAK');
  record('stopped_actual_server_state_encrypted_and_readback',{spaces:archive.spaces,encryptedSha256:archive.backupSha256});
  assert.throws(()=>verifyColdBackup({backupFile:backup,masterKey:crypto.randomBytes(32)}),/BACKUP_AUTHENTICATION_FAILED/);
  const corrupt=path.join(scratch,'vault','tampered.json'),data=JSON.parse(raw);
  data.tag=Buffer.from('tamperedtag-----').toString('base64');fs.writeFileSync(corrupt,JSON.stringify(data));
  assert.throws(()=>restoreColdBackup({backupFile:corrupt,restoreDir:path.join(scratch,'bad'),masterKey:key}),/BACKUP_AUTHENTICATION_FAILED/);
  assert.equal(fs.existsSync(path.join(scratch,'bad')),false);
  record('wrong_key_and_tampered_bundle_fail_closed');
  fs.rmSync(oldDir,{recursive:true,force:true});
  assert.equal(fs.existsSync(oldDir),false,'SOURCE_STATE_NOT_REMOVED');
  const restoredDir=path.join(scratch,'second','state');
  const restore=restoreColdBackup({backupFile:backup,restoreDir:restoredDir,masterKey:key});
  assert.equal(restore.stateSha256,before.stateSha256);
  const newBase=await start(restoredDir);
  const postReady=await call(newBase,'/ready');assert.equal(postReady.ready,true);
  assert.deepEqual(await snapshot(newBase,restoredDir),before);
  record('genuine_server_restarted_from_encrypted_backup_in_distinct_directory');
  await supervisor.stop();supervisor=null;
  record('no_original_source_or_production_service_mutated');
  return {schema:'JM.CloudContact.CP05.HostedEncryptedRecoveryProof/1',scope:'PINNED_HOSTED_V051_LOCAL_REAL_SERVER_ENCRYPTED_RECOVERY',
   observedAt:new Date().toISOString(),node:process.version,platform:process.platform,
   donorRepository:'JMisJustMe/jm-cloud-contact-server-first-cloud',pinnedCommit,
   checks,passed:checks.length,failed:0,
   claimLimits:['LOCAL_ONLY','NO_OFF_MACHINE_DURABLE_BACKUP','NO_ENCRYPTION_KEY_CUSTODY_PROOF',
    'NO_LIVE_CLOUD_MIGRATION','NO_PUBLIC_HTTPS_OR_OWNER_DEVICE','NO_PRODUCTION_DEPLOYMENT',
    'CP04_BUNDLE_COVERS_CLOUD_ROOT_STATE_AND_SIGNER_ONLY_NOT_GAME_MESH_MARKET_ZEZU',
    'SERVER_SECRET_REQUIRED_FROM_INDEPENDENT_CUSTODY']};
 }finally{if(supervisor)await supervisor.stop();fs.rmSync(scratch,{recursive:true,force:true})}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const source=process.argv[2],proofFile=process.argv[3];
 if(!source)throw Error('USAGE: node hosted-recovery-v051.mjs <pinned-source-directory> [new-proof-json]');
 try{const proof=await proveHostedRecovery(source);
  if(proofFile)fs.writeFileSync(proofFile,JSON.stringify(proof,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({ok:true,scope:proof.scope,passed:proof.passed,failed:proof.failed}));
 }catch(error){console.error(error.message);process.exitCode=1}
}
