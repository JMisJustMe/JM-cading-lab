/* MMZG v0.6 delivery repair. Runtime core and owner data are not modified. */
'use strict';

const MMZG_CACHE_PREFIX = 'jm-mmzg-v06-';
const MMZG_CACHE = MMZG_CACHE_PREFIX + 'source-20261026';
const MMZG_FILES = [
  './index.html',
  './mmzg_runtime_core_v0_6.js',
  './manifest.webmanifest',
];
const MMZG_SCOPE = new URL(self.registration.scope);
const MMZG_PATHS = new Set(MMZG_FILES.map((file) => new URL(file, MMZG_SCOPE).pathname));

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(MMZG_CACHE)
      .then((cache) => cache.addAll(MMZG_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(MMZG_CACHE_PREFIX) && key !== MMZG_CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const target = new URL(request.url);
  if (target.origin !== MMZG_SCOPE.origin || !target.pathname.startsWith(MMZG_SCOPE.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () =>
        (await caches.match(new URL('./index.html', MMZG_SCOPE))) || Response.error()
      )
    );
    return;
  }

  if (!MMZG_PATHS.has(target.pathname)) return;
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => cached || fetch(request))
  );
});
