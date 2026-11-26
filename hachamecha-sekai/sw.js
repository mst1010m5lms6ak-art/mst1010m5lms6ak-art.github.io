'use strict';

const CACHE_NAME = 'kairo-chronicle-v1.0.2';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css?v=2',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './js/security.js?v=2',
  './js/audio.js?v=2',
  './js/data/realms.js?v=2',
  './js/data/units.js?v=2',
  './js/data/stages.js?v=2',
  './js/data/relics.js?v=2',
  './js/data/achievements.js?v=2',
  './js/engine/state.js?v=2',
  './js/engine/vfx.js?v=2',
  './js/engine/battle.js?v=2',
  './js/ui/renderer.js?v=2',
  './js/main.js?v=2'
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
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Network-First with offline cache fallback: always serves fresh updates online, works 100% offline
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return res;
      })
      .catch(() => caches.match(req).then((cached) => {
        if (cached) return cached;
        if (req.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('', { status: 503, statusText: 'Offline' });
      }))
  );
});
