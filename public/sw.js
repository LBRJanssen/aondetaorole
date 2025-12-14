// Service Worker para PWA - Aonde Ta o Role
const CACHE_NAME = 'aonde-ta-o-role-v1';
const OFFLINE_URL = '/offline';

// Recursos para cache inicial
const STATIC_ASSETS = [
  '/',
  '/home',
  '/festas',
  '/login',
  '/registro',
  '/offline',
  '/manifest.json',
];

// Instalacao do Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cache aberto');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Ativa imediatamente
  self.skipWaiting();
});

// Ativacao do Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Remove caches antigos
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Assume controle imediato
  self.clients.claim();
});

// Estrategia de fetch: Network First com fallback para cache
self.addEventListener('fetch', (event) => {
  // Ignora requisicoes que nao sao GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Ignora requisicoes de API externa (ex: mapas)
  const url = new URL(event.request.url);
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('leaflet') ||
    url.pathname.includes('tile')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Se a resposta for valida, clona e armazena no cache
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(async () => {
        // Se offline, tenta buscar do cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // Se for navegacao, retorna pagina offline
        if (event.request.mode === 'navigate') {
          const offlinePage = await caches.match(OFFLINE_URL);
          if (offlinePage) {
            return offlinePage;
          }
        }

        // Retorna erro generico
        return new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable',
        });
      })
  );
});

// Listener para mensagens do cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Sincronizacao em background (para futura implementacao)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-events') {
    console.log('[SW] Sincronizando eventos em background');
    // Implementar sincronizacao de dados offline
  }
});

// Push notifications (para futura implementacao)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/home',
      },
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Click em notificacao
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});

