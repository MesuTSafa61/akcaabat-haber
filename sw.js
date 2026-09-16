/*
 * Akçaabat Haber
 * Service Worker
 * Sürüm: 1.1.0
 */

const CACHE_NAME = "akcaabat-haber-v100";
const BASE_URL = new URL("./", self.location.href);

const STATIC_FILES = [
  "",
  "index.html",
  "haber.html",
  "haber-detay.html",
  "kategori.html",
  "mac-merkezi.html",
  "kameralar.html",
  "trafik.html",
  "yazarlar.html",
  "offline.html",
  "style.css",
  "portal-shell.css",
  "script.js",
  "portal-shell.js",
  "supabase-config.js",
  "favicon.svg",
  "site.webmanifest"
].map(path => new URL(path, BASE_URL).href);

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
            return caches.match(
              new URL("offline.html", BASE_URL).href
            );
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
