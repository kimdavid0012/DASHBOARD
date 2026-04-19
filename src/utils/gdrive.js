/**
 * Google Drive API integration
 *
 * Uses access token from Firebase Auth (Google Sign-in).
 * Scope: drive.file (app-owned folder). Each user has /Dashboard-Data/ folder.
 *
 * Flow:
 *   1. signInWithGoogle() -> access token in sessionStorage
 *   2. getOrCreateDashboardFolder() -> returns folder ID, cached in sessionStorage
 *   3. uploadBackup(data) / downloadLatest() / listBackups()
 */

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
const FOLDER_NAME = 'Dashboard-Data';
const FOLDER_MIMETYPE = 'application/vnd.google-apps.folder';
const JSON_MIMETYPE = 'application/json';

// Read token directly from sessionStorage to avoid static import of firebase module
function getAccessToken() {
    const token = sessionStorage.getItem('gdrive_access_token');
    const issuedAt = parseInt(sessionStorage.getItem('gdrive_token_issued_at') || '0', 10);
    // Google access tokens duran 1 hora. Marcamos como expirado a los 55 min.
    if (!token || Date.now() - issuedAt > 55 * 60 * 1000) return null;
    return token;
}

// ═══════════════════════════════════════════════════════════════════
// FOLDER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

export async function getOrCreateDashboardFolder() {
    // Check cache first
    const cached = sessionStorage.getItem('gdrive_folder_id');
    if (cached) return cached;

    const token = getAccessToken();
    if (!token) throw new Error('No hay sesión activa de Google. Volvé a iniciar sesión.');

    // Buscar si ya existe
    const query = encodeURIComponent(`name='${FOLDER_NAME}' and mimeType='${FOLDER_MIMETYPE}' and trashed=false`);
    const searchRes = await fetch(`${DRIVE_API}/files?q=${query}&spaces=drive&fields=files(id,name)`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const searchData = await searchRes.json();
    if (searchData.error) throw new Error(`Drive search failed: ${searchData.error.message}`);

    if (searchData.files && searchData.files.length > 0) {
        const id = searchData.files[0].id;
        sessionStorage.setItem('gdrive_folder_id', id);
        return id;
    }

    // Crear folder nuevo
    const createRes = await fetch(`${DRIVE_API}/files`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: FOLDER_NAME,
            mimeType: FOLDER_MIMETYPE,
            description: 'Datos y backups de Dashboard — no borrar'
        })
    });
    const created = await createRes.json();
    if (created.error) throw new Error(`Drive create folder failed: ${created.error.message}`);

    sessionStorage.setItem('gdrive_folder_id', created.id);
    return created.id;
}

// ═══════════════════════════════════════════════════════════════════
// UPLOAD
// ═══════════════════════════════════════════════════════════════════

/**
 * Sube un backup a Drive. Si ya existe un archivo con ese nombre, lo actualiza.
 * Retorna: { id, name, modifiedTime, size }
 */
export async function uploadBackup(data, fileName = null) {
    const token = getAccessToken();
    if (!token) throw new Error('No hay sesión activa de Google.');

    const folderId = await getOrCreateDashboardFolder();
    const name = fileName || `backup-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.json`;
    const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

    // Buscar si ya existe archivo con ese nombre
    const query = encodeURIComponent(`name='${name}' and '${folderId}' in parents and trashed=false`);
    const searchRes = await fetch(`${DRIVE_API}/files?q=${query}&fields=files(id)`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const searchData = await searchRes.json();
    const existingId = searchData.files?.[0]?.id;

    const metadata = existingId ? { name } : { name, parents: [folderId] };
    const boundary = 'dashboard_' + Math.random().toString(36).slice(2);
    const body =
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        JSON.stringify(metadata) + `\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: ${JSON_MIMETYPE}\r\n\r\n` +
        content + `\r\n` +
        `--${boundary}--`;

    const url = existingId
        ? `${DRIVE_UPLOAD}/${existingId}?uploadType=multipart&fields=id,name,modifiedTime,size`
        : `${DRIVE_UPLOAD}?uploadType=multipart&fields=id,name,modifiedTime,size`;
    const method = existingId ? 'PATCH' : 'POST';

    const res = await fetch(url, {
        method,
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body
    });
    const result = await res.json();
    if (result.error) throw new Error(`Drive upload failed: ${result.error.message}`);
    return result;
}

/**
 * Sube/actualiza el state "latest" (el archivo vivo que se sincroniza)
 */
export async function uploadLatest(state) {
    return uploadBackup({
        state,
        savedAt: new Date().toISOString(),
        version: 1,
        type: 'latest'
    }, 'dashboard-latest.json');
}

// ═══════════════════════════════════════════════════════════════════
// DOWNLOAD
// ═══════════════════════════════════════════════════════════════════

export async function downloadFileById(fileId) {
    const token = getAccessToken();
    if (!token) throw new Error('No hay sesión activa de Google.');

    const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Drive download failed: ${err.error?.message || res.statusText}`);
    }
    const text = await res.text();
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

export async function downloadLatest() {
    const folderId = await getOrCreateDashboardFolder();
    const files = await listBackups();
    const latest = files.find(f => f.name === 'dashboard-latest.json');
    if (!latest) return null;
    return downloadFileById(latest.id);
}

// ═══════════════════════════════════════════════════════════════════
// LIST / DELETE
// ═══════════════════════════════════════════════════════════════════

export async function listBackups() {
    const token = getAccessToken();
    if (!token) throw new Error('No hay sesión activa de Google.');

    const folderId = await getOrCreateDashboardFolder();
    const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const res = await fetch(`${DRIVE_API}/files?q=${query}&orderBy=modifiedTime desc&fields=files(id,name,modifiedTime,size)&pageSize=100`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.error) throw new Error(`Drive list failed: ${data.error.message}`);
    return data.files || [];
}

export async function deleteBackup(fileId) {
    const token = getAccessToken();
    if (!token) throw new Error('No hay sesión activa de Google.');

    const res = await fetch(`${DRIVE_API}/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok && res.status !== 204) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Drive delete failed: ${err.error?.message || res.statusText}`);
    }
    return true;
}

/**
 * Limpieza: mantiene solo N backups más recientes (más "dashboard-latest.json")
 */
export async function cleanOldBackups(keepN = 30) {
    const files = await listBackups();
    const backups = files.filter(f => f.name !== 'dashboard-latest.json' && f.name.startsWith('backup-'));
    const toDelete = backups.slice(keepN);
    const results = await Promise.allSettled(toDelete.map(f => deleteBackup(f.id)));
    return {
        kept: Math.min(keepN, backups.length),
        deleted: results.filter(r => r.status === 'fulfilled').length,
        failed: results.filter(r => r.status === 'rejected').length
    };
}

// ═══════════════════════════════════════════════════════════════════
// STORAGE INFO
// ═══════════════════════════════════════════════════════════════════

export async function getDriveStorageInfo() {
    const token = getAccessToken();
    if (!token) return null;
    const res = await fetch(`${DRIVE_API}/about?fields=storageQuota,user`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.error) return null;
    const quota = data.storageQuota;
    return {
        userEmail: data.user?.emailAddress,
        userName: data.user?.displayName,
        usageGB: quota ? (parseInt(quota.usage, 10) / 1e9).toFixed(2) : null,
        totalGB: quota?.limit ? (parseInt(quota.limit, 10) / 1e9).toFixed(0) : 'ilimitado'
    };
}
