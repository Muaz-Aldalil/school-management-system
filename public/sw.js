const CACHE_NAME = 'al-amiriya-v3';

self.addEventListener('install', (e) => {
  e.waitUntil(
    Promise.resolve().then(() => {
      try { importScripts('sw-manifest.js'); } catch {}
      const precache = self.__SW_MANIFEST || [];
      return caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(['/offline.html', ...precache]).catch(() => {});
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Supabase REST API: stale-while-revalidate
  if (url.hostname.includes('supabase') && url.pathname.includes('/rest/v1/')) {
    e.respondWith(staleWhileRevalidate(e.request));
    return;
  }

  // Supabase Storage: cache-first
  if (url.hostname.includes('supabase') && url.pathname.includes('/storage/v1/')) {
    e.respondWith(cacheFirst(e.request));
    return;
  }

  // App shell: network-first with cache fallback
  e.respondWith(networkFirst(e.request));
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-outbox') {
    event.waitUntil(notifyClients());
  }
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function notifyClients() {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_OUTBOX' });
  });
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const fetched = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => cached);
  return cached || fetched;
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 503, statusText: 'Offline' });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok && request.url.startsWith(self.location.origin)) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || caches.match('/offline.html');
  }
}
