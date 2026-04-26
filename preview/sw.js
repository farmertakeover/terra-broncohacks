// terra.ai service worker
// Paths are relative to the SW's URL so this works on GitHub Pages
// (where the site lives under /terra-broncohacks/) and on a custom domain.

const CACHE = 'terra-ai-v1';
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon.svg',
  './html/home.html',
  './html/signin.html',
  './javascript/home.js',
  './javascript/signin.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Only intercept same-origin requests; let cross-origin (Open Food Facts, Google,
  // ZXing CDN, etc.) hit the network directly.
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
      // Network-first when no cache hit, cache-first when we have it
      return cached || network;
    })
  );
});
