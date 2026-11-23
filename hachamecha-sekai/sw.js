const CACHE_NAME = 'hachamecha-sekai-v1.0.2';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './js/core/constants.js',
  './js/core/utils.js',
  './js/core/storage.js',
  './js/core/audio.js',
  './js/data/units.js',
  './js/data/stages.js',
  './js/data/equipment.js',
  './js/game/state.js',
  './js/game/combat.js',
  './js/game/renderer.js',
  './js/ui/dragdrop.js',
  './js/ui/render-battle.js',
  './js/ui/render-party.js',
  './js/ui/render-units.js',
  './js/ui/render-gear.js',
  './js/ui/render-world.js',
  './js/main.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.all(
        PRECACHE_ASSETS.map((url) =>
          fetch(new Request(url, { cache: 'reload' }))
            .then((resp) => (resp && resp.ok ? cache.put(url, resp) : null))
            .catch(() => null)
        )
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const reqUrl = new URL(event.request.url);
  if (reqUrl.origin !== self.location.origin) return;

  // Network-First + Offline Cache Fallback（更新の即時反映と完全オフライン動作を両立）
  event.respondWith(
    fetch(event.request)
      .then((resp) => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return resp;
      })
      .catch(() => caches.match(event.request).then((c) => c || caches.match('./index.html')))
  );
});
