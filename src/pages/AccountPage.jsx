import React, { useState, useEffect } from 'react';
import {
    User, Cloud, CloudOff, LogIn, LogOut, RefreshCw, Shield, Zap,
    HardDrive, CheckCircle2, AlertCircle, ExternalLink, Sparkles, Lock
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { useData } from '../store/DataContext';
import { PageHeader, Card, Badge, InfoBox } from '../components/UI';
import { useT } from '../i18n';

export default function AccountPage() {
    const { mode, user, isCloud, isOffline, firebaseAvailable, syncStatus, signIn, signOut, switchToOffline } = useAuth();
    const { state } = useData();
    const t = useT();
    const [signingIn, setSigningIn] = useState(false);
    const [driveInfo, setDriveInfo] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isCloud) {
            (async () => {
                try {
                    const { getDriveStorageInfo } = await import('../utils/gdrive');
                    const info = await getDriveStorageInfo();
                    setDriveInfo(info);
                } catch (err) { /* silencioso */ }
            })();
        }
    }, [isCloud]);

    const handleSignIn = async () => {
        setError('');
        setSigningIn(true);
        try {
            await signIn();
        } catch (err) {
            setError(err.message);
        } finally {
            setSigningIn(false);
        }
    };

    const handleSignOut = async () => {
        if (!confirm(t('account.sign_out_confirm'))) return;
        await signOut();
    };

    return (
        <div>
            <PageHeader
                icon={User}
                title={t('account.title')}
                subtitle={t('account.subtitle')}
            />

            {/* Current mode banner */}
            <Card style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 8 }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: 16,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isCloud ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                        color: isCloud ? 'var(--accent)' : 'var(--text-muted)',
                        border: isCloud ? '1px solid var(--border-accent)' : '1px solid var(--border-color)',
                        flexShrink: 0
                    }}>
                        {isCloud ? <Cloud size={30} /> : <CloudOff size={30} />}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500 }}>
                            {isCloud ? t('account.mode_cloud') : t('account.mode_offline')}
                        </div>
                        <div className="text-sm text-muted" style={{ marginTop: 4 }}>
                            {isCloud
                                ? t('account.cloud_desc')
                                : t('account.offline_desc')}
                        </div>
                        {isCloud && user && (
                            <div className="flex items-center gap-2 mt-2">
                                {user.photoURL && <img src={user.photoURL} alt="" style={{ width: 24, height: 24, borderRadius: '50%' }} />}
                                <span className="text-sm font-semibold">{user.displayName}</span>
                                <span className="text-xs text-muted">· {user.email}</span>
                            </div>
                        )}
                    </div>
                    <Badge variant={isCloud ? 'success' : 'muted'}>
                        {isCloud ? t('account.badge_online') : t('account.badge_local')}
                    </Badge>
                </div>
            </Card>

            {error && (
                <InfoBox variant="warning" style={{ marginBottom: 16 }}>
                    <strong>Error:</strong> {error}
                </InfoBox>
            )}

            {!firebaseAvailable && (
                <InfoBox variant="warning" style={{ marginBottom: 16 }}>
                    ⚠️ El modo Cloud aún no está disponible — faltan las variables de entorno de Firebase en el servidor.
                    Mientras tanto, todo funciona perfecto en modo Offline con backup a pendrive.
                </InfoBox>
            )}

            {/* 2 cards: Offline vs Cloud */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16 }}>
                {/* OFFLINE CARD */}
                <Card>
                    <div className="flex items-center gap-3 mb-3">
                        <div style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: isOffline ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                            color: isOffline ? 'var(--accent)' : 'var(--text-muted)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: `1px solid ${isOffline ? 'var(--border-accent)' : 'var(--border-color)'}`
                        }}>
                            <HardDrive size={22} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 500 }}>Modo Offline</h3>
                            <div className="text-xs text-muted">Gratis · 100% privado · sin internet</div>
                        </div>
                    </div>
                    <ul style={{ fontSize: 13, lineHeight: 1.7, paddingLeft: 20, color: 'var(--text-secondary)' }}>
                        <li>Todo guardado en tu navegador (IndexedDB 50-200MB)</li>
                        <li>Backup a pendrive o carpeta local (hasta 1TB)</li>
                        <li>CELA + agentes AI con tu propia API key</li>
                        <li>No podés usar desde otro dispositivo</li>
                        <li>Si se rompe tu dispositivo, recuperás desde el backup</li>
                    </ul>
                    <div className="mt-4">
                        {isOffline ? (
                            <Badge variant="success">✓ Modo actual</Badge>
                        ) : (
                            <button className="btn btn-ghost btn-lg" onClick={switchToOffline}>
                                <CloudOff size={16} /> Cambiar a offline
                            </button>
                        )}
                    </div>
                </Card>

                {/* CLOUD CARD */}
                <Card>
                    <div className="flex items-center gap-3 mb-3">
                        <div style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: isCloud ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                            color: isCloud ? 'var(--accent)' : 'var(--text-muted)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: `1px solid ${isCloud ? 'var(--border-accent)' : 'var(--border-color)'}`
                        }}>
                            <Cloud size={22} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 500 }}>Modo Cloud</h3>
                            <div className="text-xs text-muted">Google Drive · multi-device · agentes 24/7</div>
                        </div>
                    </div>
                    <ul style={{ fontSize: 13, lineHeight: 1.7, paddingLeft: 20, color: 'var(--text-secondary)' }}>
                        <li>Login con Google (1 click)</li>
                        <li>Tu data en TU Google Drive (15GB+ gratis de Google)</li>
                        <li>Sincronización automática cada 5 min entre dispositivos</li>
                        <li>Historial de 30 días de snapshots versionados</li>
                        <li>Agentes AI corriendo 24/7 en la nube (próximamente)</li>
                        <li>Podés mirar tus datos desde Drive directo (son JSONs)</li>
                    </ul>
                    <div className="mt-4">
                        {isCloud ? (
                            <button className="btn btn-ghost btn-lg" onClick={handleSignOut}>
                                <LogOut size={16} /> Cerrar sesión
                            </button>
                        ) : (
                            <button
                                className="btn btn-primary btn-lg"
                                onClick={handleSignIn}
                                disabled={!firebaseAvailable || signingIn}
                            >
                                {signingIn ? <><RefreshCw size={16} className="spin" /> Conectando...</> : <><LogIn size={16} /> Activar Cloud con Google</>}
                            </button>
                        )}
                    </div>
                </Card>
            </div>

            {/* Sync status (solo si está en cloud) */}
            {isCloud && (
                <Card title={t('account.sync_status')} style={{ marginTop: 16 }}>
                    <div className="kpi-grid">
                        <div className="kpi-card">
                            <div className="kpi-icon" style={{ background: 'rgba(74, 222, 128, 0.15)', color: 'var(--success)' }}>
                                {syncStatus.syncing ? <RefreshCw size={22} className="spin" /> : <CheckCircle2 size={22} />}
                            </div>
                            <div>
                                <div className="kpi-label">Último sync</div>
                                <div className="kpi-value" style={{ fontSize: 15 }}>
                                    {syncStatus.syncing ? t('account.syncing')
                                        : syncStatus.lastSyncAt ? ago(syncStatus.lastSyncAt) + ' atrás'
                                            : t('account.pending')}
                                </div>
                            </div>
                        </div>

                        {driveInfo && (
                            <>
                                <div className="kpi-card">
                                    <div className="kpi-icon" style={{ background: 'rgba(96, 165, 250, 0.15)', color: 'var(--info)' }}>
                                        <HardDrive size={22} />
                                    </div>
                                    <div>
                                        <div className="kpi-label">Uso de Drive</div>
                                        <div className="kpi-value" style={{ fontSize: 15 }}>{driveInfo.usageGB} GB / {driveInfo.totalGB}</div>
                                    </div>
                                </div>
                                <div className="kpi-card">
                                    <div className="kpi-icon" style={{ background: 'rgba(99, 241, 203, 0.15)', color: 'var(--accent)' }}>
                                        <Cloud size={22} />
                                    </div>
                                    <div>
                                        <div className="kpi-label">Carpeta</div>
                                        <div className="kpi-value" style={{ fontSize: 14 }}>/Dashboard-Data/</div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {syncStatus.error && (
                        <InfoBox variant="warning" style={{ marginTop: 12 }}>
                            <strong>Último error de sync:</strong> {syncStatus.error}
                        </InfoBox>
                    )}
                </Card>
            )}

            {/* Privacy & security explainer */}
            <Card style={{ marginTop: 16 }}>
                <h3 style={{ margin: '0 0 12px', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500 }}>
                    🔒
                </h3>
                <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                    <p style={{ margin: '0 0 10px' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Modo Offline:</strong> ningún dato sale de tu dispositivo. Es el modo más privado que existe.
                    </p>
                    <p style={{ margin: '0 0 10px' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Modo Cloud:</strong> tu data se guarda como archivo JSON en <em>tu</em> Google Drive, en la carpeta <code>/Dashboard-Data/</code>.
                        Dashboard (nuestra app) no tiene su propia base de datos donde vivan tus datos — Google Drive es el storage.
                        Solo guardamos un ID de usuario + tu email en Firestore para saber "este usuario → esta carpeta de Drive".
                    </p>
                    <p style={{ margin: 0 }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Tu data es tuya.</strong> Podés exportarla, borrar tu cuenta, migrar a otra app. Es solo un JSON estándar.
                    </p>
                </div>
            </Card>
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
