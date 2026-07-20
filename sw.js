const CACHE='jm-web-estate-v1.3.0';
const CORE=['./','./index.html','./estate.css','./estate-accessibility.css','./estate-accessibility.js','./estate-app.js','./manifest.webmanifest','./icon.svg','./registry/estate-map.json','./author/','./author/index.html','./author/author-public.json','./registry/lyrics-house.json','./games-beyond/registry.json','./registry/theory-wing.json','./theory/','./lyrics/','./recovery/'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match(event.request).then(hit=>hit||caches.match('./index.html'))));
});
