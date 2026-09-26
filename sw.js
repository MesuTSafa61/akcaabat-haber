/*
 * Akçaabat Haber
 * Service Worker
 * Sürüm: 1.0.0
 */

const CACHE_NAME = "akcaabat-haber-v126";

const STATIC_FILES = [
  "./",
  "./index.html",
  "./haberler.html",
  "./haber-detay.html",
  "./offline.html",
  "./style.css",
  "./script.js",
  "./home.js",
  "./current-news.js",
  "./assets/news/akcaabat.svg",
  "./assets/news/trabzon.svg",
  "./assets/news/trabzonspor.svg",
  "./assets/news/sebatspor.svg",
  "./assets/akcaabat-haber-logo-final.png",
  "./assets/akcaabat-haber-logo-final-v2.png",
  "./mac-merkezi.html",
  "./kameralar.html",
  "./trafik.html",
  "./hava-durumu.html",
  "./yazarlar.html",
  "./supabase-config.js",
  "./favicon.svg",
  "./site.webmanifest"
];

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
          .filter(key => key !== CACHE_NAME)
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

  const isFreshAsset =
    event.request.mode === "navigate" ||
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
      fetch(event.request)
        .then(updateCache)
        .catch(() =>
          caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) return cachedResponse;
            if (event.request.mode === "navigate") {
              return caches.match(new URL("./offline.html", self.registration.scope).href);
            }
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
