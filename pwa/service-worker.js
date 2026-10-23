// Hält die App für den Offline-Betrieb im Klassenraum vor. Die Platzhalter für Dateiliste und Version
// füllt der Build (siehe vite.config.ts); jeder neue Stand bekommt einen neuen Cache.
// Schülerdaten liegen nicht hier, sondern in IndexedDB.
const CACHE = 'noten-__VERSION__';
const DATEIEN = __DATEIEN__;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(DATEIEN))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((namen) => Promise.all(namen.filter((n) => n.startsWith('noten-') && n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

// Erst aus dem Speicher, damit die App auch bei schlechtem Schul-WLAN sofort startet.
// Neue Versionen kommen über einen neuen Service Worker und gelten ab dem nächsten Start.
self.addEventListener('fetch', (e) => {
  const anfrage = e.request;
  if (anfrage.method !== 'GET' || new URL(anfrage.url).origin !== self.location.origin) return;
  e.respondWith(
    caches
      .match(anfrage, { ignoreSearch: true })
      .then((antwort) => antwort ?? (anfrage.mode === 'navigate' ? caches.match('./') : undefined))
      .then((antwort) => antwort ?? fetch(anfrage)),
  );
});
