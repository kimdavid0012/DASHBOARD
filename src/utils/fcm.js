/**
 * Firebase Cloud Messaging — client integration
 *
 * Permite recibir push notifications REALES aunque la app esté cerrada
 * (a diferencia de notifications.js que solo dispara notifs locales).
 *
 * Flujo:
 *   1. Usuario habilita push en Settings
 *   2. requestFCMToken() pide permiso + genera token FCM único del device
 *   3. Token se guarda en Firestore users/{uid}/fcmTokens/{tokenId}
 *   4. Backend (Cloud Function) usa Admin SDK para enviar push a esos tokens
 *
 * Requisitos para que funcione en producción:
 *   - Firebase Cloud Messaging habilitado en Firebase Console
 *   - VAPID public key configurada en env:
 *       VITE_FIREBASE_VAPID_KEY
 *   - firebase-messaging-sw.js en /public (se registra automático)
 *
 * Si falta la VAPID key, este módulo queda inerte pero no rompe la app.
 */

import { initFirebase, isFirebaseConfigured } from './firebase';

let messaging = null;
let currentToken = null;

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

export function isFCMAvailable() {
    return isFirebaseConfigured() &&
           !!VAPID_KEY &&
           'serviceWorker' in navigator &&
           'PushManager' in window &&
           'Notification' in window;
}

export function getFCMStatus() {
    if (!isFirebaseConfigured()) return { ok: false, reason: 'Firebase no configurado' };
    if (!VAPID_KEY) return { ok: false, reason: 'VITE_FIREBASE_VAPID_KEY no está en env vars' };
    if (!('serviceWorker' in navigator)) return { ok: false, reason: 'Service Worker no soportado' };
    if (!('PushManager' in window)) return { ok: false, reason: 'Push API no soportada en este browser' };
    if (!('Notification' in window)) return { ok: false, reason: 'Notification API no soportada' };
    return { ok: true };
}

/**
 * Inicializa Firebase Messaging (lazy)
 */
async function initMessaging() {
    if (messaging) return messaging;
    if (!isFCMAvailable()) throw new Error(getFCMStatus().reason);

    await initFirebase();
    const { getMessaging } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging.js');
    // Usamos el mismo app inicializado
    const { getApp } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js');
    messaging = getMessaging(getApp());
    return messaging;
}

/**
 * Pide permiso + registra FCM SW + genera token + guarda en Firestore
 */
export async function subscribeToPush(uid) {
    if (!isFCMAvailable()) {
        throw new Error(getFCMStatus().reason);
    }

    // 1. Permiso
    if (Notification.permission !== 'granted') {
        const p = await Notification.requestPermission();
        if (p !== 'granted') throw new Error('Permiso de notificaciones denegado');
    }

    // 2. Registrar SW específico de FCM (distinto al sw.js principal)
    let swReg;
    try {
        swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/firebase-cloud-messaging-push-scope' });
        await navigator.serviceWorker.ready;
    } catch (err) {
        throw new Error(`No se pudo registrar SW de FCM: ${err.message}`);
    }

    // 3. Obtener token FCM
    const { getToken } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging.js');
    const msg = await initMessaging();
    const token = await getToken(msg, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swReg
    });

    if (!token) throw new Error('FCM no devolvió token');

    currentToken = token;

    // 4. Guardar en Firestore
    if (uid) {
        const { getFirestore, doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');
        const { getApp } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js');
        const db = getFirestore(getApp());
        // Usamos el primer trozo del token como doc id para evitar duplicados
        const tokenId = token.slice(-20);
        await setDoc(doc(db, 'users', uid, 'fcmTokens', tokenId), {
            token,
            userAgent: navigator.userAgent,
            platform: detectPlatform(),
            createdAt: serverTimestamp(),
            lastUsed: serverTimestamp()
        });
    }

    return token;
}

/**
 * Desuscribe el device: borra el token de Firestore y deshabilita push
 */
export async function unsubscribeFromPush(uid) {
    if (!currentToken) return;
    const { deleteToken } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging.js');
    const msg = await initMessaging();
    await deleteToken(msg);

    if (uid) {
        const { getFirestore, doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');
        const { getApp } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js');
        const db = getFirestore(getApp());
        const tokenId = currentToken.slice(-20);
        await deleteDoc(doc(db, 'users', uid, 'fcmTokens', tokenId));
    }

    currentToken = null;
}

/**
 * Handler para mensajes foreground (cuando la app está abierta)
 * Background messages los maneja firebase-messaging-sw.js automáticamente
 */
export async function onForegroundMessage(callback) {
    const { onMessage } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging.js');
    const msg = await initMessaging();
    return onMessage(msg, (payload) => {
        // Mostrar notif local manualmente porque foreground messages no disparan SW
        if (payload.notification && Notification.permission === 'granted') {
            import('./notifications').then(({ showLocalNotification }) => {
                showLocalNotification({
                    title: payload.notification.title,
                    body: payload.notification.body,
                    url: payload.data?.url || '/',
                    tag: payload.data?.tag || 'fcm-foreground'
                });
            });
        }
        callback?.(payload);
    });
}

function detectPlatform() {
    const ua = navigator.userAgent;
    if (/Android/i.test(ua)) return 'android';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
    if (/Windows/i.test(ua)) return 'windows';
    if (/Mac/i.test(ua)) return 'mac';
    if (/Linux/i.test(ua)) return 'linux';
    return 'unknown';
}

export function getCurrentToken() {
    return currentToken;
}
