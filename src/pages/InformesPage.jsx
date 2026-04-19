import React, { useMemo, useState } from 'react';
import { BarChart3, TrendingUp, Store, Users, DollarSign } from 'lucide-react';
import { useData, filterBySucursal, getRubroLabels, SECTION_HELP } from '../store/DataContext';
import { PageHeader, Card, KpiCard, EmptyState, BarChart, LineChart, PieChart, fmtMoney, CHART_COLORS, InfoBox } from '../components/UI';

export default function InformesPage() {
    const { state } = useData();
    const labels = getRubroLabels(state.business.rubro);
    const [tab, setTab] = useState('general');
    const [periodo, setPeriodo] = useState('30');
    const current = state.meta.currentSucursalId || 'all';

    const ventas = useMemo(() => {
        let list = filterBySucursal(state.ventas, current);
        if (periodo !== 'all') {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - Number(periodo));
            list = list.filter(v => new Date(v.fecha || 0) >= cutoff);
        }
        return list;
    }, [state.ventas, current, periodo]);

    const gastos = useMemo(() => {
        let list = filterBySucursal(state.gastos, current);
        if (periodo !== 'all') {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - Number(periodo));
            list = list.filter(g => new Date(g.fecha || 0) >= cutoff);
        }
        return list;
    }, [state.gastos, current, periodo]);

    const totalVentas = ventas.reduce((s, v) => s + Number(v.total || 0), 0);
    const totalGastos = gastos.reduce((s, g) => s + Number(g.monto || 0), 0);
    const margen = totalVentas - totalGastos;

    const serieVentas = useMemo(() => {
        const n = Number(periodo) || 30;
        const dias = [];
        for (let i = n - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            const total = ventas.filter(v => (v.fecha || '').slice(0, 10) === key).reduce((s, v) => s + Number(v.total || 0), 0);
            dias.push({ label: d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }), total });
        }
        return dias;
    }, [ventas, periodo]);

    const porSucursal = useMemo(() => state.sucursales.map((s, i) => ({
        label: s.nombre,
        value: ventas.filter(v => v.sucursalId === s.id).reduce((acc, v) => acc + Number(v.total || 0), 0),
        display: fmtMoney(ventas.filter(v => v.sucursalId === s.id).reduce((acc, v) => acc + Number(v.total || 0), 0), state.business.moneda),
        color: CHART_COLORS[i % CHART_COLORS.length]
    })).sort((a, b) => b.value - a.value), [state.sucursales, ventas, state.business.moneda]);

    const porEmpleado = useMemo(() => {
        const agg = {};
        ventas.forEach(v => {
            if (v.empleadoId) agg[v.empleadoId] = (agg[v.empleadoId] || 0) + Number(v.total || 0);
        });
        return Object.entries(agg).map(([eid, total], i) => {
            const e = state.empleados.find(x => x.id === eid);
            return {
                label: e ? `${e.nombre} ${e.apellido || ''}` : 'Desconocido',
                value: total,
                display: fmtMoney(total, state.business.moneda),
                color: CHART_COLORS[i % CHART_COLORS.length],
                comisionPct: e?.comisionPct || 0,
                comision: total * (Number(e?.comisionPct || 0) / 100)
            };
        }).sort((a, b) => b.value - a.value);
    }, [ventas, state.empleados, state.business.moneda]);

    const gastosPorCategoria = useMemo(() => {
        const agg = {};
        gastos.forEach(g => { agg[g.categoria] = (agg[g.categoria] || 0) + Number(g.monto || 0); });
        return Object.entries(agg).map(([label, value], i) => ({ label, value, color: CHART_COLORS[i % CHART_COLORS.length] })).sort((a, b) => b.value - a.value);
    }, [gastos]);

    const metodoVentas = useMemo(() => {
        const agg = {};
        ventas.forEach(v => { agg[v.metodo] = (agg[v.metodo] || 0) + Number(v.total || 0); });
        return Object.entries(agg).map(([label, value], i) => ({ label, value, color: CHART_COLORS[i % CHART_COLORS.length] }));
    }, [ventas]);

    if (state.ventas.length === 0 && state.gastos.length === 0) {
        return (
            <div>
                <PageHeader icon={BarChart3} title="Informes" subtitle="Reportes detallados del negocio" help={SECTION_HELP.informes} />
                <Card>
                    <EmptyState
                        icon={BarChart3}
                        title="Sin datos para reportar"
                        description="Cargá al menos una venta o un gasto para ver informes."
                        tips={['4 ángulos: General, Por Sucursal, Por Empleado, Financiero', 'Filtros por período (7/30/90 días, año, todo)', 'Gráficos y rankings automáticos', 'Cálculo de comisiones por empleado']}
                    />
                </Card>
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                icon={BarChart3}
                title="Informes"
                subtitle="Reportes detallados del negocio"
                help={SECTION_HELP.informes}
                actions={
                    <select className="select" style={{ maxWidth: 160 }} value={periodo} onChange={e => setPeriodo(e.target.value)}>
                        <option value="7">Últimos 7 días</option>
                        <option value="30">Últimos 30 días</option>
                        <option value="90">Últimos 90 días</option>
                        <option value="365">Último año</option>
                        <option value="all">Todo</option>
                    </select>
                }
            />

            <div className="tabs">
                <button className={`tab ${tab === 'general' ? 'active' : ''}`} onClick={() => setTab('general')}><TrendingUp size={14} /> General</button>
                <button className={`tab ${tab === 'sucursal' ? 'active' : ''}`} onClick={() => setTab('sucursal')}><Store size={14} /> Por sucursal</button>
                <button className={`tab ${tab === 'empleado' ? 'active' : ''}`} onClick={() => setTab('empleado')}><Users size={14} /> Por empleado</button>
                <button className={`tab ${tab === 'financiero' ? 'active' : ''}`} onClick={() => setTab('financiero')}><DollarSign size={14} /> Financiero</button>
            </div>

            <div className="kpi-grid mb-4">
                <KpiCard icon={<TrendingUp size={20} />} label={`${labels.sales} (período)`} value={fmtMoney(totalVentas, state.business.moneda)} color="#63f1cb" />
                <KpiCard icon={<TrendingUp size={20} />} label="Operaciones" value={ventas.length} color="#60a5fa" />
                <KpiCard icon={<DollarSign size={20} />} label="Gastos (período)" value={fmtMoney(totalGastos, state.business.moneda)} color="#ef4444" />
                <KpiCard icon={<DollarSign size={20} />} label="Margen (V − G)" value={fmtMoney(margen, state.business.moneda)} color={margen >= 0 ? '#22c55e' : '#ef4444'} />
            </div>

            {tab === 'general' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
                    <Card title="Evolución de ventas"><LineChart series={[{ data: serieVentas.map(d => d.total), color: '#63f1cb' }]} labels={serieVentas.map(d => d.label).filter((_, i, arr) => i % Math.ceil(arr.length / 7) === 0)} /></Card>
                    <Card title="Ventas por método"><BarChart data={metodoVentas.map(m => ({ ...m, display: fmtMoney(m.value, state.business.moneda) }))} /></Card>
                </div>
            )}

            {tab === 'sucursal' && (
                <Card title="Comparativa entre sucursales">
                    {porSucursal.length === 0 ? <EmptyState title="Sin sucursales con ventas" /> : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                            <div><BarChart data={porSucursal} /></div>
                            <div style={{ textAlign: 'center' }}>
                                <PieChart data={porSucursal} size={200} />
                                <div className="text-xs text-muted mt-3">Distribución de ventas por sucursal</div>
                            </div>
                        </div>
                    )}
                </Card>
            )}

            {tab === 'empleado' && (
                <Card title="Ranking de vendedores">
                    {porEmpleado.length === 0 ? <EmptyState title="Ninguna venta tiene empleado asignado" description="Cuando registres ventas en POS, asignale un empleado para ver el ranking acá." /> : (
                        <>
                            <BarChart data={porEmpleado} />
                            <div className="table-wrap mt-4">
                                <table className="table">
                                    <thead><tr><th>Empleado</th><th style={{ textAlign: 'right' }}>Facturado</th><th style={{ textAlign: 'right' }}>% Comisión</th><th style={{ textAlign: 'right' }}>A pagar</th></tr></thead>
                                    <tbody>
                                        {porEmpleado.map((e, i) => (
                                            <tr key={i}>
                                                <td className="font-semibold">{e.label}</td>
                                                <td style={{ textAlign: 'right' }}>{fmtMoney(e.value, state.business.moneda)}</td>
                                                <td style={{ textAlign: 'right' }}>{e.comisionPct}%</td>
                                                <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent)' }}>{fmtMoney(e.comision, state.business.moneda)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </Card>
            )}

            {tab === 'financiero' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
                    <Card title="Gastos por categoría">
                        {gastosPorCategoria.length === 0 ? <EmptyState title="Sin gastos en el período" /> : <BarChart data={gastosPorCategoria.map(g => ({ ...g, display: fmtMoney(g.value, state.business.moneda) }))} />}
                    </Card>
                    <Card title="Rentabilidad">
                        <div style={{ padding: 12 }}>
                            <div className="flex justify-between mb-2"><span className="text-muted">Ventas</span><span style={{ color: 'var(--success)' }} className="font-semibold">+{fmtMoney(totalVentas, state.business.moneda)}</span></div>
                            <div className="flex justify-between mb-2"><span className="text-muted">Gastos</span><span style={{ color: 'var(--danger)' }} className="font-semibold">-{fmtMoney(totalGastos, state.business.moneda)}</span></div>
                            <div className="flex justify-between" style={{ paddingTop: 12, borderTop: '1px solid var(--border-color)', fontSize: 20, fontWeight: 700 }}>
                                <span>Margen bruto</span>
                                <span style={{ color: margen >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmtMoney(margen, state.business.moneda)}</span>
                            </div>
                            {totalVentas > 0 && (
                                <div className="flex justify-between mt-2 text-sm text-muted">
                                    <span>Margen %</span>
                                    <span>{((margen / totalVentas) * 100).toFixed(1)}%</span>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
