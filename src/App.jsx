import React, { useState } from 'react';
import {
    Home, BarChart3, Store, UserCog, Users, UserCheck, CheckSquare,
    ShoppingCart, Receipt, ShoppingBag, PiggyBank, ArrowRightLeft,
    DollarSign, Landmark, Truck, Users2, Megaphone, Bot,
    Instagram, Music2, Globe, Settings as SettingsIcon, Menu,
    Armchair, CalendarClock
} from 'lucide-react';
import { DataProvider, useData, getRubroLabels, getRubroConfig, shouldShowSection } from './store/DataContext';
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
import { ClientesPage, GastosPage, CajaDiariaPage, TransferenciasPage, AsistenciaPage, PedidosPage } from './pages/CrudPages';
import { MarketingPage, AgentsPage, InstagramPage, TikTokPage, AnalyticsPage, WebPage, BankingPage, TareasPage } from './pages/StubPages';
import { MesasPage, ReservasPage } from './pages/RestaurantPages';
import OnboardingModal from './components/OnboardingModal';

function AppContent() {
    const { state, actions, hydrated } = useData();
    const [page, setPage] = useState('home');

    if (!hydrated) return null;

    const showOnboarding = !state.meta.onboarded;
    const labels = getRubroLabels(state.business.rubro);
    const rubroConfig = getRubroConfig(state.business.rubro);
    const rubroName = {
        general: 'General',
        kiosco: 'Kiosco',
        restaurante: 'Restaurante',
        accesorios: 'Accesorios',
        servicios: 'Servicios',
        otro: 'Otro'
    }[state.business.rubro] || 'General';

    // NAV structure with rubro-aware visibility
    const allNavGroups = [
        {
            label: 'Principal',
            items: [
                { id: 'home', icon: Home, label: 'Inicio' },
                { id: 'informes', icon: BarChart3, label: 'Informes' }
            ]
        },
        {
            label: 'Negocio',
            items: [
                { id: 'sucursales', icon: Store, label: 'Sucursales' },
                { id: 'usuarios', icon: UserCog, label: 'Cuentas' },
                { id: 'empleados', icon: Users, label: 'Empleados' },
                { id: 'asistencia', icon: UserCheck, label: 'Asistencia' },
                { id: 'tareas', icon: CheckSquare, label: 'Tareas' }
            ]
        },
        {
            label: state.business.rubro === 'restaurante' ? 'Salón' : 'Agenda',
            items: [
                { id: 'mesas', icon: Armchair, label: 'Mesas' },
                { id: 'reservas', icon: CalendarClock, label: 'Reservas' }
            ]
        },
        {
            label: 'Operaciones',
            items: [
                { id: 'productos', icon: () => <span style={{ fontSize: 18 }}>📦</span>, label: labels.items },
                { id: 'pos', icon: ShoppingCart, label: labels.pos, highlight: true },
                { id: 'ventas', icon: Receipt, label: `Historial ${labels.sales.toLowerCase()}` },
                { id: 'pedidos', icon: ShoppingBag, label: labels.orders },
                { id: 'caja', icon: PiggyBank, label: 'Caja diaria' },
                { id: 'transferencias', icon: ArrowRightLeft, label: 'Transferencias' }
            ]
        },
        {
            label: 'Finanzas',
            items: [
                { id: 'gastos', icon: DollarSign, label: 'Gastos' },
                { id: 'banking', icon: Landmark, label: 'Banco' },
                { id: 'proveedores', icon: Truck, label: 'Proveedores' }
            ]
        },
        {
            label: 'Clientes & Marketing',
            items: [
                { id: 'clientes', icon: Users2, label: labels.clients },
                { id: 'marketing', icon: Megaphone, label: 'Marketing' },
                { id: 'agents', icon: Bot, label: 'Agentes AI' },
                { id: 'instagram', icon: Instagram, label: 'Instagram' },
                { id: 'tiktok', icon: Music2, label: 'TikTok' },
                { id: 'analytics', icon: BarChart3, label: 'Analytics' },
                { id: 'web', icon: Globe, label: 'Tienda online' }
            ]
        },
        {
            label: 'Sistema',
            items: [{ id: 'settings', icon: SettingsIcon, label: 'Configuración' }]
        }
    ];

    // Filter nav by rubro visibility
    const NAV_GROUPS = allNavGroups
        .map(grp => ({
            ...grp,
            items: grp.items.filter(item => shouldShowSection(state.business.rubro, item.id))
        }))
        .filter(grp => grp.items.length > 0);

    // Renderer
    const renderPage = () => {
        // Navigation guard - if rubro hides this section, redirect home
        if (!shouldShowSection(state.business.rubro, page)) {
            setTimeout(() => setPage('home'), 0);
            return null;
        }
        switch (page) {
            case 'home': return <DashboardHome />;
            case 'informes': return <InformesPage />;
            case 'sucursales': return <SucursalesPage />;
            case 'usuarios': return <UsuariosPage />;
            case 'empleados': return <EmpleadosPage />;
            case 'asistencia': return <AsistenciaPage />;
            case 'tareas': return <TareasPage />;
            case 'mesas': return <MesasPage />;
            case 'reservas': return <ReservasPage />;
            case 'productos': return <ProductosPage />;
            case 'pos': return <POSPage />;
            case 'ventas': return <VentasPage onNavigate={setPage} />;
            case 'pedidos': return <PedidosPage />;
            case 'caja': return <CajaDiariaPage />;
            case 'transferencias': return <TransferenciasPage />;
            case 'gastos': return <GastosPage />;
            case 'banking': return <BankingPage />;
            case 'proveedores': return <ProveedoresPage />;
            case 'clientes': return <ClientesPage />;
            case 'marketing': return <MarketingPage onNavigate={setPage} />;
            case 'agents': return <AgentsPage onNavigate={setPage} />;
            case 'instagram': return <InstagramPage onNavigate={setPage} />;
            case 'tiktok': return <TikTokPage onNavigate={setPage} />;
            case 'analytics': return <AnalyticsPage onNavigate={setPage} />;
            case 'web': return <WebPage onNavigate={setPage} />;
            case 'settings': return <SettingsPage />;
            default: return <DashboardHome />;
        }
    };

    const currentPageLabel = (() => {
        for (const grp of NAV_GROUPS) {
            const f = grp.items.find(i => i.id === page);
            if (f) return f.label;
        }
        return 'Inicio';
    })();

    return (
        <div className="app">
            <aside className="sidebar">
                <div className="sidebar-brand">
                    <div className="sidebar-brand-logo">D</div>
                    <h1>Dashboard</h1>
                </div>
                <nav className="sidebar-nav">
                    {NAV_GROUPS.map(grp => (
                        <div key={grp.label}>
                            <div className="sidebar-section-label">{grp.label}</div>
                            {grp.items.map(item => {
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.id}
                                        className={`sidebar-item ${page === item.id ? 'active' : ''}`}
                                        onClick={() => setPage(item.id)}
                                        style={item.highlight && page !== item.id ? { color: 'var(--accent)', fontWeight: 600 } : {}}
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
                    <div>{state.business.name || 'Dashboard v1'}</div>
                    <div className="sidebar-rubro-badge">{rubroName}</div>
                </div>
            </aside>

            <div className="main">
                <div className="topbar">
                    <div className="topbar-left">
                        <div className="topbar-title">{currentPageLabel}</div>
                    </div>
                    <div className="topbar-right">
                        {state.sucursales.length > 0 && (
                            <div className="sucursal-switcher">
                                <Store size={14} style={{ color: 'var(--text-muted)' }} />
                                <select
                                    value={state.meta.currentSucursalId || 'all'}
                                    onChange={e => actions.setCurrentSucursal(e.target.value === 'all' ? null : e.target.value)}
                                >
                                    <option value="all">Todas las sucursales</option>
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
        </div>
    );
}

export default function App() {
    return (
        <DataProvider>
            <AppContent />
        </DataProvider>
    );
}
