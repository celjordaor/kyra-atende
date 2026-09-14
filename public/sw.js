// Kyra Atende — Service Worker v1.0
// Push Notifications + Offline Cache

const CACHE_NAME = 'kyra-v2';
const OFFLINE_URL = '/dashboard';

// ── Lifecycle ────────────────────────────────────────────────────────────────

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([
        '/manifest.webmanifest',
        '/icons/icon-192.png',
        '/icons/icon-512.png',
        '/icons/badge-72.png',
      ])
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  // Remove caches antigos
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => clients.claim())
  );
});

// ── Push Notifications ────────────────────────────────────────────────────────

self.addEventListener('push', (e) => {
  let data = {};
  try {
    data = e.data?.json() ?? {};
  } catch {
    data = { title: 'Kyra Atende', body: e.data?.text() ?? '' };
  }

  const {
    title = 'Kyra Atende',
    body  = '',
    url   = '/dashboard',
    icon  = '/icons/icon-192.png',
    badge = '/icons/badge-72.png',
    tag,
  } = data;

  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      data:     { url },
      vibrate:  [200, 100, 200],
      tag:      tag ?? 'kyra-default',
      renotify: !!tag,
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();

  const url = e.notification.data?.url ?? '/dashboard';

  e.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((wins) => {
        // Se já há uma janela com a origem → foco + navega
        for (const w of wins) {
          if (w.url.includes(self.location.origin)) {
            w.focus();
            w.navigate(url);
            return;
          }
        }
        // Caso contrário abre nova aba
        clients.openWindow(url);
      })
  );
});

self.addEventListener('notificationclose', () => {
  // Métricas futuras: evento de fechamento sem clique
});

// ── Fetch (network-first para rotas de API, cache-first para assets) ────────

self.addEventListener('fetch', (e) => {
  // Não interceptar requests de outras origens
  if (!e.request.url.startsWith(self.location.origin)) return;

  // Sempre rede para APIs
  if (e.request.url.includes('/api/')) return;

  // Para navegação, tenta rede; fallback para offline shell
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() =>
        caches.match(OFFLINE_URL).then((cached) => cached ?? fetch(OFFLINE_URL))
      )
    );
    return;
  }

  // Assets estáticos: cache-first
  e.respondWith(
    caches.match(e.request).then((cached) =>
      cached ?? fetch(e.request).then((response) => {
        if (response.ok && e.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return response;
      })
    )
  );
});
