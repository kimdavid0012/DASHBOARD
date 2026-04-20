import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

/**
 * PWA Install Prompt — capturar el beforeinstallprompt y mostrar banner elegante
 * cuando el navegador confirma que la app es instalable.
 *
 * Se oculta automáticamente si:
 *  - Ya está instalada (display-mode: standalone)
 *  - El usuario ya dismisseó 3 veces
 *  - Se aceptó o se declinó la instalación
 */
export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [visible, setVisible] = useState(false);
    const [installing, setInstalling] = useState(false);

    useEffect(() => {
        // No mostrar si está instalada
        if (window.matchMedia?.('(display-mode: standalone)').matches) return;
        if (window.navigator.standalone) return; // iOS

        // No mostrar si el user dismisseó muchas veces
        const dismissCount = parseInt(localStorage.getItem('pwa_install_dismiss') || '0', 10);
        if (dismissCount >= 3) return;

        // No mostrar si ya se instaló
        if (localStorage.getItem('pwa_installed') === 'true') return;

        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Retrasar el banner 30 segundos (deja al user explorar primero)
            setTimeout(() => setVisible(true), 30 * 1000);
        };

        window.addEventListener('beforeinstallprompt', handler);

        const installedHandler = () => {
            localStorage.setItem('pwa_installed', 'true');
            setVisible(false);
        };
        window.addEventListener('appinstalled', installedHandler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            window.removeEventListener('appinstalled', installedHandler);
        };
    }, []);

    const install = async () => {
        if (!deferredPrompt) return;
        setInstalling(true);
        try {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                localStorage.setItem('pwa_installed', 'true');
            }
            setVisible(false);
            setDeferredPrompt(null);
        } catch (err) {
            console.warn('Install prompt error:', err);
        } finally {
            setInstalling(false);
        }
    };

    const dismiss = () => {
        const count = parseInt(localStorage.getItem('pwa_install_dismiss') || '0', 10);
        localStorage.setItem('pwa_install_dismiss', (count + 1).toString());
        setVisible(false);
    };

    if (!visible || !deferredPrompt) return null;

    return (
        <div
            style={{
                position: 'fixed',
                bottom: 16,
                left: 16,
                right: 16,
                maxWidth: 400,
                margin: '0 auto',
                padding: 14,
                background: 'linear-gradient(135deg, rgba(99,241,203,0.15), rgba(99,241,203,0.05))',
                border: '1px solid rgba(99,241,203,0.4)',
                borderRadius: 14,
                boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
                zIndex: 9999,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                color: 'var(--text-primary)',
                fontSize: 13,
                animation: 'slideUpFadeIn 0.35s var(--ease, ease-out)'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{
                    padding: 10, background: 'rgba(99,241,203,0.2)', borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                    <Smartphone size={20} style={{ color: 'var(--accent, #63f1cb)' }} />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Instalá Dashboard</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                        Acceso rápido desde tu pantalla de inicio, funciona offline, sin navegador.
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            onClick={install}
                            disabled={installing}
                            style={{
                                padding: '8px 14px',
                                background: 'var(--accent, #63f1cb)',
                                color: '#0a0a0f',
                                border: 'none',
                                borderRadius: 8,
                                fontWeight: 700,
                                fontSize: 12,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6
                            }}
                        >
                            <Download size={13} />
                            {installing ? 'Instalando...' : 'Instalar'}
                        </button>
                        <button
                            onClick={dismiss}
                            style={{
                                padding: '8px 12px',
                                background: 'transparent',
                                color: 'var(--text-muted)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 8,
                                fontSize: 12,
                                cursor: 'pointer'
                            }}
                        >
                            Después
                        </button>
                    </div>
                </div>
                <button
                    onClick={dismiss}
                    style={{
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', padding: 4, flexShrink: 0
                    }}
                    title="Cerrar"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
}
