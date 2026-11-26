'use strict';

const CACHE_NAME = 'ikai-zankyo-shell-v3';

const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/icons/emblem.svg',
  './css/tokens.css',
  './css/layout.css',
  './css/components.css',
  './css/animations.css',
  './js/namespace.js',
  './js/master-data.js',
  './js/save-security.js',
  './js/state-store.js',
  './js/audio-se.js',
  './js/combat-engine.js',
  './js/progression.js',
  './js/svg-icons.js',
  './js/ui-renderer.js',
  './js/router-input.js',
  './js/app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
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
  if (event.request.method !== 'GET') {
    return;
  }

  let reqUrl;
  try {
    reqUrl = new URL(event.request.url);
  } catch (_) {
    return;
  }

  if (reqUrl.origin !== self.location.origin) {
    return;
  }

  if (reqUrl.pathname.includes('/tests/') || reqUrl.pathname.includes('/docs/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request)
        .then((response) => {
          if (response && response.ok && response.type === 'basic') {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, cloned);
            });
          }
          return response;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('', { status: 503, statusText: 'Offline' });
        });
    })
  );
});
