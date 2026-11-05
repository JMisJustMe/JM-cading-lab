import assert from 'node:assert/strict';
import { handleJMApi, jmOpenApi, JM_API_BASE } from '../jm-api/core.mjs';
import { onRequest } from '../functions/api/jm/[[path]].js';

const origin = 'https://jmisjustme-estate.pages.dev';
let passed = 0;
async function check(description, fn) { await fn(); passed++; console.log('PASS', description); }
function request(path, method = 'GET', body, headers = {}) {
  return new Request(origin + path, {method, headers, ...(body === undefined ? {} : {body})});
}
async function run(request_) { const response = await onRequest({request:request_});
  const result = await response.json(); return { response, result }; }

await check('portable core and Pages adapter share one contract', async () => {
  const a = await handleJMApi(request(JM_API_BASE)); const b = await onRequest({request:request(JM_API_BASE)});
  assert.equal(a.status,200);assert.deepEqual(await a.json(),await b.json());
});
await check('native entrance enumerates functional routes', async () => {
  const {result} = await run(request(JM_API_BASE));
  assert.equal(result.schema,'JM.API/1.1'); assert.equal(result.mode,'PUBLIC_SAFE_CONTACT_AND_PLAN');
  assert.equal(result.links.openapi,JM_API_BASE+'/openapi.json');
});
await check('health proves only handler', async () => {
  const {result}=await run(request(JM_API_BASE+'/health'));
  assert.equal(result.state,'HANDLER_RESPONDING'); assert.equal(result.upstreams,'NOT_CHECKED');
});
await check('metadata prohibits proof transfer and mutation', async () => {
  const {result}=await run(request(JM_API_BASE+'/meta'));
  assert.equal(result.upstreamMutation,false); assert.equal(result.privateProxy,false);
});
await check('catalog contains original independent services exactly once', async () => {
  const {result}=await run(request(JM_API_BASE+'/services'));
  assert.deepEqual(result.services.map(s=>s.id),['build-mesh','workshop','live-experience','cloud-contact','owner-vault','ailatheo','phone-commander']);
  assert(result.services.every(s=>s.observedNowByThisApi===false));
});
await check('capability operations are named without execution', async () => {
  const {result}=await run(request(JM_API_BASE+'/capabilities'));
  assert.equal(result.operations.length,9); assert(result.operations.every(s=>s.action==='PLAN_ONLY'));
});
await check('OpenAPI is machine-readable, origin-bound and describes planning', async () => {
  const {result}=await run(request(JM_API_BASE+'/openapi.json'));
  assert.equal(result.openapi,'3.1.0'); assert.equal(result.servers[0].url,origin);
  assert(result.paths[JM_API_BASE+'/plan'].post);assert.deepEqual(result,jmOpenApi(origin));
});
for(const operation of ['discover','recover','compose','test','admit','workspace','vault','entitlement','phone']){
  await check(operation+' returns nonmutating governed route',async()=>{
    const {response,result}=await run(request(JM_API_BASE+'/plan','POST',JSON.stringify({operation,subject:'sample game'}),{'content-type':'application/json'}));
    assert.equal(response.status,200);assert.equal(result.state,'PLAN_ONLY');
    assert.equal(result.proof.mutationPerformed,false);assert.equal(result.proof.remoteToolExecuted,false);
    assert(operation === 'phone' ? result.contact.endpoint === null : Boolean(result.contact.endpoint));
  });
}
await check('body with invalid JSON fails closed',async()=>{
  const r=await run(request(JM_API_BASE+'/plan','POST','{broken',{'content-type':'application/json'}));assert.equal(r.response.status,400);
});
await check('non-JSON input fails closed',async()=>{
  const r=await run(request(JM_API_BASE+'/plan','POST','operation=compose',{'content-type':'text/plain'}));assert.equal(r.response.status,415);
});
await check('large content-length fails closed',async()=>{
  const r=await run(request(JM_API_BASE+'/plan','POST','{}',{'content-type':'application/json','content-length':'2049'}));assert.equal(r.response.status,413);
});
await check('body bytes independently bounded',async()=>{
  const r=await run(request(JM_API_BASE+'/plan','POST',JSON.stringify({operation:'discover',subject:'a'.repeat(2100)}),{'content-type':'application/json'}));assert.equal(r.response.status,413);
});
await check('unknown operation rejected',async()=>{
  const r=await run(request(JM_API_BASE+'/plan','POST','{"operation":"delete"}',{'content-type':'application/json'}));assert.equal(r.response.status,422);
});
await check('unexpected properties rejected',async()=>{
  const r=await run(request(JM_API_BASE+'/plan','POST','{"operation":"discover","url":"https://evil.example"}',{'content-type':'application/json'}));assert.equal(r.response.status,422);
});
await check('invalid subject type rejected',async()=>{
  const r=await run(request(JM_API_BASE+'/plan','POST','{"operation":"discover","subject":{}}',{'content-type':'application/json'}));assert.equal(r.response.status,422);
});
await check('all proxy and mutation paths stay closed',async()=>{
  for(const path of ['/api/jm/v1/admin','/api/jm/v1/proxy','/api/jm/v1/services','/api/jm/v1/plan/execute']){
    const r=await run(request(path,'POST','{}',{'content-type':'application/json'}));assert.equal(r.response.status,403);
  }
});
await check('foreign routes not claimed',async()=>{
  const r=await run(request('/api/owner/vault'));assert.equal(r.response.status,404);
});
await check('unsupported method fails closed',async()=>{
  const r=await run(request(JM_API_BASE+'/services','DELETE'));assert.equal(r.response.status,405);
});
await check('GET unknown route is a 404',async()=>{
  const r=await run(request(JM_API_BASE+'/ghost'));assert.equal(r.response.status,404);
});
await check('no credential, owner data or cross-origin CORS leaked',async()=>{
  const r=await run(request(JM_API_BASE+'/services'));
  assert.equal(r.response.headers.get('access-control-allow-origin'),null);
  assert.equal(r.response.headers.get('cache-control'),'no-store, max-age=0');
  assert.equal(r.response.headers.get('x-content-type-options'),'nosniff');
  assert(!JSON.stringify(r.result).includes('PRIVATE_CREDENTIAL_VALUE'));
});
console.log('JM API v1.1: '+passed+'/'+passed+' PASS · isolated function tests only, no live Pages deployment');
