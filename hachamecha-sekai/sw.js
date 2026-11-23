const CACHE_NAME = "hachamecha-sekai-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./css/base.css",
  "./css/layout.css",
  "./css/components.css",
  "./css/battle.css",
  "./js/constants.js",
  "./js/data-characters.js",
  "./js/data-stages.js",
  "./js/data-equip.js",
  "./js/storage.js",
  "./js/audio.js",
  "./js/ui-svg.js",
  "./js/ui-drag.js",
  "./js/battle-fx.js",
  "./js/battle-engine.js",
  "./js/ui-battle.js",
  "./js/ui-screens.js",
  "./js/app.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((res) => {
          if (!res || res.status !== 200 || res.type !== "basic") return res;
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
