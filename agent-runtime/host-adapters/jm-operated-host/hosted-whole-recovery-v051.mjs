// JM ECOSTATE CP06: genuine hosted Cloud Contact v0.5.1 FULL FILE-STATE recovery.
// Never modifies the sovereign hosted donor. Postgres and independent secrets are HOLD.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {JMNodeSupervisor} from './supervisor.mjs';
import {createWholeColdBackup,verifyWholeColdBackup,restoreWholeColdBackup} from './whole-state-cold.mjs';
const pinnedCommit='0921217d95285bcb21cda7a995d02f7ec0725810';
const server='JM_CLOUD_CONTACT_SERVER_v0_5_1_HOSTED_DESCENDANT.mjs';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const port=()=>new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const x=s.address().port;s.close(()=>resolve(x))})});
const requireDonor=src=>{const root=path.resolve(src);assert.equal(fs.realpathSync(root),root);
 for(const f of [server,'market/JM_MARKET_LAB_PROFILE_CURRENT.mjs','game/JM_GAME_LIVE_PROFILE_v0_3.mjs','mesh/JM_SERVICE_MESH_PROFILE_v0_1.mjs','zezu/JM_ZEZU_HISTORY_RETURN_PROFILE_CURRENT.mjs','profiles/JM_CLOUD_PROFILE_MANIFEST_HOSTED_v0_5_1.json']){
  const p=path.join(root,f);assert.ok(fs.lstatSync(p).isFile()&&!fs.lstatSync(p).isSymbolicLink(),'PINNED_DONOR_INCOMPLETE: '+f);
 }return root};
const snapshotFiles=dir=>Object.fromEntries(fs.readdirSync(dir).map(n=>[n,sha(fs.readFileSync(path.join(dir,n)))]));
export async function proveHostedWholeRecovery(source){
 const donor=requireDonor(source),scratch=fs.mkdtempSync(path.join(os.tmpdir(),'jm-cp06-hosted-'));
 const admin=crypto.randomBytes(32).toString('hex'),secret=crypto.randomBytes(32).toString('hex'),masterKey=crypto.randomBytes(32);
 const spaceId='cp06_whole_state_cloud',checks=[];
 const record=(name,details={})=>checks.push({name,pass:true,...details});
 let supervisor;
 const env=stateDir=>({JM_CLOUD_MODE:'production',JM_CLOUD_ADMIN_TOKEN:admin,JM_CLOUD_SERVER_SECRET:secret,JM_CLOUD_ORIGINS:'https://jm-cp06.invalid',
  JM_CLOUD_DATA:path.join(stateDir,'state.json'),JM_CLOUD_RECEIPT_SIGNING_KEY:path.join(stateDir,'receipt-signing-key.pem'),
  JM_GAME_DATA:path.join(stateDir,'game-state.json'),JM_SERVICE_MESH_DATA:path.join(stateDir,'mesh-state.json'),
  JM_MARKET_DATA:path.join(stateDir,'market-state.json'),JM_ZEZU_HISTORY_DATA:path.join(stateDir,'zezu-state.json'),
  JM_ZEZU_ADMISSION_MANIFEST:path.join(donor,'zezu/JM_ZEZU_HISTORY_ADMISSION_MANIFEST_CURRENT.json'),
  JM_CLOUD_PROFILE_DIR:path.join(donor,'profiles'),JM_CLOUD_PROFILE_MANIFEST:path.join(donor,'profiles/JM_CLOUD_PROFILE_MANIFEST_HOSTED_v0_5_1.json'),
  JM_MARKET_PULSE_ENABLED:'0',JM_MARKET_DATABASE_URL:'',DATABASE_URL:'',JM_CLOUD_TURN_URLS:'',JM_CLOUD_TURN_SHARED_SECRET:''});
 const start=async dir=>{const p=await port();supervisor=new JMNodeSupervisor({entry:path.join(donor,server),cwd:donor,port:p,env:env(dir),timeoutMs:18000,maxRestarts:0});await supervisor.start();return 'http://127.0.0.1:'+p};
 const get=async(base,route,auth)=>{
  const r=await fetch(base+route,{headers:auth?{Authorization:'Bearer '+auth}:{},redirect:'manual',signal:AbortSignal.timeout(8000)});
  const out=await r.json();assert.equal(r.status,200,'HTTP_GET_'+route+'_'+r.status);return out};
 const post=async(base,route,data,auth)=>{
  const r=await fetch(base+route,{method:'POST',headers:{'content-type':'application/json',...(auth?{Authorization:'Bearer '+auth}:{})},body:JSON.stringify(data),redirect:'manual',signal:AbortSignal.timeout(8000)});
  const out=await r.json();assert.ok(r.status>=200&&r.status<300,'HTTP_POST_'+route+'_'+r.status+':'+JSON.stringify(out).slice(0,150));return out};
 const publicReceipt=async(base)=>{
  const rec=(await get(base,'/v5/spaces/'+spaceId+'/receipt',admin)).receipt;
  const key=(await get(base,'/receipt-key')).publicKeyJwk;
  assert.ok(crypto.verify('sha256',Buffer.from(rec.receiptHash),{key:crypto.createPublicKey({key,format:'jwk'}),dsaEncoding:'ieee-p1363'},Buffer.from(rec.publicSig,'base64url')),'ECDSA_SIGNATURE_INVALID');
  return {hash:rec.receiptHash,keyId:rec.publicKeyId,verified:true};
 };
 try{
  record('original_hosted_v051_source_pinned',{sourceCommit:pinnedCommit});
  const active=path.join(scratch,'first','state');let base=await start(active);
  const ready=await get(base,'/ready');assert.equal(ready.version,'0.5.1-hosted');assert.equal(ready.ready,true);
  const cloud=await post(base,'/v5/spaces',{spaceId,label:'JM CP06 disposable whole-state',kind:'recovery',members:[{id:'tester',type:'client',capabilities:['*']}]},admin);
  assert.equal(cloud.space.spaceId,spaceId);
  const game=await post(base,'/game/v1/players/register',{handle:'CP06player'});
  const mesh=await post(base,'/mesh/v1/auth/register',{handle:'CP06mesh'});
  const workspace=await post(base,'/mesh/v1/workspaces',{label:'CP06 workspace'},mesh.token);
  const saved=await post(base,'/mesh/v1/workspaces/'+workspace.workspace.workspaceId+'/save',{content:{checkpoint:'CP06',sequence:3},sourceBody:'JM RouteVault'},mesh.token);
  assert.equal(saved.workspace.revision,1);
  const zezu=await get(base,'/zezu/v1/meta');assert.ok(zezu.stored>=1,'ZEZU_CANONICAL_BOOT_HOLD');
  const zezuId='zn_'+zezu.admissions[0].sha256.slice(0,24),zezuRecord=await get(base,'/zezu/v1/history/'+zezuId);
  const market=await get(base,'/market/v1/persistence');assert.equal(market.databaseConfigured,false);assert.equal(market.durable,false);
  const marketSnapshots=await get(base,'/market/v1/snapshots');
  const before={cloud:await publicReceipt(base),player:(await get(base,'/game/v1/me',game.token)).player,workspace:(await get(base,'/mesh/v1/workspaces/'+workspace.workspace.workspaceId,mesh.token)).workspace,zezu:zezuRecord.verification?.carrierSha256,marketSnapshots:marketSnapshots.total};
  record('real_cloud_game_mesh_market_zezu_recipient_contact',{zezuStored:zezu.stored,marketPersistence:'file-only',marketSnapshots:marketSnapshots.total});
  await supervisor.stop();supervisor=null;
  const proofFile=path.join(active,'JM_ZEZU_LIVE_RETURN_PROOF_CURRENT.json');
  if(fs.existsSync(proofFile)){const proof=JSON.parse(fs.readFileSync(proofFile));assert.equal(proof.status,'PASS','ZEZU_PROOF_HOLD')}
  const names=fs.readdirSync(active).sort();
  for(const n of ['state.json','receipt-signing-key.pem','game-state.json','mesh-state.json','market-state.json','zezu-state.json'])assert.ok(names.includes(n),'MISSING_RECIPIENT_FILE_'+n);
  const exact=snapshotFiles(active);
  record('all_five_independent_file_states_present_after_quiesce',{fileCount:names.length,fileNames:names});
  const archive=path.join(scratch,'vault','whole-state.aesgcm'),sealed=createWholeColdBackup({stateDir:active,backupFile:archive,masterKey,quiesced:true,externalDatabaseConfigured:market.databaseConfigured});
  assert.deepEqual(verifyWholeColdBackup({backupFile:archive,masterKey}).files,sealed.files);
  const ciphertext=fs.readFileSync(archive,'utf8');assert.ok(!ciphertext.includes('CP06player')&&!ciphertext.includes('CP06mesh')&&!ciphertext.includes('PRIVATE KEY'));
  record('whole_file_state_encrypted_authenticated_and_readback',{files:sealed.files.length,archiveSha256:sealed.archiveSha256});
  assert.throws(()=>verifyWholeColdBackup({backupFile:archive,masterKey:crypto.randomBytes(32)}),/CP06_AUTHENTICATION_FAILED/);
  const corrupt=path.join(scratch,'vault','tampered.aesgcm'),j=JSON.parse(ciphertext);j.tag=Buffer.alloc(16,8).toString('base64');fs.writeFileSync(corrupt,JSON.stringify(j));
  assert.throws(()=>restoreWholeColdBackup({backupFile:corrupt,restoreDir:path.join(scratch,'bad'),masterKey}),/CP06_AUTHENTICATION_FAILED/);
  record('tampered_or_wrong_key_bundle_refused_without_partial_state');
  fs.rmSync(active,{recursive:true,force:true});assert.ok(!fs.existsSync(active));
  const restored=path.join(scratch,'restored','state');restoreWholeColdBackup({backupFile:archive,restoreDir:restored,masterKey});
  assert.deepEqual(snapshotFiles(restored),exact,'STATE_BYTES_OR_ORGAN_LOST_ON_DECRYPT');
  record('all_state_carriers_restored_byte_exact_in_new_directory');
  base=await start(restored);
  const freshReady=await get(base,'/ready');assert.equal(freshReady.ready,true);assert.equal(freshReady.version,'0.5.1-hosted');
  const after={cloud:await publicReceipt(base),player:(await get(base,'/game/v1/me',game.token)).player,workspace:(await get(base,'/mesh/v1/workspaces/'+workspace.workspace.workspaceId,mesh.token)).workspace,zezu:(await get(base,'/zezu/v1/history/'+zezuId)).verification?.carrierSha256,marketSnapshots:(await get(base,'/market/v1/snapshots')).total};
  assert.deepEqual(after,before,'RECIPIENT_API_STATE_CHANGED');
  record('genuine_server_recovers_cloud_game_mesh_market_zezu_api_views_and_signing_identity');
  await supervisor.stop();supervisor=null;
  record('donor_and_production_remain_unchanged');
  return {ok:true,schema:'JM.CloudContact.CP06.WholeFileStateProof/1',scope:'GENUINE_HOSTED_V051_ALL_LOCAL_FILE_STATES',sourceCommit:pinnedCommit,passed:checks.length,failed:0,checks,
   claimLimits:['NO_POSTGRES_EXPORT_OR_RESTORE','NO_INDEPENDENT_ENV_SECRET_CUSTODY','NO_OFF_MACHINE_BACKUP','NO_REMOTE_HOST','NO_PUBLIC_TLS','NO_OWNER_DEVICE','NO_MERGE_OR_PRODUCTION_DEPLOYMENT']};
 }finally{if(supervisor)await supervisor.stop();fs.rmSync(scratch,{recursive:true,force:true})}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [src,out]=process.argv.slice(2);
 if(!src)throw Error('Usage: node hosted-whole-recovery-v051.mjs <pinned-donor-directory> [new-proof.json]');
 try{const result=await proveHostedWholeRecovery(src);
  if(out)fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({ok:true,scope:result.scope,passed:result.passed,failed:result.failed}));
 }catch(e){console.error(e.message);process.exitCode=1}
}
