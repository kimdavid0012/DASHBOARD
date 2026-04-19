import React, { useMemo } from 'react';
import {
    TrendingUp, DollarSign, ShoppingCart, Users, Package, AlertTriangle, Store, Truck
} from 'lucide-react';
import { useData, filterBySucursal, getRubroLabels } from '../store/DataContext';
import { Card, KpiCard, EmptyState, BarChart, PieChart, LineChart, fmtMoney, CHART_COLORS } from '../components/UI';

export default function DashboardHome() {
    const { state } = useData();
    const current = state.meta.currentSucursalId || 'all';
    const labels = getRubroLabels(state.business.rubro);

    const ventas = filterBySucursal(state.ventas, current);
    const productos = state.productos || [];
    const clientes = state.clientes || [];
    const pedidos = filterBySucursal(state.pedidos, current);
    const empleados = filterBySucursal(state.empleados, current);

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

    // Ventas últimos 7 días
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

    // Ventas por sucursal (solo si current === 'all')
    const ventasPorSucursal = useMemo(() => {
        if (current !== 'all' || !state.sucursales.length) return [];
        return state.sucursales.map((s, i) => {
            const total = state.ventas.filter(v => v.sucursalId === s.id).reduce((acc, v) => acc + Number(v.total || 0), 0);
            return {
                label: s.nombre,
                value: total,
                display: fmtMoney(total, state.business.moneda),
                color: CHART_COLORS[i % CHART_COLORS.length]
            };
        }).sort((a, b) => b.value - a.value);
    }, [current, state.sucursales, state.ventas, state.business.moneda]);

    // Top productos vendidos
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

    if (!state.sucursales.length) {
        return (
            <Card title="Bienvenido al Dashboard">
                <EmptyState
                    icon={Store}
                    title="Primero creá una sucursal"
                    description="Todo el sistema funciona alrededor de tus sucursales. Empezá por crear al menos una."
                    tips={[
                        'KPIs del día, mes y año por sucursal',
                        'Gráficos de ventas últimos 7 días',
                        'Ranking de productos más vendidos',
                        'Alertas de stock bajo y productos sin stock',
                        'Comparativa entre sucursales cuando tengas más de una'
                    ]}
                />
            </Card>
        );
    }

    return (
        <div className="flex-col gap-4">
            <div className="kpi-grid">
                <KpiCard icon={<DollarSign size={20} />} label="Ventas hoy" value={fmtMoney(kpis.totalHoy, state.business.moneda)} delta={{ direction: 'up', text: `${kpis.ventasHoy} operaciones` }} color="#14b8a6" />
                <KpiCard icon={<TrendingUp size={20} />} label="Ventas del mes" value={fmtMoney(kpis.totalMes, state.business.moneda)} delta={{ direction: 'up', text: `${kpis.ventasMes} operaciones` }} color="#22c55e" />
                <KpiCard icon={<ShoppingCart size={20} />} label="Pedidos online" value={pedidos.length} color="#0ea5e9" />
                <KpiCard icon={<Users size={20} />} label="Clientes" value={clientes.length} color="#a855f7" />
                <KpiCard icon={<Package size={20} />} label={labels.items} value={productos.length} color="#f59e0b" />
                <KpiCard icon={<AlertTriangle size={20} />} label="Stock bajo / agotado" value={`${kpis.stockBajo} / ${kpis.sinStock}`} color="#ef4444" />
            </div>

            {!hasAnyData ? (
                <Card title="Aún sin datos">
                    <EmptyState
                        icon={TrendingUp}
                        title="Cargá tu primera venta o producto"
                        description="Cuando tengas actividad, acá vas a ver tus gráficos y rankings."
                        tips={[
                            'Gráfico de ventas de los últimos 7 días',
                            'Ventas comparadas entre sucursales',
                            'Top 5 productos más vendidos',
                            'Distribución de pedidos por estado'
                        ]}
                    />
                </Card>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
                    <Card title="Ventas - últimos 7 días" subtitle={current === 'all' ? 'Todas las sucursales' : state.sucursales.find(s => s.id === current)?.nombre}>
                        <LineChart
                            series={[{ data: chartVentas7d.map(d => d.total), color: '#14b8a6' }]}
                            labels={chartVentas7d.map(d => d.label)}
                        />
                    </Card>

                    {current === 'all' && ventasPorSucursal.length > 0 && (
                        <Card title="Ventas por sucursal (histórico)">
                            <BarChart data={ventasPorSucursal} />
                        </Card>
                    )}

                    <Card title="Top 5 productos vendidos">
                        {topProductos.length === 0 ? (
                            <div className="text-muted text-xs" style={{ padding: 20, textAlign: 'center' }}>Aún no hay ventas registradas</div>
                        ) : (
                            <BarChart data={topProductos} />
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
}
