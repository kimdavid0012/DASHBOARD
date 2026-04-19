// Dashboard Service Worker v4 — offline + push + background sync
const CACHE_NAME = 'dashboard-v4';
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
        caches.open(CACHE_NAME).then((cache) =>
            Promise.allSettled(ASSETS_TO_CACHE.map(a => cache.add(a)))
        )
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
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.hostname.includes('anthropic.com') ||
        url.hostname.includes('openai.com') ||
        url.hostname.includes('googleapis.com') ||
        url.hostname.includes('facebook.com') ||
        url.hostname.includes('firebaseapp.com') ||
        url.hostname.includes('cloudfunctions.net') ||
        url.hostname.includes('elevenlabs.io') ||
        url.hostname.includes('afip.gov.ar')) {
        return;
    }

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

// PUSH handler — FCM compatible
self.addEventListener('push', (event) => {
    let data = {};
    try { data = event.data ? event.data.json() : {}; }
    catch { data = { title: 'Dashboard', body: event.data?.text() || 'Nueva notificación' }; }

    const title = data.title || data.notification?.title || 'Dashboard';
    const body = data.body || data.notification?.body || '';
    const tag = data.tag || 'dashboard-notif';
    const url = data.url || data.data?.url || '/';

    event.waitUntil(self.registration.showNotification(title, {
        body, tag, renotify: true,
        icon: data.icon || '/icon-192.svg',
        badge: '/icon-192.svg',
        vibrate: [100, 50, 100],
        data: { url, ...data.data },
        requireInteraction: data.requireInteraction || false,
        actions: data.actions || []
    }));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || '/';
    event.waitUntil((async () => {
        const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of windows) {
            if (client.url.includes(self.location.origin)) {
                await client.focus();
                if (client.navigate && targetUrl !== '/') {
                    try { await client.navigate(targetUrl); } catch { }
                }
                return;
            }
        }
        await self.clients.openWindow(targetUrl);
    })());
});

// Background sync
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-dashboard-data') {
        event.waitUntil((async () => {
            const clients = await self.clients.matchAll();
            clients.forEach(c => c.postMessage({ type: 'SYNC_NOW' }));
        })());
    }
});

// Periodic sync (experimental)
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'dashboard-refresh') {
        event.waitUntil((async () => {
            const clients = await self.clients.matchAll();
            clients.forEach(c => c.postMessage({ type: 'PERIODIC_SYNC' }));
        })());
    }
});

// Message from app
self.addEventListener('message', (event) => {
    const { type, data } = event.data || {};
    if (type === 'SHOW_NOTIFICATION') {
        self.registration.showNotification(data.title || 'Dashboard', {
            body: data.body || '',
            icon: '/icon-192.svg',
            badge: '/icon-192.svg',
            tag: data.tag || 'local',
            vibrate: [100, 50, 100],
            data: { url: data.url || '/' }
        });
    }
    if (type === 'SKIP_WAITING') self.skipWaiting();
});
