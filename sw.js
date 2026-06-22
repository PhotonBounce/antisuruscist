/* ═══════════════════════════════════════════════════════════════════════════
   ANTI-RUSCIST — Service Worker (Cache-first for assets, Network-first for API)
   ═══════════════════════════════════════════════════════════════════════════ */
/* Bump this version string on EVERY deploy to bust stale caches.
   Old caches are auto-deleted in the activate handler below. */
var CACHE_NAME = 'arc-v5.54-batch199';

/* Base path — change to '/' if deployed at domain root */
var BASE = '/ar/';

var PRECACHE = [
  BASE,
  BASE + 'index.html',
  BASE + 'vendor/jquery.min.js',
  BASE + 'vendor/tootik.min.css',
  BASE + 'scripts/api-client.js',
  BASE + 'scripts/main.js',
  BASE + 'scripts/adaptive-ai.js',
  BASE + 'scripts/agent-memory.js',
  BASE + 'scripts/ml-brain.js',
  BASE + 'scripts/agent-manager.js',
  BASE + 'scripts/engine-extras.js',
  BASE + 'scripts/jukebox.js',
  BASE + 'styles/main.css',
  BASE + 'icon-192.png',
  BASE + 'icon-512.png',
  BASE + 'manifest.json',
  BASE + 'images/background/bg-1.png',
  BASE + 'images/background/bg-2.png',
  BASE + 'images/background/bg-3.png',
  BASE + 'images/background/bg-4.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (n) { return n !== CACHE_NAME; })
             .map(function (n) { return caches.delete(n); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);

  // Network-first for API calls
  if (url.pathname.indexOf('/api/') === 0) {
    e.respondWith(
      fetch(e.request).catch(function () {
        return caches.match(e.request);
      })
    );
    return;
  }

  // Network-first for static assets (always get fresh code, fallback to cache offline)
  if (/\.(js|css|png|jpg|jpeg|gif|svg|webp|mp3|wav|ogg|woff2?|ttf|eot)$/i.test(url.pathname)) {
    e.respondWith(
      fetch(e.request).then(function (resp) {
        if (resp.ok) {
          var clone = resp.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(e.request, clone); });
        }
        return resp;
      }).catch(function () {
        return caches.match(e.request);
      })
    );
    return;
  }

  // Network-first for HTML (get latest, fallback to cache)
  e.respondWith(
    fetch(e.request).then(function (resp) {
      if (resp.ok) {
        var clone = resp.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(e.request, clone); });
      }
      return resp;
    }).catch(function () {
      return caches.match(e.request);
    })
  );
});
