const CACHE = 'stitchpad-shell-v2';

async function precacheShell() {
  const cache = await caches.open(CACHE);
  const indexURL = new URL('./index.html', self.location.href);
  const response = await fetch(indexURL, { cache: 'reload' });
  const html = await response.clone().text();
  await cache.put(indexURL, response);
  const paths = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((path) => !path.startsWith('data:'))
    .map((path) => new URL(path, indexURL).href);
  await cache.addAll([...new Set([new URL('./', self.location.href).href, ...paths])]);
}

self.addEventListener('install', (event) => event.waitUntil(precacheShell()));
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('activate', (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin)
    return;
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches
            .open(CACHE)
            .then((cache) => cache.put(new URL('./index.html', self.location.href), copy));
          return response;
        })
        .catch(() => caches.match(new URL('./index.html', self.location.href))),
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return response;
        }),
    ),
  );
});
