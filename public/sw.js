// Shipivo Service Worker — Phase 11 PWA
const CACHE_NAME = 'shipivo-v1';
const STATIC_ASSETS = [
  '/',
  '/admin',
  '/livreur',
  '/closureuse',
  '/manifest.json',
];

// Installation — mise en cache des assets statiques
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activation — nettoyer les anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch — stratégie Network First (toujours essayer le réseau)
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non-GET et les requêtes externes
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  // Ignorer les API Supabase (toujours live)
  if (event.request.url.includes('supabase.co')) return;
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Mettre en cache la réponse fraîche
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // Si réseau indisponible, servir depuis le cache
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // Page hors ligne par défaut
          return new Response(
            '<html><body style="background:#0A0A0F;color:#F8F8FC;font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center"><div><div style="font-size:48px;margin-bottom:16px">📦</div><h2 style="color:#F59E0B">Shipivo</h2><p style="color:#9898B0">Pas de connexion internet.<br/>Reconnectez-vous pour continuer.</p></div></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        });
      })
  );
});

// Notifications Push
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'Shipivo';
  const options = {
    body: data.body || 'Nouvelle notification',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/admin' },
    actions: [
      { action: 'open', title: 'Ouvrir' },
      { action: 'close', title: 'Fermer' }
    ]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Clic sur notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'close') return;
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find(c => c.url.includes(url) && 'focus' in c);
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
