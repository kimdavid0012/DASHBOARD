import React, { useMemo, useState } from 'react';
import { Receipt, Eye, Trash2, Filter, ShoppingCart } from 'lucide-react';
import { useData, filterBySucursal, getRubroLabels, SECTION_HELP } from '../store/DataContext';
import { PageHeader, Card, Modal, EmptyState, Badge, KpiCard, fmtMoney, fmtDate, InfoBox } from '../components/UI';
import { useT } from '../i18n';

export default function VentasPage({ onNavigate }) {
    const t = useT();
    const { state, actions } = useData();
    const labels = getRubroLabels(state.business.rubro);
    const current = state.meta.currentSucursalId || 'all';

    const [viewId, setViewId] = useState(null);
    const [filterDias, setFilterDias] = useState('30');
    const [filterMetodo, setFilterMetodo] = useState('all');

    const ventas = useMemo(() => {
        let list = filterBySucursal(state.ventas, current);
        if (filterDias !== 'all') {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - Number(filterDias));
            list = list.filter(v => new Date(v.fecha || 0) >= cutoff);
        }
        if (filterMetodo !== 'all') list = list.filter(v => v.metodo === filterMetodo);
        return list.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    }, [state.ventas, current, filterDias, filterMetodo]);

    const viewingVenta = viewId ? state.ventas.find(v => v.id === viewId) : null;

    const stats = useMemo(() => {
        const total = ventas.reduce((s, v) => s + Number(v.total || 0), 0);
        const ticketProm = ventas.length ? total / ventas.length : 0;
        return { total, count: ventas.length, ticketProm };
    }, [ventas]);

    const metodos = useMemo(() => {
        const set = new Set(state.ventas.map(v => v.metodo).filter(Boolean));
        return ['all', ...Array.from(set)];
    }, [state.ventas]);

    return (
        <div>
            <PageHeader
                icon={Receipt}
                title={`Historial de ${labels.sales.toLowerCase()}`}
                subtitle="Todas las operaciones registradas"
                help={SECTION_HELP.ventas}
                actions={
                    <button className="btn btn-primary" onClick={() => onNavigate?.('pos')}>
                        <ShoppingCart size={14} /> Ir a {labels.pos}
                    </button>
                }
            />

            <div className="kpi-grid mb-4">
                <KpiCard icon={<Receipt size={20} />} label={`${labels.sales} (filtro)`} value={stats.count} color="#63f1cb" />
                <KpiCard icon={<Receipt size={20} />} label="Total facturado" value={fmtMoney(stats.total, state.business.moneda)} color="#22c55e" />
                <KpiCard icon={<Receipt size={20} />} label="Ticket promedio" value={fmtMoney(stats.ticketProm, state.business.moneda)} color="#60a5fa" hint="Total / cantidad de operaciones" />
            </div>

            <Card>
                <div className="flex gap-2 mb-3" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                    <Filter size={14} style={{ color: 'var(--text-muted)' }} />
                    <select className="select" style={{ maxWidth: 160 }} value={filterDias} onChange={e => setFilterDias(e.target.value)}>
                        <option value="7">Últimos 7 días</option>
                        <option value="30">Últimos 30 días</option>
                        <option value="90">Últimos 90 días</option>
                        <option value="365">Último año</option>
                        <option value="all">Todo</option>
                    </select>
                    <select className="select" style={{ maxWidth: 180 }} value={filterMetodo} onChange={e => setFilterMetodo(e.target.value)}>
                        {metodos.map(m => <option key={m} value={m}>{m === 'all' ? 'Todos los métodos' : m}</option>)}
                    </select>
                </div>

                {state.ventas.length === 0 ? (
                    <EmptyState
                        icon={Receipt}
                        title={`Sin ${labels.sales.toLowerCase()} registradas`}
                        description={`Cuando uses el ${labels.pos}, cada operación aparece acá con todos sus detalles.`}
                        action={<button className="btn btn-primary" onClick={() => onNavigate?.('pos')}><ShoppingCart size={14} /> Ir al {labels.pos}</button>}
                        tips={[
                            'Fecha, hora y empleado responsable',
                            'Items con cantidades y precios',
                            'Método de pago y totales',
                            'Filtros por período y método',
                            'KPIs: total facturado y ticket promedio'
                        ]}
                    />
                ) : ventas.length === 0 ? (
                    <EmptyState
                        icon={Filter}
                        title="No hay resultados con estos filtros"
                        description="Probá ampliar el período o cambiar el método de pago."
                    />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead><tr>
                                <th>Fecha</th><th>Sucursal</th><th>Empleado</th><th>Cliente</th>
                                <th>Items</th><th>Método</th><th style={{ textAlign: 'right' }}>Total</th><th></th>
                            </tr></thead>
                            <tbody>
                                {ventas.slice(0, 200).map(v => {
                                    const suc = state.sucursales.find(s => s.id === v.sucursalId);
                                    const emp = state.empleados.find(e => e.id === v.empleadoId);
                                    const cli = state.clientes.find(c => c.id === v.clienteId);
                                    return (
                                        <tr key={v.id}>
                                            <td className="text-sm">{fmtDate(v.fecha)}</td>
                                            <td className="text-sm">{suc?.nombre || '—'}</td>
                                            <td className="text-sm">{emp ? `${emp.nombre} ${emp.apellido || ''}` : '—'}</td>
                                            <td className="text-sm">{cli?.nombre || 'Consumidor final'}</td>
                                            <td>{(v.items || []).length}</td>
                                            <td><Badge variant="info">{v.metodo}</Badge></td>
                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtMoney(v.total, state.business.moneda)}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setViewId(v.id)}><Eye size={13} /></button>
                                                <button className="btn btn-danger btn-sm btn-icon" onClick={() => { if (confirm('¿Eliminar venta? No revierte el stock.')) actions.remove('ventas', v.id); }}><Trash2 size={13} /></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {ventas.length > 200 && <div className="text-xs text-muted mt-2 text-center">Mostrando las primeras 200 de {ventas.length}. Usá filtros para reducir.</div>}
                    </div>
                )}
            </Card>

            <Modal open={!!viewingVenta} onClose={() => setViewId(null)} title="Detalle de venta">
                {viewingVenta && (
                    <div>
                        <div className="form-grid">
                            <div><div className="field-label">Fecha</div><div>{fmtDate(viewingVenta.fecha)}</div></div>
                            <div><div className="field-label">Método</div><div>{viewingVenta.metodo}</div></div>
                            <div><div className="field-label">Sucursal</div><div>{state.sucursales.find(s => s.id === viewingVenta.sucursalId)?.nombre || '—'}</div></div>
                            <div><div className="field-label">Empleado</div><div>{(() => { const e = state.empleados.find(x => x.id === viewingVenta.empleadoId); return e ? `${e.nombre} ${e.apellido || ''}` : '—'; })()}</div></div>
                            <div><div className="field-label">Cliente</div><div>{state.clientes.find(c => c.id === viewingVenta.clienteId)?.nombre || 'Consumidor final'}</div></div>
                        </div>
                        <div className="mt-4">
                            <div className="field-label mb-2">Items</div>
                            <table className="table">
                                <thead><tr><th>Producto</th><th style={{ textAlign: 'right' }}>Cant.</th><th style={{ textAlign: 'right' }}>Precio</th><th style={{ textAlign: 'right' }}>Subtotal</th></tr></thead>
                                <tbody>
                                    {(viewingVenta.items || []).map((it, i) => (
                                        <tr key={i}>
                                            <td>{it.nombre}</td>
                                            <td style={{ textAlign: 'right' }}>{it.cantidad}</td>
                                            <td style={{ textAlign: 'right' }}>{fmtMoney(it.precio, state.business.moneda)}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtMoney(it.precio * it.cantidad, state.business.moneda)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-3" style={{ textAlign: 'right', fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>
                            Total: {fmtMoney(viewingVenta.total, state.business.moneda)}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
