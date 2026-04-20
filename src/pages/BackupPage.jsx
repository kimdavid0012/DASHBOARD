import React, { useState, useEffect, useRef } from 'react';
import {
    Save, Download, Upload, FolderOpen, Clock, Shield, CheckCircle2,
    AlertCircle, Trash2, History, HardDrive, RefreshCw, FileJson, Cloud
} from 'lucide-react';
import { useData, SECTION_HELP } from '../store/DataContext';
import { PageHeader, Card, Modal, Field, EmptyState, Badge, InfoBox, fmtMoney, fmtDate } from '../components/UI';
import {
    downloadBackup, importBackup, pickBackupFolder, getBackupFolder,
    writeToBackupFolder, clearBackupFolder, getStorageInfo, listHistory,
    restoreFromHistory
} from '../utils/storage';
import { useT } from '../i18n';

export default function BackupPage() {
    const { state, actions, saveStatus } = useData();
    const t = useT();
    const [storageInfo, setStorageInfo] = useState(null);
    const [backupFolder, setBackupFolder] = useState(null);
    const [history, setHistory] = useState([]);
    const [autoBackupEnabled, setAutoBackupEnabled] = useState(() => {
        return localStorage.getItem('auto_backup_enabled') === 'true';
    });
    const [lastAutoBackup, setLastAutoBackup] = useState(null);
    const [toast, setToast] = useState('');
    const [importOpen, setImportOpen] = useState(false);
    const fileInputRef = useRef(null);

    // Load info on mount
    useEffect(() => {
        (async () => {
            const info = await getStorageInfo();
            setStorageInfo(info);
            const handle = await getBackupFolder();
            if (handle) setBackupFolder({ name: handle.name });
            const hist = await listHistory();
            setHistory(hist);
        })();
    }, []);

    // Auto-backup to folder every 15 min if enabled (antes era 30 min)
    useEffect(() => {
        if (!autoBackupEnabled || !backupFolder) return;
        const iv = setInterval(async () => {
            try {
                const res = await writeToBackupFolder(state);
                setLastAutoBackup(new Date().toISOString());
                console.log('✓ Auto-backup:', res.fileName);
            } catch (err) {
                console.warn('Auto-backup failed:', err);
            }
        }, 15 * 60 * 1000); // 15 min
        return () => clearInterval(iv);
    }, [autoBackupEnabled, backupFolder, state]);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3500);
    };

    const handleDownload = () => {
        const res = downloadBackup(state);
        showToast('✓ Backup descargado: ' + res.fileName);
    };

    const handleForceSave = async () => {
        try {
            await actions.forceSave();
            showToast('✓ Guardado forzado completado');
        } catch (err) {
            showToast('⚠️ Error: ' + err.message);
        }
    };

    const handlePickFolder = async () => {
        try {
            const res = await pickBackupFolder();
            if (res) {
                setBackupFolder(res);
                showToast('✓ Carpeta configurada: ' + res.name);
            }
        } catch (err) {
            showToast('⚠️ ' + err.message);
        }
    };

    const handleBackupToFolder = async () => {
        try {
            const res = await writeToBackupFolder(state);
            showToast(`✓ Backup guardado en ${res.folderName}/${res.fileName}`);
        } catch (err) {
            showToast('⚠️ ' + err.message);
        }
    };

    const handleForgetFolder = async () => {
        await clearBackupFolder();
        setBackupFolder(null);
        showToast('Carpeta olvidada');
    };

    const handleImport = async (file) => {
        if (!file) return;
        try {
            const newState = await importBackup(file);
            if (!confirm(`⚠️ Esto va a reemplazar TODA tu data actual con el backup.\n\nArchivo: ${file.name}\n\n¿Seguro querés continuar?`)) return;
            actions.hydrate(newState);
            // autoSave del useEffect se dispara automáticamente al cambiar state
            showToast('✓ Backup restaurado · guardando...');
            setImportOpen(false);
        } catch (err) {
            showToast('⚠️ ' + err.message);
        }
    };

    const handleRestoreFromHistory = async (key) => {
        if (!confirm('¿Restaurar este snapshot? Tu data actual se reemplaza.')) return;
        try {
            const restored = await restoreFromHistory(key);
            if (restored) {
                actions.hydrate(restored);
                showToast('✓ Restaurado desde snapshot');
            }
        } catch (err) {
            showToast('⚠️ ' + err.message);
        }
    };

    const toggleAutoBackup = () => {
        const next = !autoBackupEnabled;
        setAutoBackupEnabled(next);
        localStorage.setItem('auto_backup_enabled', next ? 'true' : 'false');
        if (next && !backupFolder) {
            showToast('Primero elegí una carpeta de backup');
            setAutoBackupEnabled(false);
        } else {
            showToast(next ? '✓ Auto-backup activado cada 30min' : 'Auto-backup desactivado');
        }
    };

    const supportsFileSystem = !!window.showDirectoryPicker;

    return (
        <div>
            <PageHeader
                icon={Shield}
                title={t('backup.title')}
                subtitle={t('backup.subtitle')}
                help={SECTION_HELP.backup}
                actions={
                    <button className="btn btn-primary" onClick={handleDownload}>
                        <Download size={14} /> Descargar backup ahora
                    </button>
                }
            />

            {toast && (
                <div style={{
                    position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
                    background: 'var(--bg-card)', border: '1px solid var(--accent)',
                    borderRadius: 12, padding: '12px 20px', zIndex: 1000,
                    boxShadow: 'var(--shadow-lg)', color: 'var(--accent)', fontWeight: 600
                }}>
                    {toast}
                </div>
            )}

            {/* STATUS GENERAL */}
            <div className="kpi-grid mb-4">
                <div className="kpi-card">
                    <div className="kpi-icon" style={{ background: saveStatus.lastError ? 'rgba(251, 113, 133, 0.15)' : 'rgba(74, 222, 128, 0.15)', color: saveStatus.lastError ? 'var(--danger)' : 'var(--success)' }}>
                        {saveStatus.saving ? <RefreshCw size={22} className="spin" /> : saveStatus.lastError ? <AlertCircle size={22} /> : <CheckCircle2 size={22} />}
                    </div>
                    <div>
                        <div className="kpi-label">Estado</div>
                        <div className="kpi-value" style={{ fontSize: 16 }}>
                            {saveStatus.saving ? 'Guardando...' : saveStatus.lastError ? 'Error' : '✓ Guardado'}
                        </div>
                        <div className="kpi-delta">
                            {saveStatus.lastSaved ? `Hace ${ago(saveStatus.lastSaved)}` : 'Nunca guardado'}
                        </div>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon" style={{ background: 'rgba(96, 165, 250, 0.15)', color: 'var(--info)' }}>
                        <HardDrive size={22} />
                    </div>
                    <div>
                        <div className="kpi-label">Sistema primario</div>
                        <div className="kpi-value" style={{ fontSize: 16 }}>
                            {saveStatus.source === 'indexeddb' ? 'IndexedDB' : saveStatus.source === 'localstorage' ? 'localStorage' : '—'}
                        </div>
                        <div className="kpi-delta">
                            {storageInfo ? `${storageInfo.usageMB} MB usados` : 'cargando...'}
                        </div>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon" style={{ background: 'rgba(244, 193, 90, 0.15)', color: 'var(--accent-2)' }}>
                        <History size={22} />
                    </div>
                    <div>
                        <div className="kpi-label">Snapshots</div>
                        <div className="kpi-value" style={{ fontSize: 16 }}>{history.length}</div>
                        <div className="kpi-delta">
                            Últimos {history.length > 0 ? ago(history[0].savedAt) : '—'}
                        </div>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon" style={{ background: 'rgba(192, 132, 252, 0.15)', color: 'var(--purple)' }}>
                        <FolderOpen size={22} />
                    </div>
                    <div>
                        <div className="kpi-label">Carpeta externa</div>
                        <div className="kpi-value" style={{ fontSize: 16 }}>
                            {backupFolder ? '✓ ' + backupFolder.name : 'Sin elegir'}
                        </div>
                        <div className="kpi-delta">{autoBackupEnabled ? 'Auto cada 30min' : 'Manual'}</div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16 }}>
                {/* Multi-capa info */}
                <Card title={t('backup.multi_layer')} subtitle={t('backup.multi_layer_sub')}>
                    <div className="flex flex-col gap-3">
                        <StorageLayerRow
                            icon="1"
                            title={t('backup.layers.idb_title')}
                            desc="Guardado automático en la base de datos del navegador. Capacidad de 50-200 MB, sobrevive a cierre de pestaña, reinicio, y limpieza parcial de caché."
                            status={saveStatus.source === 'indexeddb' ? 'active' : 'idle'}
                        />
                        <StorageLayerRow
                            icon="2"
                            title={t('backup.layers.ls_title')}
                            desc="Doble escritura sincrónica. Menor capacidad (5-10MB) pero funciona como red de seguridad si IndexedDB falla."
                            status={saveStatus.lastSaved ? 'active' : 'idle'}
                        />
                        <StorageLayerRow
                            icon="3"
                            title={t('backup.layers.snap_title')}
                            desc={`Histórico automático (últimos 10). Te permite restaurar si algo sale mal. Tenés ${history.length} puntos de restauración.`}
                            status="active"
                        />
                        <StorageLayerRow
                            icon="4"
                            title={t('backup.layers.folder_title')}
                            desc={backupFolder ? `Configurada: ${backupFolder.name}` : "Elegí una carpeta para guardar backups automáticos fuera del navegador."}
                            status={backupFolder ? 'active' : 'warning'}
                        />
                        <StorageLayerRow
                            icon="5"
                            title={t('backup.layers.drive_title')}
                            desc="Sync en nube cuando implementemos Firebase + Auth. Tu data accesible desde cualquier dispositivo."
                            status="pending"
                        />
                    </div>
                </Card>

                {/* Acciones manuales */}
                <Card title={t('backup.manual_actions')} subtitle={t('backup.manual_actions_sub')}>
                    <div className="flex flex-col gap-3">
                        <button className="btn btn-primary btn-lg" onClick={handleForceSave}>
                            <Save size={16} /> Guardar ahora (forzado)
                        </button>
                        <button className="btn" onClick={handleDownload}>
                            <Download size={16} /> Descargar backup completo (.json)
                        </button>
                        <button className="btn" onClick={() => setImportOpen(true)}>
                            <Upload size={16} /> Restaurar desde backup
                        </button>
                        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '8px 0' }} />
                        {supportsFileSystem ? (
                            !backupFolder ? (
                                <button className="btn" onClick={handlePickFolder}>
                                    <FolderOpen size={16} /> Elegir carpeta de backup (pendrive / Dropbox / etc.)
                                </button>
                            ) : (
                                <>
                                    <button className="btn" onClick={handleBackupToFolder}>
                                        <Save size={16} /> Backup a {backupFolder.name} ahora
                                    </button>
                                    <div className="flex gap-2">
                                        <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={handlePickFolder}>
                                            <FolderOpen size={12} /> Cambiar
                                        </button>
                                        <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={handleForgetFolder}>
                                            <Trash2 size={12} /> Olvidar
                                        </button>
                                    </div>
                                    <div
                                        className="flex items-center justify-between"
                                        style={{ padding: 12, background: autoBackupEnabled ? 'var(--accent-soft)' : 'var(--bg-elevated)', borderRadius: 10, cursor: 'pointer', border: autoBackupEnabled ? '1px solid var(--border-accent)' : '1px solid var(--border-color)' }}
                                        onClick={toggleAutoBackup}
                                    >
                                        <div>
                                            <div className="font-semibold text-sm">{autoBackupEnabled ? '✓ Auto-backup activo' : 'Auto-backup desactivado'}</div>
                                            <div className="text-xs text-muted">Guarda cada 30 min a la carpeta</div>
                                        </div>
                                        <Badge variant={autoBackupEnabled ? 'success' : 'muted'}>{autoBackupEnabled ? 'ON' : 'OFF'}</Badge>
                                    </div>
                                </>
                            )
                        ) : (
                            <InfoBox variant="warning">
                                Tu navegador no soporta "File System Access API". Usá Chrome, Edge u Opera en escritorio para elegir carpetas. Mientras tanto, la descarga manual funciona perfecto.
                            </InfoBox>
                        )}
                    </div>
                </Card>
            </div>

            {/* HISTORY */}
            <Card title={t('backup.history_title')} subtitle={t('backup.history_sub')} style={{ marginTop: 16 }}>
                {history.length === 0 ? (
                    <div className="text-sm text-muted">Aún no hay snapshots. Se crean automáticamente cada 10 minutos.</div>
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead><tr><th>Fecha</th><th>Antigüedad</th><th className="right">Tamaño</th><th></th></tr></thead>
                            <tbody>
                                {history.map(h => (
                                    <tr key={h.key}>
                                        <td className="text-sm mono">{new Date(h.savedAt).toLocaleString('es-AR')}</td>
                                        <td className="text-sm"><Badge variant="muted">Hace {ago(h.savedAt)}</Badge></td>
                                        <td className="right text-sm mono text-muted">{(h.size / 1024).toFixed(1)} KB</td>
                                        <td className="right">
                                            <button className="btn btn-ghost btn-sm" onClick={() => handleRestoreFromHistory(h.key)}>
                                                <RefreshCw size={12} /> Restaurar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Restaurar desde backup" size="sm">
                <InfoBox variant="warning">
                    ⚠️ Esto va a <strong>reemplazar</strong> toda tu data actual con el contenido del archivo. Asegurate de haber descargado un backup antes por las dudas.
                </InfoBox>
                <div className="mt-4">
                    <input ref={fileInputRef} type="file" accept=".json" onChange={e => handleImport(e.target.files[0])} style={{ display: 'none' }} />
                    <button className="btn btn-primary btn-lg w-full" onClick={() => fileInputRef.current?.click()}>
                        <FileJson size={16} /> Seleccionar archivo .json
                    </button>
                </div>
            </Modal>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .spin { animation: spin 1s linear infinite; }
            `}</style>
        </div>
    );
}

function StorageLayerRow({ icon, title, desc, status }) {
    const colors = {
        active: 'var(--success)',
        idle: 'var(--text-muted)',
        warning: 'var(--warning)',
        pending: 'var(--text-muted)'
    };
    return (
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: 10, background: 'var(--bg-elevated)', borderRadius: 10 }}>
            <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: colors[status] + '22',
                color: colors[status],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontWeight: 700, flexShrink: 0,
                border: `1px solid ${colors[status]}55`
            }}>
                {icon}
            </div>
            <div style={{ flex: 1 }}>
                <div className="font-semibold text-sm">{title}</div>
                <div className="text-xs text-muted" style={{ lineHeight: 1.5, marginTop: 2 }}>{desc}</div>
            </div>
            <Badge variant={status === 'active' ? 'success' : status === 'warning' ? 'warning' : 'muted'}>
                {status === 'active' ? '● Activo' : status === 'warning' ? '○ Config.' : status === 'pending' ? '⏳ Fase A' : 'Idle'}
            </Badge>
        </div>
    );
}

function ago(iso) {
    if (!iso) return 'nunca';
    const diff = Date.now() - new Date(iso).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    return `${d}d`;
}
