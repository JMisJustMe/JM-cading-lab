/* JM scoped archival delivery companion: original HTML, game and owner state remain unchanged.
   SOURCE-DELIVERY CONTACT ONLY, NOT GAMEPLAY / OWNER DEVICE DING. */
const CACHE="jm3232-browser-archived-contact-v1-20261026";
const PREFIX="jm3232-browser-archived-contact-v1";
const HOME=new URL("./JM3232_UNIFIED_BROWSER_v1_0_OPEN_CONTACT_ORGAN_v1_1_DESCENDANT.html",self.registration.scope).href;
const PRELOAD=[HOME,new URL("./manifest.webmanifest",self.registration.scope).href];
self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PRELOAD)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(
    keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key))
  )).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",event=>{
  const req=event.request;
  if(req.method!=="GET")return;
  const url=new URL(req.url),scope=new URL(self.registration.scope);
  if(url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
  event.respondWith(fetch(req).then(response=>{
    if(response.ok&&response.type!=="opaque"){
      const copy=response.clone();
      event.waitUntil(caches.open(CACHE).then(cache=>cache.put(req,copy)));
    }
    return response;
  }).catch(()=>caches.match(req).then(hit=>hit||(req.mode==="navigate"?caches.match(HOME):undefined)).then(hit=>hit||Response.error())));
});
