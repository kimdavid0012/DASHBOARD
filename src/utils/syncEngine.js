/**
 * Sync Engine: IndexedDB local <-> Google Drive
 *
 * Strategy: "local wins on save" (mismo patrón que Organizadormoda).
 * - En cada cambio: marca `pendingChanges = true`
 * - Cada 5 min: si hay pending changes, sube a Drive
 * - Al hacer login: baja desde Drive SI Drive es más reciente
 * - Conflict resolution: local wins (el usuario ve lo que acaba de escribir)
 *
 * User can force sync manually.
 */

import { uploadLatest, downloadLatest, cleanOldBackups, uploadBackup } from './gdrive';

const SYNC_INTERVAL_MS = 5 * 60 * 1000;
const DAILY_SNAPSHOT_HOUR = 3; // snapshot persistente a las 3am

let syncTimer = null;
let lastSyncedStateHash = null;
let snapshotDoneToday = null;

/**
 * Hash simple para comparar si state cambió (evita sync innecesarios)
 */
function hashState(state) {
    // Hash básico: tamaño + timestamps clave
    const str = JSON.stringify({
        ventasLen: state.ventas?.length || 0,
        productosLen: state.productos?.length || 0,
        clientesLen: state.clientes?.length || 0,
        facturasLen: state.afipFacturas?.length || 0,
        businessName: state.business?.name,
        rubro: state.business?.rubro,
        // updatedAt del último item de cada collection
        lastVentaAt: state.ventas?.[state.ventas.length - 1]?.createdAt,
        lastProductoAt: state.productos?.[state.productos.length - 1]?.updatedAt || state.productos?.[state.productos.length - 1]?.createdAt
    });
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return String(hash);
}

/**
 * Arranca el timer de sync. Devuelve función para pararlo.
 * `getState` es una función que retorna el state actual (porque cambia en el tiempo).
 */
export function startSyncEngine({ getState, onSyncStart, onSyncSuccess, onSyncError }) {
    stopSyncEngine();

    const doSync = async (manual = false) => {
        const state = getState();
        if (!state) return;

        const currentHash = hashState(state);
        if (!manual && currentHash === lastSyncedStateHash) {
            // Sin cambios, skip
            return { skipped: true };
        }

        try {
            onSyncStart?.();
            const result = await uploadLatest(state);
            lastSyncedStateHash = currentHash;

            // Daily snapshot (backup versionado)
            const now = new Date();
            const today = now.toISOString().slice(0, 10);
            if (now.getHours() >= DAILY_SNAPSHOT_HOUR && snapshotDoneToday !== today) {
                try {
                    await uploadBackup(state, `backup-${today}.json`);
                    snapshotDoneToday = today;
                    // Limpieza: mantener solo 30 snapshots
                    await cleanOldBackups(30).catch(() => { });
                } catch (err) {
                    console.warn('Daily snapshot failed:', err);
                }
            }

            onSyncSuccess?.({
                lastSyncAt: new Date().toISOString(),
                driveFileId: result.id,
                sizeKB: (parseInt(result.size || '0', 10) / 1024).toFixed(1)
            });
            return { success: true, ...result };
        } catch (err) {
            console.error('Sync error:', err);
            onSyncError?.(err);
            return { error: err.message };
        }
    };

    // Sync inicial después de 10s (dar tiempo al hydrate)
    setTimeout(() => doSync(false), 10_000);

    // Sync periódico cada 5 min
    syncTimer = setInterval(() => doSync(false), SYNC_INTERVAL_MS);

    return {
        forceSync: () => doSync(true),
        stop: stopSyncEngine
    };
}

export function stopSyncEngine() {
    if (syncTimer) {
        clearInterval(syncTimer);
        syncTimer = null;
    }
}

/**
 * Al hacer login: decide si bajar de Drive o subir el local.
 * Retorna: { source: 'drive' | 'local' | 'no-remote', state? }
 */
export async function reconcileOnLogin(localState) {
    try {
        const remote = await downloadLatest();
        if (!remote || !remote.state) {
            return { source: 'no-remote', action: 'upload-local' };
        }

        const localSaved = localState?._savedAt ? new Date(localState._savedAt).getTime() : 0;
        const remoteSaved = remote.savedAt ? new Date(remote.savedAt).getTime() : 0;

        // Si no hay timestamps, preferimos el que tenga más data
        if (!localSaved && !remoteSaved) {
            const localCount = countRecords(localState);
            const remoteCount = countRecords(remote.state);
            return remoteCount > localCount
                ? { source: 'drive', state: remote.state }
                : { source: 'local', action: 'upload-local' };
        }

        if (remoteSaved > localSaved + 60_000) {
            // Drive es >1 min más reciente -> bajar
            return { source: 'drive', state: remote.state, remoteSaved };
        }

        return { source: 'local', action: 'upload-local' };
    } catch (err) {
        console.warn('Reconcile failed, keeping local:', err);
        return { source: 'local', action: 'none', error: err.message };
    }
}

function countRecords(state) {
    if (!state) return 0;
    return (state.ventas?.length || 0) +
        (state.productos?.length || 0) +
        (state.clientes?.length || 0) +
        (state.empleados?.length || 0) +
        (state.afipFacturas?.length || 0);
}
