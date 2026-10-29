/* FTR v0.5.1-R1: separate offline scope. Do not purge caches of other JM apps. */
const CACHE='jm-ftr-first-person-v0-5-1-r1-20261029';
const ORIGINAL='../ftr-first-person-v0.5.1/';
const ASSETS=['./','./index.html','./manifest.webmanifest','./ftr-hud-render-loop.js',
  ...['styles.css','ftr-core.js','ftr-controls.js','ftr-world.js','ftr-raycast-sprites.js','ftr-input-bridge.js'].map(s=>ORIGINAL+s)];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(url.origin!==self.location.origin)return;
 event.respondWith(caches.open(CACHE).then(async cache=>{
   const hit=await cache.match(event.request);
   if(hit)return hit;
   try{const response=await fetch(event.request);if(response.ok)await cache.put(event.request,response.clone());return response;}
   catch(error){
     if(event.request.mode==='navigate')return cache.match('./index.html');
     throw error;
   }
 }));
});
