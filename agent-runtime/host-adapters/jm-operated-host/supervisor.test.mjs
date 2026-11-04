import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {JMNodeSupervisor} from './supervisor.mjs';
const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'jm-supervisor-'));
const availablePort=()=>new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p))})});
const fixture="import http from 'node:http';const s=http.createServer((r,w)=>{if(r.url==='/die'){w.end('bye');setImmediate(()=>process.exit(41));return}w.setHeader('Content-Type','application/json');w.end(JSON.stringify({ok:true,scope:'JM_NODE_TEST'}))});s.listen(Number(process.env.PORT),'127.0.0.1');";
test('JM Node supervisor: native child server health, crash restart, shutdown',async()=>{
 const dir=temp(),file=path.join(dir,'server.mjs');fs.writeFileSync(file,fixture);const port=await availablePort();
 const runner=new JMNodeSupervisor({entry:file,cwd:dir,port,intervalMs:80,timeoutMs:3500,maxRestarts:2});
 try{
  const start=await runner.start();assert.ok(start.pid>0);assert.equal(await runner.probe(),true);
  await fetch('http://127.0.0.1:'+port+'/die').catch(()=>{});
  const until=Date.now()+3000;while(Date.now()<until&&(runner.status().restarts<1||!(await runner.probe())))await new Promise(r=>setTimeout(r,75));
  assert.equal(runner.status().restarts,1);assert.equal(await runner.probe(),true);
 }finally{await runner.stop();fs.rmSync(dir,{recursive:true,force:true})}
 assert.equal(runner.status().running,false);
});
test('JM Node supervisor refuses traversal, symlink and bad health path',async()=>{
 const dir=temp(),file=path.join(dir,'server.mjs');fs.writeFileSync(file,fixture);const port=await availablePort();
 try{
  assert.throws(()=>new JMNodeSupervisor({entry:file,cwd:path.join(dir,'other'),port}),/ENTRY_OUTSIDE_CWD/);
  const link=path.join(dir,'symlink.mjs');fs.symlinkSync(file,link);
  assert.throws(()=>new JMNodeSupervisor({entry:link,cwd:dir,port}),/UNSAFE_ENTRY_FILE/);
  assert.throws(()=>new JMNodeSupervisor({entry:file,cwd:dir,port,healthPath:'http://evil.test/'}),/INVALID_HEALTH_PATH/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
