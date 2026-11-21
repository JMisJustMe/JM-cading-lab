// JM ECOSTATE CP07: two distinct GitHub-hosted test runners, real JM v0.5.1 service.
// This source only operates synthetic, explicitly PUBLIC CI fixtures. No owner secrets.
// Owner-operated machines, external database and durable secret custody remain unproved.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {JMNodeSupervisor} from './supervisor.mjs';
import {createWholeColdBackup,restoreWholeColdBackup,verifyWholeColdBackup} from './whole-state-cold.mjs';

const SOURCE_COMMIT='0921217d95285bcb21cda7a995d02f7ec0725810';
const SCHEMA='JM.CloudContact.CP07.SeparateRunnerHandoff/1';
const SERVER='JM_CLOUD_CONTACT_SERVER_v0_5_1_HOSTED_DESCENDANT.mjs';
// Deliberately public test-only fixture. NOT an encryption secret, not an owner key.
const TEST_DOMAIN='JM.CP07.PUBLIC_DISPOSABLE_CI_FIXTURE.2026-10-28/1';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const fixture=label=>crypto.createHash('sha256').update(TEST_DOMAIN+':'+label).digest();
const backupKey=fixture('BACKUP_KEY_NOT_CONFIDENTIAL');
const admin=fixture('ADMIN_NOT_CONFIDENTIAL').toString('hex');
const secret=fixture('SERVER_SECRET_NOT_CONFIDENTIAL').toString('hex');
const spaceId='cp07_runner_handoff_real_cloud';
const stateNames=['state.json','receipt-signing-key.pem','game-state.json','mesh-state.json','market-state.json','zezu-state.json'];
const stableNames=new Set([...stateNames,'state.json.bak','JM_ZEZU_LIVE_RETURN_PROOF_CURRENT.json']);
function refuse(code){throw Error(code)}
function safeFileDir(dir){const p=path.resolve(dir);assert.equal(fs.realpathSync(p),p,'CP07_SYMLINK_FOLDER');assert.ok(fs.statSync(p).isDirectory(),'CP07_DIRECTORY_REQUIRED');return p}
function checkSource(dir){const root=safeFileDir(dir);const entry=path.join(root,SERVER);
 assert.ok(fs.lstatSync(entry).isFile()&&!fs.lstatSync(entry).isSymbolicLink(),'CP07_DONOR_ENTRY_MISSING');
 let actual;try{actual=execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8',timeout:2500}).trim()}catch{refuse('CP07_DONOR_COMMIT_REQUIRED')}
 assert.equal(actual,SOURCE_COMMIT,'CP07_DONOR_COMMIT_MISMATCH');return root}
function stateDigests(dir){const names=fs.readdirSync(dir).sort();
 for(const n of names)assert.ok(stableNames.has(n),'CP07_UNEXPECTED_STATE_FILE');
 for(const n of stateNames)assert.ok(names.includes(n),'CP07_MISSING_STATE_FILE_'+n);
 return Object.fromEntries(names.map(n=>[n,sha(fs.readFileSync(path.join(dir,n)))]));
}
function safeManifest(publicData){
 if(!publicData||publicData.schema!==SCHEMA||publicData.scope!=='SYNTHETIC_CI_SEPARATE_RUNNERS'||publicData.donorCommit!==SOURCE_COMMIT)refuse('CP07_INVALID_REFERENCE');
 if(publicData.keyCustody!=='PUBLIC_CI_FIXTURE_NOT_OWNER_SECRET'||!publicData.archiveSha256||!publicData.stateDigests)refuse('CP07_INVALID_CUSTODY_LABEL');
 if(!publicData.expected||!publicData.expected.cloudHash||!publicData.expected.cloudKeyId||!publicData.expected.playerId||!publicData.expected.authId||!publicData.expected.workspaceId||!publicData.expected.zezuCarrierSha)refuse('CP07_INCOMPLETE_PUBLIC_REFERENCE');
 const keys=Object.keys(publicData.stateDigests).sort();if(keys.some(k=>!stableNames.has(k)))refuse('CP07_UNKNOWN_REFERENCE_FILE');
 for(const n of stateNames)if(!keys.includes(n))refuse('CP07_MISSING_REFERENCE_FILE');
 for(const hash of Object.values(publicData.stateDigests))if(!/^[a-f\d]{64}$/.test(hash))refuse('CP07_INVALID_REFERENCE_DIGEST');
 // No bearer credential/private key/data payloads ever belong to the public reference.
 for(const name of Object.keys(publicData))if(/token|secret|privateKey|credentials/i.test(name))refuse('CP07_REFERENCE_HAS_CREDENTIAL_FIELD');
 return publicData;
}
export function verifyTransport(artifactDir){const dir=safeFileDir(artifactDir),names=fs.readdirSync(dir).sort();
 assert.deepEqual(names,['public-reference.json','state.aesgcm'],'CP07_TRANSFER_FILE_SET_MISMATCH');
 for(const n of names)assert.ok(fs.lstatSync(path.join(dir,n)).isFile()&&!fs.lstatSync(path.join(dir,n)).isSymbolicLink(),'CP07_TRANSFER_SYMLINK');
 const reference=JSON.parse(fs.readFileSync(path.join(dir,'public-reference.json'),'utf8'));
 safeManifest(reference);
 assert.equal(sha(fs.readFileSync(path.join(dir,'state.aesgcm'))),reference.archiveSha256,'CP07_TRANSFER_DIGEST_HOLD');
 return reference;
}
const freePort=()=>new Promise((resolve,reject)=>{const n=net.createServer();n.once('error',reject);n.listen(0,'127.0.0.1',()=>{const p=n.address().port;n.close(()=>resolve(p))})});
function env(donor,dir){return{
 JM_CLOUD_MODE:'production',JM_CLOUD_ADMIN_TOKEN:admin,JM_CLOUD_SERVER_SECRET:secret,
 JM_CLOUD_ORIGINS:'https://jm-cp07-ci.invalid',
 JM_CLOUD_DATA:path.join(dir,'state.json'),JM_CLOUD_RECEIPT_SIGNING_KEY:path.join(dir,'receipt-signing-key.pem'),
 JM_GAME_DATA:path.join(dir,'game-state.json'),JM_SERVICE_MESH_DATA:path.join(dir,'mesh-state.json'),
 JM_MARKET_DATA:path.join(dir,'market-state.json'),JM_ZEZU_HISTORY_DATA:path.join(dir,'zezu-state.json'),
 JM_ZEZU_ADMISSION_MANIFEST:path.join(donor,'zezu/JM_ZEZU_HISTORY_ADMISSION_MANIFEST_CURRENT.json'),
 JM_CLOUD_PROFILE_DIR:path.join(donor,'profiles'),JM_CLOUD_PROFILE_MANIFEST:path.join(donor,'profiles/JM_CLOUD_PROFILE_MANIFEST_HOSTED_v0_5_1.json'),
 JM_MARKET_PULSE_ENABLED:'0',JM_MARKET_DATABASE_URL:'',DATABASE_URL:'',
 JM_CLOUD_TURN_URLS:'',JM_CLOUD_TURN_SHARED_SECRET:'',
 JM_ZEZU_LIVE_PROOF_OUTPUT:'',
 }}
async function launch(donor,dir){const port=await freePort();const supervisor=new JMNodeSupervisor({entry:path.join(donor,SERVER),cwd:donor,port,env:env(donor,dir),timeoutMs:18000,maxRestarts:0});
 await supervisor.start();return{base:'http://127.0.0.1:'+port,supervisor}}
async function request(base,route,verb='GET',body=null,token=null){
 const resp=await fetch(base+route,{method:verb,redirect:'error',signal:AbortSignal.timeout(9000),headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 const j=await resp.json();assert.ok(resp.ok,`CP07_HTTP_${resp.status}_${route}`);return j;
}
async function signer(base){const info=await request(base,'/receipt-key');const result=(await request(base,'/v5/spaces/'+spaceId+'/receipt','GET',null,admin)).receipt;
 const pub=crypto.createPublicKey({key:info.publicKeyJwk,format:'jwk'});
 assert.equal(info.keyId,result.publicKeyId);
 assert.ok(crypto.verify('sha256',Buffer.from(result.receiptHash),{key:pub,dsaEncoding:'ieee-p1363'},Buffer.from(result.publicSig,'base64url')),'CP07_RECEIPT_SIGNATURE_REFUSED');
 return{hash:result.receiptHash,keyId:info.keyId,valid:true};
}
function mintedBearer(kind,id){
 // The actual service's native HMAC format with a *public* test-only secret.
 const label=kind==='game'?'JM.GameLiveProfile/0.3':'JM.ServiceMesh/0.1';
 const payload=Buffer.from(JSON.stringify(kind==='game'?{playerId:id,at:0,n:'public-cp07-test'}:{id,at:0,n:'public-cp07-test'})).toString('base64url');
 const signingKey=crypto.createHmac('sha256',secret).update(label).digest();
 return payload+'.'+crypto.createHmac('sha256',signingKey).update(payload).digest('base64url');
}
async function apiView(base,reference){const e=reference.expected;
 const health=await request(base,'/health');assert.equal(health.version,'0.5.1-hosted');
 const ready=await request(base,'/ready');assert.equal(ready.ready,true);assert.ok(ready.receiptSigning&&ready.profileCount>=1);
 const cloud=await signer(base);assert.equal(cloud.hash,e.cloudHash);assert.equal(cloud.keyId,e.cloudKeyId);
 const game=await request(base,'/game/v1/me','GET',null,mintedBearer('game',e.playerId));
 assert.equal(game.player.playerId,e.playerId);assert.equal(game.player.handle,e.playerHandle);
 const mesh=await request(base,'/mesh/v1/workspaces/'+encodeURIComponent(e.workspaceId),'GET',null,mintedBearer('mesh',e.authId));
 assert.equal(mesh.workspace.workspaceId,e.workspaceId);assert.equal(mesh.workspace.revision,1);
 assert.deepEqual(mesh.workspace.content,{checkpoint:'CP07',sequence:7});
 const z=await request(base,'/zezu/v1/history/zn_'+e.zezuCarrierSha.slice(0,24));assert.equal(z.verification?.carrierSha256,e.zezuCarrierSha);
 const market=await request(base,'/market/v1/persistence');assert.equal(market.databaseConfigured,false);assert.equal(market.durable,false);
 const snap=await request(base,'/market/v1/snapshots');assert.equal(snap.total,e.marketSnapshots);
 return{cloudSignatureVerified:true,gameAccount:true,meshWorkspace:true,zezuCarrier:true,marketFileFallback:true};
}
export async function produceCrossRunnerProof(donorPath,artifactDir){const donor=checkSource(donorPath);
 const dest=path.resolve(artifactDir);assert.ok(!fs.existsSync(dest),'CP07_DEST_EXISTS');
 const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'jm-cp07-produce-')),active=path.join(scratch,'state');
 let runner=null,created=false;
 try{
  const launched=await launch(donor,active);runner=launched.supervisor;const base=launched.base;
  const ready=await request(base,'/ready');assert.equal(ready.version,'0.5.1-hosted');assert.equal(ready.ready,true);
  const cloud=await request(base,'/v5/spaces','POST',{spaceId,label:'JM CP07 synthetic CI handoff',kind:'recovery',members:[{id:'tester',type:'client',capabilities:['*']}]},admin);
  assert.equal(cloud.space.spaceId,spaceId);
  const game=await request(base,'/game/v1/players/register','POST',{handle:'CP07player'});
  const mesh=await request(base,'/mesh/v1/auth/register','POST',{handle:'CP07mesh'});
  const workspace=await request(base,'/mesh/v1/workspaces','POST',{label:'JM CP07 public fixture'},mesh.token);
  await request(base,'/mesh/v1/workspaces/'+workspace.workspace.workspaceId+'/save','POST',{content:{checkpoint:'CP07',sequence:7}},mesh.token);
  const zezu=await request(base,'/zezu/v1/meta');assert.ok(zezu.stored>=1);
  const market=await request(base,'/market/v1/persistence');assert.equal(market.databaseConfigured,false);assert.equal(market.durable,false);
  const snaps=await request(base,'/market/v1/snapshots');
  const cloudView=await signer(base);
  const expected={cloudHash:cloudView.hash,cloudKeyId:cloudView.keyId,
   playerId:game.player.playerId,playerHandle:game.player.handle,
   authId:mesh.authuser.authuserId,workspaceId:workspace.workspace.workspaceId,
   zezuCarrierSha:zezu.admissions[0].sha256,marketSnapshots:snaps.total};
  await runner.stop();runner=null;
  const state=stateDigests(active), vault=path.join(scratch,'state.aesgcm');
  const sealed=createWholeColdBackup({stateDir:active,backupFile:vault,masterKey:backupKey,quiesced:true,externalDatabaseConfigured:false});
  assert.deepEqual(verifyWholeColdBackup({backupFile:vault,masterKey:backupKey}).files,sealed.files);
  const reference=safeManifest({schema:SCHEMA,scope:'SYNTHETIC_CI_SEPARATE_RUNNERS',donorCommit:SOURCE_COMMIT,
    keyCustody:'PUBLIC_CI_FIXTURE_NOT_OWNER_SECRET',createdAt:new Date().toISOString(),
    archiveSha256:sha(fs.readFileSync(vault)),expected,stateDigests:state,
    origin:{workflowRun:process.env.GITHUB_RUN_ID||null,job:process.env.GITHUB_JOB||'local-producer',platform:process.platform},
    boundary:['SYNTHETIC_DATA_ONLY','PUBLIC_REUSABLE_CI_KEY','GITHUB_ARTIFACT_TEMPORARY','NO_OWNER_VAULT_OR_PRODUCTION_CREDENTIALS','NO_POSTGRES','NO_LIVE_REMOTE_SERVER']});
  fs.mkdirSync(dest,{mode:0o700});created=true;
  fs.copyFileSync(vault,path.join(dest,'state.aesgcm'));
  fs.writeFileSync(path.join(dest,'public-reference.json'),JSON.stringify(reference,null,2)+'\n',{mode:0o600,flag:'wx'});
  verifyTransport(dest);
  return{ok:true,phase:'PRODUCE',scope:reference.scope,files:sealed.files.length,archiveSha256:reference.archiveSha256,
    cloudSignatureVerified:cloudView.valid,cloudGameMeshMarketZezu:true,sourceCommit:SOURCE_COMMIT};
 }catch(e){if(created)fs.rmSync(dest,{recursive:true,force:true});throw e}
 finally{if(runner)await runner.stop();fs.rmSync(scratch,{recursive:true,force:true})}
}
export async function consumeCrossRunnerProof(donorPath,artifactDir){const donor=checkSource(donorPath),reference=verifyTransport(artifactDir);
 assert.notEqual(reference.origin.job,process.env.GITHUB_JOB||'local-consumer','CP07_SAME_JOB_REFUSED');
 const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'jm-cp07-consume-')),restored=path.join(scratch,'restored-state');
 let runner=null;
 try{
  const backupFile=path.join(artifactDir,'state.aesgcm');
  const restore=restoreWholeColdBackup({backupFile,restoreDir:restored,masterKey:backupKey});
  assert.deepEqual(restore.files,Object.keys(reference.stateDigests).sort());
  assert.deepEqual(stateDigests(restored),reference.stateDigests,'CP07_CROSS_RUNNER_RESTORE_MISMATCH');
  const launched=await launch(donor,restored);runner=launched.supervisor;
  const api=await apiView(launched.base,reference);
  await runner.stop();runner=null;
  return{ok:true,phase:'RECOVER',schema:'JM.CloudContact.CP07.SeparateRunnerProof/1',
   scope:'GENUINE_HOSTED_V051_TWO_CI_RUNNERS_TEMPORARY_RELAY',donorCommit:SOURCE_COMMIT,
   archiveSha256:reference.archiveSha256,fileCount:restore.files.length,
   sourceJob:reference.origin.job,recoveryJob:process.env.GITHUB_JOB||'local-consumer',
   api,passed:6,failed:0,
   boundaries:['NO_OWNER_CONTROLLED_SECOND_MACHINE','NO_REAL_SECRET_CUSTODY','PUBLIC_CI_TEST_KEY_NOT_CONFIDENTIAL',
     'GITHUB_ARTIFACT_NOT_PERMANENT_DURABILITY','NO_POSTGRES_BACKUP','NO_LIVE_TRAFFIC_OR_TLS','NO_PRODUCTION_MIGRATION']};
 }finally{if(runner)await runner.stop();fs.rmSync(scratch,{recursive:true,force:true})}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [action,donor,carrier,receipt]=process.argv.slice(2);
 if(!['produce','recover'].includes(action)||!donor||!carrier)throw Error('USAGE: node cross-runner-recovery-v051.mjs produce|recover <exact-donor-repo> <carrier-dir> [new-receipt.json]');
 try{const proof=action==='produce'?await produceCrossRunnerProof(donor,carrier):await consumeCrossRunnerProof(donor,carrier);
  if(receipt)fs.writeFileSync(receipt,JSON.stringify(proof,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify(proof));
 }catch(e){console.error(e?.message||e);process.exitCode=1}
}
