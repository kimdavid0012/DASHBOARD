import React, { useMemo } from 'react';
import {
    TrendingUp, DollarSign, ShoppingCart, Users, Package,
    AlertTriangle, Store, Home, Calendar, RotateCcw, Settings as SettingsIcon,
    Bot, FileText, Receipt, ArrowRight, Flame, Clock, Armchair,
    Megaphone, Zap, Plus
} from 'lucide-react';
import { useData, filterBySucursal, getRubroLabels, SECTION_HELP } from '../store/DataContext';
import { PageHeader, Card, KpiCard, EmptyState, BarChart, LineChart, fmtMoney, CHART_COLORS, InfoBox } from '../components/UI';
import { useT } from '../i18n';

export default function DashboardHome({ onNavigate }) {
    const t = useT();
    const { state, actions } = useData();
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
                    <Card title={`${labels.sales} — últimos 7 días`} subtitle={current === 'all' ? 'Todas las sucursales' : state.sucursales.find(s => s.id === current)?.nombre}>
                        <LineChart
                            series={[{ data: chartVentas7d.map(d => d.total), color: '#63f1cb' }]}
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
