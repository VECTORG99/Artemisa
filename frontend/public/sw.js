/* eslint-disable no-restricted-globals */
/**
 * Artemisa frontend Service Worker (#408).
 *
 * Minimal, dependency-free caching strategy:
 *  - Uses network-first for navigations so deploys serve fresh HTML before
 *    that HTML references hashed Next chunks.
 *  - Uses stale-while-revalidate for same-origin static GET requests.
 *  - Never caches /api/* (runtime data must always be fresh) or
 *    cross-origin / non-GET requests.
 *  - Cleans old cache versions on activate and claims clients.
 *
 * Intentionally hand-rolled rather than @serwist/next to avoid build
 * integration risk with Next 16 + Turbopack for a hackathon deployment.
 */
importScripts('/sw-version.js');

const CACHE_VERSION = self.ARTEMISA_SW_VERSION || 'dev';
const CACHE = `artemisa-${CACHE_VERSION}`;
const OFFLINE_FALLBACK = '/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.add(OFFLINE_FALLBACK).catch(() => {});
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Never serve API or Next internals data from cache — they must be fresh.
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/_next/data')) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);

      if (req.mode === 'navigate') {
        try {
          const fresh = await fetch(req);
          if (fresh && fresh.status === 200 && fresh.type === 'basic') {
            cache.put(req, fresh.clone()).catch(() => {});
          }
          return fresh;
        } catch {
          return (await cache.match(req)) || (await cache.match(OFFLINE_FALLBACK)) || Response.error();
        }
      }

      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => {
          // Only cache valid, same-origin basic responses.
          if (res && res.status === 200 && res.type === 'basic') {
            cache.put(req, res.clone()).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      // Stale-while-revalidate: cached first (if any), network revalidates.
      return cached || network;
    })(),
  );
});
