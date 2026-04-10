const CACHE_NAME = 'notifeo-v1';

// Fichiers à pré-cacher (shell de l'app)
const PRECACHE = [
  '/logo-notifeo.png',
];

// Install: pré-cache les assets statiques
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// Activate: nettoie les anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first avec fallback cache (pour que l'app reste fonctionnelle)
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ne pas cacher les requêtes Supabase, les API calls, etc.
  if (
    request.url.includes('supabase.co') ||
    request.url.includes('/api/') ||
    request.method !== 'GET'
  ) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache les réponses réussies pour les assets statiques
        if (
          response.ok &&
          (request.url.includes('.png') ||
            request.url.includes('.jpg') ||
            request.url.includes('.svg') ||
            request.url.includes('.css') ||
            request.url.includes('.js'))
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
