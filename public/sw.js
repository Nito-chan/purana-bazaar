const CACHE_NAME = 'purana-bazaar-v1';
const SHELL = ['/', '/favicon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests.
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Navigation requests: app shell first, network update in background.
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/').then((cached) =>
        fetch(request)
          .then((response) => {
            const copy = response.clone();
            if (response.ok) {
              caches.open(CACHE_NAME).then((cache) => cache.put('/', copy));
            }
            return response;
          })
          .catch(() => cached),
      ),
    );
    return;
  }

  // Static assets: cache-first, then network, then populate cache.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
