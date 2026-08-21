const CACHE = 'body-return-v0.2';
const ASSETS = ['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./assets/icon.svg','./assets/body-return-roadmap.svg'];
self.addEventListener('install', (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS))));
self.addEventListener('activate', (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))));
self.addEventListener('fetch', (event) => event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request))));
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    const existing = clientList.find((client) => 'focus' in client);
    return existing ? existing.focus() : clients.openWindow('./index.html');
  }));
});
