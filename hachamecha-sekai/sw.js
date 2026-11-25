const CACHE_NAME = 'hachamecha-world-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './css/base.css',
  './css/layout.css',
  './css/battle.css',
  './css/screens.css',
  './js/core/namespace.js',
  './js/core/security.js',
  './js/core/storage.js',
  './js/core/audio.js',
  './js/core/icons.js',
  './js/core/state.js',
  './js/data/abilities.js',
  './js/data/equipments.js',
  './js/data/formations.js',
  './js/data/characters.js',
  './js/data/enemies.js',
  './js/data/contents.js',
  './js/engine/stats.js',
  './js/engine/dispatch.js',
  './js/engine/vfx.js',
  './js/engine/battle.js',
  './js/ui/dom.js',
  './js/ui/render_battle.js',
  './js/ui/render_adventure.js',
  './js/ui/render_party.js',
  './js/ui/render_roster.js',
  './js/ui/render_equip.js',
  './js/ui/render_hub.js',
  './js/ui/render_codex.js',
  './js/ui/app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
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

// Network-First：オンライン時は常に最新ファイルを取得してキャッシュ更新、オフライン時はキャッシュから完全動作
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        })
      )
  );
});
