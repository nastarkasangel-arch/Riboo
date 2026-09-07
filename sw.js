// abdelrezakbezzag — Offline-shell service worker.
// Caches the app shell (this HTML file + fonts) on first load, then serves
// from cache with a network update in the background ("stale-while-revalidate").
// Never caches POST requests or API calls to /api/* — those must always hit
// the network so chat replies are never served stale.
const CACHE_NAME = 'ab-shell-v2';
const SHELL_URLS = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Never cache backend calls — chat/text/image generation must stay live.
  if (url.pathname.startsWith('/api/')) return;
  if (url.origin !== self.location.origin && !url.hostname.endsWith('gstatic.com') && !url.hostname.endsWith('googleapis.com')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(req);
      const network = fetch(req).then((response) => {
        if (response && response.ok) cache.put(req, response.clone());
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
