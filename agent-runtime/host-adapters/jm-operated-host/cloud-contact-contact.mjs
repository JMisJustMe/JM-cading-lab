// CP03: contact a preserved JM server through the existing CP02 host adapter.
// Requires the recovered source package; never downloads or rewrites the body.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {JMNodeSupervisor} from './supervisor.mjs';

const execute=promisify(execFile);
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const entryName='JM_CLOUD_CONTACT_SERVER_v0_5_PROFILE_MOUNTS.mjs';
const qaName='JM_PHONE_LAPTOP_GENERAL_SERVER_INTEGRATION_QA_v0_5.mjs';
const manifestHash='cad827d910b03fdfbaabe6abfecfecf57d1ca48fa61beedcef3f1d0e5be02e37';
const sourceHash='25d44a24a7d9addf8793f0e4394bb569066b19e181e67aefc20cac5cd618db4d';
const keyName='receipt-signing-key.pem',dataName='state.json';

function recoveredFiles(source){
 const root=path.resolve(source);
 assert.equal(fs.realpathSync(root),root,'SOURCE_SYMLINK_REFUSED');
 const manifest=fs.readFileSync(path.join(root,'SHA256_MANIFEST.txt'));
 assert.equal(hash(manifest),manifestHash,'RECOVERED_MANIFEST_MISMATCH');
 const files=new Map();
 for(const line of manifest.toString('utf8').trim().split('\n')){
  const match=/^([a-f0-9]{64})  ([A-Za-z0-9_./-]+)$/.exec(line);
  assert.ok(match,'INVALID_SOURCE_MANIFEST');
  const [,digest,name]=match;
  assert.ok(!path.isAbsolute(name)&&!name.split('/').includes('..')&&!files.has(name),'INVALID_SOURCE_PATH');
  const file=path.join(root,name);
  assert.equal(fs.realpathSync(file),file,'SOURCE_SYMLINK_REFUSED');
  assert.ok(fs.lstatSync(file).isFile(),'SOURCE_FILE_REQUIRED');
  const bytes=fs.readFileSync(file);
  assert.equal(hash(bytes),digest,'RECOVERED_FILE_MISMATCH: '+name);
  files.set(name,bytes);
 }
 assert.equal(files.size,11,'RECOVERED_PACKAGE_INCOMPLETE');
 assert.equal(hash(files.get(entryName)),sourceHash);
 return files;
}

const availablePort=()=>new Promise((resolve,reject)=>{
 const s=net.createServer();s.once('error',reject);
 s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port))});
});

export async function contactCloudContact(source){
 const files=recoveredFiles(source),root=fs.mkdtempSync(path.join(os.tmpdir(),'jm-cp03-contact-'));
 const admin=crypto.randomBytes(32).toString('hex'),secret=crypto.randomBytes(32).toString('hex');
 const checks=[];let runner;
 const pass=(name,detail)=>checks.push({name,pass:true,...(detail===undefined?{}:{detail})});
 const copySource=home=>{
  const dir=path.join(home,'source');
  for(const [name,bytes] of files){const to=path.join(dir,name);fs.mkdirSync(path.dirname(to),{recursive:true,mode:0o700});fs.writeFileSync(to,bytes,{flag:'wx',mode:0o600})}
  return dir;
 };
 const environment=home=>({JM_CLOUD_ADMIN_TOKEN:admin,JM_CLOUD_SERVER_SECRET:secret,
  JM_CLOUD_MODE:'production',JM_CLOUD_ORIGINS:'https://jm-cp03.invalid',
  JM_CLOUD_DATA:path.join(home,'state',dataName),
  JM_CLOUD_PROFILE_DIR:path.join(home,'source'),
  JM_CLOUD_PROFILE_MANIFEST:path.join(home,'source','JM_CLOUD_PROFILE_MANIFEST_v0_5.json'),
  JM_CLOUD_RECEIPT_SIGNING_KEY:path.join(home,'state',keyName),
  JM_CLOUD_TURN_URLS:'',JM_CLOUD_TURN_SHARED_SECRET:''});
 const launch=async home=>{
  const port=await availablePort();
  runner=new JMNodeSupervisor({entry:path.join(home,'source',entryName),cwd:path.join(home,'source'),port,env:environment(home),timeoutMs:5000,maxRestarts:2});
  await runner.start();return 'http://127.0.0.1:'+port;
 };
 const request=async(base,route,authenticated=false)=>{
  const response=await fetch(base+route,{headers:authenticated?{Authorization:'Bearer '+admin}:{},redirect:'error',signal:AbortSignal.timeout(3000)});
  assert.equal(response.status,200,'CONTACT_HTTP_STATUS');return response.json();
 };
 const snapshot=async(base,home)=>{
  const spaces=await request(base,'/v5/spaces',true);
  assert.equal(spaces.spaces.length,1);
  const id=spaces.spaces[0].spaceId;
  return {space:(await request(base,'/v5/spaces/'+id,true)).space,
   receipt:(await request(base,'/v5/spaces/'+id+'/receipt',true)).receipt.receiptHash,
   key:(await request(base,'/receipt-key')).keyId,
   dataHash:hash(fs.readFileSync(path.join(home,'state',dataName)))};
 };
 try{
  pass('recovered_package_integrity',{files:files.size,manifestSha256:manifestHash,serverSha256:sourceHash});
  const home=path.join(root,'live');copySource(home);
  let base=await launch(home);
  assert.equal((await request(base,'/health')).version,'0.5.0');
  const ready=await request(base,'/ready');assert.equal(ready.ready,true);assert.equal(ready.profileCount,1);
  pass('genuine_server_ready',{version:'0.5.0',profiles:ready.profileCount,receiptSigning:ready.receiptSigning,turnConfigured:ready.turnConfigured});
  const qa=await execute(process.execPath,[path.join(home,'source',qaName)],{
   cwd:path.join(home,'source'),env:{...process.env,JM_TEST_BASE:base,JM_TEST_ADMIN:admin,JM_TEST_SECRET:secret},timeout:15000,maxBuffer:1024*1024});
  const result=JSON.parse(qa.stdout);
  assert.equal(result.failed,0,'INHERITED_QA_FAILURE');assert.equal(result.passed,27,'INHERITED_QA_COUNT');
  pass('inherited_server_api_profile_qa',{passed:result.passed,failed:result.failed,checks:result.checks.map(x=>({name:x.name,pass:x.pass}))});
  const before=await snapshot(base,home),oldPid=runner.status().pid;
  runner.child.kill('SIGKILL');
  const until=Date.now()+5000;
  while(Date.now()<until){if(runner.status().restarts===1&&runner.status().pid!==oldPid&&await runner.probe())break;await new Promise(r=>setTimeout(r,50))}
  assert.equal(runner.status().restarts,1);assert.notEqual(runner.status().pid,oldPid);assert.equal(await runner.probe(),true);
  assert.deepEqual(await snapshot(base,home),before);
  pass('unexpected_exit_restarted_with_exact_state_and_signing_identity');
  await runner.stop();assert.equal(runner.status().running,false);
  // Cold restart uses a new supervisor and the same private state directory.
  base=await launch(home);assert.deepEqual(await snapshot(base,home),before);
  pass('cold_supervisor_reentry_preserves_exact_state_and_signing_identity');
  await runner.stop();
  const stopped=JSON.parse(fs.readFileSync(path.join(home,'state',dataName)));
  assert.ok(Object.keys(stopped.spaces).length===1);
  const restored=path.join(root,'restored');copySource(restored);fs.mkdirSync(path.join(restored,'state'),{mode:0o700});
  for(const name of [dataName,keyName])fs.copyFileSync(path.join(home,'state',name),path.join(restored,'state',name));
  base=await launch(restored);assert.deepEqual(await snapshot(base,restored),before);
  pass('quiesced_copy_restoration_in_distinct_directory');
  await runner.stop();
  // No donor bytes are changed by this contact harness.
  const after=recoveredFiles(source);
  for(const [name,bytes] of files)assert.deepEqual(after.get(name),bytes);
  pass('recovered_source_unchanged');
  return {schema:'JM.OperatedHost.CloudContactLocalProof/1',checkpoint:'CP03',
   observedAt:new Date().toISOString(),node:process.version,platform:process.platform,
   harnessSha256:hash(fs.readFileSync(fileURLToPath(import.meta.url))),
   supervisorSha256:hash(fs.readFileSync(fileURLToPath(new URL('./supervisor.mjs',import.meta.url)))),
   scope:'RECOVERED_V0_5_0_GENUINE_SERVER_LOCAL_SUPERVISION',
   sourceAuthority:'Recovered frozen v0.5.0 bytes match standalone source and successor-package manifest; latest hosted v0.5.1 authority is not asserted.',
   parent:'dd8abf50a05d777df2384ad6aaa957b2208c677e',checks,passed:checks.length,failed:0,
   boundaries:['LOCAL_LOOPBACK_ONLY','DISPOSABLE_CREDENTIALS_AND_STATE','NO_PUBLIC_DEPLOYMENT',
    'NO_OWNER_DEVICE_OR_ACTUAL_WEBRTC_PROOF','NO_RENDER_SHUTDOWN_OR_PROVIDER_FAILOVER',
    'NO_DURABLE_REMOTE_OR_ENCRYPTED_BACKUP_SERVICE','NO_PRODUCTION_MIGRATION',
    'CP02_SOURCE_PROMOTION_REMAINS_OPEN','LATEST_HOSTED_SOURCE_NOT_RECONCILED']};
 }finally{
  if(runner)await runner.stop();
  fs.rmSync(root,{recursive:true,force:true});
 }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [source,evidence]=process.argv.slice(2);
 if(!source)throw Error('USAGE node cloud-contact-contact.mjs <recovered-package-directory> [evidence.json]');
 try{const proof=await contactCloudContact(source);
  if(evidence)fs.writeFileSync(evidence,JSON.stringify(proof,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify(proof,null,2));
 }catch(error){console.error(error.message);process.exitCode=1}
}
