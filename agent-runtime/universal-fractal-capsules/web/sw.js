/* JM UFC CP02 static-shell offline carrier. Never sees/caches private capsules. */
const CACHE='jm-ufc-cp03-shell-2';
const FILES=['./index.html','./verify-signed.html','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install', event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', event=>{
 event.waitUntil(caches.keys().then(async keys=>{
  for(const key of keys) if(key.startsWith('jm-ufc-') && key!==CACHE) await caches.delete(key);
  await self.clients.claim();
 }));
});
self.addEventListener('fetch', event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET' || url.origin!==self.location.origin) return;
 const base=new URL('./',self.registration.scope).pathname;
 if(!url.pathname.startsWith(base))return;
 if(!['index.html','verify-signed.html','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png',''].includes(url.pathname.slice(base.length)))return;
 event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request)));
});
