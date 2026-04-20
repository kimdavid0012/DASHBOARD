import React, { useState, useEffect, useRef } from 'react';
import {
    Home, BarChart3, Store, UserCog, Users, UserCheck, CheckSquare,
    ShoppingCart, Receipt, ShoppingBag, PiggyBank, ArrowRightLeft,
    DollarSign, Landmark, Truck, Users2, Megaphone, Bot,
    Instagram, Music2, Globe, Settings as SettingsIcon,
    Armchair, CalendarClock, RotateCcw, FileText, Upload, Shield,
    CheckCircle2, AlertCircle, RefreshCw, Cloud, CloudOff, User,
    Menu, X as XIcon, ChefHat, Sun, Moon
} from 'lucide-react';
import { DataProvider, useData, getRubroConfig, shouldShowSection } from './store/DataContext';
import { AuthProvider, useAuth } from './store/AuthContext';
import { useT, getRubroLabelsI18n } from './i18n';
import DashboardHome from './pages/DashboardHome';
import InformesPage from './pages/InformesPage';
import SucursalesPage from './pages/SucursalesPage';
import UsuariosPage from './pages/UsuariosPage';
import EmpleadosPage from './pages/EmpleadosPage';
import ProductosPage from './pages/ProductosPage';
import POSPage from './pages/POSPage';
import VentasPage from './pages/VentasPage';
import ProveedoresPage from './pages/ProveedoresPage';
import SettingsPage from './pages/SettingsPage';
import AfipPage from './pages/AfipPage';
import DataImportPage from './pages/DataImportPage';
import BackupPage from './pages/BackupPage';
import AccountPage from './pages/AccountPage';
import { ClientesPage, GastosPage, CajaDiariaPage, TransferenciasPage, AsistenciaPage, PedidosPage } from './pages/CrudPages';
import { MarketingPage, AgentsPage, InstagramPage, TikTokPage, AnalyticsPage, WebPage, BankingPage, TareasPage } from './pages/StubPages';
import { MesasPage, ReservasPage, KDSPage } from './pages/RestaurantPages';
import OnboardingModal from './components/OnboardingModal';
import CelaBot from './components/CelaBot';
import InstallPrompt from './components/InstallPrompt';

const RUBRO_EMOJI = {
    kiosco: '🏪', restaurante: '🍽️', accesorios: '👗',
    servicios: '💼', general: '🏬', otro: '✨'
};

// ── Save indicator chip for topbar ────────────────────────────────
function SaveIndicator() {
    const { saveStatus } = useData();
    const t = useT();
    if (!saveStatus) return null;
    const { saving, lastSaved, lastError, source } = saveStatus;

    if (saving) return <div className="save-indicator saving"><RefreshCw size={12} className="spin" /><span>{t('app.save_indicator.saving')}</span></div>;
    if (lastError) return <div className="save-indicator error" title={lastError}><AlertCircle size={12} /><span>{t('app.save_indicator.error')}</span></div>;
    if (lastSaved) {
        const secs = Math.floor((Date.now() - new Date(lastSaved).getTime()) / 1000);
        const ago = secs < 60 ? `${secs}s` : secs < 3600 ? `${Math.floor(secs / 60)}m` : `${Math.floor(secs / 3600)}h`;
        return <div className="save-indicator ok" title={`${ago} · ${source}`}><CheckCircle2 size={12} /><span>{t('app.save_indicator.ok')}</span></div>;
    }
    return null;
}

// ── Cloud sync indicator (siempre visible, muestra estado offline/cloud) ──
function CloudSyncIndicator({ onNavigate }) {
    const { isCloud, isOffline, syncStatus, firebaseAvailable } = useAuth();
    const t = useT();

    // Si Firebase no está ni configurado, no mostramos nada (la app funciona full-offline)
    if (!firebaseAvailable) return null;

    // Offline mode explícito
    if (isOffline) {
        return (
            <div
                className="save-indicator"
                onClick={() => onNavigate?.('account')}
                style={{ cursor: 'pointer', color: 'var(--text-muted)', opacity: 0.7 }}
                title="Haciendo clic vas a Cuenta para activar sync en la nube"
            >
                <Cloud size={12} style={{ opacity: 0.5 }} />
                <span>Local</span>
            </div>
        );
    }

    if (!isCloud) return null;

    const { syncing, lastSyncAt, error } = syncStatus;
    return (
        <div
            className={`save-indicator ${error ? 'error' : syncing ? 'saving' : 'ok'}`}
            onClick={() => onNavigate?.('account')}
            style={{ cursor: 'pointer' }}
        >
            {syncing ? <RefreshCw size={12} className="spin" /> : error ? <AlertCircle size={12} /> : <Cloud size={12} />}
            <span>{syncing ? t('app.cloud_indicator.syncing') : error ? t('app.cloud_indicator.error') : lastSyncAt ? t('app.cloud_indicator.cloud') : t('app.cloud_indicator.pending')}</span>
        </div>
    );
}

// ── Theme toggle (dark/light) ──────────────────────────────────────
function ThemeToggle() {
    const [theme, setTheme] = React.useState(() => {
        return localStorage.getItem('theme') || 'dark';
    });

    React.useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    return (
        <button
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            className="save-indicator"
            style={{ cursor: 'pointer', background: 'transparent' }}
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            aria-label="Toggle theme"
        >
            {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
        </button>
    );
}

// ── Cloud Sync Engine Bridge (usa hooks, dispara en modo cloud) ──
function CloudSyncBridge() {
    const { isCloud, user, setSyncStatus } = useAuth();
    const { state, actions } = useData();
    const syncRef = useRef(null);
    const stateRef = useRef(state);

    // Keep latest state available to sync engine
    useEffect(() => { stateRef.current = state; }, [state]);

    useEffect(() => {
        if (!isCloud || !user) {
            if (syncRef.current) {
                syncRef.current.stop?.();
                syncRef.current = null;
            }
            return;
        }

        // Arrancar sync engine
        let cancelled = false;
        (async () => {
            try {
                const { startSyncEngine, reconcileOnLogin } = await import('./utils/syncEngine');

                // 1) Al entrar a cloud, reconciliar con Drive
                setSyncStatus(s => ({ ...s, syncing: true, error: null }));
                const reconcile = await reconcileOnLogin(stateRef.current);
                if (cancelled) return;

                if (reconcile.source === 'drive' && reconcile.state) {
                    const ok = confirm(
                        '☁️ Encontré datos más recientes en tu Google Drive\n\n' +
                        `Subidos: ${new Date(reconcile.remoteSaved).toLocaleString('es-AR')}\n\n` +
                        '¿Querés traer esa versión?\n\n' +
                        '(Cancelar = mantenés lo de este dispositivo y sobrescribís Drive)'
                    );
                    if (ok) {
                        actions.hydrate(reconcile.state);
                    }
                }

                // 2) Arrancar sync periódico
                syncRef.current = startSyncEngine({
                    getState: () => stateRef.current,
                    onSyncStart: () => setSyncStatus(s => ({ ...s, syncing: true, error: null })),
                    onSyncSuccess: ({ lastSyncAt }) => setSyncStatus(s => ({
                        ...s, syncing: false, lastSyncAt, error: null, pendingChanges: false
                    })),
                    onSyncError: (err) => setSyncStatus(s => ({ ...s, syncing: false, error: err.message }))
                });
            } catch (err) {
                console.error('Sync engine failed:', err);
                setSyncStatus(s => ({ ...s, syncing: false, error: err.message }));
            }
        })();

        return () => {
            cancelled = true;
            if (syncRef.current) {
                syncRef.current.stop?.();
                syncRef.current = null;
            }
        };
    }, [isCloud, user?.uid]);

    return null;
}

function AppContent() {
    const { state, actions, hydrated } = useData();
    const { isCloud, user, mode } = useAuth();
    const t = useT();
    const [page, setPage] = useState('home');
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    // Deep linking via URL ?nav=pos para shortcuts PWA y links directos
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const nav = params.get('nav');
        const validPages = ['home', 'pos', 'kds', 'informes', 'afip', 'productos', 'ventas', 'clientes', 'empleados', 'mesas', 'reservas', 'sucursales', 'settings', 'account'];
        if (nav && validPages.includes(nav)) {
            setPage(nav);
            // Limpia el query param sin recargar
            const url = new URL(window.location);
            url.searchParams.delete('nav');
            url.searchParams.delete('source');
            window.history.replaceState({}, '', url);
        }
    }, []);

    // Close mobile nav on page change
    useEffect(() => {
        setMobileNavOpen(false);
    }, [page]);

    // Close mobile nav on escape key
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') setMobileNavOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    if (!hydrated || mode === 'loading') {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
                <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: 'linear-gradient(135deg, #63f1cb, #3ddbae)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-display)', color: '#0a0a0f', fontSize: 22, fontWeight: 700,
                    boxShadow: '0 4px 14px rgba(99, 241, 203, 0.3)'
                }}>D</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t('app.loading_data')}</div>
            </div>
        );
    }

    const showOnboarding = !state.meta.onboarded;
    const labels = getRubroLabelsI18n(state.business.rubro);
    const rubroConfig = getRubroConfig(state.business.rubro);
    const rubroName = t(`onboarding.rubros.${state.business.rubro}.name`) || 'General';

    const allNavGroups = [
        {
            label: t('nav.principal'),
            items: [
                { id: 'home', icon: Home, label: t('nav.home') },
                { id: 'informes', icon: BarChart3, label: t('nav.informes') }
            ]
        },
        {
            label: t('nav.negocio'),
            items: [
                { id: 'sucursales', icon: Store, label: t('nav.sucursales') },
                { id: 'usuarios', icon: UserCog, label: t('nav.cuentas') },
                { id: 'empleados', icon: Users, label: t('nav.empleados') },
                { id: 'asistencia', icon: UserCheck, label: t('nav.asistencia') },
                { id: 'tareas', icon: CheckSquare, label: t('nav.tareas') }
            ]
        },
        {
            label: state.business.rubro === 'restaurante' ? t('nav.salon') : t('nav.agenda'),
            items: [
                { id: 'mesas', icon: Armchair, label: state.business.rubro === 'restaurante' ? t('nav.mesas') : t('nav.espacios') },
                { id: 'reservas', icon: CalendarClock, label: t('nav.reservas') },
                { id: 'kds', icon: ChefHat, label: 'KDS · Cocina', highlight: state.business.rubro === 'restaurante' }
            ]
        },
        {
            label: t('nav.operaciones'),
            items: [
                { id: 'productos', icon: () => <span style={{ fontSize: 18 }}>{rubroConfig.productEmoji || '📦'}</span>, label: labels.items },
                { id: 'pos', icon: ShoppingCart, label: labels.pos, highlight: true },
                { id: 'ventas', icon: Receipt, label: `${t('nav.ventas_historial')}` },
                { id: 'pedidos', icon: ShoppingBag, label: labels.orders },
                { id: 'caja', icon: PiggyBank, label: t('nav.caja') },
                { id: 'transferencias', icon: ArrowRightLeft, label: t('nav.transferencias') }
            ]
        },
        {
            label: t('nav.finanzas'),
            items: [
                { id: 'gastos', icon: DollarSign, label: t('nav.gastos') },
                { id: 'banking', icon: Landmark, label: t('nav.banco') },
                { id: 'proveedores', icon: Truck, label: t('nav.proveedores') },
                { id: 'afip', icon: FileText, label: t('nav.afip') }
            ]
        },
        {
            label: t('nav.clientes_mkt'),
            items: [
                { id: 'clientes', icon: Users2, label: labels.clients },
                { id: 'marketing', icon: Megaphone, label: t('nav.marketing') },
                { id: 'agents', icon: Bot, label: t('nav.agents') },
                { id: 'instagram', icon: Instagram, label: t('nav.instagram') },
                { id: 'tiktok', icon: Music2, label: t('nav.tiktok') },
                { id: 'analytics', icon: BarChart3, label: t('nav.analytics') },
                { id: 'web', icon: Globe, label: t('nav.web') }
            ]
        },
        {
            label: t('nav.datos_sistema'),
            items: [
                { id: 'import', icon: Upload, label: t('nav.import') },
                { id: 'backup', icon: Shield, label: t('nav.backup') },
                { id: 'account', icon: isCloud ? Cloud : User, label: isCloud ? t('nav.cuenta_cloud') : t('nav.cuenta_offline'), highlight: isCloud },
                { id: 'settings', icon: SettingsIcon, label: t('nav.configuracion') }
            ]
        }
    ];

    const NAV_GROUPS = allNavGroups
        .map(grp => ({ ...grp, items: grp.items.filter(item => shouldShowSection(state.business.rubro, item.id)) }))
        .filter(grp => grp.items.length > 0);

    const renderPage = () => {
        if (!shouldShowSection(state.business.rubro, page)) {
            setTimeout(() => setPage('home'), 0);
            return null;
        }
        switch (page) {
            case 'home': return <DashboardHome onNavigate={setPage} />;
            case 'informes': return <InformesPage />;
            case 'sucursales': return <SucursalesPage />;
            case 'usuarios': return <UsuariosPage />;
            case 'empleados': return <EmpleadosPage />;
            case 'asistencia': return <AsistenciaPage />;
            case 'tareas': return <TareasPage />;
            case 'mesas': return <MesasPage />;
            case 'reservas': return <ReservasPage />;
            case 'kds': return <KDSPage />;
            case 'productos': return <ProductosPage />;
            case 'pos': return <POSPage />;
            case 'ventas': return <VentasPage onNavigate={setPage} />;
            case 'pedidos': return <PedidosPage />;
            case 'caja': return <CajaDiariaPage />;
            case 'transferencias': return <TransferenciasPage />;
            case 'gastos': return <GastosPage />;
            case 'banking': return <BankingPage />;
            case 'proveedores': return <ProveedoresPage />;
            case 'afip': return <AfipPage />;
            case 'clientes': return <ClientesPage />;
            case 'marketing': return <MarketingPage onNavigate={setPage} />;
            case 'agents': return <AgentsPage onNavigate={setPage} />;
            case 'instagram': return <InstagramPage onNavigate={setPage} />;
            case 'tiktok': return <TikTokPage onNavigate={setPage} />;
            case 'analytics': return <AnalyticsPage onNavigate={setPage} />;
            case 'web': return <WebPage onNavigate={setPage} />;
            case 'import': return <DataImportPage />;
            case 'backup': return <BackupPage />;
            case 'account': return <AccountPage />;
            case 'settings': return <SettingsPage />;
            default: return <DashboardHome onNavigate={setPage} />;
        }
    };

    const currentPageLabel = (() => {
        for (const grp of NAV_GROUPS) {
            const f = grp.items.find(i => i.id === page);
            if (f) return f.label;
        }
        return 'Inicio';
    })();

    const handleReconfigure = () => {
        const ok = confirm(t('app.reconfigure_confirm'));
        if (ok) actions.resetOnboarding();
    };

    return (
        <div className={`app ${mobileNavOpen ? 'mobile-nav-open' : ''}`}>
            <CloudSyncBridge />

            {/* Mobile backdrop - blocks clicks when drawer open */}
            <div
                className="mobile-nav-backdrop"
                onClick={() => setMobileNavOpen(false)}
                aria-hidden="true"
            />

            <aside className="sidebar" aria-label="Navigation">
                <button
                    className="sidebar-close-mobile"
                    onClick={() => setMobileNavOpen(false)}
                    aria-label="Close navigation"
                >
                    <XIcon size={20} />
                </button>
                <div className="sidebar-brand">
                    <div className="sidebar-brand-logo">D</div>
                    <div className="sidebar-brand-text">
                        <h1>Dashboard</h1>
                        <div className="sidebar-brand-tagline">{t('app.brand_tagline')}</div>
                    </div>
                </div>
                <nav className="sidebar-nav">
                    {NAV_GROUPS.map(grp => (
                        <div key={grp.label}>
                            <div className="sidebar-section-label">{grp.label}</div>
                            {grp.items.map(item => {
                                const Icon = item.icon;
                                const isHighlight = item.highlight && page !== item.id;
                                return (
                                    <button
                                        key={item.id}
                                        className={`sidebar-item ${page === item.id ? 'active' : ''} ${isHighlight ? 'highlight' : ''}`}
                                        onClick={() => setPage(item.id)}
                                    >
                                        <Icon size={18} />
                                        <span>{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </nav>
                <div className="sidebar-footer">
                    <div className="sidebar-footer-business">{state.business.name || t('app.my_business')}</div>
                    <div className="sidebar-rubro-badge">
                        <span>{RUBRO_EMOJI[state.business.rubro] || '🏬'}</span>
                        <span>{rubroName}</span>
                    </div>
                    {isCloud && user && (
                        <div style={{ marginTop: 8, padding: 8, background: 'var(--accent-soft)', borderRadius: 8, border: '1px solid var(--border-accent)' }}>
                            <div className="flex items-center gap-2">
                                {user.photoURL && <img src={user.photoURL} alt="" style={{ width: 22, height: 22, borderRadius: '50%' }} />}
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>{user.displayName || user.email}</div>
                                    <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Drive ●</div>
                                </div>
                            </div>
                        </div>
                    )}
                    <button
                        className="sidebar-reconfigure"
                        onClick={handleReconfigure}
                        title={t('app.reconfigure')}
                    >
                        <RotateCcw size={11} style={{ display: 'inline', marginRight: 6, verticalAlign: -1 }} />
                        {t('app.reconfigure')}
                    </button>
                </div>
            </aside>

            <div className="main">
                <div className="topbar">
                    <div className="topbar-left">
                        <button
                            className="topbar-menu-btn"
                            onClick={() => setMobileNavOpen(true)}
                            aria-label="Open navigation"
                        >
                            <Menu size={20} />
                        </button>
                        <div className="topbar-title">{currentPageLabel}</div>
                    </div>
                    <div className="topbar-right">
                        <SaveIndicator />
                        <CloudSyncIndicator onNavigate={setPage} />
                        <ThemeToggle />
                        {state.sucursales.length > 0 && (
                            <div className="sucursal-switcher">
                                <Store size={14} style={{ color: 'var(--text-muted)' }} />
                                <select
                                    value={state.meta.currentSucursalId || 'all'}
                                    onChange={e => actions.setCurrentSucursal(e.target.value === 'all' ? null : e.target.value)}
                                >
                                    <option value="all">{t('app.all_branches')}</option>
                                    {state.sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
                <div className="content">
                    {renderPage()}
                </div>
            </div>

            {showOnboarding && <OnboardingModal />}
            {!showOnboarding && <CelaBot />}
            {!showOnboarding && <InstallPrompt />}
        </div>
    );
}

export default function App() {
    return (
        <DataProvider>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </DataProvider>
    );
}
