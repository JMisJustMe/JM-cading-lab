import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {JMDurableSpool,JMDurableNetwork} from './jm-durable-spool.mjs';
const cases=[];
async function check(name,fn){try{await fn();cases.push({name,pass:true});}catch(e){cases.push({name,pass:false,error:e.message});}}
const fixture=(id,channel='mail',role='owner',validated=true,message='JM sandbox')=>({id,channel,role,validated,message});
const root=await fs.mkdtemp(path.join(os.tmpdir(),'jm-cp02-'));
try{
 const sys=new JMDurableNetwork(root);
 await check('01 prepare a guarded private spool',async()=>assert.equal(await sys.spool.prepare(),root));
 await check('02 local permission mode is private',async()=>assert.equal((await fs.stat(root)).mode&0o077,0));
 await check('03 native mail message persists',async()=>{
   const r=await sys.accept(fixture('mail_001'));assert.equal(r.result,'queued');assert.equal(r.persisted,true);
 });
 await check('04 native device message persists',async()=>assert.equal((await sys.accept(fixture('device_001','device'))).persisted,true));
 await check('05 native storage message persists',async()=>assert.equal((await sys.accept(fixture('storage_001','storage'))).persisted,true));
 await check('06 spool lists three cold records',async()=>assert.equal((await sys.spool.recover()).records.length,3));
 await check('07 persisted receipts identify local boundary',async()=>{
   const {records}=await sys.spool.recover();assert.equal(records[0].receipt.deliveryScope,'SANDBOX_LOCAL_MEMORY_ONLY');
 });
 await check('08 cold-new-instance recovers same records',async()=>assert.equal((await new JMDurableSpool(root).recover()).records.length,3));
 await check('09 independent node process sees disk records',async()=>{
   const probe=path.join(import.meta.dirname,'cold-process-probe.mjs');
   const child=spawnSync(process.execPath,[probe,root],{encoding:'utf8'});
   assert.equal(child.status,0,child.stderr);
   const found=JSON.parse(child.stdout);assert.equal(found.count,3);assert.equal(found.scope,'LOCAL_DISK_ONLY');
 });
 await check('10 durable duplicate refused after restart',async()=>{
   const newProcess=new JMDurableNetwork(root);
   const r=await newProcess.accept(fixture('mail_001'));assert.equal(r.result,'denied');assert.equal(r.reason,'DUPLICATE_DURABLE_ID');
 });
 await check('11 duplicate leaves original record untouched',async()=>assert.equal((await sys.spool.recover()).records.length,3));
 await check('12 guest never makes disk record',async()=>{
   const r=await sys.accept(fixture('guest_001','mail','guest'));assert.equal(r.persisted,false);assert.equal(await sys.spool.has('guest_001'),false);
 });
 await check('13 unvalidated fixture never writes',async()=>{
   const r=await sys.accept(fixture('badval_001','device','owner',false));assert.equal(r.persisted,false);assert.equal(await sys.spool.has('badval_001'),false);
 });
 await check('14 disk body matches original fixture',async()=>{
   const found=(await sys.spool.recover()).records.find(x=>x.id==='mail_001');assert.equal(found.body,'JM sandbox');
 });
 await check('15 payload may contain punctuation',async()=>{
   const r=await sys.accept(fixture('punct_001','mail','owner',true,'a:b;c! @--'));assert.equal(r.persisted,true);
 });
 await check('16 record contains cryptographic content checksum',async()=>{
   const raw=JSON.parse(await fs.readFile(path.join(root,'mail_001.jmq'),'utf8'));assert.match(raw.sha256,/^[a-f0-9]{64}$/);
 });
 await check('17 file persisted with restrictive permissions',async()=>assert.equal((await fs.stat(path.join(root,'mail_001.jmq'))).mode&0o077,0));
 await check('18 invalid id cannot form a file path',async()=>await assert.rejects(sys.spool.has('../escape')));
 await check('19 receipt and entry mismatch rejected',async()=>await assert.rejects(sys.spool.persist({id:'wrong_001',channel:'mail',payload:'x',carrier:'local-memory-queue'},{id:'wrong_002',channel:'mail',result:'queued'})));
 await check('20 direct double persist rejected atomically',async()=>{
   const entry={id:'mail_001',channel:'mail',payload:'JM sandbox',carrier:'local-memory-queue'};
   await assert.rejects(sys.spool.persist(entry,{id:'mail_001',channel:'mail',result:'queued'}),{code:'DUPLICATE_DURABLE_ID'});
 });
 await check('21 partial transaction is reported',async()=>{
   await fs.writeFile(path.join(root,'.interrupted.partial'),'crash',{mode:0o600});
   assert.equal((await sys.spool.recover()).orphanPartials,1);
 });
 await check('22 leftover partial does not masquerade as delivered',async()=>assert.equal((await sys.spool.recover()).records.some(x=>x.id==='interrupted'),false));
 await check('23 tampered disk content rejected on recovery',async()=>{
   const f=path.join(root,'mail_001.jmq');const original=await fs.readFile(f,'utf8');
   await fs.writeFile(f,original.replace('JM sandbox','not the same'));
   try{await assert.rejects(sys.spool.recover(),{code:'CORRUPT_SPOOL'});}
   finally{await fs.writeFile(f,original);}
 });
 await check('24 recovered record intact after restoration',async()=>assert.ok((await sys.spool.recover()).records.some(x=>x.id==='mail_001')));
 await check('25 malformed JSON rejected',async()=>{
   const f=path.join(root,'mail_001.jmq'),original=await fs.readFile(f,'utf8');
   await fs.writeFile(f,'{');
   try{await assert.rejects(sys.spool.recover(),{code:'CORRUPT_SPOOL'});}
   finally{await fs.writeFile(f,original);}
 });
 await check('26 parallel writers permit at most one durable ID',async()=>{
   const a=new JMDurableNetwork(root),b=new JMDurableNetwork(root);
   const results=await Promise.all([a.accept(fixture('race_001')),b.accept(fixture('race_001'))]);
   assert.equal(results.filter(x=>x.persisted===true).length,1);
   assert.equal((await sys.spool.recover()).records.filter(x=>x.id==='race_001').length,1);
 });
 await check('27 no external network involved',async()=>assert.equal((await sys.spool.recover()).scope,'LOCAL_DISK_ONLY'));
 await check('28 process contact remains after independent restart',async()=>{
   const child=spawnSync(process.execPath,[path.join(import.meta.dirname,'cold-process-probe.mjs'),root],{encoding:'utf8'});
   assert.equal(child.status,0);assert.ok(JSON.parse(child.stdout).ids.includes('race_001'));
 });
 await check('29 refuse insecure directory mode',async()=>{
   const insecure=await fs.mkdtemp(path.join(os.tmpdir(),'jm-insecure-'));
   try{await fs.chmod(insecure,0o755);await assert.rejects(new JMDurableSpool(insecure).prepare(),{code:'PERMISSIONS_TOO_BROAD'});}
   finally{await fs.rm(insecure,{recursive:true,force:true});}
 });
 await check('30 refuse symlink spool root',async()=>{
   const link=root+'-link';
   await fs.symlink(root,link);
   try{await assert.rejects(new JMDurableSpool(link).prepare(),{code:'UNSAFE_SPOOL_DIRECTORY'});}
   finally{await fs.unlink(link);}
 });
}finally{await fs.rm(root,{recursive:true,force:true});}
const failures=cases.filter(x=>!x.pass);
console.log(JSON.stringify({schema:'JM.NetworkCP02.PersistenceTests/1',total:cases.length,passed:cases.length-failures.length,failed:failures.length,cases},null,2));
if(failures.length)process.exitCode=1;
