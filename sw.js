const CACHE_NAME = "ganeshgallary-shell-v15";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./drive-config.js",
  "./public/manifest.webmanifest",
  "./public/drive-manifest.json",
  "./public/icons/icon.svg",
  "./public/icons/icon-192.png",
  "./public/icons/icon-512.png",
  "./public/icons/gallery-icon-192.png",
  "./public/icons/gallery-icon-512.png",
  "./public/icons/gallery-icon-maskable-192.png",
  "./public/icons/gallery-icon-maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  if (requestUrl.origin !== self.location.origin || event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) {
          return cached;
        }
        if (event.request.mode === "navigate") {
          return caches.match("./index.html");
        }
        throw new Error("Offline cache miss");
      })
  );
});
