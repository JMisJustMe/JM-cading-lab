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
if (!String(x.json.result.serverInfo.version).startsWith('0.2.0-estate-integration')) throw new Error('wrong integrated version');

x = await rpc(2,'tools/list');
if (!x.res.ok || x.json.result.tools.length !== 5) throw new Error('public tool count changed');
if (x.json.result.tools.some(t => t.annotations?.readOnlyHint !== true || t.annotations?.openWorldHint !== false || t.annotations?.destructiveHint !== false)) throw new Error('public annotations changed');

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

console.log('Navigator public MCP v0.2 Estate integration unit proof PASS');
