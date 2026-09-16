/*
 * Akçaabat Haber
 * Service Worker
 * Sürüm: 1.0.0
 */

const CACHE_NAME = "akcaabat-haber-v104";

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
  "./mac-merkezi.html",
  "./kameralar.html",
  "./trafik.html",
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

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then(networkResponse => {
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type === "opaque"
          ) {
            return networkResponse;
          }

          const responseClone = networkResponse.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });

          return networkResponse;
        })
        .catch(() => {
          if (event.request.mode === "navigate") {
            return caches.match(new URL("./offline.html", self.registration.scope).href);
          }

          return new Response(
            "İçerik şu anda kullanılamıyor.",
            {
              status: 503,
              statusText: "Service Unavailable",
              headers: {
                "Content-Type": "text/plain; charset=utf-8"
              }
            }
          );
        });
    })
  );
});
