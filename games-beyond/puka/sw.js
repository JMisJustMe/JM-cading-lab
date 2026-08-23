const CACHE='jm-puka-v03a';
const CORE=['./','./00_OPEN_FIRST.html','./index.html','./puka.css','./puka-core.js','./puka-ui.js','./manifest.webmanifest','./registry.json','./assets/puka-card-back.svg','./assets/royal-felt-medallion.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&k.startsWith('jm-puka-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match('./00_OPEN_FIRST.html'))));});
