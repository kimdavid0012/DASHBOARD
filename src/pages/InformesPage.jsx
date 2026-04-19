import React, { useMemo, useState } from 'react';
import {
    BarChart3, TrendingUp, Users, Store, DollarSign, Calendar,
    Download, Award, Activity, Percent
} from 'lucide-react';
import { useData } from '../store/DataContext';
import { Card, KpiCard, EmptyState, BarChart, PieChart, LineChart, fmtMoney, CHART_COLORS } from '../components/UI';

const TABS = [
    { id: 'general', label: 'General', icon: BarChart3 },
    { id: 'sucursal', label: 'Por Sucursal', icon: Store },
    { id: 'empleado', label: 'Por Empleado', icon: Users },
    { id: 'financiero', label: 'Financiero', icon: DollarSign }
];

const PERIODOS = [
    { id: '7d', label: 'Últimos 7 días', dias: 7 },
    { id: '30d', label: 'Últimos 30 días', dias: 30 },
    { id: '90d', label: 'Últimos 90 días', dias: 90 },
    { id: 'year', label: 'Este año', dias: 365 },
    { id: 'all', label: 'Todo el histórico', dias: null }
];

export default function InformesPage() {
    const { state } = useData();
    const [tab, setTab] = useState('general');
    const [periodo, setPeriodo] = useState('30d');

    // Filter by period
    const ventasPeriodo = useMemo(() => {
        const p = PERIODOS.find(x => x.id === periodo);
        if (!p || !p.dias) return state.ventas;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - p.dias);
        return state.ventas.filter(v => new Date(v.fecha || 0) >= cutoff);
    }, [state.ventas, periodo]);

    const gastosPeriodo = useMemo(() => {
        const p = PERIODOS.find(x => x.id === periodo);
        if (!p || !p.dias) return state.gastos;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - p.dias);
        return state.gastos.filter(g => new Date(g.fecha || 0) >= cutoff);
    }, [state.gastos, periodo]);

    const totalVentas = ventasPeriodo.reduce((s, v) => s + Number(v.total || 0), 0);
    const totalGastos = gastosPeriodo.reduce((s, g) => s + Number(g.monto || 0), 0);
    const rentabilidad = totalVentas - totalGastos;
    const margen = totalVentas > 0 ? (rentabilidad / totalVentas) * 100 : 0;

    if (state.ventas.length === 0 && state.gastos.length === 0) {
        return (
            <Card title="Informes">
                <EmptyState
                    icon={BarChart3}
                    title="Todavía no hay datos para informar"
                    description="Cargá ventas y gastos para empezar a ver tus reportes."
                    tips={[
                        'Informes generales con todos los KPIs clave',
                        'Split por sucursal: rendimiento comparativo',
                        'Split por empleado: ranking de vendedores, ventas y comisiones',
                        'Informe financiero: ingresos, gastos, rentabilidad y margen',
                        'Filtros por período (7/30/90 días, año, histórico)',
                        'Gráficos de evolución temporal'
                    ]}
                />
            </Card>
        );
    }

    return (
        <div className="flex-col gap-4">
            {/* Header */}
            <Card>
                <div className="flex items-center justify-between gap-4" style={{ flexWrap: 'wrap' }}>
                    <div>
                        <h2 className="card-title">Informes</h2>
                        <p className="card-subtitle">Análisis de ventas, gastos, rendimiento y rentabilidad</p>
                    </div>
                    <select className="select" style={{ maxWidth: 220 }} value={periodo} onChange={e => setPeriodo(e.target.value)}>
                        {PERIODOS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                </div>
            </Card>

            {/* Tabs */}
            <div className="tabs">
                {TABS.map(t => (
                    <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
                        <span className="flex items-center gap-2"><t.icon size={14} /> {t.label}</span>
                    </button>
                ))}
            </div>

            {tab === 'general' && (
                <TabGeneral ventas={ventasPeriodo} gastos={gastosPeriodo} totalVentas={totalVentas} totalGastos={totalGastos} rentabilidad={rentabilidad} margen={margen} state={state} />
            )}

            {tab === 'sucursal' && (
                <TabSucursal ventas={ventasPeriodo} gastos={gastosPeriodo} state={state} />
            )}

            {tab === 'empleado' && (
                <TabEmpleado ventas={ventasPeriodo} state={state} />
            )}

            {tab === 'financiero' && (
                <TabFinanciero ventas={ventasPeriodo} gastos={gastosPeriodo} totalVentas={totalVentas} totalGastos={totalGastos} rentabilidad={rentabilidad} margen={margen} state={state} />
            )}
        </div>
    );
}

// ══════════════ TAB GENERAL ══════════════
function TabGeneral({ ventas, gastos, totalVentas, totalGastos, rentabilidad, margen, state }) {
    const ticket = ventas.length ? totalVentas / ventas.length : 0;

    // Ventas por día (últimos 14 días o del período)
    const chartDias = useMemo(() => {
        const dias = [];
        for (let i = 13; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            const total = ventas.filter(v => (v.fecha || '').slice(0, 10) === key).reduce((s, v) => s + Number(v.total || 0), 0);
            dias.push({ key, label: d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }), total });
        }
        return dias;
    }, [ventas]);

    // Por método de pago
    const porMetodo = useMemo(() => {
        const m = {};
        ventas.forEach(v => { m[v.metodo || 'Sin especificar'] = (m[v.metodo || 'Sin especificar'] || 0) + Number(v.total || 0); });
        return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([label, value], i) => ({
            label, value, display: fmtMoney(value, state.business.moneda), color: CHART_COLORS[i % CHART_COLORS.length]
        }));
    }, [ventas, state.business.moneda]);

    // Top productos
    const topProductos = useMemo(() => {
        const m = {};
        ventas.forEach(v => (v.items || []).forEach(it => {
            m[it.productoId] = m[it.productoId] || { nombre: it.nombre, cantidad: 0, total: 0 };
            m[it.productoId].cantidad += Number(it.cantidad || 0);
            m[it.productoId].total += Number(it.cantidad || 0) * Number(it.precio || 0);
        }));
        return Object.values(m).sort((a, b) => b.total - a.total).slice(0, 10)
            .map((p, i) => ({ label: p.nombre, value: p.total, display: `${p.cantidad}u · ${fmtMoney(p.total, state.business.moneda)}`, color: CHART_COLORS[i % CHART_COLORS.length] }));
    }, [ventas, state.business.moneda]);

    return (
        <div className="flex-col gap-4">
            <div className="kpi-grid">
                <KpiCard icon={<DollarSign size={20} />} label="Ventas totales" value={fmtMoney(totalVentas, state.business.moneda)} delta={{ direction: 'up', text: `${ventas.length} operaciones` }} color="#22c55e" />
                <KpiCard icon={<TrendingUp size={20} />} label="Gastos totales" value={fmtMoney(totalGastos, state.business.moneda)} delta={{ direction: 'down', text: `${gastos.length} registros` }} color="#ef4444" />
                <KpiCard icon={<DollarSign size={20} />} label="Rentabilidad" value={fmtMoney(rentabilidad, state.business.moneda)} color={rentabilidad >= 0 ? '#14b8a6' : '#ef4444'} />
                <KpiCard icon={<Percent size={20} />} label="Margen" value={`${margen.toFixed(1)}%`} color="#a855f7" />
                <KpiCard icon={<Activity size={20} />} label="Ticket promedio" value={fmtMoney(ticket, state.business.moneda)} color="#0ea5e9" />
            </div>

            <Card title="Ventas últimos 14 días">
                <LineChart series={[{ data: chartDias.map(d => d.total), color: '#14b8a6' }]} labels={chartDias.map(d => d.label)} />
            </Card>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                <Card title="Por método de pago">
                    <div className="flex gap-4 items-center" style={{ flexWrap: 'wrap' }}>
                        <PieChart data={porMetodo} size={160} />
                        <div style={{ flex: 1, minWidth: 160 }}>
                            {porMetodo.map((d, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs mb-2">
                                    <span style={{ width: 10, height: 10, borderRadius: 2, background: d.color }} />
                                    <span style={{ flex: 1 }}>{d.label}</span>
                                    <span className="font-semibold">{d.display}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>

                <Card title="Top 10 productos">
                    {topProductos.length === 0 ? <div className="text-muted text-xs" style={{ textAlign: 'center', padding: 20 }}>Sin datos</div> :
                        <BarChart data={topProductos} />}
                </Card>
            </div>
        </div>
    );
}

// ══════════════ TAB POR SUCURSAL ══════════════
function TabSucursal({ ventas, gastos, state }) {
    const sucursales = state.sucursales || [];

    if (sucursales.length === 0) {
        return <Card><EmptyState icon={Store} title="No hay sucursales cargadas" description="Creá sucursales para ver el análisis comparativo." /></Card>;
    }

    const datosPorSucursal = sucursales.map((s, i) => {
        const vs = ventas.filter(v => v.sucursalId === s.id);
        const gs = gastos.filter(g => g.sucursalId === s.id);
        const totalV = vs.reduce((acc, v) => acc + Number(v.total || 0), 0);
        const totalG = gs.reduce((acc, g) => acc + Number(g.monto || 0), 0);
        const empleados = state.empleados.filter(e => e.sucursalId === s.id).length;
        return {
            id: s.id,
            nombre: s.nombre,
            ciudad: s.ciudad,
            ventas: vs.length,
            totalVentas: totalV,
            totalGastos: totalG,
            rentabilidad: totalV - totalG,
            empleados,
            color: CHART_COLORS[i % CHART_COLORS.length]
        };
    });

    const chartVentas = datosPorSucursal.map(d => ({
        label: d.nombre, value: d.totalVentas, display: fmtMoney(d.totalVentas, state.business.moneda), color: d.color
    })).sort((a, b) => b.value - a.value);

    const chartRent = datosPorSucursal.map(d => ({
        label: d.nombre, value: Math.max(0, d.rentabilidad), display: fmtMoney(d.rentabilidad, state.business.moneda), color: d.rentabilidad >= 0 ? '#22c55e' : '#ef4444'
    })).sort((a, b) => b.value - a.value);

    return (
        <div className="flex-col gap-4">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                <Card title="Ventas por sucursal"><BarChart data={chartVentas} /></Card>
                <Card title="Rentabilidad por sucursal"><BarChart data={chartRent} /></Card>
            </div>

            <Card title="Detalle por sucursal">
                <div className="table-wrap">
                    <table className="table">
                        <thead><tr><th>Sucursal</th><th>Ubicación</th><th>Empleados</th><th style={{ textAlign: 'right' }}>Operaciones</th><th style={{ textAlign: 'right' }}>Ventas</th><th style={{ textAlign: 'right' }}>Gastos</th><th style={{ textAlign: 'right' }}>Rentabilidad</th><th style={{ textAlign: 'right' }}>Margen</th></tr></thead>
                        <tbody>
                            {datosPorSucursal.map(d => {
                                const margen = d.totalVentas > 0 ? (d.rentabilidad / d.totalVentas) * 100 : 0;
                                return (
                                    <tr key={d.id}>
                                        <td><div className="font-semibold">{d.nombre}</div></td>
                                        <td className="text-sm">{d.ciudad || '—'}</td>
                                        <td>{d.empleados}</td>
                                        <td style={{ textAlign: 'right' }}>{d.ventas}</td>
                                        <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>{fmtMoney(d.totalVentas, state.business.moneda)}</td>
                                        <td style={{ textAlign: 'right', color: 'var(--danger)' }}>-{fmtMoney(d.totalGastos, state.business.moneda)}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, color: d.rentabilidad >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmtMoney(d.rentabilidad, state.business.moneda)}</td>
                                        <td style={{ textAlign: 'right' }}>{margen.toFixed(1)}%</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

// ══════════════ TAB POR EMPLEADO ══════════════
function TabEmpleado({ ventas, state }) {
    const empleados = state.empleados || [];

    if (empleados.length === 0) {
        return <Card><EmptyState icon={Users} title="No hay empleados cargados" description="Cargá tu equipo para ver el ranking de ventas y rendimiento."
            tips={[
                'Ranking de vendedores por facturación',
                'Tickets emitidos y promedio por empleado',
                'Comisión calculada automáticamente',
                '% de asistencia en el período',
                'Comparativa entre empleados de la misma sucursal'
            ]} /></Card>;
    }

    const datosPorEmp = empleados.map((e, i) => {
        const vs = ventas.filter(v => v.empleadoId === e.id);
        const totalV = vs.reduce((acc, v) => acc + Number(v.total || 0), 0);
        const ticket = vs.length ? totalV / vs.length : 0;
        const comision = totalV * (Number(e.comisionPct || 0) / 100);

        // Asistencia del período
        const asist = state.asistencia.filter(a => a.empleadoId === e.id);
        const presentes = asist.filter(a => a.tipo === 'presente').length;
        const ausentes = asist.filter(a => a.tipo === 'ausente').length;
        const totalMarcas = asist.length;
        const pctAsistencia = totalMarcas > 0 ? (presentes / totalMarcas) * 100 : null;

        return {
            id: e.id,
            nombre: `${e.nombre} ${e.apellido || ''}`.trim(),
            cargo: e.cargo,
            sucursal: state.sucursales.find(s => s.id === e.sucursalId)?.nombre || '—',
            sucursalId: e.sucursalId,
            ventas: vs.length,
            totalVentas: totalV,
            ticket,
            comisionPct: Number(e.comisionPct || 0),
            comision,
            sueldo: Number(e.sueldoBase || 0),
            pctAsistencia, presentes, ausentes,
            color: CHART_COLORS[i % CHART_COLORS.length]
        };
    });

    const top = [...datosPorEmp].sort((a, b) => b.totalVentas - a.totalVentas).slice(0, 10);
    const chartTop = top.map(d => ({
        label: d.nombre, value: d.totalVentas, display: fmtMoney(d.totalVentas, state.business.moneda), color: d.color
    }));

    const totalComisiones = datosPorEmp.reduce((s, d) => s + d.comision, 0);
    const totalSueldos = datosPorEmp.reduce((s, d) => s + d.sueldo, 0);

    return (
        <div className="flex-col gap-4">
            <div className="kpi-grid">
                <KpiCard icon={<Users size={20} />} label="Empleados" value={empleados.length} color="#14b8a6" />
                <KpiCard icon={<Award size={20} />} label="Con ventas registradas" value={datosPorEmp.filter(d => d.ventas > 0).length} color="#22c55e" />
                <KpiCard icon={<DollarSign size={20} />} label="Comisiones a pagar" value={fmtMoney(totalComisiones, state.business.moneda)} color="#f59e0b" />
                <KpiCard icon={<DollarSign size={20} />} label="Sueldos base" value={fmtMoney(totalSueldos, state.business.moneda)} color="#a855f7" />
            </div>

            <Card title="Top 10 vendedores por facturación">
                <BarChart data={chartTop} />
            </Card>

            <Card title="Detalle por empleado">
                <div className="table-wrap">
                    <table className="table">
                        <thead><tr><th>Empleado</th><th>Cargo</th><th>Sucursal</th><th style={{ textAlign: 'right' }}>Tickets</th><th style={{ textAlign: 'right' }}>Ventas</th><th style={{ textAlign: 'right' }}>Ticket prom.</th><th style={{ textAlign: 'right' }}>% Com.</th><th style={{ textAlign: 'right' }}>Comisión</th><th>Asistencia</th></tr></thead>
                        <tbody>
                            {datosPorEmp.sort((a, b) => b.totalVentas - a.totalVentas).map(d => (
                                <tr key={d.id}>
                                    <td className="font-semibold">{d.nombre}</td>
                                    <td className="text-sm">{d.cargo}</td>
                                    <td className="text-sm">{d.sucursal}</td>
                                    <td style={{ textAlign: 'right' }}>{d.ventas}</td>
                                    <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>{fmtMoney(d.totalVentas, state.business.moneda)}</td>
                                    <td style={{ textAlign: 'right' }}>{fmtMoney(d.ticket, state.business.moneda)}</td>
                                    <td style={{ textAlign: 'right' }}>{d.comisionPct}%</td>
                                    <td style={{ textAlign: 'right', color: 'var(--warning)', fontWeight: 600 }}>{fmtMoney(d.comision, state.business.moneda)}</td>
                                    <td>{d.pctAsistencia !== null ? <span className="text-sm">{d.pctAsistencia.toFixed(0)}% ({d.presentes}/{d.presentes + d.ausentes})</span> : <span className="text-xs text-muted">Sin registros</span>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

// ══════════════ TAB FINANCIERO ══════════════
function TabFinanciero({ ventas, gastos, totalVentas, totalGastos, rentabilidad, margen, state }) {
    // Gastos por categoría
    const porCat = useMemo(() => {
        const m = {};
        gastos.forEach(g => { m[g.categoria || 'Otro'] = (m[g.categoria || 'Otro'] || 0) + Number(g.monto || 0); });
        return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([label, value], i) => ({
            label, value, display: fmtMoney(value, state.business.moneda), color: CHART_COLORS[i % CHART_COLORS.length]
        }));
    }, [gastos, state.business.moneda]);

    // Deuda a proveedores
    const deudaProveedores = (state.proveedores || []).reduce((s, p) => s + Number(p.deuda || 0), 0);

    // Por mes (últimos 6 meses)
    const chartMeses = useMemo(() => {
        const meses = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = d.toISOString().slice(0, 7);
            const label = d.toLocaleDateString('es-AR', { month: 'short' });
            const v = state.ventas.filter(x => (x.fecha || '').slice(0, 7) === key).reduce((s, x) => s + Number(x.total || 0), 0);
            const g = state.gastos.filter(x => (x.fecha || '').slice(0, 7) === key).reduce((s, x) => s + Number(x.monto || 0), 0);
            meses.push({ key, label, ventas: v, gastos: g });
        }
        return meses;
    }, [state.ventas, state.gastos]);

    return (
        <div className="flex-col gap-4">
            <div className="kpi-grid">
                <KpiCard icon={<TrendingUp size={20} />} label="Ingresos" value={fmtMoney(totalVentas, state.business.moneda)} color="#22c55e" />
                <KpiCard icon={<TrendingUp size={20} />} label="Egresos" value={fmtMoney(totalGastos, state.business.moneda)} color="#ef4444" />
                <KpiCard icon={<DollarSign size={20} />} label="Resultado" value={fmtMoney(rentabilidad, state.business.moneda)} color={rentabilidad >= 0 ? '#14b8a6' : '#ef4444'} />
                <KpiCard icon={<Percent size={20} />} label="Margen" value={`${margen.toFixed(1)}%`} color="#a855f7" />
                <KpiCard icon={<DollarSign size={20} />} label="Deuda a proveedores" value={fmtMoney(deudaProveedores, state.business.moneda)} color="#f59e0b" />
            </div>

            <Card title="Evolución mensual (ingresos vs egresos)">
                <LineChart
                    series={[
                        { data: chartMeses.map(m => m.ventas), color: '#22c55e' },
                        { data: chartMeses.map(m => m.gastos), color: '#ef4444' }
                    ]}
                    labels={chartMeses.map(m => m.label)}
                />
                <div className="flex gap-4 text-xs mt-2" style={{ justifyContent: 'center' }}>
                    <span className="flex items-center gap-1"><span style={{ width: 10, height: 10, borderRadius: 2, background: '#22c55e' }} /> Ventas</span>
                    <span className="flex items-center gap-1"><span style={{ width: 10, height: 10, borderRadius: 2, background: '#ef4444' }} /> Gastos</span>
                </div>
            </Card>

            <Card title="Gastos por categoría">
                {porCat.length === 0 ? <div className="text-muted text-xs" style={{ textAlign: 'center', padding: 20 }}>Sin datos</div> : <BarChart data={porCat} />}
            </Card>
        </div>
    );
}
