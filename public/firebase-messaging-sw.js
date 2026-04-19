// firebase-messaging-sw.js
// Service Worker específico para Firebase Cloud Messaging
// Debe estar en /public con este nombre exacto (requisito de FCM SDK)
//
// Recibe push notifications cuando la app está cerrada o en background
// Foreground messages los maneja fcm.js en el frontend

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// Config se inyecta al buildear o se hace hardcode con valores públicos
// El VAPID key es la que pide permisos, estas son las de proyecto
self.FIREBASE_CONFIG = {
    apiKey: self.FIREBASE_API_KEY_PLACEHOLDER || 'AIzaSyBXTjeQBRTlEPCSzo-uwsP6RVUcHuwMqX0',
    authDomain: 'dashboard-1b5cd.firebaseapp.com',
    projectId: 'dashboard-1b5cd',
    messagingSenderId: '286067347065',
    appId: '1:286067347065:web:966ea55f395a7fc7438ea8'
};

firebase.initializeApp(self.FIREBASE_CONFIG);
const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || 'Dashboard';
    const options = {
        body: payload.notification?.body || '',
        icon: payload.notification?.icon || '/icon-192.svg',
        badge: '/icon-192.svg',
        tag: payload.data?.tag || 'fcm-bg',
        data: {
            url: payload.data?.url || '/',
            ...payload.data
        },
        vibrate: [100, 50, 100],
        renotify: true
    };
    return self.registration.showNotification(title, options);
});

// Reutilizamos el handler de notificationclick del sw.js principal
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
