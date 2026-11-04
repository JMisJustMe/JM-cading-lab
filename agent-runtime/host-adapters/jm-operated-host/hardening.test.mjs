import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import {deploy,inspect} from './host.mjs';
import {JMNodeSupervisor} from './supervisor.mjs';
test('store ancestor symlink is refused on deploy and persisted readback',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jm-host-hardening-'));
 try{const src=path.join(dir,'src'),store=path.join(dir,'store');fs.mkdirSync(src);fs.writeFileSync(path.join(src,'index.html'),'JM');deploy(store,'demo',src);
  fs.renameSync(path.join(store,'apps'),path.join(dir,'outside'));fs.symlinkSync(path.join(dir,'outside'),path.join(store,'apps'));
  assert.throws(()=>inspect(store,'demo'),/UNSAFE_STORE_PATH/);
  assert.throws(()=>deploy(store,'demo',src),/UNSAFE_STORE_PATH/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('supervisor refuses readiness from an already occupied unrelated port',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jm-supervisor-hardening-'));const entry=path.join(dir,'idle.mjs');fs.writeFileSync(entry,'setInterval(()=>{},1000)');
 const unrelated=http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.end('{"ok":true,"ready":true}')});await new Promise(r=>unrelated.listen(0,'127.0.0.1',r));
 const runner=new JMNodeSupervisor({entry,cwd:dir,port:unrelated.address().port,maxRestarts:0,timeoutMs:500});
 try{await assert.rejects(runner.start(),/SERVICE_PORT_OCCUPIED/);assert.equal(runner.status().running,false)}finally{await runner.stop();await new Promise(r=>unrelated.close(r));fs.rmSync(dir,{recursive:true,force:true})}
});
test('supervisor rejects invalid timeout and prevents overlapping starts',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jm-supervisor-hardening-'));const entry=path.join(dir,'idle.mjs');fs.writeFileSync(entry,'setInterval(()=>{},1000)');
 const portServer=net.createServer();await new Promise(r=>portServer.listen(0,'127.0.0.1',r));const port=portServer.address().port;await new Promise(r=>portServer.close(r));
 const opts={entry,cwd:dir,port,maxRestarts:0,timeoutMs:100};const runner=new JMNodeSupervisor(opts);
 try{for(const timeoutMs of [NaN,Infinity,-1,0,1.5])assert.throws(()=>new JMNodeSupervisor({...opts,timeoutMs}),/INVALID_PROBE_TIMEOUT/);
  const first=runner.start();await assert.rejects(runner.start(),/ALREADY_STARTED/);await assert.rejects(first,/SUPERVISED_READINESS_HOLD/);
 }finally{await runner.stop();fs.rmSync(dir,{recursive:true,force:true})}
});
test('raw hostile HTTP paths fail closed without disclosing filesystem details',async()=>{
 const {createServer}=await import('./host.mjs');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jm-http-hardening-'));const server=createServer(dir);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const request=raw=>new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port:server.address().port,path:raw},res=>{let body='';res.on('data',x=>body+=x);res.on('end',()=>resolve({status:res.statusCode,body}))});req.on('error',reject);req.end()});
 try{for(const raw of ['/apps/demo/../secret','/apps/demo/%2e%2e/secret','/apps/demo/%2Fsecret','/apps/demo/%5csecret','/apps/demo/%00secret','/apps/demo/%zz','/apps/demo//secret']){const r=await request(raw);assert.equal(r.status,400,raw);assert.ok(!r.body.includes(dir))}
 }finally{await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true})}
});
test('deployment refuses a private store nested inside its public source',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jm-source-hardening-'));fs.writeFileSync(path.join(dir,'index.html'),'JM');
 try{assert.throws(()=>deploy(path.join(dir,'private-store'),'demo',dir),/SOURCE_STORE_OVERLAP/)}finally{fs.rmSync(dir,{recursive:true,force:true})}
});
