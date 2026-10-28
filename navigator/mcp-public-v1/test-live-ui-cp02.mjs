// Read-only contact test: fetch the actual JM AIRBORNE browser through the same MCP UI resource.
// This is *not* evidence that the ChatGPT Android host displayed it successfully.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import worker from './worker.mjs';

const ORIGINAL='https://jmisjustme-estate.pages.dev/navigator/';
const UI='ui://jm3232-navigator/airborne-source-cp02.html';
const sha=b=>createHash('sha256').update(b).digest('hex');
const res=await fetch(ORIGINAL,{headers:{accept:'text/html'}});
assert.equal(res.status,200,'canonical browser must be reachable');
const source=Buffer.from(await res.arrayBuffer());
const observed=sha(source);
assert.ok([
 'b41d03fdc5a4fd9545ed30beac5477e70a54ddf479bb580f4650333a41387569',
 '2ece6163a5ca81ff89ca056ffc9d508eefd04977dbe8ae470573f0e664ec4d8a'
].includes(observed),'live source changed: fail closed instead of claiming original');
assert.ok(source.length>6_000_000 && source.length<=7_000_000);
const rpc=async(id,method,params={})=>{
 const response=await worker.fetch(new Request('https://navigator-plugin-public.example/mcp',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id,method,params})}),{ASSETS:{fetch:()=>new Response('asset')}});
 return {response,data:await response.json()};
};
let x=await rpc(1,'resources/list');
assert.equal(x.response.status,200);
assert.equal(x.data.result.resources[0].uri,UI);
assert.deepEqual(x.data.result.resources[0]._meta.ui.csp.frameDomains,[]);
x=await rpc(2,'resources/read',{uri:UI});
assert.equal(x.response.status,200,JSON.stringify(x.data.error||{}));
assert.equal(x.data.result.contents.length,1);
const content=x.data.result.contents[0];
assert.equal(content.mimeType,'text/html;profile=mcp-app');
assert.equal(content._meta['jm/source_sha256'],observed);
assert.equal(content._meta['jm/source_bytes'],source.length);
assert.equal(content._meta['jm/source_status'],'EXACT_LIVE_CARRIER_PINNED_HOST_UNVERIFIED');
assert.equal(content.text.match(/<base href="https:\/\/jmisjustme-estate.pages.dev\/navigator\/"/g)?.length,1);
const restored=Buffer.from(content.text.replace('<base href="'+ORIGINAL+'">',''),'utf8');
assert.equal(sha(restored),observed,'original browser must remain byte-identical after removing only BASE carrier adapter');
assert.ok(content.text.includes('v1.5.2 · AIRBORNE'));
assert.ok(content.text.includes('jm3232-navigator-state-v01'));
assert.equal(content._meta.ui.csp.frameDomains.length,0);
console.log('JM3232 CP02 SOURCE RESOURCE LIVE PASS',{
 sourceBytes:source.length,sha256:observed,headAdapter:'one BASE tag only',actualChatGPTHostRendered:false
});
