const CACHE = "princess-star-kingdom-v123";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./game.js",
  "./manifest.webmanifest",
  "./assets/princess-kingdom-v2.webp",
  "./assets/app-icon-512.webp",
  "./assets/app-icon-192.png",
  "./assets/power-row.webp",
  "./assets/power-col.webp",
  "./assets/power-bomb.webp",
  "./assets/power-rainbow.webp",
  "./assets/milu-russian-blue-v1.webp",
  "./assets/nana-wave-v1.webp",
  "./assets/royal-rocket-v1.webp",
  "./assets/rose-bomb-v1.webp",
  "./assets/royal-facilities-atlas-v1.webp",
  "./assets/gem-ruby.webp",
  "./assets/gem-sapphire.webp",
  "./assets/gem-emerald.webp",
  "./assets/gem-moon.webp",
  "./assets/gem-sun.webp",
  "./assets/gem-pearl-rose.webp"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match("./index.html")))
  );
});
