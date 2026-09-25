const CACHE='jm3232-navigator-v1-5-2';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k.startsWith('jm3232-navigator-')&&k!==CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET'||req.mode!=='navigate') return;
  event.respondWith((async()=>{
    try{
      const res=await fetch(req);
      if(res.ok){
        const cache=await caches.open(CACHE);
        cache.put('./',res.clone()).catch(()=>{});
      }
      return res;
    }catch(err){
      const cached=await caches.match('./');
      if(cached) return cached;
      throw err;
    }
  })());
});
