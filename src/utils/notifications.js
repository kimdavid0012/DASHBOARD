/**
 * Notifications helper — pide permiso + dispara notifs locales via SW
 *
 * La app puede enviar notificaciones sin servidor push:
 *   - Usando la Notification API directamente (si es tab activa)
 *   - Via Service Worker showNotification (funciona aunque la app no sea la tab activa)
 *
 * Para push REAL con backend (FCM) hace falta además:
 *   - Firebase Cloud Messaging configurado
 *   - VAPID key pública en el frontend
 *   - Suscripción del cliente guardada en Firestore
 *   - Backend que envíe vía FCM Admin SDK
 *   Este módulo deja todo preparado para agregar eso después.
 */

/**
 * Estado del permiso: 'granted' | 'denied' | 'default' | 'unsupported'
 */
export function getPermissionState() {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
}

/**
 * Pide permiso al usuario (solo se puede llamar desde un gesture)
 */
export async function requestPermission() {
    if (!('Notification' in window)) {
        return { ok: false, reason: 'Tu navegador no soporta notificaciones' };
    }
    if (Notification.permission === 'granted') {
        return { ok: true };
    }
    if (Notification.permission === 'denied') {
        return { ok: false, reason: 'Bloqueaste las notificaciones. Actívalas desde la configuración del navegador.' };
    }
    try {
        const result = await Notification.requestPermission();
        return { ok: result === 'granted', reason: result === 'denied' ? 'Permiso rechazado' : '' };
    } catch (err) {
        return { ok: false, reason: err.message };
    }
}

/**
 * Muestra notificación local (via Service Worker si está disponible, sino API directa)
 */
export async function showLocalNotification({ title, body, tag, url, vibrate }) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return false;
    }

    // Preferimos via SW porque funciona aunque el tab no esté visible
    if ('serviceWorker' in navigator) {
        try {
            const reg = await navigator.serviceWorker.ready;
            reg.active?.postMessage({
                type: 'SHOW_NOTIFICATION',
                data: { title, body, tag, url }
            });
            return true;
        } catch { /* fallback */ }
    }

    // Fallback: Notification API directa (solo funciona si tab activa)
    try {
        new Notification(title, {
            body,
            icon: '/icon-192.svg',
            tag,
            vibrate: vibrate || [100, 50, 100]
        });
        return true;
    } catch {
        return false;
    }
}

/**
 * Registrar background sync (Chrome/Android)
 * Se dispara cuando el browser recupera conexión después de estar offline
 */
export async function registerBackgroundSync() {
    if (!('serviceWorker' in navigator) || !('SyncManager' in window)) return false;
    try {
        const reg = await navigator.serviceWorker.ready;
        await reg.sync.register('sync-dashboard-data');
        return true;
    } catch {
        return false;
    }
}

/**
 * Registrar periodic sync (experimental, Chrome Android)
 * Permite actualizar datos cada N horas aunque la app esté cerrada
 */
export async function registerPeriodicSync(minIntervalHours = 6) {
    if (!('serviceWorker' in navigator)) return false;
    try {
        const reg = await navigator.serviceWorker.ready;
        if (!reg.periodicSync) return false;

        const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
        if (status.state !== 'granted') return false;

        await reg.periodicSync.register('dashboard-refresh', {
            minInterval: minIntervalHours * 60 * 60 * 1000
        });
        return true;
    } catch {
        return false;
    }
}

/**
 * Verifica si la app está instalada como PWA
 */
export function isInstalledAsPWA() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
}

/**
 * Escucha mensajes del SW (ej: "SYNC_NOW" cuando recupera conexión)
 */
export function onServiceWorkerMessage(callback) {
    if (!('serviceWorker' in navigator)) return () => { };
    const handler = (event) => callback(event.data);
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
}
