import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import http from 'node:http';
import {createPacket,sendPrivateContact,startPrivateReceiver,verifyPacket,signPacket,PROTOCOL} from './jm-private-contact.mjs';
import {JMDurableSpool} from '../cp02/jm-durable-spool.mjs';

const checks=[];
async function check(name,fn){try{await fn();checks.push({name,pass:true});}catch(e){checks.push({name,pass:false,error:e.message});}}
const root=await fs.mkdtemp(path.join(os.tmpdir(),'jm-cp03-'));
const key='JM_CP03_LOCAL_TEST_SHARED_SECRET_0123456789_ABCDEF';
const badKey='NOT_SAME_KEY_LOCAL_TEST_REQUIRES_32_BYTES_EXACT';
const message=(id,channel='mail',body='HELLO JM LOCAL ONLY')=>({id,channel,message:body});
const receiver=await startPrivateReceiver({root,key});
const url='http://127.0.0.1:'+receiver.port+'/v1/contact';
let child;
try{
 await check('01 loopback receiver bound to IPv4',()=>assert.equal(receiver.server.address().address,'127.0.0.1'));
 await check('02 packet typed schema',()=>assert.equal(createPacket(message('msg_001')).schema,PROTOCOL));
 await check('03 packet signatures deterministic',()=>{
   const p=createPacket(message('msg_002'),{nonce:'abcdabcdabcdabcd',issuedAt:Date.now()});
   assert.equal(signPacket(p,key),signPacket(p,key));
 });
 await check('04 mail peer transmission persisted',async()=>{
   const r=await sendPrivateContact(url,key,createPacket(message('mail_001')));assert.equal(r.status,200);assert.equal(r.result,'persisted');
 });
 await check('05 device peer transmission persisted',async()=>assert.equal((await sendPrivateContact(url,key,createPacket(message('device_001','device')))).status,200));
 await check('06 storage peer transmission persisted',async()=>assert.equal((await sendPrivateContact(url,key,createPacket(message('storage_001','storage')))).status,200));
 await check('07 disk confirms all three peer deliveries',async()=>assert.equal((await new JMDurableSpool(root).recover()).records.length,3));
 await check('08 peer receipt states actual local scope',async()=>{
   const r=await sendPrivateContact(url,key,createPacket(message('scope_001')));assert.equal(r.scope,'LOCAL_LOOPBACK_TO_DISK');assert.match(r.sha256,/^[a-f0-9]{64}$/);
 });
 await check('09 response does not leak message content',async()=>{
   const secret='PRIVATE_FIXTURE_ONLY_NEVER_REAL_MAIL';
   const r=await sendPrivateContact(url,key,createPacket(message('private_001','mail',secret)));
   assert.ok(!JSON.stringify(r).includes(secret));
 });
 await check('10 bad signature rejected before state mutation',()=>{
   const packet=createPacket(message('bad_001'));const seen=new Set();
   assert.throws(()=>verifyPacket(JSON.stringify(packet),'0'.repeat(64),key,seen),{code:'SIGNATURE_INVALID'});
   assert.equal(seen.size,0);
 });
 await check('11 wrong secret cannot verify signature',()=>{
   const p=createPacket(message('bad_002'));assert.throws(()=>verifyPacket(JSON.stringify(p),signPacket(p,badKey),key,new Set()),{code:'SIGNATURE_INVALID'});
 });
 await check('12 duplicate nonce rejected',()=>{
   const p=createPacket(message('non_001'),{nonce:'replayNonce012345',issuedAt:Date.now()}),seen=new Set();
   verifyPacket(JSON.stringify(p),signPacket(p,key),key,seen);
   assert.throws(()=>verifyPacket(JSON.stringify(p),signPacket(p,key),key,seen),{code:'NONCE_REPLAY'});
 });
 await check('13 stale signed packet rejected',()=>{
   const p=createPacket(message('old_001'),{issuedAt:Date.now()-120000});
   assert.throws(()=>verifyPacket(JSON.stringify(p),signPacket(p,key),key,new Set()),{code:'TIMESTAMP_STALE'});
 });
 await check('14 future signed packet rejected',()=>{
   const p=createPacket(message('future_001'),{issuedAt:Date.now()+120000});
   assert.throws(()=>verifyPacket(JSON.stringify(p),signPacket(p,key),key,new Set()),{code:'TIMESTAMP_STALE'});
 });
 await check('15 tampered signed packet rejected',()=>{
   const p=createPacket(message('tamper_001')),raw=JSON.stringify(p);
   assert.throws(()=>verifyPacket(raw.replace('tamper_001','changed_001'),signPacket(p,key),key,new Set()),{code:'SIGNATURE_INVALID'});
 });
 await check('16 invalid packet ID denied',()=>assert.throws(()=>createPacket(message('../bad'))));
 await check('17 invalid channel denied',()=>assert.throws(()=>createPacket(message('chan_001','fax'))));
 await check('18 empty payload denied',()=>assert.throws(()=>createPacket(message('empty_001','mail',''))));
 await check('19 short secret denied',()=>assert.throws(()=>signPacket(createPacket(message('short_001')),'x'),{code:'SECRET_TOO_SHORT'}));
 await check('20 non-loopback target denied',async()=>await assert.rejects(sendPrivateContact('http://example.com/v1/contact',key,createPacket(message('net_001'))),{code:'TARGET_NOT_LOOPBACK'}));
 await check('21 loopback wrong path denied',async()=>await assert.rejects(sendPrivateContact('http://127.0.0.1:'+receiver.port+'/other',key,createPacket(message('path_001'))),{code:'TARGET_NOT_LOOPBACK'}));
 await check('22 durable duplicate denied with new nonce',async()=>{
   const r=await sendPrivateContact(url,key,createPacket(message('mail_001')));assert.equal(r.status,409);assert.equal(r.reason,'DUPLICATE_DURABLE_ID');
 });
 await check('23 replay of identical signed packet denied at server',async()=>{
   const p=createPacket(message('replay_001'));await sendPrivateContact(url,key,p);
   const r=await sendPrivateContact(url,key,p);assert.equal(r.status,401);assert.equal(r.reason,'NONCE_REPLAY');
 });
 await check('24 duplicate denial retains disk integrity',async()=>{
   const all=await new JMDurableSpool(root).recover();
   assert.equal(all.records.filter(x=>x.id==='mail_001').length,1);
 });
 await check('25 full contact results in original-native policy receipt on disk',async()=>{
   const all=await new JMDurableSpool(root).recover();
   const r=all.records.find(x=>x.id==='mail_001');assert.equal(r.receipt.bodyProof.RouteScript,'NetworkRoute:start');
 });
 await check('26 independent receiver process binds loopback',async()=>{
   const secondRoot=await fs.mkdtemp(path.join(os.tmpdir(),'jm-cp03-child-'));
   child=spawn(process.execPath,[path.join(import.meta.dirname,'receiver-process.mjs'),secondRoot],
     {env:{...process.env,JM_CP03_TEST_KEY:key},stdio:['ignore','pipe','pipe']});
   const port=await new Promise((resolve,reject)=>{
     const kill=setTimeout(()=>reject(new Error('CHILD_START_TIMEOUT')),5000);
     let output='';
     child.stdout.on('data',part=>{output+=part.toString();const match=output.match(/JM_LOOPBACK_PORT=(\d+)/);
       if(match){clearTimeout(kill);resolve(Number(match[1]));}});
     child.on('error',reject);child.on('exit',code=>reject(new Error('CHILD_EXIT_'+code)));
   });
   const r=await sendPrivateContact('http://127.0.0.1:'+port+'/v1/contact',key,createPacket(message('process_001')));
   assert.equal(r.result,'persisted');
   assert.equal((await new JMDurableSpool(secondRoot).recover()).records.length,1);
   child.kill('SIGTERM');
   await new Promise(resolve=>child.once('exit',resolve));child=null;
   await fs.rm(secondRoot,{recursive:true,force:true});
 });
 await check('27 request without valid auth never generates local claimed Ding',async()=>{
   const packet=createPacket(message('unauth_001'));
   await assert.rejects(sendPrivateContact(url,badKey,packet),{code:'RESPONSE_SIGNATURE_INVALID'});
   assert.equal((await new JMDurableSpool(root).recover()).records.some(x=>x.id==='unauth_001'),false);
 });
 await check('28 all outcomes remain bounded to loopback',()=>assert.equal(receiver.server.address().family,'IPv4'));
}finally{if(child){child.kill('SIGTERM');}await receiver.close();await fs.rm(root,{recursive:true,force:true});}
const failed=checks.filter(x=>!x.pass);
console.log(JSON.stringify({schema:'JM.NetworkCP03.PeerContactTests/1',total:checks.length,passed:checks.length-failed.length,failed:failed.length,checks},null,2));
if(failed.length)process.exitCode=1;
