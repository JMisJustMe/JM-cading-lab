import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,readdirSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawn} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {createEstateReturnCloud} from '../unified-browser/jm-estate-return-cloud.mjs';
import {httpRequest} from '../unified-browser/jm-cloud-workspace-client.mjs';

let checks=0;
const ok=(v,label)=>{assert.ok(v,label);checks++};
const eq=(a,b,label)=>{assert.deepEqual(a,b,label);checks++};
const throws=(fn,regex)=>{assert.throws(fn,regex);checks++};
const rejects=async(fn,regex)=>{await assert.rejects(fn,regex);checks++};
const scratch=mkdtempSync(join(tmpdir(),'jm-m002-cp15-'));
const statePath=join(scratch,'workspace.json'),keyPath=join(scratch,'signer.pem');
const port=19000+Math.floor(Math.random()*3500);
const base='http://127.0.0.1:'+port;
let child=null;
async function start(){
 child=spawn(process.execPath,['tests/fixtures/m002-cp15-signed-workspace-fixture.mjs',
  statePath,keyPath,String(port)],{stdio:['ignore','pipe','pipe']});
 let stderr='';child.stderr.on('data',x=>{stderr+=x.toString()});
 for(let i=0;i<120;i++){
  if(child.exitCode!==null)throw Error('CP15_FIXTURE_EXITED:'+stderr.slice(0,200));
  try{if((await fetch(base+'/ready')).ok)return}catch{}
  await new Promise(r=>setTimeout(r,50));
 }
 throw Error('CP15_FIXTURE_TIMEOUT:'+stderr.slice(0,500));
}
async function stop(){
 if(!child)return;
 const c=child;child=null;
 await new Promise(resolve=>{c.once('exit',resolve);c.kill('SIGTERM');setTimeout(()=>{if(c.exitCode===null)c.kill('SIGKILL')},1000).unref()});
}
const checkpointRecords=[];
const rawSha=t=>createHash('sha256').update(t).digest('hex');
function largeOutput(){
 const body=JSON.stringify({schema:'jm.m002.cp14.return-body/1',
  ownerId:'SOURCE_PROTECTED_CREATIVE_OPERATOR',
  typeIds:['book','comic','cartoon','music','game','coding','runtime','os','language'],
  changes:Array.from({length:92},(_,i)=>({slot:i,actor:'JM Krix',
   state:'ENABLED_AT_CONTACT_'+i+' :: '+('independent-recipient-frame-'+i+'-').repeat(23)})),
  sourceAuthority:'SYNTHETIC_TEST_NOT_PRIVATE'});
 return {schema:'jm.m002.cp14.envelope/1',body,sha256:rawSha(body)};
}
const receipt={schema:'jm.m002.cp15.proof/1',status:'HOLD',checks:0,
 host:'SCOPED_LOCAL_FIXTURE_NOT_PRODUCTION_CLOUD',
 currentPhysicalDevice:'NOT_TESTED',publishedDeployment:'NOT_PERFORMED'};
try{
 await start();
 const request=httpRequest(base);
 const registration=await request('POST','/mesh/v1/auth/register','',{handle:'CP15_'+randomUUID().slice(0,9)});
 const token=registration.token;
 const pass='CP15 synthetic secret with a lengthy recovery phrase 2026';
 const original=largeOutput();
 const journalCopies=[];
 const sending=createEstateReturnCloud({request,token,onJournal:j=>journalCopies.push(j)});
 const staged=await sending.stage(original,pass);
 ok(staged.parts>=2,'MUST_HAVE_MULTIPLE_INDEPENDENT_PARTS');
 ok(staged.cipherSha256.length===64,'MISSING_ENCRYPTED_HASH');
 ok(!JSON.stringify(sending.journal()).includes('SOURCE_PROTECTED_CREATIVE_OPERATOR'),
  'PLAINTEXT_LEAKED_IN_JOURNAL');
 throws(()=>sending.stage(original,pass),/CP15_PENDING_TRANSFER_RECOVER_FIRST_HOLD/);
 const submitted=await sending.push(pass);
 eq(submitted.state,'CLOUD_SIGNED_AND_DECRYPTED_READBACK','NO_CLOUD_READBACK');
 eq(submitted.parts,staged.parts,'CHUNK_COUNT_DRIFT');
 ok(submitted.recovery.manifestCheckpoint.workspaceId.startsWith('ws_'),'MANIFEST_MISSING');
 const countBefore=Object.keys(JSON.parse(readFileSync(statePath,'utf8')).workspaces).length;
 const retried=await sending.push(pass);
 eq(retried.recovery.manifestCheckpoint.workspaceId,submitted.recovery.manifestCheckpoint.workspaceId,
  'RETRY_MINTED_NEW_MANIFEST');
 const countAfter=Object.keys(JSON.parse(readFileSync(statePath,'utf8')).workspaces).length;
 eq(countAfter,countBefore,'IDEMPOTENT_PUSH_CREATED_NEW_REMOTE_STATE');
 const secondary=createEstateReturnCloud({request,token});
 const fromLaptop=await secondary.pull(submitted.recovery,pass);
 eq(fromLaptop.value,original,'INDEPENDENT_CLIENT_STATE_DIFFERENCE');
 eq(fromLaptop.parts,staged.parts,'LAPTOP_REASSEMBLY_FAILED');
 eq(fromLaptop.state,'CLOUD_SIGNED_AND_DECRYPTED_READBACK','UNSIGNED_RETURN_CLAIM');
 await rejects(()=>secondary.pull(submitted.recovery,'the wrong but still sufficiently long phrase'),
  /CP15_DECRYPT_OR_KEY_HOLD/);
 const altered={...submitted.recovery,cipherSha256:'f'.repeat(64)};
 await rejects(()=>secondary.pull(altered,pass),/CP15_MANIFEST_SCOPE_HOLD/);
 const fake={...submitted.recovery,transferId:randomUUID()};
 await rejects(()=>secondary.pull(fake,pass),/CP15_MANIFEST_SCOPE_HOLD/);
 await rejects(()=>secondary.pull(submitted.recovery,'short'),/CP15_PASSPHRASE_LENGTH_HOLD/);
 throws(()=>createEstateReturnCloud({request,token:'fake'}),/CP15_SCOPED_CREDENTIAL_HOLD/);
 const snapshot=JSON.stringify(original);
 eq(snapshot,JSON.stringify(original),'IMMUTABLE_SOURCE_CHANGED');
 const bundlePath=join(scratch,'private-recovery.json');
 writeFileSync(bundlePath,JSON.stringify({schema:'jm.m002.cp15.owner-import/1',
  credential:token,recovery:submitted.recovery},null,2),{mode:0o600});
 const reopened=JSON.parse(readFileSync(bundlePath,'utf8'));
 await stop();await start();
 const third=createEstateReturnCloud({request:httpRequest(base),token:reopened.credential});
 const restartBack=await third.pull(reopened.recovery,pass);
 eq(restartBack.value,original,'SERVER_RESTART_LOST_STATE');
 receipt.cases=['encrypted-client-side','sharded-transfer','original JM cloud signed receipts',
  'independent second client','disk-backed HTTP process restart','wrong passphrase',
  'no credential persistence in module','idempotent cloud push',
  'changed manifests rejected','full original result readback'];
 // Simulate one genuine lost network response AFTER a remote mutation.
 let missed=false,partial=null;
 const losing=async(...args)=>{
  const result=await httpRequest(base)(...args);
  if(!missed&&args[0]==='POST'&&String(args[1]).endsWith('/save')){
   missed=true;throw Error('CP15_SIMULATED_LOST_RESPONSE');
  }
  return result;
 };
 const contender=createEstateReturnCloud({request:losing,token,onJournal:j=>{partial=j}});
 const other={schema:'jm.estate.operator.local-return/0.2',mode:'estate-fabric',
  input:'source = persisted.✓',summary:'A source-qualified native JM operator receipt'};
 await contender.stage(other,pass);
 await rejects(()=>contender.push(pass),/CP15_SIMULATED_LOST_RESPONSE/);
 ok(partial?.parts[0]?.checkpoint?.state==='SAVE_PENDING','NO_PENDING_EARLY_JOURNAL');
 // Recover response without replaying the target write.
 const resumed=createEstateReturnCloud({request:httpRequest(base),token,journal:partial,onJournal:j=>partial=j});
 const pendingResult=await resumed.push(pass);
 eq(pendingResult.state,'CLOUD_SIGNED_AND_DECRYPTED_READBACK','INTERRUPTED_WRITE_CANNOT_RESUME');
 eq((await third.pull(pendingResult.recovery,pass)).value,other,
  'SECOND_INDEPENDENT_PENDING_RECOVERY_FAILED');
 receipt.cases.push('lost-response-recovery-without-duplicate-write');
 // Check that changed bytes on provider storage are refused by original client,
 // even if the manifest pointers still exist and signer key is unchanged.
 await stop();
 const changed=JSON.parse(readFileSync(statePath,'utf8'));
 const chunkId=JSON.parse(readFileSync(bundlePath,'utf8')).recovery;
 const chunks=Object.values(changed.workspaces).filter(x=>x.content?.intent?.startsWith('JM.CP15.CIPHER.CHUNK/1:'));
 ok(chunks.length>=staged.parts,'NO_STORED_CIPHERTEXT_CHUNKS');
 chunks[0].content.intent+='X';
 writeFileSync(statePath,JSON.stringify(changed));
 await start();
 await rejects(()=>third.pull(chunkId,pass),/TARGET_STATE_CHANGED|TARGET_RECEIPT_MISMATCH|CLOUD_TRACE_MISMATCH|CP15_REMOTE_CIPHER_DRIFT/,
  'CORRUPTED_REMOTE_BYTES_MUST_HOLD');
 receipt.cases.push('provider-file-content-corruption-rejected');
 receipt.checks=checks;receipt.status='SCOPED_SIGNED_ENCRYPTED_HTTP_RETURN_PASS';
 console.log(JSON.stringify({schema:receipt.schema,status:receipt.status,checks:receipt.checks,
  chunks:staged.parts,independentClients:3,realHttp:true,processRestart:true,
  provider:'ISOLATED_PROTOCOL_FIXTURE',signed:'ECDSA_P256_REAL_CRYPTO',
  originalJMCloudClient:true,release:'HOLD',physicalDevice:'HOLD'}));
}finally{await stop();rmSync(scratch,{recursive:true,force:true})}
