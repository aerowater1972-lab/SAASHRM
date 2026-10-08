/* Flexy HRMS service worker.
 *
 * - Precache: app shell (login, offline fallback, manifest, icons).
 * - Static assets (/_next/static): stale-while-revalidate.
 * - Navigations: network-first, fall back to /offline when unreachable.
 * - Background Sync tag "clock-outbox": the page owns the authed POSTs,
 *   so the SW just nudges open clients to flush (see pwa-register).
 */
const VERSION = 'flexy-v1';
const PRECACHE = [
  '/offline',
  '/login',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => undefined),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim())
      .catch(() => undefined),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Static build assets: cache-first, refresh in background.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(request, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // API calls: never served from SW cache (auth + freshness matter).
  if (url.pathname.startsWith('/api/')) return;

  // Navigations: network-first with offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline')),
    );
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'clock-outbox') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((c) => c.postMessage({ type: 'FLUSH_CLOCK_OUTBOX' }));
      }),
    );
  }
});
