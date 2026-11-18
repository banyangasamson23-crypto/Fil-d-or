/* Fil d'Or : service worker (mode sans connexion) */
const VERSION = "fildor-v8";
const CORE = ["./", "./index.html", "./manifest.webmanifest"];
const EXTRA = [
  "./fo-icon.svg",
  "./ic8-192.png",
  "./ic8-512.png",
  "./ic8-maskable-192.png",
  "./ic8-maskable-512.png",
  "./ic8-apple.png",
  "./ic8-fav32.png"
];
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(VERSION).then(function (cache) {
      return cache.addAll(CORE.map(function (u) { return new Request(u, { cache: "reload" }); }))
        .then(function () {
          /* les images : si l'une manque, ça ne bloque plus l'installation */
          return Promise.all(EXTRA.map(function (u) { return cache.add(u).catch(function () {}); }));
        });
    })
  );
});
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});
self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});
self.addEventListener("fetch", function (event) {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    event.respondWith(
      caches.match("./index.html", { ignoreSearch: true }).then(function (hit) {
        return hit || fetch(req);
      })
    );
    return;
  }
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(req, copy); });
        }
        return res;
      });
    })
  );
});
