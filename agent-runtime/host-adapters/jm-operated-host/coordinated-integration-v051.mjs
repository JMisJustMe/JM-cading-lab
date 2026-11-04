// JM CP10 CI: genuine hosted v0.5.1 server + PostgreSQL 16 isolated test only.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import net from 'node:net';
import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {JMNodeSupervisor} from './supervisor.mjs';
import {createRecipientKeys} from './recipient-custody.mjs';
import {sealCoordinatedCheckpoint,preflightCoordinatedCheckpoint,restoreCoordinatedCheckpoint,inspectCoordinatedCheckpoint} from './coordinated-checkpoint.mjs';
const SRC_COMMIT='0921217d95285bcb21cda7a995d02f7ec0725810';
const DB='postgresql://postgres:cp10_disposable_only@127.0.0.1:5432/';
const srcDb=DB+'jm_cp10_original',dstDb=DB+'jm_cp10_recovery';
const envDB=name=>({PATH:process.env.PATH||'/usr/bin:/bin',PGHOST:'127.0.0.1',PGPORT:'5432',PGUSER:'postgres',PGPASSWORD:'cp10_disposable_only',PGDATABASE:name,PGSSLMODE:'disable'});
function sql(db,stmt){const r=spawnSync('psql',['-X','--set=ON_ERROR_STOP=1','--tuples-only','--no-align','--command',stmt],{env:envDB(db),encoding:'utf8',timeout:10000,maxBuffer:1e6,shell:false});if(r.status!==0||r.error)throw Error('CP10_DISPOSABLE_SQL_FAILED');return r.stdout.trim()}
function seed(){for(const n of ['jm_cp10_original','jm_cp10_recovery']){assert.equal(sql('postgres',`SELECT 1 FROM pg_database WHERE datname='${n}'`),'','CP10_DB_ALREADY_EXISTS');sql('postgres',`CREATE DATABASE ${n}`)}
 sql('jm_cp10_original',`CREATE TABLE public.jm_market_pulse_snapshots(id BIGSERIAL PRIMARY KEY,fetched_at TIMESTAMPTZ NOT NULL,symbol TEXT NOT NULL,payload JSONB NOT NULL);
 CREATE TABLE public.jm_quick_flip_proof_outcomes(id BIGSERIAL PRIMARY KEY,created_at TIMESTAMPTZ NOT NULL,symbol TEXT,receipt_hash TEXT NOT NULL UNIQUE,payload JSONB NOT NULL);
 CREATE TABLE public.jm_quick_flip_durability_witnesses(id UUID PRIMARY KEY,created_at TIMESTAMPTZ NOT NULL,previous_id UUID,payload JSONB NOT NULL);
 INSERT INTO public.jm_market_pulse_snapshots(fetched_at,symbol,payload) VALUES('2026-10-22T09:00:00Z','BTC/GBP','{"schema":"JM.MarketExecutableQuote/0.5","bid":49230,"symbol":"BTC/GBP"}');
 INSERT INTO public.jm_quick_flip_proof_outcomes(created_at,symbol,receipt_hash,payload) VALUES('2026-10-22T10:00:00Z','BTC/GBP','cp10_disposable_001','{"schema":"JM.QuickFlipProofOutcome/1.0","outcome":"FULL_DEPTH_INCOMPLETE"}');
 INSERT INTO public.jm_quick_flip_durability_witnesses(id,created_at,previous_id,payload) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','2026-10-22T11:00:00Z',NULL,'{"schema":"JM.QuickFlipDurabilityWitness/1.0","bootId":"CP10"}');`);
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const port=()=>new Promise((ok,no)=>{const s=net.createServer();s.once('error',no);s.listen(0,'127.0.0.1',()=>{const n=s.address().port;s.close(()=>ok(n))})});
async function wait(fn,attempts=100){for(let i=0;i<attempts;i++){const r=await fn();if(r)return r;await sleep(100)}throw Error('CP10_WITNESS_NOT_READY')}
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
export async function integration(donor){assert.equal(process.env.JM_CP10_CI_TEST_DATABASES,'YES_DISPOSABLE_ONLY','NO_PRODUCTION_DB_ALLOWED');
 const root=path.resolve(donor);assert.equal(fs.realpathSync(root),root);for(const f of ['JM_CLOUD_CONTACT_SERVER_v0_5_1_HOSTED_DESCENDANT.mjs','zezu/JM_ZEZU_HISTORY_ADMISSION_MANIFEST_CURRENT.json'])assert.ok(fs.statSync(path.join(root,f)).isFile());
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'jm-cp10-joint-'));seed();const checks=[];const claim=name=>checks.push({name,pass:true});
 const admin=crypto.randomBytes(32).toString('hex'),serverSecret=crypto.randomBytes(32).toString('hex');let sup=null;
 const conf=(dir,db)=>({JM_CLOUD_MODE:'production',JM_CLOUD_ADMIN_TOKEN:admin,JM_CLOUD_SERVER_SECRET:serverSecret,JM_CLOUD_ORIGINS:'https://cp10.invalid',JM_CLOUD_DATA:path.join(dir,'state.json'),JM_CLOUD_RECEIPT_SIGNING_KEY:path.join(dir,'receipt-signing-key.pem'),JM_GAME_DATA:path.join(dir,'game-state.json'),JM_SERVICE_MESH_DATA:path.join(dir,'mesh-state.json'),JM_MARKET_DATA:path.join(dir,'market-state.json'),JM_ZEZU_HISTORY_DATA:path.join(dir,'zezu-state.json'),JM_CLOUD_PROFILE_DIR:path.join(root,'profiles'),JM_CLOUD_PROFILE_MANIFEST:path.join(root,'profiles/JM_CLOUD_PROFILE_MANIFEST_HOSTED_v0_5_1.json'),JM_ZEZU_ADMISSION_MANIFEST:path.join(root,'zezu/JM_ZEZU_HISTORY_ADMISSION_MANIFEST_CURRENT.json'),JM_MARKET_DATABASE_URL:db,JM_MARKET_PULSE_ENABLED:'1',JM_MARKET_PULSE_INTERVAL_MS:'3600000',JM_CLOUD_TURN_URLS:'',JM_CLOUD_TURN_SHARED_SECRET:''});
 const start=async(dir,db)=>{const p=await port();sup=new JMNodeSupervisor({entry:path.join(root,'JM_CLOUD_CONTACT_SERVER_v0_5_1_HOSTED_DESCENDANT.mjs'),cwd:root,port:p,env:conf(dir,db),timeoutMs:18000,maxRestarts:0});await sup.start();return 'http://127.0.0.1:'+p};
 const request=async (base,route,{method='GET',token=null,data=null}={})=>{const r=await fetch(base+route,{method,redirect:'manual',signal:AbortSignal.timeout(7500),headers:{...(token?{authorization:'Bearer '+token}:{}),...(data?{'content-type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});const j=await r.json();assert.ok(r.ok,`CP10_API_${route}_${r.status}`);return j};
 const actualReceipt=async base=>{const r=(await request(base,'/v5/spaces/cp10_joint_recovery/receipt',{token:admin})).receipt;const k=(await request(base,'/receipt-key')).publicKeyJwk;assert.ok(crypto.verify('sha256',Buffer.from(r.receiptHash),{key:crypto.createPublicKey({key:k,format:'jwk'}),dsaEncoding:'ieee-p1363'},Buffer.from(r.publicSig,'base64url')),'CP10_SIGNING_SIGNATURE_INVALID');return {hash:r.receiptHash,keyId:r.publicKeyId}};
 try{
  claim('three_original_market_tables_in_disposable_postgres16');
  const active=path.join(temp,'original','state'),base=await start(active,srcDb);
  await wait(async()=>{const p=await request(base,'/market/v1/persistence');return p.durable&&p.ready&&p.mode==='postgres'});
  claim('actual_hosted_market_database_contact_and_boot_witness');
  await request(base,'/v5/spaces',{method:'POST',token:admin,data:{spaceId:'cp10_joint_recovery',label:'JM CP10 stopped checkpoint',members:[{id:'controller',type:'client',capabilities:['*']}]}});
  const game=await request(base,'/game/v1/players/register',{method:'POST',data:{handle:'CP10player'}});
  const mesh=await request(base,'/mesh/v1/auth/register',{method:'POST',data:{handle:'CP10mesh'}});
  const w=await request(base,'/mesh/v1/workspaces',{method:'POST',token:mesh.token,data:{label:'CP10 workspace'}});
  await request(base,'/mesh/v1/workspaces/'+w.workspace.workspaceId+'/save',{method:'POST',token:mesh.token,data:{content:{checkpoint:'CP10',value:42}}});
  const z=await request(base,'/zezu/v1/meta');assert.ok(z.stored>0,'CP10_ZEZU_MOUNT');
  const before={receipt:await actualReceipt(base),player:(await request(base,'/game/v1/me',{token:game.token})).player,workspace:(await request(base,'/mesh/v1/workspaces/'+w.workspace.workspaceId,{token:mesh.token})).workspace,zezu:z.stored};
  claim('actual_hosted_cloud_game_mesh_zezu_data_persisted');
  await sup.stop();sup=null;
  await wait(async()=>fs.existsSync(path.join(active,'market-state.json')));const market=JSON.parse(fs.readFileSync(path.join(active,'market-state.json')));assert.equal(market.persistence.mode,'postgres');assert.equal(market.persistence.durable,true);assert.equal(market.persistence.ready,true);
  claim('original_market_file_indicates_postgres_durability');
  const keys={privateFile:path.join(temp,'recipient.private.pem'),publicFile:path.join(temp,'recipient.public.pem')},k=createRecipientKeys(keys);
  const vault=path.join(temp,'vault','checkpoint.sealed');const sourceFiles=Object.fromEntries(fs.readdirSync(active).map(x=>[x,hash(fs.readFileSync(path.join(active,x)))]));
  const sealed=sealCoordinatedCheckpoint({stateDir:active,pgSourceUrl:srcDb,publicFile:keys.publicFile,expectedRecipientId:k.recipientId,sealedFile:vault,quiesced:true});
  assert.equal(sealed.fileCount,Object.keys(sourceFiles).length);assert.equal(inspectCoordinatedCheckpoint({sealedFile:vault}).sealedSha256,sealed.sealedSha256);
  claim('stopped_joint_file_postgres_checkpoint_created_and_integrity_pinned');
  assert.throws(()=>preflightCoordinatedCheckpoint({sealedFile:vault,privateFile:keys.privateFile,expectedSealedSha256:'0'.repeat(64)}),/CP10_INDEPENDENT_ARCHIVE_PIN_REQUIRED/);
  const wrong={privateFile:path.join(temp,'wrong.private.pem'),publicFile:path.join(temp,'wrong.public.pem')};createRecipientKeys(wrong);assert.throws(()=>preflightCoordinatedCheckpoint({sealedFile:vault,privateFile:wrong.privateFile,expectedSealedSha256:sealed.sealedSha256}),/CP10_WRONG_RECIPIENT/);
  claim('untrusted_archive_pin_or_private_key_refused');
  const forged=path.join(temp,'forged');const json=JSON.parse(fs.readFileSync(vault));json.tag=Buffer.alloc(16,8).toString('base64');fs.writeFileSync(forged,JSON.stringify(json));
  assert.throws(()=>preflightCoordinatedCheckpoint({sealedFile:forged,privateFile:keys.privateFile,expectedSealedSha256:hash(fs.readFileSync(forged))}),/CP10_AUTHENTICATION_FAILED/);
  claim('tampered_checkpoint_refused_by_authenticated_decryption');
  const pre=preflightCoordinatedCheckpoint({sealedFile:vault,privateFile:keys.privateFile,expectedSealedSha256:sealed.sealedSha256});assert.equal(pre.checkpointId,sealed.checkpointId);
  claim('recipient_private_key_preflight_verifies_common_checkpoint');
  const restored=path.join(temp,'recovered','state');const result=restoreCoordinatedCheckpoint({sealedFile:vault,privateFile:keys.privateFile,expectedSealedSha256:sealed.sealedSha256,restoreDir:restored,pgTargetUrl:dstDb});
  assert.equal(result.checkpointId,sealed.checkpointId);assert.deepEqual(Object.fromEntries(fs.readdirSync(restored).map(n=>[n,hash(fs.readFileSync(path.join(restored,n)))])),sourceFiles);
  assert.equal(sql('jm_cp10_recovery',"SELECT payload->>'outcome' FROM jm_quick_flip_proof_outcomes WHERE receipt_hash='cp10_disposable_001'"),'FULL_DEPTH_INCOMPLETE');
  claim('combined_file_sha_and_three_postgresql_tables_restored_isolated');
  const restoredBase=await start(restored,dstDb);await wait(async()=>{const p=await request(restoredBase,'/market/v1/persistence');return p.durable&&p.ready&&p.continuity?.recoveredPriorWitness});
  const after={receipt:await actualReceipt(restoredBase),player:(await request(restoredBase,'/game/v1/me',{token:game.token})).player,workspace:(await request(restoredBase,'/mesh/v1/workspaces/'+w.workspace.workspaceId,{token:mesh.token})).workspace,zezu:(await request(restoredBase,'/zezu/v1/meta')).stored};
  assert.deepEqual(after,before);const durable=await request(restoredBase,'/market/v1/persistence');assert.equal(durable.durable,true);assert.equal(durable.continuity.recoveredPriorWitness,true);
  claim('original_hosted_service_restarts_with_cloud_game_mesh_zezu_and_postgres_witness');
  await sup.stop();sup=null;
  assert.throws(()=>restoreCoordinatedCheckpoint({sealedFile:vault,privateFile:keys.privateFile,expectedSealedSha256:sealed.sealedSha256,restoreDir:restored,pgTargetUrl:dstDb}),/CP10_FILE_TARGET_NOT_EMPTY/);
  claim('occupied_recovery_target_refuses_overwrite');
  return {ok:true,schema:'JM.CloudContact.CP10.JointRecoveryTest/1',scope:'PINNED_HOSTED_V051_STOPPED_FILE_AND_REAL_PG16_ISOLATED_RESTORE',donorCommit:SRC_COMMIT,checkpointId:sealed.checkpointId,passed:checks.length,failed:0,checks,limits:['CI_TEST_FIXTURE_NOT_PRODUCTION','STOPPED_WRITERS_BY_SUPERVISOR_NOT_GLOBAL_DB_LOCK','NO_CROSS_STORE_ACID_TRANSACTION','NO_OWNER_OFFSITE_OR_INDEPENDENT_MACHINE','NO_LIVE_PROMOTION_OR_DEPLOY']};
 }finally{if(sup)await sup.stop();fs.rmSync(temp,{recursive:true,force:true})}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const r=await integration(process.argv[2]);if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify(r,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({ok:r.ok,scope:r.scope,passed:r.passed,failed:r.failed}));}
 catch(e){console.error(e.message);process.exitCode=1}
}
