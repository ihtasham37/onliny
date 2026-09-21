const CACHE_NAME = 'onliny-pwa-v6';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const urlsToCache = [
        '/',
        '/manifest.json',
        '/favicon.svg',
        '/apple-touch-icon.png',
        '/pwa-192x192.png',
        '/pwa-512x512.png',
        '/pwa-maskable-512x512.png'
      ];
      try {
        await Promise.allSettled(urlsToCache.map(url => cache.add(url)));
      } catch (e) {}
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle standard GET HTTP/HTTPS requests
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  // Network-first strategy for dynamic store content, fallback to cache
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then(cached => cached || caches.match('/'));
    })
  );
});
