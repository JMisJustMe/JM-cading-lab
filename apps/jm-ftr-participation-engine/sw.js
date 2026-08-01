const CACHE='jm-ftr-fivefold-v9-0-permanent';
const ASSETS=["./", "./index.html", "./manifest.webmanifest", "./body-manifest.json", "./docs/GOVERNING_SPEC_BUNDLE.md", "./schemas/GOVERNING_SCHEMA_BUNDLE.json", "./firmware/FIELD_FIRMWARE_BUNDLE.md", "./samples/FIELD_SAMPLES_BUNDLE.md", "./payload/payload-000.b64", "./payload/pair-001-002.b64", "./payload/pair-003-004.b64", "./payload/pair-005-006.b64", "./payload/pair-007-008.b64"];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(x=>{const y=x.clone();caches.open(CACHE).then(c=>c.put(e.request,y));return x}).catch(()=>caches.match('./index.html')))));
