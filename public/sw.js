// Minimal app-shell service worker. Caches navigations so the installed PWA
// opens offline; Firestore's own persistence handles all data offline.
// If this is ever replaced with a generated Workbox setup, use @serwist/next —
// @ducanh2912/next-pwa is unmaintained and its npm page now redirects there.
//
// BUMP `CACHE` ON EVERY RELEASE THAT CHANGES A STATIC ASSET.
// The static export hashes CSS and JS, so those self-bust. Unhashed assets do
// not — and that is exactly where the theme lives: `manifest.json` (theme_color)
// and `/icons/*`. Without a bump, the two installed phones keep serving the old
// ones from cache forever, because static assets below are cache-first.
const CACHE = "et-shell-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Drop every cache from a previous version, then take over open clients. The
  // old worker never pruned, so stale shells accumulated indefinitely.
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Network-first for navigations, fall back to cached shell when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((r) => r ?? caches.match("/"))),
    );
    return;
  }

  // Network-first for the manifest so a changed theme_color is picked up on the
  // next launch instead of waiting for a cache bump to reach the device.
  if (request.url.endsWith("/manifest.json")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => (await caches.match(request)) ?? Response.error()),
    );
    return;
  }

  // Cache-first for static assets.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        }),
    ),
  );
});
