// Dashboard Service Worker - offline-first
const CACHE_NAME = 'dashboard-v3-1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.webmanifest',
    '/icon-192.svg',
    '/icon-512.svg'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
            await self.clients.claim();
        })()
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Solo GET
    if (request.method !== 'GET') return;

    // No cacheamos llamadas a APIs externas (Anthropic/OpenAI)
    const url = new URL(request.url);
    if (url.hostname.includes('anthropic.com') || url.hostname.includes('openai.com') ||
        url.hostname.includes('googleapis.com') || url.hostname.includes('facebook.com')) {
        return;
    }

    // Estrategia: stale-while-revalidate para mismo origen
    if (url.origin === self.location.origin) {
        event.respondWith((async () => {
            const cache = await caches.open(CACHE_NAME);
            const cached = await cache.match(request);
            const networkPromise = fetch(request).then(response => {
                if (response && response.status === 200) {
                    cache.put(request, response.clone()).catch(() => { });
                }
                return response;
            }).catch(() => cached);
            return cached || networkPromise;
        })());
    }
});
