// ============================================================================
// sw.js — offline app-shell cache for abdelrezakbezzag.
// Registered by the PWA object in index.html (navigator.serviceWorker.register('./sw.js')).
// Bump CACHE_NAME whenever you change index.html/manifest so old clients pick
// up the new version instead of serving a stale cached copy forever.
// ============================================================================
const CACHE_NAME = 'abdelrezakbezzag-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only ever cache GET requests for our own origin.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // Never cache the AI proxy — chat replies must always be live/fresh.
  if (new URL(req.url).pathname.startsWith('/api/')) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached); // offline: fall back to whatever was cached
      return cached || network;
    })
  );
});
