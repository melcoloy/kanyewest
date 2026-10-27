// ---------- Service worker (PWA) ----------
// Rend le site installable et consultable hors ligne.
//   - Fichiers du site : réseau d'abord (toujours à jour en ligne), copie en cache pour le hors-ligne.
//   - Pochettes Apple et polices Google : cache d'abord (elles ne changent pas).
//   - API iTunes et extraits audio : jamais mis en cache (le blind test a besoin du réseau).
// Après une modification du site, pas besoin de changer VERSION : le réseau passe en premier.
// Change-la seulement si tu ajoutes / renommes des fichiers dans SHELL.

const VERSION = "v3";
const SHELL_CACHE = `ye-shell-${VERSION}`;
const ASSET_CACHE = "ye-assets";
const MAX_ASSETS = 120;

const SHELL = [
  "./",
  "index.html",
  "css/style.css",
  "manifest.webmanifest",
  "data/albums.js",
  "data/tracklists.js",
  "data/stats.js",
  "data/track-streams.js",
  "data/samples.js",
  "data/history.js",
  "js/covers.js",
  "js/app.js",
  "js/previews.js",
  "js/player.js",
  "js/game.js",
  "js/jeux.js",
  "js/comparer.js",
  "js/invites.js",
  "js/blindtest.js",
  "js/samples.js",
  "js/tierlist.js",
  "js/theme.js",
  "js/tabs.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("ye-shell-") && k !== SHELL_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(req) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return (await cache.match(req, { ignoreSearch: true })) || (req.mode === "navigate" ? cache.match("index.html") : Response.error());
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === "opaque") {
    await cache.put(req, res.clone());
    const keys = await cache.keys();
    if (keys.length > MAX_ASSETS) await cache.delete(keys[0]); // on garde le cache raisonnable
  }
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) return e.respondWith(networkFirst(req));
  if (/mzstatic\.com$/.test(url.hostname) && req.destination === "image") return e.respondWith(cacheFirst(req));
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) return e.respondWith(cacheFirst(req));
  // Le reste (API iTunes, extraits audio…) passe directement par le réseau
});
