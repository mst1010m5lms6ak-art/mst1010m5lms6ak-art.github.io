const CACHE_NAME = 'hachamecha-sekai-v5';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './css/tokens.css',
  './css/layout.css',
  './css/components.css',
  './css/battle.css',
  './js/namespace.js',
  './js/storage.js',
  './js/audio.js',
  './js/data/rules.js',
  './js/data/abilities.js',
  './js/data/characters.js',
  './js/data/enemies.js',
  './js/data/equipment.js',
  './js/data/stages.js',
  './js/engine/stats.js',
  './js/engine/dispatch.js',
  './js/engine/battle-vfx.js',
  './js/engine/battle.js',
  './js/ui/render-common.js',
  './js/ui/screen-quest.js',
  './js/ui/screen-party.js',
  './js/ui/screen-equip.js',
  './js/ui/screen-codex.js',
  './js/ui/screen-settings.js',
  './js/ui/screen-battle.js',
  './js/ui/app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        CORE_ASSETS.map((url) =>
          fetch(new Request(url, { cache: 'reload' }))
            .then((res) => (res && res.ok ? cache.put(url, res) : null))
            .catch(() => cache.add(url).catch(() => {}))
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clientsClaim();
});

/* Network-First + オフライン時は即キャッシュ応答（更新反映とオフライン完全動作を両立） */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).then((response) => {
      if (response && response.status === 200 && response.type === 'basic') {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
      }
      return response;
    }).catch(() =>
      caches.match(event.request).then((cached) => cached || caches.match('./index.html'))
    )
  );
});
