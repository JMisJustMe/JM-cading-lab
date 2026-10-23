import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {CP16_SCHEMA,createTrustedEstateServer} from '../coding-estate/integration/m002-cp16-trusted-host.mjs';
import {makeCP16Fixture} from './fixtures/m002-cp16-provenance.mjs';
assert.equal(CP16_SCHEMA,'jm.m002.cp16.custody/1');
const f=makeCP16Fixture();
let service;
try{
 service=createTrustedEstateServer(f.config);
 const address=await service.listen(0);
 const base='http://127.0.0.1:'+address.port;
 const send=async(method,path,value)=>{
  const res=await fetch(base+path,{method,headers:{
   authorization:'Bearer '+f.config.bearer,
   ...(value?{'content-type':'application/json'}:{})},
   body:value?JSON.stringify(value):undefined});
  return {code:res.status,body:await res.json()};
 };
 const start=await send('GET','/v1/state');
 assert.equal(start.body.revision,0);
 const id=randomUUID();
 const input={operationId:id,expectedRevision:0,sourceIds:['alpha','beta'],
  question:'habit',top:3,request:f.request};
 const executed=await send('POST','/v1/execute',input);
 assert.equal(executed.code,201);
 const recovered=await send('GET','/v1/recover/'+id);
 assert.equal(recovered.code,200);
 assert.equal(recovered.body.sha256,executed.body.sha256);
 const retry=await send('POST','/v1/execute',input);
 assert.equal(retry.code,200);
 assert.equal(retry.body.sha256,executed.body.sha256);
 const stale=await send('POST','/v1/execute',{...input,operationId:randomUUID()});
 assert.equal(stale.code,409);
 const next={...input,operationId:randomUUID(),expectedRevision:1,request:{...f.request,choice:'protect'}};
 const second=await send('POST','/v1/execute',next);
 assert.equal(second.code,201);
 assert.equal(second.body.revision,2);
 const changed=await send('GET','/v1/recover/'+next.operationId);
 assert.equal(changed.code,200);
 const updated=JSON.parse(JSON.parse(changed.body.envelope.body).federationEnvelope.body).finalReceivers;
 assert.equal(updated.book.revision,2);
 await service.close();service=null;
 const intact=readFileSync(f.config.stateFile,'utf8');
 const tampered=JSON.parse(intact);
 tampered.raw=tampered.raw.replace('JM Krix','JM Ghost');
 writeFileSync(f.config.stateFile,JSON.stringify(tampered));
 assert.throws(()=>createTrustedEstateServer(f.config),/CP16_DISK_HMAC_HOLD/);
 writeFileSync(f.config.stateFile,intact);
 service=createTrustedEstateServer(f.config);
 assert.ok(service.boundary);
 await service.listen(0);
 console.log(JSON.stringify({status:'CP16_ORIGINAL_JM_LIVE_HTTP_PASS',revision:executed.body.revision}));
}finally{if(service)await service.close();f.dispose()}
