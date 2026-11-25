'use strict';

const CACHE_NAME = 'hachamecha-sekai-v3';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/base.css',
  './css/theme.css',
  './css/layout.css',
  './css/battle.css',
  './css/screens.css',
  './assets/icons/icon-180.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './js/namespace.js',
  './js/utils.js',
  './js/storage.js',
  './js/data/elements_races.js',
  './js/data/abilities.js',
  './js/data/characters.js',
  './js/data/enemies.js',
  './js/data/equipment.js',
  './js/data/stages_pve.js',
  './js/engine/state.js',
  './js/engine/calc.js',
  './js/engine/expedition.js',
  './js/engine/battle.js',
  './js/ui/anim.js',
  './js/ui/battle_view.js',
  './js/ui/party_view.js',
  './js/ui/growth_view.js',
  './js/ui/quest_view.js',
  './js/ui/codex_view.js',
  './js/ui/app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;

      return fetch(req).then((res) => {
        if (!res || res.status !== 200 || res.type !== 'basic') {
          return res;
        }
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        return res;
      }).catch(() => {
        if (req.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('', { status: 504, statusText: 'Offline' });
      });
    })
  );
});
