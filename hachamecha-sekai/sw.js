const CACHE_NAME = 'hachamecha-sekai-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './css/base.css',
  './css/layout.css',
  './css/battle.css',
  './css/components.css',
  './js/core/namespace.js',
  './js/core/dom.js',
  './js/core/storage.js',
  './js/core/pwa.js',
  './js/data/abilities.js',
  './js/data/characters.js',
  './js/data/equipment.js',
  './js/data/enemies.js',
  './js/data/stages.js',
  './js/engine/state.js',
  './js/engine/stats.js',
  './js/engine/battle.js',
  './js/ui/battleView.js',
  './js/ui/deployView.js',
  './js/ui/partyView.js',
  './js/ui/growthView.js',
  './js/ui/equipView.js',
  './js/ui/archiveView.js',
  './js/ui/app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
