import React, { useMemo, useState } from 'react';
import {
    TrendingUp, DollarSign, ShoppingCart, Users, Package,
    AlertTriangle, Store, Home, Calendar, RotateCcw, Settings as SettingsIcon,
    Bot, FileText, Receipt, ArrowRight, Flame, Clock, Armchair,
    Megaphone, Zap, Plus, RefreshCw
} from 'lucide-react';
import { useData, filterBySucursal, getRubroLabels, SECTION_HELP } from '../store/DataContext';
import { PageHeader, Card, KpiCard, EmptyState, BarChart, LineChart, fmtMoney, CHART_COLORS, InfoBox, DateRangeFilter, filterByDateRange, describeDateRange } from '../components/UI';
import { useT } from '../i18n';

export default function DashboardHome({ onNavigate }) {
    const t = useT();
    const { state, actions } = useData();
    const current = state.meta.currentSucursalId || 'all';
    const [range, setRange] = useState({ type: 'week' });
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

    // Chart dinámico según range
    const chartVentasRange = useMemo(() => {
        const ventasFiltradas = filterByDateRange(ventas, range, v => v.fecha);

        // Determinar cantidad de días/buckets
        let n = 7;
        let bucketType = 'day';
        switch (range.type) {
            case 'today': n = 1; break;
            case 'yesterday': n = 1; break;
            case 'week': n = 7; break;
            case 'month': n = 30; break;
            case 'quarter': n = 12; bucketType = 'week'; break;
            case 'year': n = 12; bucketType = 'month'; break;
            case 'all': n = 12; bucketType = 'month'; break;
            case 'custom': {
                if (range.from && range.to) {
                    const days = Math.ceil((new Date(range.to) - new Date(range.from)) / 86400000) + 1;
                    if (days <= 31) { n = days; bucketType = 'day'; }
                    else if (days <= 120) { n = Math.ceil(days / 7); bucketType = 'week'; }
                    else { n = Math.ceil(days / 30); bucketType = 'month'; }
                }
                break;
            }
        }

        const buckets = [];
        const now = new Date();
        for (let i = n - 1; i >= 0; i--) {
            const d = new Date();
            if (bucketType === 'day') d.setDate(d.getDate() - i);
            else if (bucketType === 'week') d.setDate(d.getDate() - (i * 7));
            else d.setMonth(d.getMonth() - i);

            let key, label, matchFn;
            if (bucketType === 'day') {
                key = d.toISOString().slice(0, 10);
                label = d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
                matchFn = v => (v.fecha || '').slice(0, 10) === key;
            } else if (bucketType === 'week') {
                const start = new Date(d); start.setDate(start.getDate() - 6);
                label = `${start.getDate()}/${start.getMonth() + 1}`;
                matchFn = v => {
                    const vd = new Date(v.fecha || 0);
                    return vd >= start && vd <= d;
                };
            } else {
                key = d.toISOString().slice(0, 7);
                label = d.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '');
                matchFn = v => (v.fecha || '').slice(0, 7) === key;
            }

            const total = ventasFiltradas.filter(matchFn).reduce((s, v) => s + Number(v.total || 0), 0);
            buckets.push({ label, total });
        }
        return buckets;
    }, [ventas, range]);

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

    // Últimas 5 ventas
    const ultimasVentas = useMemo(() => {
        return [...ventas]
            .sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0))
            .slice(0, 5);
    }, [ventas]);

    // Productos con stock crítico (sin stock + stock bajo)
    const productosCriticos = useMemo(() => {
        return productos
            .filter(p => {
                const stock = Number(p.stock || 0);
                const min = Number(p.stockMinimo || 5);
                return stock <= min;
            })
            .sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0))
            .slice(0, 5);
    }, [productos]);

    // Comandas activas en cocina (si rubro resto)
    const comandasActivas = useMemo(() => {
        if (state.business.rubro !== 'restaurante') return [];
        const cutoff = Date.now() - 8 * 60 * 60 * 1000;
        return (state.ventas || [])
            .filter(v => v.mesaId && v.kdsEstado !== 'entregada' && new Date(v.fecha).getTime() > cutoff)
            .slice(0, 4);
    }, [state.ventas, state.business.rubro]);

    // Vencimientos próximos (AFIP)
    const vencimientosUrgentes = useMemo(() => {
        const hoy = Date.now();
        const en7dias = hoy + 7 * 24 * 60 * 60 * 1000;
        return (state.vencimientos || [])
            .filter(v => !v.pagado && new Date(v.fecha).getTime() <= en7dias)
            .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
            .slice(0, 3);
    }, [state.vencimientos]);

    // Empleados trabajando hoy (si hay asistencia)
    const empleadosActivos = useMemo(() => {
        const hoy = new Date().toISOString().slice(0, 10);
        return (state.asistencia || [])
            .filter(a => a.fecha === hoy && !a.salida)
            .length;
    }, [state.asistencia]);

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
                actions={
                    <>
                        <SyncAllButton state={state} actions={actions} />
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                                if (confirm('¿Volver a la pantalla de configuración inicial?\n\n⚠️ No se pierden datos — solo podrás actualizar nombre, rubro y moneda del negocio.')) {
                                    actions.resetOnboarding();
                                }
                            }}
                            title="Reconfigurar nombre, rubro, moneda"
                        >
                            <RotateCcw size={13} /> Reconfigurar
                        </button>
                        {onNavigate && (
                            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('settings')}>
                                <SettingsIcon size={13} /> Configuración
                            </button>
                        )}
                    </>
                }
            />

            <div className="kpi-grid mb-4">
                <KpiCard
                    icon={<DollarSign size={20} />}
                    label={`${labels.sales} hoy`}
                    value={fmtMoney(kpis.totalHoy, state.business.moneda)}
                    delta={{ direction: 'up', text: `${kpis.ventasHoy} operaciones` }}
                    color="#63f1cb"
                    hint="Total facturado en el día de hoy"
                />
                <KpiCard
                    icon={<TrendingUp size={20} />}
                    label={`${labels.sales} del mes`}
                    value={fmtMoney(kpis.totalMes, state.business.moneda)}
                    delta={{ direction: 'up', text: `${kpis.ventasMes} operaciones` }}
                    color="#22c55e"
                />
                <KpiCard icon={<ShoppingCart size={20} />} label={labels.orders} value={pedidos.length} color="#60a5fa" />
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

            {/* QUICK ACTIONS MOSAIC */}
            {onNavigate && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: 10,
                    marginBottom: 20
                }}>
                    <QuickAction icon={Zap} label="Ir al POS" accent="#63f1cb" onClick={() => onNavigate('pos')} />
                    <QuickAction icon={Plus} label={`Nuevo ${labels.item.toLowerCase()}`} accent="#60a5fa" onClick={() => onNavigate('productos')} />
                    {state.business.rubro === 'restaurante' && (
                        <QuickAction icon={Flame} label="Cocina KDS" accent="#f59e0b"
                            badge={comandasActivas.length || null}
                            onClick={() => onNavigate('kds')} />
                    )}
                    <QuickAction icon={FileText} label="Nueva factura" accent="#a78bfa" onClick={() => onNavigate('afip')} />
                    <QuickAction icon={Bot} label="CELA bot" accent="#ec4899" onClick={() => { /* toggle bot */ window.dispatchEvent(new CustomEvent('cela-bot-toggle')); }} />
                    <QuickAction icon={TrendingUp} label="Ver informes" accent="#22c55e" onClick={() => onNavigate('informes')} />
                </div>
            )}

            {/* SMART WIDGETS — solo muestra los que tengan data */}
            {(productosCriticos.length > 0 || comandasActivas.length > 0 || vencimientosUrgentes.length > 0 || ultimasVentas.length > 0) && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: 16,
                    marginBottom: 20
                }}>
                    {/* Alertas de stock */}
                    {productosCriticos.length > 0 && (
                        <Card>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <AlertTriangle size={18} style={{ color: '#ef4444' }} />
                                    <strong style={{ fontSize: 14 }}>Stock crítico</strong>
                                </div>
                                {onNavigate && (
                                    <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('productos')}>
                                        Ver todos <ArrowRight size={12} />
                                    </button>
                                )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {productosCriticos.map(p => {
                                    const stock = Number(p.stock || 0);
                                    const sinStock = stock === 0;
                                    return (
                                        <div key={p.id} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '8px 10px',
                                            background: sinStock ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
                                            border: `1px solid ${sinStock ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                                            borderRadius: 8,
                                            fontSize: 13
                                        }}>
                                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {p.nombre}
                                            </span>
                                            <span style={{
                                                fontSize: 11, fontWeight: 700,
                                                color: sinStock ? '#ef4444' : '#f59e0b',
                                                marginLeft: 8,
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {sinStock ? '⚠️ SIN STOCK' : `${stock} ud`}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    )}

                    {/* Comandas activas (resto) */}
                    {comandasActivas.length > 0 && (
                        <Card>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Flame size={18} style={{ color: '#f59e0b' }} />
                                    <strong style={{ fontSize: 14 }}>Cocina en vivo</strong>
                                </div>
                                {onNavigate && (
                                    <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('kds')}>
                                        Ir al KDS <ArrowRight size={12} />
                                    </button>
                                )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {comandasActivas.map(c => {
                                    const mesa = state.mesas?.find(m => m.id === c.mesaId);
                                    const ageMin = Math.floor((Date.now() - new Date(c.fecha).getTime()) / 60000);
                                    const urgent = ageMin > 15;
                                    const estado = c.kdsEstado || 'nueva';
                                    const estadoLabel = estado === 'nueva' ? '📋' : estado === 'preparando' ? '🍳' : '✅';
                                    return (
                                        <div key={c.id} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '8px 10px',
                                            background: urgent ? 'rgba(239,68,68,0.08)' : 'var(--bg-elevated)',
                                            border: `1px solid ${urgent ? 'rgba(239,68,68,0.3)' : 'var(--border-color)'}`,
                                            borderRadius: 8,
                                            fontSize: 13
                                        }}>
                                            <span>{estadoLabel} Mesa {mesa?.numero || '?'} · {(c.items || []).length} items</span>
                                            <span style={{
                                                fontSize: 11, fontWeight: 600,
                                                color: urgent ? '#ef4444' : 'var(--text-muted)'
                                            }}>
                                                {ageMin}min {urgent && '🔥'}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    )}

                    {/* Últimas ventas */}
                    {ultimasVentas.length > 0 && (
                        <Card>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Receipt size={18} style={{ color: 'var(--accent)' }} />
                                    <strong style={{ fontSize: 14 }}>Últimas ventas</strong>
                                </div>
                                {onNavigate && (
                                    <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('ventas')}>
                                        Ver todas <ArrowRight size={12} />
                                    </button>
                                )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {ultimasVentas.map(v => {
                                    const f = new Date(v.fecha || 0);
                                    const hoy = new Date();
                                    const esHoy = f.toDateString() === hoy.toDateString();
                                    const tiempo = esHoy ? f.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : f.toLocaleDateString('es-AR');
                                    return (
                                        <div key={v.id} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '8px 10px',
                                            background: 'var(--bg-elevated)',
                                            borderRadius: 8,
                                            fontSize: 13
                                        }}>
                                            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                                                {tiempo} · {(v.items || []).length} items
                                            </span>
                                            <span style={{ fontWeight: 600, color: 'var(--accent)' }}>
                                                {fmtMoney(v.total || 0, state.business.moneda)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    )}

                    {/* Vencimientos AFIP */}
                    {vencimientosUrgentes.length > 0 && (
                        <Card>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Calendar size={18} style={{ color: '#a855f7' }} />
                                    <strong style={{ fontSize: 14 }}>Próximos vencimientos</strong>
                                </div>
                                {onNavigate && (
                                    <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('afip')}>
                                        Ver AFIP <ArrowRight size={12} />
                                    </button>
                                )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {vencimientosUrgentes.map(v => {
                                    const dias = Math.ceil((new Date(v.fecha).getTime() - Date.now()) / 86400000);
                                    const urgent = dias <= 2;
                                    return (
                                        <div key={v.id} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '8px 10px',
                                            background: urgent ? 'rgba(239,68,68,0.08)' : 'var(--bg-elevated)',
                                            border: `1px solid ${urgent ? 'rgba(239,68,68,0.3)' : 'var(--border-color)'}`,
                                            borderRadius: 8,
                                            fontSize: 13
                                        }}>
                                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {v.nombre || 'Vencimiento'}
                                            </span>
                                            <span style={{
                                                fontSize: 11, fontWeight: 700,
                                                color: urgent ? '#ef4444' : 'var(--text-muted)',
                                                marginLeft: 8,
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {dias === 0 ? 'HOY' : dias < 0 ? 'VENCIDO' : `${dias}d`}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    )}
                </div>
            )}

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
                    <Card title={`${labels.sales} — ${describeDateRange(range)}`} subtitle={current === 'all' ? 'Todas las sucursales' : state.sucursales.find(s => s.id === current)?.nombre}>
                        <div style={{ marginBottom: 12 }}>
                            <DateRangeFilter value={range} onChange={setRange} compact />
                        </div>
                        <LineChart
                            series={[{ data: chartVentasRange.map(d => d.total), color: '#63f1cb' }]}
                            labels={chartVentasRange.map(d => d.label)}
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

// ═══════════════════════════════════════════════════════════════════
// QuickAction — mosaic tile con icono, label, accent y badge opcional
// ═══════════════════════════════════════════════════════════════════
function QuickAction({ icon: Icon, label, accent, onClick, badge }) {
    return (
        <button
            onClick={onClick}
            style={{
                position: 'relative',
                padding: 14,
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 12,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.15s var(--ease)',
                minHeight: 88,
                color: 'var(--text-primary)',
                WebkitTapHighlightColor: 'transparent'
            }}
            onMouseOver={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.borderColor = accent || 'var(--accent)';
                e.currentTarget.style.boxShadow = `0 6px 20px rgba(0,0,0,0.15)`;
            }}
            onMouseOut={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            <div style={{
                width: 40, height: 40,
                borderRadius: 10,
                background: accent ? `${accent}22` : 'var(--bg-elevated)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: accent || 'var(--accent)'
            }}>
                <Icon size={20} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, textAlign: 'center', lineHeight: 1.3 }}>
                {label}
            </div>
            {badge !== null && badge !== undefined && (
                <div style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: accent || 'var(--accent)',
                    color: '#0a0a0f',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 20,
                    minWidth: 18,
                    textAlign: 'center'
                }}>
                    {badge}
                </div>
            )}
        </button>
    );
}

// ═══════════════════════════════════════════════════════════════════
// SYNC ALL BUTTON — traer en paralelo productos + clientes + orders web
// ═══════════════════════════════════════════════════════════════════
function SyncAllButton({ state, actions }) {
    const [syncing, setSyncing] = React.useState(false);
    const [progress, setProgress] = React.useState({ productos: 0, clientes: 0, orders: 0 });
    const [result, setResult] = React.useState(null);

    const hasWoo = state.integraciones.wooStoreUrl && state.integraciones.wooConsumerKey && state.integraciones.wooConsumerSecret;
    if (!hasWoo) return null;

    const syncAll = async () => {
        if (!confirm('¿Sincronizar productos, clientes y pedidos desde tu web WooCommerce? Puede tardar 30-60s.')) return;

        setSyncing(true);
        setProgress({ productos: 0, clientes: 0, orders: 0 });
        setResult(null);

        try {
            const { wooApiFetch } = await import('../utils/wooClient');

            // Paralelo: productos + clientes + orders últimos 30 días
            const [prodResult, custResult, orderResult] = await Promise.all([
                // PRODUCTOS con fotos
                (async () => {
                    let all = [];
                    for (let page = 1; page <= 10; page++) {
                        const { data, error } = await wooApiFetch('products?per_page=100&page=' + page, state);
                        if (error) throw new Error('Productos: ' + error);
                        if (!data?.length) break;
                        all = all.concat(data);
                        setProgress(p => ({ ...p, productos: all.length }));
                        if (data.length < 100) break;
                    }
                    return all;
                })(),
                // CLIENTES
                (async () => {
                    let all = [];
                    for (let page = 1; page <= 5; page++) {
                        const { data, error } = await wooApiFetch('customers?per_page=100&page=' + page, state);
                        if (error) throw new Error('Clientes: ' + error);
                        if (!data?.length) break;
                        all = all.concat(data);
                        setProgress(p => ({ ...p, clientes: all.length }));
                        if (data.length < 100) break;
                    }
                    return all;
                })(),
                // ORDERS últimos 30 días
                (async () => {
                    const after = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
                    const { data, error } = await wooApiFetch('orders?per_page=100&after=' + encodeURIComponent(after), state);
                    if (error) throw new Error('Orders: ' + error);
                    setProgress(p => ({ ...p, orders: data?.length || 0 }));
                    return data || [];
                })()
            ]);

            // Procesar productos: agregar nuevos, actualizar stock + foto
            let prodNew = 0, prodUpd = 0;
            const prodByKey = new Map();
            (state.productos || []).forEach(p => {
                if (p.codigo) prodByKey.set(String(p.codigo).toLowerCase(), p);
                if (p.wooProductId) prodByKey.set('woo-' + p.wooProductId, p);
            });
            const prodNuevos = [];
            for (const wp of prodResult) {
                const sku = (wp.sku || '').toLowerCase().trim();
                const existe = prodByKey.get(sku) || prodByKey.get('woo-' + wp.id);
                const mainImage = wp.images?.[0]?.src || null;
                if (!existe) {
                    prodNuevos.push({
                        nombre: wp.name, codigo: wp.sku || null,
                        categoria: wp.categories?.[0]?.name || 'General',
                        precioVenta: Number(wp.price || 0), precioCosto: 0,
                        stock: Number(wp.stock_quantity || 0), stockMinimo: 5, unidad: 'unidad',
                        descripcion: (wp.short_description || '').replace(/<[^>]+>/g, '').slice(0, 500),
                        activo: wp.status === 'publish',
                        imagen: mainImage, imagenes: (wp.images || []).map(i => i.src),
                        wooProductId: wp.id, origen: 'woocommerce'
                    });
                    prodNew++;
                } else {
                    const patch = {};
                    if (mainImage && !existe.imagen) patch.imagen = mainImage;
                    if (wp.stock_quantity != null && existe.stock !== Number(wp.stock_quantity)) patch.stock = Number(wp.stock_quantity);
                    if (!existe.wooProductId) patch.wooProductId = wp.id;
                    if (Object.keys(patch).length) { actions.update('productos', existe.id, patch); prodUpd++; }
                }
            }
            if (prodNuevos.length) actions.bulkAdd('productos', prodNuevos);

            // Procesar clientes: agregar nuevos
            let custNew = 0;
            const custByEmail = new Set((state.clientes || []).map(c => (c.email || '').toLowerCase()).filter(Boolean));
            const custNuevos = [];
            for (const c of custResult) {
                const email = (c.email || '').toLowerCase();
                if (!email || custByEmail.has(email)) continue;
                custNuevos.push({
                    nombre: ((c.first_name || '') + ' ' + (c.last_name || '')).trim() || c.username || 'Cliente web',
                    email: c.email, telefono: c.billing?.phone || '',
                    direccion: [c.billing?.address_1, c.billing?.address_2].filter(Boolean).join(', '),
                    ciudad: c.billing?.city || '',
                    notas: 'Importado de WooCommerce #' + c.id,
                    wooCustomerId: c.id, origen: 'woocommerce'
                });
                custNew++;
            }
            if (custNuevos.length) actions.bulkAdd('clientes', custNuevos);

            setResult({
                productos: { nuevos: prodNew, actualizados: prodUpd, total: prodResult.length },
                clientes: { nuevos: custNew, total: custResult.length },
                orders: { total: orderResult.length }
            });
            setTimeout(() => setResult(null), 10000);
        } catch (err) {
            setResult({ error: err.message });
            setTimeout(() => setResult(null), 10000);
        } finally {
            setSyncing(false);
        }
    };

    if (result) {
        const colorOk = 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.04))';
        const colorErr = 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.04))';
        return (
            <div style={{
                padding: '8px 14px',
                background: result.error ? colorErr : colorOk,
                border: '1px solid ' + (result.error ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'),
                borderRadius: 8, fontSize: 11, lineHeight: 1.5
            }}>
                {result.error ? (
                    <span style={{ color: '#ef4444' }}>❌ {result.error}</span>
                ) : (
                    <span>
                        ✅ <strong>Sync OK:</strong>{' '}
                        {result.productos.nuevos}+{result.productos.actualizados} productos ·{' '}
                        {result.clientes.nuevos} clientes nuevos ·{' '}
                        {result.orders.total} orders
                    </span>
                )}
            </div>
        );
    }

    return (
        <button
            className="btn btn-ghost btn-sm"
            onClick={syncAll}
            disabled={syncing}
            title="Traer productos, clientes y pedidos desde tu tienda web"
            style={{ position: 'relative' }}
        >
            {syncing ? (
                <>
                    <RefreshCw size={13} className="spin" />
                    <span>Sync... {progress.productos + progress.clientes + progress.orders}</span>
                </>
            ) : (
                <>
                    🌐 Sync web
                </>
            )}
        </button>
    );
}
