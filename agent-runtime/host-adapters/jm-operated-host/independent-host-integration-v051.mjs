// CP12 genuine unchanged JM v0.5.1 admission and local loopback only, disposable CI.
import fs from 'node:fs';import crypto from 'node:crypto';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import net from 'node:net';import {fileURLToPath} from 'node:url';
import {preflightOwnerHost,launchOwnerHost} from './independent-host-admission.mjs';
const reserve=()=>new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port))})});
const write=(p,b)=>fs.writeFileSync(p,typeof b==='string'?b:JSON.stringify(b),{mode:0o600});
export async function prove(donor){assert.ok(fs.existsSync(path.join(donor,'JM_CLOUD_CONTACT_SERVER_v0_5_1_HOSTED_DESCENDANT.mjs')));const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'jm-cp12-owned-host-test-')),checks=[];const mark=n=>checks.push({name:n,pass:true});let superv=null;
try{const state=path.join(tmp,'restored'),secrets=path.join(tmp,'private');fs.mkdirSync(state,{mode:0o700});fs.mkdirSync(secrets,{mode:0o700});
 const schema={
 'state.json':{schema:'jm.cloud-contact.server/0.5',spaces:{}},
 'game-state.json':{schema:'JM.GameLiveProfile/0.3',players:{},handles:{},queues:{},matches:{},clans:{},receipts:[],catalog:{}},
 'mesh-state.json':{schema:'JM.ServiceMesh/0.2',authusers:{},handles:{},workspaces:{},pipelines:{},receipts:[]},
 'market-state.json':{schema:'JM.MarketEcosystemLab.State/0.28',snapshots:[],proofOutcomes:[],persistence:{mode:'runtime-file-fallback',durable:false}},
 'zezu-state.json':{schema:'zezu.nwona.server-history-store/0.2',records:{}}
 };for(const [n,v] of Object.entries(schema))write(path.join(state,n),v);
 const kp=crypto.generateKeyPairSync('ec',{namedCurve:'prime256v1'});write(path.join(state,'receipt-signing-key.pem'),kp.privateKey.export({type:'pkcs8',format:'pem'}));
 const admin=crypto.randomBytes(32).toString('hex'),server=crypto.randomBytes(32).toString('hex');const adminFile=path.join(secrets,'admin.token'),serverFile=path.join(secrets,'server.secret');write(adminFile,admin);write(serverFile,server);
 const port=await reserve(),config={donorRoot:donor,stateDir:state,adminTokenFile:adminFile,serverSecretFile:serverFile,port,allowedHttpsOrigin:'https://cp12.example.invalid'};
 const pre=preflightOwnerHost(config);assert.equal(pre.sourceCommit,'0921217d95285bcb21cda7a995d02f7ec0725810');assert.equal(pre._internal,undefined);assert.ok(!JSON.stringify(pre).includes(admin)&&!JSON.stringify(pre).includes(server));mark('pinned_donor_external_secret_custody_and_private_preflight');
 if(process.platform!=='win32'){fs.chmodSync(adminFile,0o644);assert.throws(()=>preflightOwnerHost(config),/CP12_SECRET_PERMISSIONS/);fs.chmodSync(adminFile,0o600)}mark('world_readable_admin_secret_refused');
 const bad={...config,marketDatabaseUrlFile:path.join(secrets,'not-existing')};assert.throws(()=>preflightOwnerHost(bad),/CP12_MARKET_POSTGRES_CUSTODY_MISMATCH/);mark('unexpected_database_secret_refused_by_file_mode');
 const x=launchOwnerHost(config);superv=x.supervisor;const started=await superv.start();assert.equal(started.ok,true);const base='http://127.0.0.1:'+port;
 const ready=await (await fetch(base+'/ready',{signal:AbortSignal.timeout(3000)})).json();assert.equal(ready.ready,true);assert.equal(ready.version,'0.5.1-hosted');mark('genuine_original_cloud_contact_ready_on_owner_loopback');
 const p=await fetch(base+'/v5/spaces',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+admin},body:JSON.stringify({spaceId:'cp12_own_host_disposable',label:'CP12 local owner host',members:[{id:'owner',type:'client',capabilities:['*']}]})});assert.equal(p.status,201);mark('original_cloud_api_accepts_authenticated_space');
 const r=(await (await fetch(base+'/v5/spaces/cp12_own_host_disposable/receipt',{headers:{authorization:'Bearer '+admin}})).json()).receipt;const key=(await (await fetch(base+'/receipt-key')).json()).publicKeyJwk;assert.ok(crypto.verify('sha256',Buffer.from(r.receiptHash),{key:crypto.createPublicKey({key,format:'jwk'}),dsaEncoding:'ieee-p1363'},Buffer.from(r.publicSig,'base64url')));mark('original_cloud_receipt_signed_and_verified');
 const g=await (await fetch(base+'/game/v1/ready')).json();assert.equal(g.ready,true);const m=await (await fetch(base+'/mesh/v1/ready')).json();assert.equal(m.ready,true);const z=await (await fetch(base+'/zezu/v1/ready')).json();assert.equal(z.ready,true);const ma=await (await fetch(base+'/market/v1/persistence')).json();assert.equal(ma.databaseConfigured,false);mark('game_mesh_market_file_mode_zezu_ready');
 await superv.stop();superv=null;mark('original_supervised_process_stops_without_public_listener');
 return{ok:true,scope:'PINNED_ORIGINAL_V051_LOOPBACK_HOST_ADMISSION_ONLY',checks,passed:checks.length,failed:0,limits:['NO_OWNER_DEVICE_CONTACT','NO_PUBLIC_HTTPS','NO_PERSISTENT_SECOND_HOST','NO_SECRET_TRANSFER_PROOF','NO_PRODUCTION_DEPLOYMENT']};
}finally{if(superv)await superv.stop();fs.rmSync(tmp,{recursive:true,force:true})}}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))try{const result=await prove(path.resolve(process.argv[2]));if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({ok:result.ok,scope:result.scope,passed:result.passed,failed:result.failed}))}catch(e){console.error(e.message);process.exitCode=1}
