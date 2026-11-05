const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('games-beyond/sw.js','utf8');
function harness({offline=true}={}){
 const handlers=new Map(), deleted=[], store=new Map(), receipts=new Map();
 const origin='https://example.test/JM-cading-lab/games-beyond/';
 const toUrl=x=>new URL(typeof x==='string'?x:x.url,origin).href;
 const normalize=(url,ignore)=>ignore?new URL(url).origin+new URL(url).pathname:url;
 const caches={
  async keys(){return [...store.keys()]},
  async delete(name){deleted.push(name);return store.delete(name)},
  async open(name){
   if(!store.has(name))store.set(name,new Map());
   const map=store.get(name);
   return {
    async addAll(items){for(const x of items){map.set(toUrl(x),new Response('precache:'+x,{headers:{'content-type':'text/plain'}}));}},
    async put(req,res){map.set(toUrl(req),res)},
    async match(req,options={}){const target=normalize(toUrl(req),options.ignoreSearch);for(const [url,res] of map){if(normalize(url,options.ignoreSearch)===target)return res.clone();}return undefined;},
    async keys(){return [...map.keys()].map(url=>({url}))}
   };
  },
  async match(req,options={}){for(const key of store.keys()){const result=await (await this.open(key)).match(req,options);if(result)return result;}return undefined;}
 };
 const fakeSelf={addEventListener:(name,fn)=>handlers.set(name,fn),skipWaiting:async()=>{},clients:{claim:async()=>{receipts.set('claimed',true)}}};
 const context=vm.createContext({self:fakeSelf,caches,fetch:async req=>{if(offline)throw Error('offline');return new Response('live:'+toUrl(req),{status:200})},Response,Headers,URL,console});
 vm.runInContext(source,context);
 return {handlers,deleted,store,caches,origin,context,receipts,async put(cache,url,body,type='text/plain'){
   const c=await caches.open(cache);await c.put(url,new Response(body,{headers:{'content-type':type}}));
 }};
}
test('query-versioned JSON recovers exact cached bytes, not House HTML',async()=>{
 const x=harness();
 await x.put('games-beyond-v0-9-test',x.origin+'payload-manifest.json','{"bodyCount":22}','application/json');
 await x.put('games-beyond-v0-9-test',x.origin,'<html>House fallback</html>','text/html');
 const resp=await vm.runInContext('networkFirst',x.context)(new Request(x.origin+'payload-manifest.json?release=cp31'));
 assert.equal(resp.status,200);
 assert.deepEqual(await resp.json(),{bodyCount:22});
});
test('missing offline JavaScript fails 503, not misleading HTML 200',async()=>{
 const x=harness();
 await x.put('games-beyond-v0-9-test',x.origin,'<html>House fallback</html>','text/html');
 const resp=await vm.runInContext('networkFirst',x.context)(new Request(x.origin+'missing-game.js'));
 assert.equal(resp.status,503);
 assert.equal(resp.headers.get('content-type'),'text/plain; charset=utf-8');
 assert.doesNotMatch(await resp.text(),/<html/);
});
test('service worker activation only retires this House cache lineage',async()=>{
 const x=harness();
 for(const name of ['JM_Studios_Originals','zionfolder-keeper-v4','games-beyond-old','games-beyond-v0-9-whole-estate-current-r4-cp31-offline','games-beyond-v0-9-whole-estate-current-r4-cp31-offline-owner-html-20261105','games-beyond-v0-9-whole-estate-current-r4-cp31-offline-phone-contact-20261105','games-beyond-v0-9-whole-estate-current-r4-cp31-offline-phone-contact-cp21-20261105']) await x.caches.open(name);
 let done;x.handlers.get('activate')({waitUntil:p=>done=p});
 await done;
 assert.deepEqual([...x.store.keys()].sort(),['JM_Studios_Originals','games-beyond-v0-9-whole-estate-current-r4-cp31-offline-phone-contact-cp21-20261105','zionfolder-keeper-v4'].sort());
 assert.deepEqual(x.deleted,['games-beyond-old','games-beyond-v0-9-whole-estate-current-r4-cp31-offline','games-beyond-v0-9-whole-estate-current-r4-cp31-offline-owner-html-20261105','games-beyond-v0-9-whole-estate-current-r4-cp31-offline-phone-contact-20261105']);
 assert.equal(x.receipts.get('claimed'),true);
});
test('House HTML is a fallback only for House navigation, not asset requests',async()=>{
 const x=harness();
 await x.put('games-beyond-v0-9-test',x.origin,'<html><body>Original House</body></html>','text/html');
 const resp=await vm.runInContext('houseDocument',x.context)(new Request(x.origin+'?jm-play=western-sniper'));
 assert.equal(resp.status,200);
 const html=await resp.text();
 assert.match(html,/Original House/);
 assert.match(html,/routeos-achievement-hall-v0-7\.js/);
});
test('shared visual shell and source custody paths are in mandatory precache',()=>{
 for(const path of ['../ecostate-visual-v1.css','../ecostate-contact-v4.css','../estate-head-public-consumer.js','../unified-browser/jm-games-beyond-return-v1.js','payload-manifest.json','GAMES_BEYOND_PAYLOAD_v0_3.lzma.b64.txt'])
   assert.ok(source.includes(path),path);
 assert.match(source,/CORE\.push\(\.\.\.SHARED\)/);
});

test('current Games House offline HTML excludes mismatched legacy catalogue engine',async()=>{
 const x=harness();
 await x.put('games-beyond-v0-9-test',x.origin,'<html><body><div id="view-rooms">Current rooms</div></body></html>','text/html');
 const resp=await vm.runInContext('houseDocument',x.context)(new Request(x.origin+'?jm-play=cardbored'));
 assert.equal(resp.status,200);
 const html=await resp.text();
 assert.match(html,/Current rooms/);
 assert.doesNotMatch(html,/catalogue-v0-6-core-loader\.js/);
 assert.match(html,/whole-estate-current-catalogue-v1\.js/);
 assert.match(html,/routeos-achievement-hall-v0-7\.js/);
});
