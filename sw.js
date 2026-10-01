/*
 * Akçaabat Haber
 * Service Worker
 * Sürüm: 1.0.0
 */

const CACHE_NAME = "akcaabat-haber-v172";
const CACHE_PREFIX = "akcaabat-haber-v";

const STATIC_FILES = ["./offline.html"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .catch(() => caches.match(new URL("./offline.html", self.registration.scope).href))
    );
    return;
  }

  const isFreshAsset =
    requestUrl.pathname.endsWith("/data/yerel-hizmetler.json") ||
    requestUrl.pathname.includes("/assets/akcaabat-haber-logo-") ||
    /\.(?:css|js)(?:\?|$)/i.test(requestUrl.pathname + requestUrl.search);

  const updateCache = networkResponse => {
    if (
      networkResponse &&
      networkResponse.status === 200 &&
      networkResponse.type !== "opaque"
    ) {
      const responseClone = networkResponse.clone();
      caches.open(CACHE_NAME).then(cache => {
        cache.put(event.request, responseClone);
      });
    }
    return networkResponse;
  };

  if (isFreshAsset) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then(updateCache)
        .catch(() =>
          caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) return cachedResponse;
            return new Response("İçerik şu anda kullanılamıyor.", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" }
            });
          })
        )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse =>
      cachedResponse || fetch(event.request).then(updateCache)
    )
  );
});
