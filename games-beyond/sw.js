const CACHE='games-beyond-v0-2-full-mount';
const CORE=[
  './','./index.html','./house-v0-2.js','./manifest.webmanifest','./icon.svg',
  './registry.json','./bundled-bodies.json','./android-route.json',
  './bodies/futarized-v1-2.html',
  './bodies/fight-clash-v0-4.html',
  './bodies/aiming-run-v0-1a.html',
  './bodies/drag-aim-loop-kernel-v0-9-9.html',
  './bodies/loopit-glyphplay-gameforge-boundary-rejoin-node.html'
];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(response=>{
    const copy=response.clone();
    caches.open(CACHE).then(cache=>cache.put(event.request,copy));
    return response;
  }).catch(()=>caches.match('./index.html'))));
});
