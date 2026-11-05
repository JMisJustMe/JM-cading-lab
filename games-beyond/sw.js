const CACHE='games-beyond-v0-9-whole-estate-current-r4-cp31-offline-phone-contact-20261105';
const MODULES=['catalogue-v0-6-style.js','catalogue-v0-6-data-1.js','catalogue-v0-6-data-2a.js','catalogue-v0-6-data-2b.js','catalogue-v0-6-data-3a.js','catalogue-v0-6-data-3b.js','catalogue-v0-6-core-data-1.js','catalogue-v0-6-core-data-2.js','catalogue-v0-6-core-loader.js','routeos-achievement-hall-v0-7.js','routeos-v0-7-label.js','routeos-runtime-launch-v0-8.js','whole-estate-current-catalogue-v1.js'];
const CORE=['./','index.html','app.js',...MODULES,'routeos/index.html','routeos/runtime/index.html','lzma-d-min.js','manifest.webmanifest','payload-manifest.json','registry.json','accessibility-report-v0-5.json','GAMES_BEYOND_PAYLOAD_v0_3.lzma.b64.txt','all-games.html','WHOLE_GAMES_ESTATE_RECONCILIATION_2026-09-20.md','bodies/futarized-v1-2.html','bodies/fight-clash-v0-4.html','bodies/aiming-run-v0-1a.html','bodies/drag-aim-loop-kernel-v0-9-9.html','bodies/loopit-glyphplay-gameforge-boundary-rejoin-node.html','bodies/playform-v0-1.html'];
// Shared shell assets are already published in the original Estate home.
// Cache these paths for offline contact without creating new copies or new sites.
const SHARED=['../ecostate-visual-v1.css','../ecostate-personality-v2.css','../ecostate-authored-v3.css','../ecostate-contact-v4.css','../ecostate-interaction-v1.js','../ecostate-personality-v2.js','../ecostate-authored-v3.js','../ecostate-contact-v4.js','../estate-head-public-consumer.js','../unified-browser/jm-games-beyond-return-v1.js'];
CORE.push(...SHARED);
const INJECTION=MODULES.map(src=>`<script src="${src}?v=${encodeURIComponent(CACHE)}"></script>`).join('');
// Current Rooms and RouteOS use the native House DOM; keep their modern modules.
// The archived v0.6 compressed catalogue requires a different DOM and must not execute here.
const CURRENT_MODULES=MODULES.filter(src=>src.startsWith('routeos-')||src==='whole-estate-current-catalogue-v1.js');
const CURRENT_INJECTION=CURRENT_MODULES.map(src=>`<script src="${src}?v=${encodeURIComponent(CACHE)}"></script>`).join('');
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith('games-beyond-')&&key!==CACHE).map(key=>caches.delete(key)));await self.clients.claim()})()));
// Query-versioned body files and manifests must recover their exact precached URL.
// Never substitute House HTML for a JSON, JS, CSS or binary asset.
async function networkFirst(request){
 try{
  const response=await fetch(request);
  if(response.ok){const copy=response.clone();await caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{});}
  return response;
 }catch{
  return (await caches.match(request,{ignoreSearch:true}))||
   new Response('Offline asset unavailable',{status:503,headers:{'content-type':'text/plain; charset=utf-8'}});
 }
}
async function houseDocument(request){let response;try{response=await fetch(request,{cache:'no-store'})}catch{response=(await caches.match(request,{ignoreSearch:true}))||(await caches.match('./'))}if(!response)return new Response('Games&Beyond unavailable',{status:503});const type=response.headers.get('content-type')||'';if(!type.includes('text/html'))return response;let html=await response.text();// Preserve modern Catalogue/RouteOS, never execute the archived v0.6 core on v0.5 Rooms.
if(html.includes('id="view-rooms"')){
 if(!html.includes('whole-estate-current-catalogue-v1.js'))html=html.replace(/<\/body>/i,`${CURRENT_INJECTION}</body>`);
}else if(!html.includes('routeos-achievement-hall-v0-7.js')){
 html=html.replace(/<\/body>/i,`${INJECTION}</body>`);
}const headers=new Headers(response.headers);headers.set('content-type','text/html; charset=utf-8');headers.delete('content-length');headers.set('x-jm-games-beyond','v0.9-whole-estate-current-r4-cp31-offline');return new Response(html,{status:response.status,statusText:response.statusText,headers})}
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;const url=new URL(event.request.url);const houseNavigation=url.pathname.endsWith('/games-beyond/')||url.pathname.endsWith('/games-beyond/index.html');event.respondWith(houseNavigation?houseDocument(event.request):networkFirst(event.request))});