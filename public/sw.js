/* JiA service worker - STATIC assets only.
 * Deliberately NEVER caches: API calls (Supabase) or checkout/order pages --
 * data integrity beats offline comfort for a COD storefront. Pages are
 * network-first with a cached "/" offline fallback.
 */
const VERSION = "jia-media-v3";
const PRECACHE = ["/", "/manifest.webmanifest", "/logo.png", "/jia%20white-mode.png", "/jia%20dark-mode.png", "/images/hero.webp", "/images/hero.jpg", "/images/placeholder.jpg"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(PRECACHE).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // API + CDN images: never touch

  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match("/")));
    return;
  }
  if (url.pathname.startsWith("/assets/")) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
  }
});
