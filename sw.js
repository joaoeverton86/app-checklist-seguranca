const CACHE_NAME = 'checklist-v140';
const SHELL_URLS = [
    './',
    './index.html',
    './app.js',
    './data.js',
    './index.css',
    './manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.keys().then(names => {
            return Promise.all(
                names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
            );
        }).then(() => caches.open(CACHE_NAME))
        .then(cache => cache.addAll(SHELL_URLS))
        .then(() => self.skipWaiting())
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

    // API do Supabase é dado dinâmico (mesma URL "?select=*" sempre) - com cache-first isso
    // travava a resposta da PRIMEIRA consulta pra sempre no cache do SW, escondendo tudo que
    // era sincronizado depois em outro aparelho até o próximo deploy trocar o CACHE_NAME.
    if (url.hostname.endsWith('.supabase.co')) {
        return;
    }

    // /dashboard/ é um site à parte (painel gerencial, sem PWA/offline próprio) - não deve
    // ficar sob o cache deste Service Worker. Sem essa exclusão, qualquer atualização do
    // dashboard.css/dashboard.js só aparecia pra quem já tinha aberto o app principal nesse
    // navegador depois do próximo deploy do app (que troca o CACHE_NAME), mesmo sem nenhuma
    // relação real entre as duas coisas.
    if (url.pathname.includes('/dashboard/')) {
        return;
    }

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
                });
            })
        );
        return;
    }

    const isShellFile = SHELL_URLS.some(s => url.pathname.endsWith(s.replace('./', '/')));

    if (isShellFile) {
        event.respondWith(
            fetch(event.request, { cache: 'no-cache' }).then(response => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                return response;
            }).catch(() => caches.match(event.request))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            });
        })
    );
});
