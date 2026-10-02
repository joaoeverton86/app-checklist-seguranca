const CACHE_NAME = 'app-checklist-v2.0';
const SHELL_URLS = [
    './',
    './index.html',
    './app.js',
    './data.js',
    './index.css',
    './manifest.json',
    './qrcode.min.js',
    './icon-192.png',
    './icon-512.png'
];

// Bibliotecas de terceiro (CDN) essenciais para operação offline do aplicativo em campo:
// Leitura de QR Code, gráficos, exportação PDF de espelho de checklist e hashes.
const CDN_URLS = [
    'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/dist/bcrypt.min.js'
];

// Ouvinte para atualização sob demanda: acionado pelo banner "Atualizar Agora"
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(SHELL_URLS).then(() => {
                return Promise.allSettled(CDN_URLS.map(url => cache.add(url)));
            });
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(names => {
            return Promise.all(
                names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    if (url.hostname === 'script.google.com' || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
        return;
    }

    // API do Supabase é dinâmica (PostgREST / Auth). A camada cliente de dados (IndexedDB / sync_queue)
    // assume o controle total offline.
    if (url.hostname.endsWith('.supabase.co')) {
        return;
    }

    // /dashboard/ é painel administrativo separado sem PWA offline
    if (url.pathname.includes('/dashboard/')) {
        return;
    }

    // Bibliotecas CDN externas: Cache First com atualização em background quando online
    if (url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'cdnjs.cloudflare.com') {
        event.respondWith(
            caches.match(event.request).then(cached => {
                if (cached) return cached;
                return fetch(event.request).then(response => {
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                }).catch(() => cached);
            })
        );
        return;
    }

    const isShellFile = SHELL_URLS.some(s => url.pathname.endsWith(s.replace('./', '/')) || (s === './' && (url.pathname === '/' || url.pathname.endsWith('/index.html'))));

    // Recursos da casca da aplicação (HTML/JS/CSS): Network first com fallback garantido para cache offline
    if (isShellFile) {
        event.respondWith(
            fetch(event.request, { cache: 'no-cache' }).then(response => {
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => {
                return caches.match(event.request).then(cached => {
                    if (cached) return cached;
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html') || caches.match('/');
                    }
                    return null;
                });
            })
        );
        return;
    }

    // Demais recursos: Cache com fallback para rede
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => {
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
                return null;
            });
        })
    );
});
