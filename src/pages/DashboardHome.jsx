import React, { useMemo } from 'react';
import {
    TrendingUp, DollarSign, ShoppingCart, Users, Package,
    AlertTriangle, Store, Home, Calendar
} from 'lucide-react';
import { useData, filterBySucursal, getRubroLabels, SECTION_HELP } from '../store/DataContext';
import { PageHeader, Card, KpiCard, EmptyState, BarChart, LineChart, fmtMoney, CHART_COLORS, InfoBox } from '../components/UI';

export default function DashboardHome() {
    const { state } = useData();
    const current = state.meta.currentSucursalId || 'all';
    const labels = getRubroLabels(state.business.rubro);

    const ventas = filterBySucursal(state.ventas, current);
    const productos = state.productos || [];
    const clientes = state.clientes || [];
    const pedidos = filterBySucursal(state.pedidos, current);

    const kpis = useMemo(() => {
        const now = new Date();
        const hoy = now.toISOString().slice(0, 10);
        const mes = hoy.slice(0, 7);
        const ventasHoy = ventas.filter(v => (v.fecha || '').slice(0, 10) === hoy);
        const ventasMes = ventas.filter(v => (v.fecha || '').slice(0, 7) === mes);
        const totalHoy = ventasHoy.reduce((s, v) => s + Number(v.total || 0), 0);
        const totalMes = ventasMes.reduce((s, v) => s + Number(v.total || 0), 0);
        const stockBajo = productos.filter(p => Number(p.stock || 0) > 0 && Number(p.stock || 0) <= Number(p.stockMinimo || 5)).length;
        const sinStock = productos.filter(p => Number(p.stock || 0) <= 0).length;
        return { ventasHoy: ventasHoy.length, totalHoy, ventasMes: ventasMes.length, totalMes, stockBajo, sinStock };
    }, [ventas, productos]);

    const chartVentas7d = useMemo(() => {
        const dias = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            const total = ventas.filter(v => (v.fecha || '').slice(0, 10) === key).reduce((s, v) => s + Number(v.total || 0), 0);
            dias.push({ key, label: d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }), total });
        }
        return dias;
    }, [ventas]);

    const ventasPorSucursal = useMemo(() => {
        if (current !== 'all' || !state.sucursales.length) return [];
        return state.sucursales.map((s, i) => {
            const total = state.ventas.filter(v => v.sucursalId === s.id).reduce((acc, v) => acc + Number(v.total || 0), 0);
            return { label: s.nombre, value: total, display: fmtMoney(total, state.business.moneda), color: CHART_COLORS[i % CHART_COLORS.length] };
        }).sort((a, b) => b.value - a.value);
    }, [current, state.sucursales, state.ventas, state.business.moneda]);

    const topProductos = useMemo(() => {
        const count = {};
        ventas.forEach(v => {
            (v.items || []).forEach(it => {
                count[it.productoId] = (count[it.productoId] || 0) + Number(it.cantidad || 0);
            });
        });
        return Object.entries(count)
            .map(([pid, cant]) => {
                const p = productos.find(x => x.id === pid);
                return { label: p?.nombre || 'Desconocido', value: cant };
            })
            .sort((a, b) => b.value - a.value)
            .slice(0, 5)
            .map((d, i) => ({ ...d, color: CHART_COLORS[i % CHART_COLORS.length] }));
    }, [ventas, productos]);

    const hasAnyData = ventas.length > 0 || productos.length > 0 || clientes.length > 0;

    // ───── No sucursales yet ─────
    if (!state.sucursales.length) {
        return (
            <div>
                <PageHeader icon={Home} title="Inicio" subtitle={state.business.name || 'Panel de control'} help={SECTION_HELP.home} />
                <Card>
                    <EmptyState
                        icon={Store}
                        title="Empezá creando tu primera sucursal"
                        description="El Dashboard está organizado por sucursales. Todo lo que cargues (ventas, empleados, stock, gastos) se asocia a una sucursal."
                        tips={[
                            'KPIs del día y del mes en tiempo real',
                            'Gráfico de ventas de los últimos 7 días',
                            'Ranking de los productos más vendidos',
                            'Alertas de stock bajo y productos agotados',
                            'Comparativa entre sucursales cuando tengas más de una'
                        ]}
                        example="Ejemplo: si tenés 3 locales, cada uno es una 'sucursal' y podés ver cuál vende más, quién trabaja ahí, qué stock tiene, etc."
                    />
                </Card>
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                icon={Home}
                title={`Inicio${state.business.name ? ' — ' + state.business.name : ''}`}
                subtitle={current === 'all' ? 'Vista consolidada de todas las sucursales' : `Sucursal: ${state.sucursales.find(s => s.id === current)?.nombre}`}
                help={SECTION_HELP.home}
            />

            <div className="kpi-grid mb-4">
                <KpiCard
                    icon={<DollarSign size={20} />}
                    label={`${labels.sales} hoy`}
                    value={fmtMoney(kpis.totalHoy, state.business.moneda)}
                    delta={{ direction: 'up', text: `${kpis.ventasHoy} operaciones` }}
                    color="#14b8a6"
                    hint="Total facturado en el día de hoy"
                />
                <KpiCard
                    icon={<TrendingUp size={20} />}
                    label={`${labels.sales} del mes`}
                    value={fmtMoney(kpis.totalMes, state.business.moneda)}
                    delta={{ direction: 'up', text: `${kpis.ventasMes} operaciones` }}
                    color="#22c55e"
                />
                <KpiCard icon={<ShoppingCart size={20} />} label={labels.orders} value={pedidos.length} color="#0ea5e9" />
                <KpiCard icon={<Users size={20} />} label={labels.clients} value={clientes.length} color="#a855f7" />
                <KpiCard icon={<Package size={20} />} label={labels.items} value={productos.length} color="#f59e0b" />
                <KpiCard
                    icon={<AlertTriangle size={20} />}
                    label="Alertas de stock"
                    value={`${kpis.stockBajo} / ${kpis.sinStock}`}
                    color="#ef4444"
                    hint={`${kpis.stockBajo} con stock bajo, ${kpis.sinStock} sin stock`}
                />
            </div>

            {!hasAnyData ? (
                <Card>
                    <InfoBox>
                        Ya creaste tu sucursal. Ahora podés cargar {labels.itemPlural}, empleados y empezar a vender.
                    </InfoBox>
                    <EmptyState
                        icon={TrendingUp}
                        title="Cargá tu catálogo y empezá a vender"
                        description="Una vez que tengas datos, vas a ver gráficos y rankings acá."
                        tips={[
                            'Gráfico de ventas de los últimos 7 días',
                            'Comparativa entre sucursales',
                            `Top 5 ${labels.itemPlural} más vendidos`,
                            'Distribución de pedidos por estado'
                        ]}
                    />
                </Card>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
                    <Card title={`${labels.sales} — últimos 7 días`} subtitle={current === 'all' ? 'Todas las sucursales' : state.sucursales.find(s => s.id === current)?.nombre}>
                        <LineChart
                            series={[{ data: chartVentas7d.map(d => d.total), color: '#14b8a6' }]}
                            labels={chartVentas7d.map(d => d.label)}
                        />
                    </Card>

                    {current === 'all' && ventasPorSucursal.length > 0 && (
                        <Card title="Ventas por sucursal (histórico)" subtitle="Comparativa total acumulada">
                            <BarChart data={ventasPorSucursal} />
                        </Card>
                    )}

                    <Card title={`Top 5 ${labels.itemPlural} vendidos`} subtitle="Los que más rotan">
                        {topProductos.length === 0 ? (
                            <div className="text-muted text-xs" style={{ padding: 20, textAlign: 'center' }}>
                                Aún no hay ventas registradas
                            </div>
                        ) : (
                            <BarChart data={topProductos} />
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
}
