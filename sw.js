const CACHE='jm-web-estate-v1.4.13-ailatheo-entitlement-boundary';
const CORE=[
  './',
  './index.html',
  './estate.css',
  './estate-accessibility.css',
  './estate-accessibility.js',
  './estate-app.js',
  './estate-return-route.js',
  './ecostate-gripcube-v5.css',
  './ecostate-gripcube-v5.js',
  './ecostate-griprail-v6.css',
  './ecostate-griprail-v6.js',
  './author-home-door.js',
  './estate-head-public-consumer.js',
  './access/',
  './access/index.html',
  './career/',
  './career/index.html',
  './books/',
  './books/index.html',
  './visual-story/',
  './visual-story/index.html',
  './manifest.webmanifest',
  './icon.svg',
  './404.html',
  './registry/estate-map.json',
  './registry/estate-head-public-current.json',
  './registry/theory-wing.json',
  './registry/money-menu-publication-receipt-v1.2.json',
  './games-beyond/registry.json',
  './money-menu/',
  './money-menu/index.html',
  './money-menu/PUBLICATION_RECEIPT.json',
  './market-lab/',
  './market-lab/index.html',
  './earn-now/',
  './earn-now/index.html',
  './author/',
  './author/index.html',
  './author/author-public.json',
  './author/press-kit/',
  './author/press-kit/index.html',
  './author/press-kit/press-kit.txt',
  './author/press-kit/press-kit-public.json',
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
      .then(async () => {
        const cache = await caches.open(CACHE);
        for (const request of await cache.keys()) {
          const response = await cache.match(request);
          if (!publicCacheRequest(request) || !safeCacheResponse(response)) {
            await cache.delete(request);
          }
        }
      })
      .then(() => self.clients.claim())
  );
});

// Original Estate: only public, same-origin GETs may enter the offline cache.
function publicCacheRequest(request){
  if(request.method !== 'GET' || request.headers.has('Authorization')) return false;
  const url = new URL(request.url);
  if(url.origin !== self.location.origin) return false;
  const path = url.pathname;
  if(path === '/api' || path.startsWith('/api/')) return false;
  if(path === '/owner' || path.startsWith('/owner/')) return false;
  if(path === '/author/authuser.html') return false;
  return true;
}

function safeCacheResponse(response){
  if(!response || !response.ok) return false;
  const policy = response.headers.get('Cache-Control') || '';
  return !/(?:^|[,\s])(?:private|no-store)(?:[,\s=]|$)/i.test(policy);
}

async function fresh(request){
  try{
    const response = await fetch(request,{cache:'no-store'});
    if(response && response.ok){
      const cache = await caches.open(CACHE);
      if(safeCacheResponse(response)){
        cache.put(request,response.clone()).catch(()=>{});
      } else {
        await cache.delete(request);
      }
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
  if (!publicCacheRequest(event.request)) return;
  event.respondWith(fresh(event.request));
});
