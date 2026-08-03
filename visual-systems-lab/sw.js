const CACHE='jm-visual-lab-v0.1.0';
const CORE=['./','./index.html','./styles.css','./jm-core.js','./visual-runtime.js','./app.js','./visual-lab.cading','./manifest.webmanifest','./icon.svg','./00_OPEN_FIRST.html'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
    const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response;
  }).catch(()=>event.request.mode==='navigate'?caches.match('./index.html'):cached)));
});
