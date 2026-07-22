const CACHE='jm-web-estate-v1.4.2-route-repair';
const CORE=[
  './',
  './index.html',
  './estate.css',
  './estate-accessibility.css',
  './estate-accessibility.js',
  './estate-app.js','./author-home-door.js',
  './manifest.webmanifest',
  './icon.svg',
  './404.html',
  './registry/estate-map.json',
  './registry/estate-head-public-current.json',
  './registry/theory-wing.json',
  './games-beyond/registry.json',
  './recent/index.html',
  './theory/biohouse-nervous-signal-route/index.html',
  './theory/biohouse-nervous-signal-route/v1.0.html',
  './theory/trasta/index.html',
  './theory/reality-route-ethos/index.html',
  './games-beyond/recent-direction/index.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.allSettled(CORE.map(url => cache.add(new Request(url,{cache:'reload'})))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('jm-web-estate-') && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function fresh(request){
  try{
    const response = await fetch(request,{cache:'no-store'});
    if(response && response.ok){
      const cache = await caches.open(CACHE);
      cache.put(request,response.clone()).catch(()=>{});
      return response;
    }
    const cached = await caches.match(request,{ignoreSearch:true});
    if(cached) return cached;
    return response;
  }catch(error){
    const cached = await caches.match(request,{ignoreSearch:true});
    if(cached) return cached;
    if(request.mode === 'navigate'){
      return (await caches.match('./index.html')) || Response.error();
    }
    return Response.error();
  }
}

self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET') return;
  event.respondWith(fresh(event.request));
});
