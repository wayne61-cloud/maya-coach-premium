const CACHE_NAME = "maya-coach-shell-v3-20260329-1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./index.html?v=20260329-1",
  "./styles.css?v=20260329-1",
  "./manifest.webmanifest?v=20260329-1",
  "./js/main.js?v=20260329-1"
];

function isSameOrigin(request) {
  return request.url.startsWith(self.location.origin);
}

function isShellRequest(request) {
  return ["document", "script", "style", "manifest"].includes(request.destination);
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response.ok && isSameOrigin(request)) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error("offline");
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && isSameOrigin(request)) {
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : null))))
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || !isSameOrigin(request)) return;

  if (isShellRequest(request)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (request.destination === "image") {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      const existing = windowClients[0];
      if (existing) return existing.focus();
      return clients.openWindow("./index.html");
    })
  );
});
