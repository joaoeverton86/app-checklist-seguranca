// Service Worker - Checklist Segurança
const CACHE_NAME = 'checklist-v12';

// Instalar - limpar caches antigos
self.addEventListener('install', event => {
    event.waitUntil(
        caches.keys().then(names => {
            return Promise.all(
                names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
            );
        })
    );
    self.skipWaiting();
});

// Ativar
self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
});

// Buscar - Network First (sempre buscar arquivos novos)
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Salvar no cache para funcionar offline depois
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Se offline, usar cache
                return caches.match(event.request);
            })
    );
});
