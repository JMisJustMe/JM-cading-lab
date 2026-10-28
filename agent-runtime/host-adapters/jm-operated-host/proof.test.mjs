import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {JMNodeSupervisor} from './supervisor.mjs';
const fixture = "import http from 'node:http';http.createServer((req,res)=>{if(req.url==='/die'){res.end('bye');setImmediate(()=>process.exit(41));return}res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:true,scope:'JM_NODE_TEST',...(process.env.JM_SUPERVISOR_PROOF?{supervisorProof:process.env.JM_SUPERVISOR_PROOF}:{})}))}).listen(Number(process.env.PORT),'127.0.0.1');";
const port=()=>new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p))})});
const setup=async()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jm-cp04-'));const entry=path.join(dir,'server.mjs');fs.writeFileSync(entry,fixture);return {dir,entry,port:await port()}};
const cleanup=async(r,dir)=>{await r?.stop();fs.rmSync(dir,{recursive:true,force:true})};
test('CP04: opt-in proof succeeds and rotates across crash restart',async()=>{
 const {dir,entry,port:p}=await setup();const r=new JMNodeSupervisor({entry,cwd:dir,port:p,readinessProof:true,intervalMs:80,timeoutMs:3500,maxRestarts:2});
 try{const first=await r.start();assert.equal(first.ok,true);assert.equal(await r.probe(),true);
  const old=r._proofToken;assert.match(old,/^[a-f0-9]{48}$/);assert.ok(!JSON.stringify(r.status()).includes(old));
  await fetch('http://127.0.0.1:'+p+'/die').catch(()=>{});
  const until=Date.now()+3000;while(Date.now()<until&&(r.status().restarts<1||!(await r.probe())))await new Promise(r=>setTimeout(r,75));
  assert.equal(r.status().restarts,1);assert.equal(await r.probe(),true);assert.notEqual(r._proofToken,old);
 }finally{await cleanup(r,dir)}
 assert.equal(r._proofToken,null);
});
test('CP04: supervisor-generated proof overrides caller-injected value',async()=>{
 const {dir,entry,port:p}=await setup();const r=new JMNodeSupervisor({entry,cwd:dir,port:p,readinessProof:true,env:{JM_SUPERVISOR_PROOF:'injected'},timeoutMs:3500,maxRestarts:0});
 try{await r.start();assert.notEqual(r._proofToken,'injected');assert.equal(await r.probe(),true)}finally{await cleanup(r,dir)}
});
test('CP04: uncooperative existing service holds only when proof is requested',async()=>{
 const {dir,entry,port:p}=await setup();const r=new JMNodeSupervisor({entry,cwd:dir,port:p,readinessProof:true,timeoutMs:500,maxRestarts:0});
 try{
  fs.writeFileSync(entry,"import http from 'node:http';http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:true,scope:'JM_NODE_TEST'}))}).listen(Number(process.env.PORT),'127.0.0.1');");
  await assert.rejects(r.start(),/SUPERVISED_READINESS_HOLD/);assert.equal(r.status().running,false);
 }finally{await cleanup(r,dir)}
});
test('CP04: wrong fixed proof is rejected despite otherwise healthy JSON',async()=>{
 const {dir,entry,port:p}=await setup();const r=new JMNodeSupervisor({entry,cwd:dir,port:p,readinessProof:true,timeoutMs:550,maxRestarts:0});
 try{
  fs.writeFileSync(entry,"import http from 'node:http';http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:true,scope:'JM_NODE_TEST',supervisorProof:'forged'}))}).listen(Number(process.env.PORT),'127.0.0.1');");
  await assert.rejects(r.start(),/SUPERVISED_READINESS_HOLD/);assert.equal(r.status().running,false);
 }finally{await cleanup(r,dir)}
});
test('CP04: default mode keeps original readiness behavior',async()=>{
 const {dir,entry,port:p}=await setup();const r=new JMNodeSupervisor({entry,cwd:dir,port:p,timeoutMs:3500,maxRestarts:0});
 try{const result=await r.start();assert.equal(result.ok,true);assert.equal(await r.probe(),true);assert.equal(r._proofToken,null)}finally{await cleanup(r,dir)}
});
test('CP04: invalid proof mode refused before spawning',async()=>{
 const {dir,entry,port:p}=await setup();try{for(const v of ['true',1,null,{}])assert.throws(()=>new JMNodeSupervisor({entry,cwd:dir,port:p,readinessProof:v}),/INVALID_READINESS_PROOF_MODE/)}finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('CP03 ancestry: same instance retries occupied port with proof mode',async()=>{
 const {dir,entry,port:p}=await setup();const blocker=net.createServer();await new Promise(r=>blocker.listen(p,'127.0.0.1',r));const r=new JMNodeSupervisor({entry,cwd:dir,port:p,readinessProof:true,timeoutMs:3500,maxRestarts:0});
 try{await assert.rejects(r.start(),/SERVICE_PORT_OCCUPIED/);await new Promise(r=>blocker.close(r));assert.equal((await r.start()).ok,true);assert.equal(await r.probe(),true)}finally{await cleanup(r,dir);if(blocker.listening)await new Promise(r=>blocker.close(r))}
});
