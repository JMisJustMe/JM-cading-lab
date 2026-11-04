import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {deploy,rollback,inspect,createServer,verifyRelease} from './host.mjs';
const tmp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'jm-host-cp01-'));
test('deploy, HTTP, version return, persisted rollback, tamper and security responses',async()=>{
 const dir=tmp(),store=path.join(dir,'store'),src=path.join(dir,'src'),server=createServer(store);
 try{
  fs.mkdirSync(src);fs.writeFileSync(path.join(src,'index.html'),'<h1>JM v1</h1>');
  const a=deploy(store,'jm-cloud-contact',src);
  assert.equal(a.change,'DEPLOYED');assert.equal(deploy(store,'jm-cloud-contact',src).change,'UNCHANGED');
  assert.equal(inspect(store,'jm-cloud-contact').history.length,1);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
  assert.equal((await fetch(base+'/_jm/ready')).status,200);
  assert.match(await (await fetch(base+'/apps/jm-cloud-contact/')).text(),/JM v1/);
  assert.equal((await fetch(base+'/apps/jm-cloud-contact/')).headers.get('x-content-type-options'),'nosniff');
  assert.equal((await fetch(base+'/apps/jm-cloud-contact/',{method:'POST'})).status,405);
  assert.equal((await fetch(base+'/apps/jm-cloud-contact/%2e%2e%2fsecret')).status,400);
  assert.equal((await fetch(base+'/apps/jm-cloud-contact/no.html')).status,404);
  fs.writeFileSync(path.join(src,'index.html'),'<h1>JM v2</h1>');const b=deploy(store,'jm-cloud-contact',src);
  assert.notEqual(a.release,b.release);assert.match(await (await fetch(base+'/apps/jm-cloud-contact/')).text(),/JM v2/);
  assert.equal(rollback(store,'jm-cloud-contact').release,a.release);
  assert.match(await (await fetch(base+'/apps/jm-cloud-contact/')).text(),/JM v1/);
  assert.equal(inspect(store,'jm-cloud-contact').current,a.release);
  const target=path.join(store,'apps','jm-cloud-contact','releases',a.release,'site','index.html');fs.writeFileSync(target,'tampered');
  assert.equal((await fetch(base+'/apps/jm-cloud-contact/')).status,503);
  assert.throws(()=>verifyRelease(store,'jm-cloud-contact',a.release),/ASSET_TAMPER/);
 }finally{if(server.listening)await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true})}
});
test('source path and symlink guards, file limits, no ancestral rollback',()=>{
 const dir=tmp(),store=path.join(dir,'store'),src=path.join(dir,'src');
 try{
  fs.mkdirSync(src);fs.writeFileSync(path.join(src,'index.html'),'original');
  assert.throws(()=>deploy(store,'../escape',src),/INVALID_APP_NAME/);
  assert.throws(()=>rollback(store,'unknown'),/APP_NOT_DEPLOYED/);
  deploy(store,'demo',src);assert.throws(()=>rollback(store,'demo'),/NO_PRIOR_RELEASE/);
  fs.symlinkSync(path.join(src,'index.html'),path.join(src,'link.html'));
  assert.throws(()=>deploy(store,'bad',src),/SOURCE_SYMLINK_REFUSED/);
  fs.unlinkSync(path.join(src,'link.html'));
  fs.writeFileSync(path.join(src,'huge.bin'),Buffer.alloc(16*1024*1024+1));
  assert.throws(()=>deploy(store,'bad',src),/SOURCE_LIMIT/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
