const CACHE_NAME = 'onliny-pwa-v8';

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
        return res;
      }).catch(async () => {
        const cached = await caches.match(event.request, { ignoreSearch: true });
        if (cached) return cached;
        return new Response('Asset Not Found', { status: 404, statusText: 'Not Found' });
      })
    );
    return;
  }

  // Network-first strategy for dynamic page navigation with cache fallback
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request, { ignoreSearch: true });
      if (cached) return cached;
      const indexHtml = await caches.match('/', { ignoreSearch: true });
      if (indexHtml) return indexHtml;
      return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    })
  );
});

// PWA Notification Click Handler - opens order tracking / store page on mobile tap
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Push notification listener for background server push messages
self.addEventListener('push', (event) => {
  let data = { title: 'Zivio Store Update', body: 'You have a new update on your order!' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }

  const options = {
    body: data.body,
    icon: '/favicon.svg',
    badge: '/pwa-192x192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Zivio Store Update', options)
  );
});

