// Read-only contact test: fetch the actual JM AIRBORNE browser through the same MCP UI resource.
// This is *not* evidence that the ChatGPT Android host displayed it successfully.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import worker from './worker.mjs';

const ORIGINAL='https://jmisjustme-estate.pages.dev/navigator/';
const UI='ui://jm3232-navigator/airborne-chatgpt-cp03.html';
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
assert.equal(content._meta['jm/source_status'],'HASH_PINNED_ORIGINAL_PLUS_CP03_HOST_BRIDGE_HOST_UNVERIFIED');
assert.equal(content.text.match(/<base href="https:\/\/jmisjustme-estate.pages.dev\/navigator\/"/g)?.length,1);
// Source identity is recovered by exact removal of only three declared carrier contacts.
const html=content.text;
const bridge=html.match(/<script data-jm-cp03="host-bridge">([\\s\\S]*?)<\\/script>\\n/);
assert.ok(bridge,'host bridge adapter absent');
const saveOriginal="function saveStore(){try{localStorage.setItem(STORE_KEY,JSON.stringify(store))}catch(e){memoryPersist=JSON.parse(JSON.stringify(store))}}";
const saveCarrier=saveOriginal.replace("function saveStore(){","function saveStore(){window.JM3232_CHATGPT_BRIDGE?.persist(store);");
assert.ok(html.includes(saveCarrier),'source state adapter not found');
const anchor="source:'Public web handoff'}];const jobs=[];";
assert.ok(html.includes(anchor),'original search anchor missing');
const searchContact=html.match(/;if\\(store\\.settings\\.remote&&window\\.JM3232_CHATGPT_BRIDGE\\?\\.internet\\)\\{jobs\\.push\\(window\\.JM3232_CHATGPT_BRIDGE\\.internet\\(q\\).*?\\}\\}\\)/);
assert.ok(searchContact,'search contact not found');
const reverted=html.replace(bridge[0],'')
  .replace(searchContact[0],'')
  .replace(saveCarrier,saveOriginal)
  .replace('<base href="'+ORIGINAL+'">','');
assert.equal(sha(Buffer.from(reverted,'utf8')),observed,'removing only CP03 declared contacts must restore ORIGINAL source byte-exact');
assert.ok(content.text.includes('v1.5.2 · AIRBORNE'));
assert.ok(content.text.includes('jm3232-navigator-state-v01'));
assert.equal(content._meta.ui.csp.frameDomains.length,0);
console.log('JM3232 CP03 ORIGINAL PLUS REVERSIBLE CARRIER LIVE PASS',{
 sourceBytes:source.length,sha256:observed,headAdapter:'base + reversible CP03 host/search/state contacts',actualChatGPTHostRendered:false
});
