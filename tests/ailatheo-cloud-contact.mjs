import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createCloudWorkspaceClient,httpRequest} from '../unified-browser/jm-cloud-workspace-client.mjs';
import {onRequest} from '../functions/api/estate-contact.js';
const live=process.env.JM_LIVE_CONTACT==='1';
const cwd=path.resolve('../cloud-contact'),scratch=path.resolve('../contact-state');
fs.mkdirSync(scratch,{recursive:true});
let child;
const port=18984,base=live?'https://jm-cloud-contact-server-v05.onrender.com':'http://127.0.0.1:'+port;
async function start(){
  child=spawn(process.execPath,['JM_CLOUD_CONTACT_SERVER_v0_5_1_HOSTED_DESCENDANT.mjs'],{cwd,env:{...process.env,
    HOST:'127.0.0.1',PORT:String(port),JM_CLOUD_MODE:'development',JM_CLOUD_ADMIN_TOKEN:'test-admin-'.repeat(5),JM_CLOUD_SERVER_SECRET:'test-secret-'.repeat(5),
    JM_CLOUD_DATA:path.join(scratch,'cloud.json'),JM_SERVICE_MESH_DATA:path.join(scratch,'mesh.json'),JM_CLOUD_RECEIPT_SIGNING_KEY:path.join(scratch,'signer.pem'),JM_MARKET_PULSE_ENABLED:'0'},stdio:'ignore'});
  for(let i=0;i<100;i++){try{if((await fetch(base+'/ready')).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw Error('SERVER_NOT_READY');
}
async function stop(){if(child&&!child.killed){const done=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');await done;child=null}}
const tests=[];
try{
  if(!live)await start();
  const request=httpRequest(base),client=createCloudWorkspaceClient({request});
  const handle='M002_'+crypto.randomUUID().replaceAll('-','').slice(0,14);
  const auth=await client.register(handle);
  const intent='Mission 002 synthetic contact: preserve source identity, execute RouteVault save, verify signed cloud return, recover exact state. No owner or customer data.';
  const result=await client.saveIntent(intent);
  assert.equal(result.state,'TARGET_READBACK_VERIFIED');assert.equal(result.content.intent,intent);
  tests.push('scoped-registration','real-http-workspace-create','real-http-routevault-save','target-content-hash-readback','mesh-receipt-readback','cloud-ECDSA-signature');
  const cp=client.checkpoint();
  fs.writeFileSync(path.join(scratch,live?'live-private-recovery.json':'local-private-recovery.json'),JSON.stringify({token:auth.token,checkpoint:cp}),{mode:0o600});
  const returned=await createCloudWorkspaceClient({request:httpRequest(base),token:auth.token,checkpoint:cp}).recover();
  assert.deepEqual(returned.content,result.content);tests.push('fresh-client-recovery');
  await assert.rejects(createCloudWorkspaceClient({request,token:auth.token,checkpoint:{...cp,contentHash:'0'.repeat(64)}}).recover(),/TARGET_STATE_CHANGED/);
  await assert.rejects(createCloudWorkspaceClient({request,token:'invalid'.repeat(8),checkpoint:cp}).recover());tests.push('tampered-checkpoint-rejected','invalid-credential-rejected');
  await assert.rejects(createCloudWorkspaceClient({request,token:auth.token,checkpoint:{...cp,cloudKeyId:'changed'}}).recover(),/PINNED_CLOUD_SIGNER_CHANGED/);tests.push('changed-signer-rejected');
  if(!live){
    let pending;
    const interrupted=createCloudWorkspaceClient({request:async(...args)=>{const response=await request(...args);if(args[1].endsWith('/save'))throw Error('RESPONSE_LOST_AFTER_TARGET_SAVE');return response},token:auth.token,onCheckpoint:c=>{pending=c}});
    await assert.rejects(interrupted.saveIntent('Synthetic interrupted-response recovery'),/RESPONSE_LOST/);
    assert.equal(pending.state,'SAVE_PENDING');
    const recovered=await createCloudWorkspaceClient({request,token:auth.token,checkpoint:pending}).recover();
    assert.equal(recovered.content.intent,'Synthetic interrupted-response recovery');tests.push('lost-response-recovery-without-replaying-write');
  }
  if(!live){await stop();await start();const restarted=await createCloudWorkspaceClient({request:httpRequest(base),token:auth.token,checkpoint:cp}).recover();assert.deepEqual(restarted.content,result.content);tests.push('actual-server-process-restart','same-signer-and-exact-state-after-restart')}
  // Relay rejection tests use the real handler; no network is needed for denied routes.
  for(const route of ['/v5/spaces','https://evil.example/','/mesh/v1/workspaces/../admin']){
    const r=await onRequest({request:new Request('https://estate.example/api/estate-contact?route='+encodeURIComponent(route))});assert.equal(r.status,400);
  }
  const cross=await onRequest({request:new Request('https://estate.example/api/estate-contact?route=/mesh/v1/auth/register',{method:'POST',headers:{origin:'https://other.example','content-type':'application/json'},body:'{}'})});assert.equal(cross.status,403);tests.push('fixed-recipient-relay-rejects-unscoped-admin-and-cross-origin-writes');
  if(live){
    // Execute an actual same-origin backend relay read against the live target.
    const r=await onRequest({request:new Request('https://jmisjustme-estate.pages.dev/api/estate-contact?route='+encodeURIComponent('/mesh/v1/workspaces/'+cp.workspaceId),{headers:{authorization:'Bearer '+auth.token}})});
    assert.equal(r.status,200);assert.equal((await r.json()).workspace.contentHash,cp.contentHash);tests.push('existing-backend-relay-to-live-target');
  }
  const proof={operationId:'JMOP-3b5c9c64cbc980ac184151f2',at:new Date().toISOString(),state:'PASS',target:base,tests,checkpoint:cp,
    boundary:live?'Live target write, signature and independent client recovery. No server restart, permanent storage, physical Android or owner acceptance claimed.':'Actual local HTTP server and process restart using recovered production source. No distributed/cloud or physical-device acceptance.'};
  const output=process.env.JM_PROOF_DIR||path.resolve('../../outputs');fs.mkdirSync(output,{recursive:true});
  const outfile=path.join(output,live?'live-contact-proof.json':'local-restart-proof.json');fs.writeFileSync(outfile,JSON.stringify(proof,null,2));console.log(JSON.stringify(proof,null,2));
}finally{await stop()}
