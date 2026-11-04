import assert from 'node:assert/strict';
import {handleJMApi, jmOpenApi, JM_API_BASE} from '../jm-api/core.mjs';
import {onRequest} from '../functions/api/jm/[[path]].js';
const base='https://jmisjustme-estate.pages.dev';
const url=(p)=>base+JM_API_BASE+p;
const r=(p,method='GET',body,headers={})=>new Request(url(p),{method,headers,...(body==null?{}:{body})});
let n=0;
async function check(name,task){await task();n++;console.log('PASS',name)}
const receive=async req=>{const res=await onRequest({request:req});return {status:res.status,headers:res.headers,body:await res.json()}};

await check('original 7 independently identified API bodies',async()=>{
  const {body}=await receive(r('/services'));
  assert.deepEqual(body.services.map(x=>x.id),['build-mesh','workshop','live-experience','cloud-contact','owner-vault','ailatheo','phone-commander']);
  assert(body.services.every(x=>x.observedNowByThisApi===false));
  assert.equal(body.services.find(x=>x.id==='phone-commander').endpoint,null);
});
await check('historical API entries never crowned current',async()=>{
 const {body}=await receive(r('/lineage'));
 assert.deepEqual(body.historical.map(x=>x.id),['jm-studios-api','shims-reading-backend','sovereign-agent-gateway']);
 assert(body.historical.every(x=>x.publicRoute===null&&x.state.includes('UNVERIFIED')));
});
await check('9 plans contact their actual independent services',async()=>{
 const expected={discover:'build-mesh',recover:'build-mesh',compose:'workshop',test:'workshop',admit:'live-experience',workspace:'cloud-contact',vault:'owner-vault',entitlement:'ailatheo',phone:'phone-commander'};
 for(const [operation,service] of Object.entries(expected)){
  const {body,status}=await receive(r('/plan','POST',JSON.stringify({operation}),{'content-type':'application/json'}));
  assert.equal(status,200);assert.equal(body.contact.id,service);assert.equal(body.state,'PLAN_ONLY');
  assert.equal(body.proof.ownerCredentialForwarded,false);assert.equal(body.proof.remoteToolExecuted,false);
 }
});
await check('OpenAPI has 9 valid contact plan operations and one fixed readiness endpoint',async()=>{
 const v=jmOpenApi(base);assert.equal(v.info.version,'1.1.0');
 assert.equal(v.paths[JM_API_BASE+'/contact/cloud-contact/ready'].get.summary.includes('Fixed'),true);
 assert.equal(v.paths[JM_API_BASE+'/plan'].post.requestBody.content['application/json'].schema.properties.operation.enum.length,9);
});
await check('Pages and portable core match',async()=>{
 const x=await onRequest({request:r('/lineage')}),y=await handleJMApi(r('/lineage')); assert.deepEqual(await x.json(),await y.json());
});
await check('public probe uses one fixed origin and never forwards auth, cookies, body',async()=>{
 let count=0;const mock=async (u,o)=>{count++;assert.equal(u,'https://jm-cloud-contact-server-v05.onrender.com/ready');
  assert.equal(o.method,'GET');assert.equal(o.redirect,'manual');assert.deepEqual(o.headers,{accept:'application/json'});
  assert.equal(o.body,undefined);assert.equal(o.headers.authorization,undefined);return {status:200}};
 const req=r('/contact/cloud-contact/ready','GET',undefined,{authorization:'Bearer SECRET',cookie:'abc=1'});
 const resp=await handleJMApi(req,{fetchImpl:mock}); const json=await resp.json();
 assert.equal(count,1);assert.equal(resp.status,200);assert.equal(json.state,'READY_HTTP_RESPONSE');assert.equal(json.credentialsForwarded,false);
});
await check('upstream redirect is rejected without following location',async()=>{
 const z=await handleJMApi(r('/contact/cloud-contact/ready'),{fetchImpl:async()=>({status:302})});assert.equal(z.status,502);assert.equal((await z.json()).state,'REDIRECT_REJECTED');
});
await check('upstream timeout and network errors fail closed',async()=>{
 const z=await handleJMApi(r('/contact/cloud-contact/ready'),{fetchImpl:async()=>{throw Error('private target error')}});
 assert.equal(z.status,502);assert.equal((await z.json()).state,'CONTACT_UNAVAILABLE');
});
await check('upstream status only, never copies JSON body',async()=>{
 const z=await handleJMApi(r('/contact/cloud-contact/ready'),{fetchImpl:async()=>({status:503,json:()=>({secret:'DONT_ECHO'})})});
 assert.equal(z.status,502);assert.equal(JSON.stringify(await z.json()).includes('DONT_ECHO'),false);
});
await check('arbitrary proxy targets remain forbidden',async()=>{
 for(const path of ['/contact/owner-vault/ready','/contact/https:/evil.example/','/proxy','/admin','/services/build-mesh']){
 const x=await receive(r(path));assert.equal(x.status,404);
 }
});
await check('no mutations beyond nonexecuting plan',async()=>{
 for(const p of ['/contact/cloud-contact/ready','/services','/owner/vault','/plan/execute']){
  const x=await receive(r(p,'POST','{}',{'content-type':'application/json'}));assert.equal(x.status,403);
 }
});
await check('no browser CORS or public credentials',async()=>{
 const x=await receive(r('/services'));assert.equal(x.headers.get('access-control-allow-origin'),null);
 assert.equal(x.headers.get('cache-control'),'no-store, max-age=0');
 assert.equal(JSON.stringify(x.body).includes('JM_OWNER_VAULT_KEY'),false);
});
await check('unsupported methods rejected',async()=>{
 const x=await receive(r('/','DELETE'));assert.equal(x.status,405);
});
await check('non-JSON and injected body fields rejected',async()=>{
 const x=await receive(r('/plan','POST','{"operation":"vault","token":"secret"}',{'content-type':'application/json'}));assert.equal(x.status,422);
});
console.log('JM API reconciliation: '+n+'/'+n+' PASS');
