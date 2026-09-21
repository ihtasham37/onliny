const CACHE_NAME = 'onliny-pwa-v7';

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

  const url = new URL(event.request.url);

  // For JS, CSS, or API assets, NEVER fall back to index.html on failure or 404
  const isAsset = url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.includes('/assets/');
  const isApi = url.pathname.startsWith('/api/');

  if (isAsset || isApi) {
    event.respondWith(
      fetch(event.request).then((res) => {
        // If 404 for a JS asset, don't cache it
        return res;
      }).catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        return new Response('Asset Not Found', { status: 404, statusText: 'Not Found' });
      })
    );
    return;
  }

  // Network-first strategy for dynamic page navigation
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      const indexHtml = await caches.match('/');
      if (indexHtml) return indexHtml;
      return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    })
  );
});

