// Service worker for "Ruta de Inglés".
// Caches the app shell on install so the app opens even offline.
// Bump CACHE_NAME whenever you edit any file in the app shell so
// returning visitors pick up the new version instead of a stale cache.
const CACHE_NAME = 'ruta-ingles-v1';

const APP_SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(APP_SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

// Cache-first for same-origin GET requests (the app shell), falling back
// to the network and then caching what comes back. Requests to other
// origins (e.g. Google Fonts) are left to the network as-is — the app's
// CSS already falls back to system fonts if those can't be reached.
self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (response) {
        if (response && response.status === 200 && response.type === 'basic') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, clone); });
        }
        return response;
      }).catch(function () {
        if (req.mode === 'navigate') return caches.match('./index.html');
        return cached;
      });
    })
  );
});
