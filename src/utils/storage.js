/**
 * Storage engine con múltiples capas de seguridad:
 *   1. IndexedDB (primario, 50-200MB, sobrevive a casi todo)
 *   2. localStorage (backup inmediato, 5MB)
 *   3. Auto-backup a archivo cada N minutos
 *   4. Export/import manual
 *   5. Versioning (mantiene últimos 5 snapshots en IndexedDB)
 */
import { get, set, del, keys } from 'idb-keyval';

const PRIMARY_KEY = 'dashboard_state_v1';
const HISTORY_PREFIX = 'dashboard_history_';
const MAX_HISTORY = 10;
const BACKUP_INTERVAL_MS = 5 * 60 * 1000; // cada 5 min

// ═══════════════════════════════════════════════════════════════════
// SAVE — double-write a IndexedDB + localStorage
// ═══════════════════════════════════════════════════════════════════
export async function saveState(state) {
    const payload = {
        state,
        savedAt: new Date().toISOString(),
        version: 1
    };
    const serialized = JSON.stringify(payload);
    const sizeKB = (serialized.length / 1024).toFixed(1);

    let idbOk = false, lsOk = false;

    // 1) IndexedDB (primario)
    try {
        await set(PRIMARY_KEY, payload);
        idbOk = true;
    } catch (err) {
        console.error('IndexedDB save failed:', err);
    }

    // 2) localStorage (fallback inmediato)
    try {
        localStorage.setItem(PRIMARY_KEY, serialized);
        lsOk = true;
    } catch (err) {
        // QuotaExceeded es común si la data crece mucho
        console.warn('localStorage save failed (likely quota):', err.message);
    }

    return { idbOk, lsOk, sizeKB, savedAt: payload.savedAt };
}

// ═══════════════════════════════════════════════════════════════════
// LOAD — intenta IndexedDB, cae a localStorage, valida integridad
// ═══════════════════════════════════════════════════════════════════
export async function loadState() {
    // 1) IndexedDB primero
    try {
        const idbPayload = await get(PRIMARY_KEY);
        if (idbPayload && idbPayload.state) {
            return { source: 'indexeddb', state: idbPayload.state, savedAt: idbPayload.savedAt };
        }
    } catch (err) {
        console.warn('IndexedDB load failed:', err);
    }

    // 2) localStorage fallback
    try {
        const raw = localStorage.getItem(PRIMARY_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            // Si vino payload estructurado, desempaco; si es formato viejo, uso directo
            const state = parsed.state || parsed;
            const savedAt = parsed.savedAt || null;
            return { source: 'localstorage', state, savedAt };
        }
    } catch (err) {
        console.warn('localStorage load failed:', err);
    }

    // 3) Último recurso: buscar en history (si primary se corrompió)
    try {
        const allKeys = await keys();
        const historyKeys = allKeys
            .filter(k => typeof k === 'string' && k.startsWith(HISTORY_PREFIX))
            .sort()
            .reverse();
        if (historyKeys.length > 0) {
            const mostRecent = await get(historyKeys[0]);
            if (mostRecent && mostRecent.state) {
                console.warn('⚠️ Primary storage corrupto, recuperando de history:', historyKeys[0]);
                return { source: 'history-recovery', state: mostRecent.state, savedAt: mostRecent.savedAt };
            }
        }
    } catch (err) {
        console.error('History recovery failed:', err);
    }

    return { source: 'empty', state: null, savedAt: null };
}

// ═══════════════════════════════════════════════════════════════════
// SNAPSHOT — guardar un punto en history (para recovery)
// ═══════════════════════════════════════════════════════════════════
export async function pushHistorySnapshot(state) {
    const now = new Date().toISOString();
    const key = `${HISTORY_PREFIX}${now}`;
    try {
        await set(key, { state, savedAt: now });
        // Limpio history viejo
        const allKeys = await keys();
        const historyKeys = allKeys
            .filter(k => typeof k === 'string' && k.startsWith(HISTORY_PREFIX))
            .sort()
            .reverse();
        const toDelete = historyKeys.slice(MAX_HISTORY);
        await Promise.all(toDelete.map(k => del(k)));
        return { key, count: historyKeys.length };
    } catch (err) {
        console.warn('Snapshot failed:', err);
        return null;
    }
}

export async function listHistory() {
    try {
        const allKeys = await keys();
        const historyKeys = allKeys
            .filter(k => typeof k === 'string' && k.startsWith(HISTORY_PREFIX))
            .sort()
            .reverse();
        const history = await Promise.all(historyKeys.map(async k => {
            const v = await get(k);
            return { key: k, savedAt: v?.savedAt, size: JSON.stringify(v?.state || {}).length };
        }));
        return history;
    } catch (err) {
        return [];
    }
}

export async function restoreFromHistory(historyKey) {
    try {
        const payload = await get(historyKey);
        if (payload && payload.state) {
            await set(PRIMARY_KEY, payload);
            try { localStorage.setItem(PRIMARY_KEY, JSON.stringify(payload)); } catch { /* ignore */ }
            return payload.state;
        }
        return null;
    } catch (err) {
        console.error('Restore failed:', err);
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════════
// EXPORT a archivo (descarga local)
// ═══════════════════════════════════════════════════════════════════
export function downloadBackup(state) {
    const payload = {
        state,
        exportedAt: new Date().toISOString(),
        version: 1,
        businessName: state.business?.name || 'Dashboard'
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const safeName = (state.business?.name || 'dashboard').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.href = url;
    a.download = `backup-${safeName}-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { fileName: a.download };
}

// ═══════════════════════════════════════════════════════════════════
// IMPORT desde archivo
// ═══════════════════════════════════════════════════════════════════
export function importBackup(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const parsed = JSON.parse(text);
                const state = parsed.state || parsed;
                // Validaciones básicas
                if (!state || typeof state !== 'object') {
                    return reject(new Error('El archivo no tiene formato válido'));
                }
                if (!state.business && !state.ventas && !state.productos) {
                    return reject(new Error('El archivo no parece un backup de Dashboard'));
                }
                resolve(state);
            } catch (err) {
                reject(new Error('No pude leer el archivo: ' + err.message));
            }
        };
        reader.onerror = () => reject(new Error('Error leyendo archivo'));
        reader.readAsText(file);
    });
}

// ═══════════════════════════════════════════════════════════════════
// File System Access API — para guardar a pendrive / carpeta específica
// ═══════════════════════════════════════════════════════════════════
const BACKUP_DIR_KEY = 'dashboard_backup_dir_handle';
let cachedDirHandle = null;

export async function pickBackupFolder() {
    if (!window.showDirectoryPicker) {
        throw new Error('Tu navegador no soporta esta función. Usá Chrome/Edge/Opera.');
    }
    try {
        const handle = await window.showDirectoryPicker({
            mode: 'readwrite',
            startIn: 'documents'
        });
        // Guardo handle en IndexedDB (localStorage no lo soporta)
        await set(BACKUP_DIR_KEY, handle);
        cachedDirHandle = handle;
        return { name: handle.name };
    } catch (err) {
        if (err.name === 'AbortError') return null;
        throw err;
    }
}

export async function getBackupFolder() {
    if (cachedDirHandle) return cachedDirHandle;
    try {
        const handle = await get(BACKUP_DIR_KEY);
        if (!handle) return null;
        // Verificar permisos (pueden haber caducado)
        const perm = await handle.queryPermission({ mode: 'readwrite' });
        if (perm !== 'granted') {
            const requested = await handle.requestPermission({ mode: 'readwrite' });
            if (requested !== 'granted') return null;
        }
        cachedDirHandle = handle;
        return handle;
    } catch (err) {
        return null;
    }
}

export async function writeToBackupFolder(state) {
    const handle = await getBackupFolder();
    if (!handle) throw new Error('Primero elegí una carpeta de backup');
    const date = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const safeName = (state.business?.name || 'dashboard').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `backup-${safeName}-${date}.json`;
    const fileHandle = await handle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    const payload = {
        state,
        exportedAt: new Date().toISOString(),
        version: 1,
        businessName: state.business?.name || 'Dashboard'
    };
    await writable.write(JSON.stringify(payload, null, 2));
    await writable.close();

    // ROTACIÓN: mantener últimos 10 archivos (anti-data-loss + anti-carpeta-llena)
    try {
        const backupFiles = [];
        for await (const entry of handle.values()) {
            if (entry.kind === 'file' && entry.name.startsWith('backup-' + safeName) && entry.name.endsWith('.json')) {
                backupFiles.push(entry.name);
            }
        }
        const sorted = backupFiles.sort().reverse(); // más reciente primero
        const toDelete = sorted.slice(10);
        for (const name of toDelete) {
            try { await handle.removeEntry(name); } catch { /* ignore */ }
        }
    } catch { /* rotation is best-effort */ }

    return { fileName, folderName: handle.name };
}

export async function clearBackupFolder() {
    await del(BACKUP_DIR_KEY);
    cachedDirHandle = null;
}

// ═══════════════════════════════════════════════════════════════════
// STORAGE INFO
// ═══════════════════════════════════════════════════════════════════
export async function getStorageInfo() {
    try {
        if (navigator.storage?.estimate) {
            const est = await navigator.storage.estimate();
            return {
                usageMB: (est.usage / 1024 / 1024).toFixed(2),
                quotaMB: (est.quota / 1024 / 1024).toFixed(0),
                percent: ((est.usage / est.quota) * 100).toFixed(2)
            };
        }
    } catch (err) { /* ignore */ }
    return null;
}

export async function persistStorage() {
    // Pedir a navegador que NO borre la data si se queda sin espacio
    if (navigator.storage?.persist) {
        try {
            return await navigator.storage.persist();
        } catch (err) {
            return false;
        }
    }
    return false;
}

// ═══════════════════════════════════════════════════════════════════
// FILE SYSTEM ACCESS — backup automático a carpeta local elegida
// ═══════════════════════════════════════════════════════════════════
/**
 * El usuario elige una carpeta UNA VEZ y la app guarda ahí silenciosamente.
 * Funciona en Chrome/Edge (no Firefox/Safari). Es la capa anti-pérdida definitiva
 * porque el archivo vive en disco fuera del navegador.
 *
 * Guardamos handles en IDB porque no se pueden serializar a localStorage.
 */
const FS_HANDLE_KEY = 'dashboard_fs_backup_handle';

export async function isFileSystemAccessSupported() {
    return 'showDirectoryPicker' in window;
}

/**
 * Pide al usuario elegir carpeta de backup y la guarda para uso futuro
 */
export async function setupFileSystemBackup() {
    if (!('showDirectoryPicker' in window)) {
        throw new Error('File System Access API no soportada (usá Chrome/Edge)');
    }
    const handle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
    });
    await set(FS_HANDLE_KEY, handle);
    return handle;
}

export async function getFileSystemHandle() {
    try {
        const handle = await get(FS_HANDLE_KEY);
        if (!handle) return null;
        // Verificar que aún tengamos permiso
        const perm = await handle.queryPermission({ mode: 'readwrite' });
        if (perm === 'granted') return handle;
        const req = await handle.requestPermission({ mode: 'readwrite' });
        return req === 'granted' ? handle : null;
    } catch {
        return null;
    }
}

export async function removeFileSystemBackup() {
    await del(FS_HANDLE_KEY);
}

/**
 * Guarda snapshot a la carpeta elegida. Mantiene los últimos 10 archivos rotados.
 * Nombre: dashboard-YYYYMMDD-HHMM.json
 */
export async function saveToFileSystem(state) {
    const handle = await getFileSystemHandle();
    if (!handle) return { ok: false, reason: 'Sin handle' };

    try {
        const now = new Date();
        const stamp = now.toISOString().slice(0, 16).replace(/[:T-]/g, '').slice(0, 12); // YYYYMMDDHHMM
        const filename = `dashboard-${stamp}.json`;

        const fileHandle = await handle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify({ state, savedAt: now.toISOString(), version: 1 }, null, 2));
        await writable.close();

        // Rotación: mantener últimos 10
        const filesToKeep = new Set();
        for await (const entry of handle.values()) {
            if (entry.kind === 'file' && entry.name.startsWith('dashboard-') && entry.name.endsWith('.json')) {
                filesToKeep.add(entry.name);
            }
        }
        const sortedNames = [...filesToKeep].sort().reverse();
        const toDelete = sortedNames.slice(10);
        for (const name of toDelete) {
            try { await handle.removeEntry(name); } catch { /* ignore */ }
        }

        return { ok: true, filename };
    } catch (err) {
        return { ok: false, reason: err.message };
    }
}
