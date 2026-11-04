/* Fil d'Or : service worker
   Fonctionnement : l'appli est copiée dans le téléphone à la première ouverture,
   puis s'ouvre sans connexion. Les données des clients ne passent JAMAIS par ici :
   elles restent dans le stockage de l'appareil.

   POUR PUBLIER UNE NOUVELLE VERSION : changer le numéro VERSION ci-dessous
   (par exemple fildor-v2). Les utilisateurs verront « Une nouvelle version est disponible ». */
const VERSION = "fildor-v1";

const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-192.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
  "./favicon-32.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(VERSION).then(function (cache) {
      /* cache: "reload" : on ignore le cache HTTP pour être sûr de copier les fichiers à jour */
      return cache.addAll(SHELL.map(function (u) { return new Request(u, { cache: "reload" }); }));
    })
  );
  /* pas de skipWaiting automatique : c'est l'utilisateur qui choisit le moment de la mise à jour */
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
  if (url.origin !== self.location.origin) return;        /* on ne touche pas aux autres sites (WhatsApp, etc.) */

  /* ouverture de l'appli : page en cache d'abord, même sans réseau */
  if (req.mode === "navigate") {
    event.respondWith(
      caches.match("./index.html", { ignoreSearch: true }).then(function (hit) {
        return hit || fetch(req);
      })
    );
    return;
  }

  /* autres fichiers : cache d'abord, sinon réseau (et on garde une copie) */
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
