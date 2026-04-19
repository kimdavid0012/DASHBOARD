import React, { useMemo, useState } from 'react';
import { BarChart3, TrendingUp, Store, Users, DollarSign, Package, Clock, Download, Printer } from 'lucide-react';
import { useData, filterBySucursal, getRubroLabels, SECTION_HELP } from '../store/DataContext';
import { PageHeader, Card, KpiCard, EmptyState, BarChart, LineChart, PieChart, fmtMoney, CHART_COLORS, InfoBox, DateRangeFilter, filterByDateRange, describeDateRange } from '../components/UI';
import { useT } from '../i18n';

export default function InformesPage() {
    const t = useT();
    const { state } = useData();
    const labels = getRubroLabels(state.business.rubro);
    const [tab, setTab] = useState('general');
    const [range, setRange] = useState({ type: 'month' });
    const current = state.meta.currentSucursalId || 'all';

    const ventas = useMemo(() => {
        const list = filterBySucursal(state.ventas, current);
        return filterByDateRange(list, range, v => v.fecha);
    }, [state.ventas, current, range]);

    const gastos = useMemo(() => {
        const list = filterBySucursal(state.gastos, current);
        return filterByDateRange(list, range, g => g.fecha);
    }, [state.gastos, current, range]);

    const totalVentas = ventas.reduce((s, v) => s + Number(v.total || 0), 0);
    const totalGastos = gastos.reduce((s, g) => s + Number(g.monto || 0), 0);
    const margen = totalVentas - totalGastos;

    // Calcular días del rango para serieVentas
    const diasEnRango = useMemo(() => {
        switch (range.type) {
            case 'today': return 1;
            case 'yesterday': return 1;
            case 'week': return 7;
            case 'month': return 30;
            case 'quarter': return 90;
            case 'year': return 365;
            case 'all': return Math.max(30, Math.min(365, Math.floor((Date.now() - new Date(state.ventas?.[0]?.fecha || Date.now()).getTime()) / 86400000) || 30));
            case 'custom': {
                if (!range.from || !range.to) return 30;
                return Math.max(1, Math.ceil((new Date(range.to) - new Date(range.from)) / 86400000) + 1);
            }
            default: return 30;
        }
    }, [range, state.ventas]);

    const serieVentas = useMemo(() => {
        const n = Math.min(diasEnRango, 60); // Cap visual a 60 días
        const dias = [];
        const endDate = range.type === 'yesterday' ? (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d; })() :
                        range.type === 'custom' && range.to ? new Date(range.to) :
                        new Date();
        for (let i = n - 1; i >= 0; i--) {
            const d = new Date(endDate);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            const total = ventas.filter(v => (v.fecha || '').slice(0, 10) === key).reduce((s, v) => s + Number(v.total || 0), 0);
            dias.push({ label: d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }), total });
        }
        return dias;
    }, [ventas, range, diasEnRango]);

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

    // Top productos vendidos (por revenue)
    const topProductos = useMemo(() => {
        const agg = {}; // productoId -> { nombre, cantidad, revenue }
        ventas.forEach(v => {
            (v.items || []).forEach(it => {
                const key = it.productoId || it.nombre;
                if (!agg[key]) agg[key] = { nombre: it.nombre, cantidad: 0, revenue: 0 };
                agg[key].cantidad += Number(it.cantidad || 0);
                agg[key].revenue += Number(it.precio || 0) * Number(it.cantidad || 0);
            });
        });
        return Object.values(agg)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10)
            .map((p, i) => ({
                label: p.nombre,
                value: p.revenue,
                cantidad: p.cantidad,
                display: fmtMoney(p.revenue, state.business.moneda),
                color: CHART_COLORS[i % CHART_COLORS.length]
            }));
    }, [ventas, state.business.moneda]);

    // Top variantes (talle + color) — solo si hay ventas con variantLabel
    const topVariantes = useMemo(() => {
        const agg = {};
        ventas.forEach(v => {
            (v.items || []).forEach(it => {
                if (!it.variantLabel) return;
                const key = `${it.nombre} · ${it.variantLabel}`;
                if (!agg[key]) agg[key] = { cantidad: 0, revenue: 0 };
                agg[key].cantidad += Number(it.cantidad || 0);
                agg[key].revenue += Number(it.precio || 0) * Number(it.cantidad || 0);
            });
        });
        return Object.entries(agg)
            .sort((a, b) => b[1].revenue - a[1].revenue)
            .slice(0, 10)
            .map(([label, data], i) => ({
                label,
                value: data.revenue,
                cantidad: data.cantidad,
                display: fmtMoney(data.revenue, state.business.moneda),
                color: CHART_COLORS[i % CHART_COLORS.length]
            }));
    }, [ventas, state.business.moneda]);

    // Ventas por categoría
    const porCategoria = useMemo(() => {
        const agg = {};
        ventas.forEach(v => {
            (v.items || []).forEach(it => {
                const prod = state.productos?.find(p => p.id === it.productoId);
                const cat = prod?.categoria || 'Sin categoría';
                if (!agg[cat]) agg[cat] = 0;
                agg[cat] += Number(it.precio || 0) * Number(it.cantidad || 0);
            });
        });
        return Object.entries(agg)
            .map(([label, value], i) => ({
                label, value,
                display: fmtMoney(value, state.business.moneda),
                color: CHART_COLORS[i % CHART_COLORS.length]
            }))
            .sort((a, b) => b.value - a.value);
    }, [ventas, state.productos, state.business.moneda]);

    // Ticket promedio
    const ticketPromedio = ventas.length > 0 ? totalVentas / ventas.length : 0;
    const operacionesPorDia = ventas.length / (diasEnRango || 30);

    if (state.ventas.length === 0 && state.gastos.length === 0) {
        return (
            <div>
                <PageHeader icon={BarChart3} title={t('pages.informes.title')} subtitle={t('pages.informes.subtitle')} help={SECTION_HELP.informes} />
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
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={async () => {
                                const { exportInformes } = await import('../utils/excelExport');
                                await exportInformes(state, range, describeDateRange(range));
                            }}
                            title="Exportar a Excel"
                        >
                            <Download size={14} /> Excel
                        </button>
                        <button
                            className="btn btn-ghost btn-icon"
                            onClick={() => window.print()}
                            title="Imprimir / Guardar PDF"
                        >
                            <Printer size={16} />
                        </button>
                    </div>
                }
            />

            <div style={{ marginBottom: 16 }}>
                <DateRangeFilter value={range} onChange={setRange} />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                    📅 {describeDateRange(range)} · {ventas.length} operación{ventas.length !== 1 ? 'es' : ''} · {gastos.length} gasto{gastos.length !== 1 ? 's' : ''}
                </div>
            </div>

            <div className="tabs">
                <button className={`tab ${tab === 'general' ? 'active' : ''}`} onClick={() => setTab('general')}><TrendingUp size={14} /> General</button>
                <button className={`tab ${tab === 'productos' ? 'active' : ''}`} onClick={() => setTab('productos')}><Package size={14} /> {labels.items}</button>
                <button className={`tab ${tab === 'sucursal' ? 'active' : ''}`} onClick={() => setTab('sucursal')}><Store size={14} /> Por sucursal</button>
                <button className={`tab ${tab === 'empleado' ? 'active' : ''}`} onClick={() => setTab('empleado')}><Users size={14} /> Por empleado</button>
                <button className={`tab ${tab === 'financiero' ? 'active' : ''}`} onClick={() => setTab('financiero')}><DollarSign size={14} /> Financiero</button>
            </div>

            <div className="kpi-grid mb-4">
                <KpiCard icon={<TrendingUp size={20} />} label={`${labels.sales} (período)`} value={fmtMoney(totalVentas, state.business.moneda)} color="#63f1cb" />
                <KpiCard icon={<TrendingUp size={20} />} label="Ticket promedio" value={fmtMoney(ticketPromedio, state.business.moneda)} color="#a78bfa" />
                <KpiCard icon={<DollarSign size={20} />} label="Operaciones" value={ventas.length} color="#60a5fa" />
                <KpiCard icon={<DollarSign size={20} />} label="Margen (V − G)" value={fmtMoney(margen, state.business.moneda)} color={margen >= 0 ? '#22c55e' : '#ef4444'} />
            </div>

            {tab === 'general' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
                    <Card title="Evolución de ventas"><LineChart series={[{ data: serieVentas.map(d => d.total), color: '#63f1cb' }]} labels={serieVentas.map(d => d.label).filter((_, i, arr) => i % Math.ceil(arr.length / 7) === 0)} /></Card>
                    <Card title="Ventas por método"><BarChart data={metodoVentas.map(m => ({ ...m, display: fmtMoney(m.value, state.business.moneda) }))} /></Card>
                </div>
            )}

            {tab === 'productos' && (
                <div style={{ display: 'grid', gap: 16 }}>
                    {topProductos.length === 0 ? (
                        <Card>
                            <EmptyState title={`Sin ventas de ${labels.items.toLowerCase()}`} description="Cargá algunas ventas para ver los rankings." />
                        </Card>
                    ) : (
                        <>
                            <Card title={`Top ${labels.items.toLowerCase()} por facturación`} subtitle={`Ranking de los 10 más vendidos (por revenue)`}>
                                <BarChart data={topProductos} />
                                <div className="table-wrap mt-4">
                                    <table className="table">
                                        <thead><tr><th>#</th><th>{labels.item}</th><th style={{ textAlign: 'right' }}>Cantidad</th><th style={{ textAlign: 'right' }}>Facturado</th></tr></thead>
                                        <tbody>
                                            {topProductos.map((p, i) => (
                                                <tr key={i}>
                                                    <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                                                    <td className="font-semibold">{p.label}</td>
                                                    <td style={{ textAlign: 'right' }}>{p.cantidad}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent)' }}>{p.display}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>

                            {topVariantes.length > 0 && (
                                <Card title="Top variantes vendidas" subtitle="Talles/colores más pedidos">
                                    <BarChart data={topVariantes} />
                                </Card>
                            )}

                            {porCategoria.length > 1 && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                                    <Card title="Ventas por categoría">
                                        <BarChart data={porCategoria} />
                                    </Card>
                                    <Card title="Distribución">
                                        <div style={{ textAlign: 'center' }}>
                                            <PieChart data={porCategoria} size={200} />
                                        </div>
                                    </Card>
                                </div>
                            )}
                        </>
                    )}
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
