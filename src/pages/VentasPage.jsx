import React, { useMemo, useState } from 'react';
import { ShoppingCart, Plus, Trash2, Store as StoreIcon, User as UserIcon, DollarSign, TrendingUp, X as XIcon } from 'lucide-react';
import { useData, filterBySucursal, getRubroLabels } from '../store/DataContext';
import { Card, Modal, Field, EmptyState, Badge, KpiCard, fmtMoney, fmtDate } from '../components/UI';

const METODOS = ['Efectivo', 'Tarjeta débito', 'Tarjeta crédito', 'Mercado Pago', 'Transferencia', 'Otro'];

export default function VentasPage() {
    const { state, actions } = useData();
    const current = state.meta.currentSucursalId || 'all';
    const labels = getRubroLabels(state.business.rubro);

    const ventas = filterBySucursal(state.ventas, current).slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    const productos = state.productos || [];
    const empleados = filterBySucursal(state.empleados, current);
    const clientes = state.clientes || [];

    const [open, setOpen] = useState(false);
    const [cart, setCart] = useState([]);
    const [metodo, setMetodo] = useState('Efectivo');
    const [clienteId, setClienteId] = useState('');
    const [empleadoId, setEmpleadoId] = useState('');
    const [sucursalId, setSucursalId] = useState('');
    const [descuento, setDescuento] = useState(0);

    const openNew = () => {
        setCart([]);
        setMetodo('Efectivo');
        setClienteId('');
        setEmpleadoId('');
        setSucursalId(current !== 'all' ? current : (state.sucursales[0]?.id || ''));
        setDescuento(0);
        setOpen(true);
    };

    const addToCart = (prodId) => {
        const p = productos.find(x => x.id === prodId);
        if (!p) return;
        const exist = cart.find(c => c.productoId === prodId);
        if (exist) setCart(cart.map(c => c.productoId === prodId ? { ...c, cantidad: c.cantidad + 1 } : c));
        else setCart([...cart, { productoId: prodId, nombre: p.nombre, precio: Number(p.precioVenta || 0), cantidad: 1 }]);
    };

    const updateQty = (pid, q) => {
        const n = Math.max(1, Number(q));
        setCart(cart.map(c => c.productoId === pid ? { ...c, cantidad: n } : c));
    };

    const removeItem = (pid) => setCart(cart.filter(c => c.productoId !== pid));

    const subtotal = cart.reduce((s, c) => s + c.precio * c.cantidad, 0);
    const total = Math.max(0, subtotal - Number(descuento || 0));

    const save = () => {
        if (!sucursalId) return alert('Seleccioná una sucursal');
        if (cart.length === 0) return alert('Agregá al menos un ítem');
        actions.add('ventas', {
            fecha: new Date().toISOString(),
            sucursalId, empleadoId, clienteId,
            items: cart, subtotal, descuento: Number(descuento || 0), total,
            metodo
        });
        // Descontar stock
        cart.forEach(c => {
            const p = productos.find(x => x.id === c.productoId);
            if (p) actions.update('productos', p.id, { stock: Math.max(0, Number(p.stock || 0) - c.cantidad) });
        });
        setOpen(false);
    };

    const kpis = useMemo(() => {
        const hoy = new Date().toISOString().slice(0, 10);
        const ventasHoy = ventas.filter(v => (v.fecha || '').slice(0, 10) === hoy);
        const totalHoy = ventasHoy.reduce((s, v) => s + Number(v.total || 0), 0);
        const total = ventas.reduce((s, v) => s + Number(v.total || 0), 0);
        const promedio = ventas.length ? total / ventas.length : 0;
        return { countHoy: ventasHoy.length, totalHoy, total, promedio };
    }, [ventas]);

    return (
        <div className="flex-col gap-4">
            <div className="kpi-grid">
                <KpiCard icon={<ShoppingCart size={20} />} label="Ventas hoy" value={kpis.countHoy} color="#14b8a6" />
                <KpiCard icon={<DollarSign size={20} />} label="Total hoy" value={fmtMoney(kpis.totalHoy, state.business.moneda)} color="#22c55e" />
                <KpiCard icon={<TrendingUp size={20} />} label="Total histórico" value={fmtMoney(kpis.total, state.business.moneda)} color="#0ea5e9" />
                <KpiCard icon={<DollarSign size={20} />} label="Ticket promedio" value={fmtMoney(kpis.promedio, state.business.moneda)} color="#a855f7" />
            </div>

            <Card
                title="Ventas"
                subtitle={current === 'all' ? 'Todas las sucursales' : state.sucursales.find(s => s.id === current)?.nombre}
                actions={<button className="btn btn-primary" onClick={openNew} disabled={state.sucursales.length === 0 || productos.length === 0}><Plus size={14} /> Nueva venta</button>}
            >
                {state.sucursales.length === 0 ? (
                    <EmptyState icon={StoreIcon} title="Primero creá una sucursal" />
                ) : productos.length === 0 ? (
                    <EmptyState icon={ShoppingCart} title={`Primero cargá tus ${labels.items.toLowerCase()}`} description="Para registrar ventas necesitás tener productos en el catálogo." />
                ) : ventas.length === 0 ? (
                    <EmptyState
                        icon={ShoppingCart}
                        title="Todavía no hay ventas registradas"
                        description="Registrá tu primera venta desde el botón superior."
                        action={<button className="btn btn-primary" onClick={openNew}><Plus size={14} /> Nueva venta</button>}
                        tips={[
                            'Historial de ventas con fecha, sucursal, empleado y método',
                            'KPIs del día: cantidad, total, ticket promedio',
                            'Descuento de stock automático al registrar una venta',
                            'En Informes: ventas por sucursal, por empleado y por método de pago'
                        ]}
                    />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr><th>Fecha</th><th>Sucursal</th><th>Empleado</th><th>Cliente</th><th>Items</th><th>Método</th><th style={{ textAlign: 'right' }}>Total</th><th></th></tr>
                            </thead>
                            <tbody>
                                {ventas.slice(0, 50).map(v => (
                                    <tr key={v.id}>
                                        <td className="text-sm">{fmtDate(v.fecha)}<div className="text-xs text-muted">{v.fecha?.slice(11, 16)}</div></td>
                                        <td className="text-sm">{state.sucursales.find(s => s.id === v.sucursalId)?.nombre || '—'}</td>
                                        <td className="text-sm">{state.empleados.find(e => e.id === v.empleadoId)?.nombre || '—'}</td>
                                        <td className="text-sm">{state.clientes.find(c => c.id === v.clienteId)?.nombre || '—'}</td>
                                        <td>{(v.items || []).length}</td>
                                        <td><Badge variant="info">{v.metodo}</Badge></td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtMoney(v.total, state.business.moneda)}</td>
                                        <td style={{ textAlign: 'right' }}><button className="btn btn-danger btn-sm btn-icon" onClick={() => { if (confirm('¿Eliminar esta venta? Esto NO restablece el stock.')) actions.remove('ventas', v.id); }}><Trash2 size={13} /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {ventas.length > 50 && <div className="text-xs text-muted mt-2" style={{ textAlign: 'center' }}>Mostrando las últimas 50 de {ventas.length} ventas</div>}
                    </div>
                )}
            </Card>

            <Modal open={open} onClose={() => setOpen(false)} title="Nueva venta" size="lg">
                <div className="form-grid mb-3">
                    <Field label="Sucursal" required>
                        <select className="select" value={sucursalId} onChange={e => setSucursalId(e.target.value)}>
                            <option value="">Elegir...</option>
                            {state.sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                        </select>
                    </Field>
                    <Field label="Empleado">
                        <select className="select" value={empleadoId} onChange={e => setEmpleadoId(e.target.value)}>
                            <option value="">Sin especificar</option>
                            {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellido}</option>)}
                        </select>
                    </Field>
                    <Field label="Cliente">
                        <select className="select" value={clienteId} onChange={e => setClienteId(e.target.value)}>
                            <option value="">Consumidor final</option>
                            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                    </Field>
                    <Field label="Método de pago">
                        <select className="select" value={metodo} onChange={e => setMetodo(e.target.value)}>{METODOS.map(m => <option key={m}>{m}</option>)}</select>
                    </Field>
                </div>

                <div className="card mb-3" style={{ padding: 12 }}>
                    <div className="text-xs text-muted mb-2">Agregar producto al ticket</div>
                    <select className="select" onChange={e => { if (e.target.value) { addToCart(e.target.value); e.target.value = ''; } }}>
                        <option value="">Seleccionar...</option>
                        {productos.filter(p => p.activo !== false).map(p => (
                            <option key={p.id} value={p.id}>{p.nombre} — {fmtMoney(p.precioVenta, state.business.moneda)} {Number(p.stock) > 0 ? `(stock ${p.stock})` : '(SIN STOCK)'}</option>
                        ))}
                    </select>
                </div>

                {cart.length > 0 && (
                    <div className="card mb-3" style={{ padding: 0 }}>
                        <table className="table">
                            <thead><tr><th>Producto</th><th>Cantidad</th><th style={{ textAlign: 'right' }}>Precio</th><th style={{ textAlign: 'right' }}>Subtotal</th><th></th></tr></thead>
                            <tbody>
                                {cart.map(c => (
                                    <tr key={c.productoId}>
                                        <td>{c.nombre}</td>
                                        <td><input className="input" type="number" min="1" style={{ width: 70 }} value={c.cantidad} onChange={e => updateQty(c.productoId, e.target.value)} /></td>
                                        <td style={{ textAlign: 'right' }}>{fmtMoney(c.precio, state.business.moneda)}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtMoney(c.precio * c.cantidad, state.business.moneda)}</td>
                                        <td style={{ textAlign: 'right' }}><button className="btn btn-danger btn-sm btn-icon" onClick={() => removeItem(c.productoId)}><XIcon size={12} /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="card" style={{ background: 'var(--bg-elevated)' }}>
                    <div className="flex justify-between items-center mb-2"><span>Subtotal</span><span>{fmtMoney(subtotal, state.business.moneda)}</span></div>
                    <div className="flex justify-between items-center mb-2"><span>Descuento</span><input className="input" type="number" style={{ width: 120, textAlign: 'right' }} value={descuento} onChange={e => setDescuento(e.target.value)} /></div>
                    <div className="flex justify-between items-center text-lg font-bold" style={{ borderTop: '1px solid var(--border-color)', paddingTop: 8 }}><span>Total</span><span style={{ color: 'var(--accent)' }}>{fmtMoney(total, state.business.moneda)}</span></div>
                </div>

                <div className="flex gap-2 mt-4" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
                    <button className="btn btn-primary" onClick={save} disabled={cart.length === 0}>Registrar venta</button>
                </div>
            </Modal>
        </div>
    );
}
