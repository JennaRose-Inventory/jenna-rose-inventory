// Service Worker — Jenna Rose Inventory
// Handles background push notifications
const CACHE_NAME  = "jr-cache-v3";
const OFFLINE_URL = "/";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.add(OFFLINE_URL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network first for navigation
self.addEventListener("fetch", (e) => {
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE_URL)));
  }
});

// ── Handle background push notifications ──────────────────────────────────────
self.addEventListener("push", (e) => {
  if (!e.data) return;

  let data;
  try { data = e.data.json(); }
  catch { data = { title: "Jenna Rose", body: e.data.text() }; }

  const options = {
    body:               data.body  ?? "",
    icon:               data.icon  ?? "/icon.svg",
    badge:              data.badge ?? "/icon.svg",
    tag:                data.tag   ?? "jr-notification",
    renotify:           true,
    requireInteraction: false,
    vibrate:            [200, 100, 200],
    data:               { url: "/" },
  };

  e.waitUntil(
    self.registration.showNotification(data.title ?? "⚠️ Low Stock Alert", options)
  );
});

// ── Handle notification tap → open app ───────────────────────────────────────
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow("/");
    })
  );
});
