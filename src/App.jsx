import React, { useState } from 'react';
import {
    LayoutDashboard, Store, Users, UserPlus, Truck, Package, ShoppingCart,
    ClipboardList, Wallet, Repeat, TrendingDown, Calendar, ListTodo,
    BarChart3, Megaphone, Bot, Instagram, Music2, Globe, Landmark,
    Settings as SettingsIcon
} from 'lucide-react';

import { DataProvider, useData } from './store/DataContext';
import OnboardingModal from './components/OnboardingModal';

import DashboardHome from './pages/DashboardHome';
import SucursalesPage from './pages/SucursalesPage';
import UsuariosPage from './pages/UsuariosPage';
import EmpleadosPage from './pages/EmpleadosPage';
import ProveedoresPage from './pages/ProveedoresPage';
import ProductosPage from './pages/ProductosPage';
import VentasPage from './pages/VentasPage';
import InformesPage from './pages/InformesPage';
import SettingsPage from './pages/SettingsPage';
import {
    ClientesPage, GastosPage, CajaDiariaPage, TransferenciasPage,
    AsistenciaPage, PedidosPage
} from './pages/CrudPages';
import {
    MarketingPage, AgentsPage, InstagramPage, TikTokPage, AnalyticsPage,
    WebPage, BankingPage, TareasPage
} from './pages/StubPages';

// Sidebar navigation configuration
const NAV = [
    {
        section: 'Principal',
        items: [
            { id: 'home', label: 'Inicio', icon: LayoutDashboard, component: DashboardHome },
            { id: 'informes', label: 'Informes', icon: BarChart3, component: InformesPage }
        ]
    },
    {
        section: 'Negocio',
        items: [
            { id: 'sucursales', label: 'Sucursales', icon: Store, component: SucursalesPage },
            { id: 'usuarios', label: 'Cuentas', icon: UserPlus, component: UsuariosPage },
            { id: 'empleados', label: 'Empleados', icon: Users, component: EmpleadosPage },
            { id: 'asistencia', label: 'Asistencia', icon: Calendar, component: AsistenciaPage },
            { id: 'tareas', label: 'Tareas', icon: ListTodo, component: TareasPage }
        ]
    },
    {
        section: 'Operaciones',
        items: [
            { id: 'productos', label: 'Productos', icon: Package, component: ProductosPage },
            { id: 'ventas', label: 'Ventas', icon: ShoppingCart, component: VentasPage },
            { id: 'pedidos', label: 'Pedidos online', icon: ClipboardList, component: PedidosPage },
            { id: 'caja', label: 'Caja diaria', icon: Wallet, component: CajaDiariaPage },
            { id: 'transferencias', label: 'Transferencias', icon: Repeat, component: TransferenciasPage }
        ]
    },
    {
        section: 'Finanzas',
        items: [
            { id: 'gastos', label: 'Gastos', icon: TrendingDown, component: GastosPage },
            { id: 'banking', label: 'Banco', icon: Landmark, component: BankingPage },
            { id: 'proveedores', label: 'Proveedores', icon: Truck, component: ProveedoresPage }
        ]
    },
    {
        section: 'Clientes & Marketing',
        items: [
            { id: 'clientes', label: 'Clientes', icon: Users, component: ClientesPage },
            { id: 'marketing', label: 'Marketing', icon: Megaphone, component: MarketingPage },
            { id: 'agents', label: 'Agentes AI', icon: Bot, component: AgentsPage },
            { id: 'instagram', label: 'Instagram', icon: Instagram, component: InstagramPage },
            { id: 'tiktok', label: 'TikTok', icon: Music2, component: TikTokPage },
            { id: 'analytics', label: 'Google Analytics', icon: BarChart3, component: AnalyticsPage },
            { id: 'web', label: 'Tienda online', icon: Globe, component: WebPage }
        ]
    },
    {
        section: 'Sistema',
        items: [
            { id: 'settings', label: 'Configuración', icon: SettingsIcon, component: SettingsPage }
        ]
    }
];

const ALL_ITEMS = NAV.flatMap(s => s.items);

function AppShell() {
    const { state, actions, hydrated } = useData();
    const [viewId, setViewId] = useState('home');

    if (!hydrated) {
        return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</div>;
    }

    const showOnboarding = !state.meta.onboarded;
    const currentItem = ALL_ITEMS.find(i => i.id === viewId) || ALL_ITEMS[0];
    const Component = currentItem.component;

    const current = state.meta.currentSucursalId || 'all';
    const hasMultipleSucursales = (state.sucursales || []).length > 1;

    return (
        <>
            {showOnboarding && <OnboardingModal />}
            <div className="app">
                {/* ───────── SIDEBAR ───────── */}
                <aside className="sidebar">
                    <div className="sidebar-brand">
                        <div className="sidebar-brand-logo">D</div>
                        <h1>Dashboard</h1>
                    </div>
                    <nav className="sidebar-nav">
                        {NAV.map(section => (
                            <div key={section.section}>
                                <div className="sidebar-section-label">{section.section}</div>
                                {section.items.map(it => {
                                    const Icon = it.icon;
                                    return (
                                        <button
                                            key={it.id}
                                            className={`sidebar-item ${viewId === it.id ? 'active' : ''}`}
                                            onClick={() => setViewId(it.id)}
                                        >
                                            <Icon size={18} />
                                            <span>{it.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </nav>
                    <div className="sidebar-footer">
                        {state.business.name || 'Dashboard'} · v1.0
                    </div>
                </aside>

                {/* ───────── MAIN ───────── */}
                <main className="main">
                    <div className="topbar">
                        <div className="topbar-left">
                            <div className="topbar-title">{currentItem.label}</div>
                        </div>
                        <div className="topbar-right">
                            {hasMultipleSucursales && (
                                <div className="sucursal-switcher">
                                    <Store size={14} color="var(--text-muted)" />
                                    <select
                                        value={current}
                                        onChange={e => actions.setCurrentSucursal(e.target.value)}
                                    >
                                        <option value="all">Todas las sucursales</option>
                                        {state.sucursales.map(s => (
                                            <option key={s.id} value={s.id}>{s.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="content">
                        <Component />
                    </div>
                </main>
            </div>
        </>
    );
}

export default function App() {
    return (
        <DataProvider>
            <AppShell />
        </DataProvider>
    );
}
