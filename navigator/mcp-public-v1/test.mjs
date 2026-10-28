import worker from './worker.mjs';

const integrationRegistry = {
  schema: 'JM.Estate.PublicNervousSystem/1',
  version: 'v1.0-test',
  status: 'TEST_REGISTRY',
  canonical_root: 'https://jmisjustme-estate.pages.dev/',
  integration_route: 'https://jmisjustme-estate.pages.dev/navigator/estate-integration/',
  registry_route: 'https://jmisjustme-estate.pages.dev/navigator/estate-integration/public-registry.json',
  routes: [{id:'estate'}],
  services: [{id:'navigator-public-mcp'}],
  lineage_seats: [{
    id:'JM-BUILD-MESH-001',
    name:'JM ECOSTATE — Build Mesh',
    aliases:['JM ECOSTATE Build Mesh','Build Mesh','JM Build Mesh'],
    role:'ESTATE_CONTROL_PLANE_PUBLIC_LINEAGE_SEAT',
    status:'CURRENT_DECLARED',
    version:'package v1.0.3 / hosted MCP v0.7.1',
    source:'JM ECOSTATE — Build Mesh v1.0.3 Self-Seating Registry Refresh',
    source_file:'navigator/estate-integration/public-registry.json',
    preserved:'Build Mesh v1.0 → v1.0.1 → v1.0.2 → v1.0.3; hosted MCP v0.5 → v0.6 → v0.7 → v0.7.1.',
    lineage:[{source_file:'JM_CAREER_CURRENT_PROJECT_REGISTRY_v0_4.json',locator:'ecostate-build-mesh-v102',authority:'JM.CareerCurrentProjectRegistry/0.4',role:'current self-seat'}],
    connections:['JM3232 Navigator','JM Estate Public Nervous System'],
    authority:{primary:'JM.CareerCurrentProjectRegistry/0.4',confirmation_status:'LIVE_READBACK_PASS',source_owner:'JM / JMISJUSTME'},
    boundary:'Public-safe lineage seat only.'
  }],
  privacy_boundary: {contains_owner_write_endpoint:false}
};

const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init={}) => {
  const url = typeof input === 'string' ? input : input.url;
  if (url.includes('/navigator/estate-integration/public-registry.json')) {
    return new Response(JSON.stringify(integrationRegistry), {status:200, headers:{'content-type':'application/json'}});
  }
  if (url === 'https://navigator-live-contact.jm-inline-contact-probe.pages.dev/mcp') {
    const body = JSON.parse(init.body || '{}');
    const name = body?.params?.name;
    if (body.method === 'tools/call' && name === 'navigator_bridge_status') {
      return new Response(JSON.stringify({jsonrpc:'2.0',id:1,result:{structuredContent:{source_counts:{search_docs:881},receipt_chain_head:'MUST_NOT_LEAK',registered_bodies:999,stringmarks:999}}}), {status:200, headers:{'content-type':'application/json'}});
    }
    return new Response(JSON.stringify({jsonrpc:'2.0',id:1,result:{structuredContent:{}}}), {status:200, headers:{'content-type':'application/json'}});
  }
  return originalFetch(input, init);
};

const env = {ASSETS:{fetch: async () => new Response('asset', {status:200})}};
async function rpc(id, method, params={}) {
  const req = new Request('https://navigator-plugin-public.example/mcp', {
    method:'POST', headers:{'content-type':'application/json'},
    body:JSON.stringify({jsonrpc:'2.0',id,method,params})
  });
  const res = await worker.fetch(req, env);
  return {res, json:await res.json()};
}

let x = await rpc(1,'initialize',{protocolVersion:'2025-06-18',capabilities:{}});
if (!x.res.ok || x.json.error) throw new Error('initialize failed');
if (!String(x.json.result.serverInfo.version).startsWith('0.3.0-original-ui-contact-cp02')) throw new Error('wrong integrated version');

x = await rpc(2,'tools/list');
if (!x.res.ok || x.json.result.tools.length !== 6) throw new Error('inherited+render tool count changed');
const expected = ['search','fetch','navigator_resolve_rootword','navigator_return_lineage','navigator_bridge_status'];
for(const name of expected){
  const t=x.json.result.tools.find(t=>t.name===name);
  if(!t || t.annotations?.readOnlyHint!==true || t.annotations?.openWorldHint!==false || t.annotations?.destructiveHint!==false) throw new Error('original read-only permission changed: '+name);
}
const render=x.json.result.tools.find(t=>t.name==='navigator_render_original_browser');
if(!render||render.annotations?.readOnlyHint!==true||render.annotations?.openWorldHint!==true||render.annotations?.destructiveHint!==false||render._meta?.ui?.resourceUri!=='ui://jm3232-navigator/airborne-source-cp02.html')throw new Error('render tool contract changed');

x = await rpc(3,'tools/call',{name:'navigator_create_stringreceipt',arguments:{}});
if (x.res.ok || !x.json.error) throw new Error('write tool exposed');

x = await rpc(4,'tools/call',{name:'navigator_bridge_status',arguments:{}});
if (!x.res.ok || x.json.error) throw new Error('bridge status failed');
const status = x.json.result.structuredContent;
if (status.estate_integration?.state !== 'CONNECTED') throw new Error('integration registry was not consumed');
const serialized = JSON.stringify(status);
for (const forbidden of ['receipt_chain_head','registered_bodies','stringmarks','navigator-live-contact.jm-inline-contact-probe.pages.dev']) {
  if (serialized.includes(forbidden)) throw new Error(`private/upstream detail leaked: ${forbidden}`);
}

const healthRes = await worker.fetch(new Request('https://navigator-plugin-public.example/health'), env);
const health = await healthRes.json();
if (!health.ok || health.estate_integration?.state !== 'CONNECTED') throw new Error('health integration failed');
if (JSON.stringify(health).includes('navigator-live-contact.jm-inline-contact-probe.pages.dev')) throw new Error('owner upstream exposed in health');

x = await rpc(5,'tools/call',{name:'search',arguments:{query:'JM ECOSTATE — Build Mesh',limit:8}});
if (!x.res.ok || x.json.error) throw new Error('Build Mesh lineage search failed');
const rows = x.json.result.structuredContent?.results || [];
if (rows[0]?.id !== 'JM-BUILD-MESH-001') throw new Error('Build Mesh public lineage seat did not rank first');

x = await rpc(6,'tools/call',{name:'navigator_return_lineage',arguments:{id:'JM-BUILD-MESH-001'}});
if (!x.res.ok || x.json.error) throw new Error('Build Mesh lineage return failed');
const lineage = x.json.result.structuredContent;
if (lineage.id !== 'JM-BUILD-MESH-001' || lineage.authority?.primary !== 'JM.CareerCurrentProjectRegistry/0.4') throw new Error('Build Mesh lineage authority mismatch');
if (JSON.stringify(lineage).includes('receipt_chain_head')) throw new Error('private lineage state leaked');

x = await rpc(7,'resources/list');
if(!x.res.ok || x.json.result.resources.length!==1 || x.json.result.resources[0].uri!=='ui://jm3232-navigator/airborne-source-cp02.html')throw new Error('original body UI missing');
const resource=x.json.result.resources[0];
if(resource._meta?.ui?.csp?.frameDomains?.length!==0 || resource._meta?.ui?.csp?.connectDomains?.[0]!=='https://jmisjustme-estate.pages.dev')throw new Error('resource origin or nested frame policy changed');
x = await rpc(8,'tools/call',{name:'navigator_render_original_browser',arguments:{}});
if(!x.res.ok || x.json.error || x.json.result.structuredContent?.host_render_state!=='UNVERIFIED')throw new Error('original render tool did not preserve host proof boundary');
x = await rpc(9,'tools/call',{name:'navigator_render_original_browser',arguments:{url:'https://example.com'}});
if(x.res.ok || !x.json.error)throw new Error('render accepted arbitrary URL');
x = await rpc(10,'resources/read',{uri:'ui://unknown/original.html'});
if(x.res.ok || !x.json.error)throw new Error('unknown UI resource accepted');
x = await rpc(11,'resources/read',{uri:'ui://jm3232-navigator/airborne-source-cp02.html'});
if(x.res.ok || !x.json.error || !String(x.json.error.message).includes('source'))throw new Error('invalid/unavailable original source not rejected');
if(health.resource_count!==1 || health.tool_count!==6)throw new Error('health new surface not accounted for');
console.log('JM3232 CP02: five inherited tools + one governed render UI; negative-source refusal and private-write preservation PASS');
