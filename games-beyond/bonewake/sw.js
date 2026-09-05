const CACHE='jm-bonewake-v1-12';
const CORE=[
 './','./index.html','./00_OPEN_FIRST.html','./manifest.webmanifest','./bonewake-icon.svg',
 './bonewake-estate-standard.css','./bonewake-estate-runtime.js',
 './bonewake-p01.css','./bonewake-p02.css','./bonewake-p03.css','./bonewake-p04.css','./bonewake-p05.css',
 './bonewake-core-p01.js','./bonewake-core-p02.js','./bonewake-core-p03.js','./bonewake-core-p04.js','./bonewake-core-p05.js','./bonewake-core-p06.js','./bonewake-core-p07.js',
 './bonewake-render-p01.js','./bonewake-render-p02.js','./bonewake-render-p03.js','./bonewake-render-p04.js','./bonewake-input.js'
];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const u=new URL(e.request.url);if(u.origin!==location.origin)return;
 e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./00_OPEN_FIRST.html'))))
});
