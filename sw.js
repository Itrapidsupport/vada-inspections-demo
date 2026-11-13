/* Offline shell for the inspections app. One registration per tenant: script /sw.js, scope /<slug>/.
   A reload in a unit with weak signal still opens. Pages: network first, cache fallback.
   Static assets (hashed) and tenant logos: cache first. A new version waits until the app is on its
   home screen (the page posts "activate"). */
const ROOT = new URL("./", self.location).pathname;          // "/" or "/<basePath>/"
const SCOPE = new URL(self.registration.scope).pathname;     // "/<slug>/"
const CACHE = "pmi-" + SCOPE.replace(/\W+/g, "") + "-v1";
const STATIC = "pmi-static-v1";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([SCOPE])));
});
self.addEventListener("message", (e) => { if (e.data === "activate") self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  const prefix = "pmi-" + SCOPE.replace(/\W+/g, "") + "-";
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith(prefix) && k !== CACHE).map((k) => caches.delete(k)))));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (req.mode === "navigate" && url.pathname.startsWith(SCOPE)) {
    e.respondWith(fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(SCOPE, copy)); } return res; }).catch(() => caches.match(SCOPE)));
    return;
  }
  if (url.pathname.startsWith(ROOT + "_next/") || url.pathname.startsWith(ROOT + "t/")) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(STATIC).then((c) => c.put(req, copy)); } return res; })));
  }
});
