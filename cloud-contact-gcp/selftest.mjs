import assert from 'node:assert/strict';
import {test} from 'node:test';
import { once } from 'node:events';
import {createJMCloudRunRelay} from './entrypoint.mjs';

async function served(fn, publicOrigin) {
  const server = createJMCloudRunRelay({publicOrigin});
  server.listen(0, '127.0.0.1');
  await once(server,'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try { return await fn(base); } finally { await new Promise((r,j)=>server.close(e=>e?j(e):r())); }
}
const body = JSON.stringify({scope:'fixture',intent:'synthetic',expectedRevision:1});
const route = '/api/estate-contact?route=';
const bearer = 'Bearer '+ 'a'.repeat(32);

// Run sequentially so a fake on-process fetch never affects a parallel test.
test('CP-GC1 inherited relay safety, state route and negative tests',async t=>{
  const rawFetch = globalThis.fetch;
  const intercepted = [];
  globalThis.fetch = async (url, options={}) => {
    if (String(url).startsWith('https://jm-cloud-contact-server-v05.onrender.com/')) {
      intercepted.push({url:String(url),headers:options.headers,method:options.method,body:options.body});
      return new Response(JSON.stringify({ok:true,schema:'JM.Synthetic.Upstream/1',revision:1}),{
        status:200,headers:{'content-type':'application/json'}});
    }
    return rawFetch(url,options);
  };
  try {
    await t.test('no origin config fails closed',async()=>served(async base=>{
      const r=await rawFetch(base+route+'/ready'); assert.equal(r.status,503);
      assert.equal((await r.json()).error,'CONFIG_HOLD_PUBLIC_ORIGIN');
    }, undefined));
    await t.test('unsafe origin invalid',async()=>served(async base=>{
      const r=await rawFetch(base+route+'/ready'); assert.equal(r.status,503);
    },'http://example.com'));
    await t.test('fixed public readiness forwards exactly',async()=>served(async base=>{
      const r=await rawFetch(base+route+'/ready'); assert.equal(r.status,200);
      assert.equal((await r.json()).revision,1);
      assert.equal(intercepted.at(-1).url,'https://jm-cloud-contact-server-v05.onrender.com/ready');
      assert.equal(r.headers.get('cache-control'),'no-store');
    },'https://jm-candidate.example'));
    await t.test('scoped synthetic state write forwards bearer and exact JSON',async()=>served(async base=>{
      const r=await rawFetch(base+route+'/mesh/v1/workspaces/ws_AAAABBBB/save',{
        method:'POST',headers:{authorization:bearer,origin:'https://jm-candidate.example','content-type':'application/json'},body});
      assert.equal(r.status,200);
      assert.equal(intercepted.at(-1).headers.authorization,bearer);
      assert.equal(intercepted.at(-1).body,body);
      assert.equal(intercepted.at(-1).method,'POST');
    },'https://jm-candidate.example'));
    await t.test('no bearer denied',async()=>served(async base=>{
      const n=intercepted.length;
      const r=await rawFetch(base+route+'/mesh/v1/dashboard');assert.equal(r.status,401);
      assert.equal(intercepted.length,n);
    },'https://jm-candidate.example'));
    await t.test('foreign browser origin denied',async()=>served(async base=>{
      const n=intercepted.length;
      const r=await rawFetch(base+route+'/mesh/v1/workspaces',{method:'POST',headers:{authorization:bearer,origin:'https://evil.example','content-type':'application/json'},body});
      assert.equal(r.status,403);assert.equal(intercepted.length,n);
    },'https://jm-candidate.example'));
    await t.test('forbidden route is never sent upstream',async()=>served(async base=>{
      const n=intercepted.length;
      const r=await rawFetch(base+route+'/admin');assert.equal(r.status,400);assert.equal(intercepted.length,n);
    },'https://jm-candidate.example'));
    await t.test('unknown path never dispatched',async()=>served(async base=>{
      const n=intercepted.length;
      const r=await rawFetch(base+'/random?route=/ready');assert.equal(r.status,404);assert.equal(intercepted.length,n);
    },'https://jm-candidate.example'));
    await t.test('unsupported HTTP method denied',async()=>served(async base=>{
      const r=await rawFetch(base+route+'/ready',{method:'PUT'});assert.equal(r.status,405);
    },'https://jm-candidate.example'));
    await t.test('overlarge post refused without upstream contact',async()=>served(async base=>{
      const n=intercepted.length;
      const r=await rawFetch(base+route+'/mesh/v1/workspaces',{method:'POST',headers:{authorization:bearer,'content-type':'application/json'},body:'x'.repeat(33000)});
      assert.equal(r.status,413);assert.equal(intercepted.length,n);
    },'https://jm-candidate.example'));
    await t.test('bad JSON denied by inherited relay',async()=>served(async base=>{
      const r=await rawFetch(base+route+'/mesh/v1/workspaces',{method:'POST',headers:{authorization:bearer,'content-type':'application/json'},body:'{bad'});assert.equal(r.status,400);
    },'https://jm-candidate.example'));
    await t.test('upstream redirect denied by inherited relay',async()=>served(async base=>{
      const save=globalThis.fetch;
      globalThis.fetch=async()=>new Response('',{status:302,headers:{location:'https://elsewhere.invalid'}});
      try{const r=await rawFetch(base+route+'/ready');assert.equal(r.status,502);assert.equal((await r.json()).error,'TARGET_REDIRECT_BLOCKED');}
      finally{globalThis.fetch=save;}
    },'https://jm-candidate.example'));
    await t.test('non JSON upstream rejected',async()=>served(async base=>{
      const save=globalThis.fetch;
      globalThis.fetch=async()=>new Response('html',{status:200,headers:{'content-type':'text/html'}});
      try{const r=await rawFetch(base+route+'/ready');assert.equal(r.status,502);}
      finally{globalThis.fetch=save;}
    },'https://jm-candidate.example'));
    await t.test('upstream failure does not leak body/credential',async()=>served(async base=>{
      const save=globalThis.fetch;
      globalThis.fetch=async()=>{throw Error('unavailable');};
      try{const r=await rawFetch(base+route+'/mesh/v1/dashboard',{headers:{authorization:bearer}});assert.equal(r.status,502);assert.ok(!(await r.text()).includes(bearer));}
      finally{globalThis.fetch=save;}
    },'https://jm-candidate.example'));
    await t.test('request Host cannot select the upstream recipient',async()=>served(async base=>{
      const r=await rawFetch(base+route+'/ready',{headers:{'X-Forwarded-Host':'attacker.example'}});
      assert.equal(r.status,200);assert.equal(intercepted.at(-1).url,'https://jm-cloud-contact-server-v05.onrender.com/ready');
    },'https://jm-candidate.example'));
  } finally { globalThis.fetch = rawFetch; }
});