import React, { useMemo, useState } from 'react';
import {
    ShoppingCart, Search, X as XIcon, Plus, Minus, Trash2,
    Package, Store, CheckCircle, DollarSign
} from 'lucide-react';
import { useData, filterBySucursal, getRubroLabels, SECTION_HELP } from '../store/DataContext';
import { PageHeader, Card, Modal, Field, EmptyState, Badge, InfoBox, fmtMoney } from '../components/UI';

const METODOS = ['Efectivo', 'Tarjeta débito', 'Tarjeta crédito', 'Mercado Pago', 'Transferencia', 'Otro'];

export default function POSPage() {
    const { state, actions } = useData();
    const labels = getRubroLabels(state.business.rubro);
    const current = state.meta.currentSucursalId || 'all';

    const productos = (state.productos || []).filter(p => p.activo !== false);
    const empleados = filterBySucursal(state.empleados, current);
    const clientes = state.clientes || [];

    const [search, setSearch] = useState('');
    const [categoria, setCategoria] = useState('all');
    const [cart, setCart] = useState([]);
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [successOpen, setSuccessOpen] = useState(false);
    const [metodo, setMetodo] = useState('Efectivo');
    const [clienteId, setClienteId] = useState('');
    const [empleadoId, setEmpleadoId] = useState('');
    const [sucursalId, setSucursalId] = useState(current !== 'all' ? current : (state.sucursales[0]?.id || ''));
    const [descuento, setDescuento] = useState(0);

    const categorias = useMemo(() => {
        const set = new Set(productos.map(p => p.categoria).filter(Boolean));
        return ['all', ...Array.from(set).sort()];
    }, [productos]);

    const filteredProductos = useMemo(() => {
        return productos.filter(p => {
            if (categoria !== 'all' && p.categoria !== categoria) return false;
            if (search.trim()) {
                const q = search.trim().toLowerCase();
                return [p.nombre, p.codigo, p.categoria].some(v => (v || '').toLowerCase().includes(q));
            }
            return true;
        });
    }, [productos, categoria, search]);

    const addToCart = (p) => {
        if (Number(p.stock || 0) <= 0 && p.stock !== undefined) return;
        const exist = cart.find(c => c.productoId === p.id);
        if (exist) {
            setCart(cart.map(c => c.productoId === p.id ? { ...c, cantidad: c.cantidad + 1 } : c));
        } else {
            setCart([...cart, { productoId: p.id, nombre: p.nombre, precio: Number(p.precioVenta || 0), cantidad: 1 }]);
        }
    };

    const updateQty = (pid, delta) => {
        setCart(cart.map(c => {
            if (c.productoId !== pid) return c;
            const newQty = c.cantidad + delta;
            return newQty <= 0 ? null : { ...c, cantidad: newQty };
        }).filter(Boolean));
    };

    const removeFromCart = (pid) => setCart(cart.filter(c => c.productoId !== pid));
    const clearCart = () => setCart([]);

    const subtotal = cart.reduce((s, c) => s + c.precio * c.cantidad, 0);
    const total = Math.max(0, subtotal - Number(descuento || 0));

    const openCheckout = () => {
        if (cart.length === 0) return alert(`Agregá al menos un ${labels.item.toLowerCase()} al ticket`);
        if (state.sucursales.length === 0) return alert('Primero creá una sucursal');
        setCheckoutOpen(true);
    };

    const confirmSale = () => {
        if (!sucursalId) return alert('Elegí una sucursal');

        actions.add('ventas', {
            fecha: new Date().toISOString(),
            sucursalId, empleadoId, clienteId,
            items: cart, subtotal, descuento: Number(descuento || 0), total,
            metodo
        });

        // Descontar stock
        cart.forEach(c => {
            const p = productos.find(x => x.id === c.productoId);
            if (p && p.stock !== undefined) {
                actions.update('productos', p.id, { stock: Math.max(0, Number(p.stock || 0) - c.cantidad) });
            }
        });

        setCheckoutOpen(false);
        setSuccessOpen(true);
        clearCart();
        setDescuento(0);
        setClienteId('');
        setEmpleadoId('');
    };

    // Empty states
    if (state.sucursales.length === 0) {
        return (
            <div>
                <PageHeader icon={ShoppingCart} title={labels.pos} subtitle={labels.posDesc} help={SECTION_HELP.pos} />
                <Card>
                    <EmptyState
                        icon={Store}
                        title="Primero creá una sucursal"
                        description="Antes de vender necesitás tener al menos una sucursal. Andá al menú → Sucursales."
                    />
                </Card>
            </div>
        );
    }

    if (productos.length === 0) {
        return (
            <div>
                <PageHeader icon={ShoppingCart} title={labels.pos} subtitle={labels.posDesc} help={SECTION_HELP.pos} />
                <Card>
                    <EmptyState
                        icon={Package}
                        title={`Primero cargá tus ${labels.items.toLowerCase()}`}
                        description={`Necesitás tener ${labels.itemPlural} en el catálogo para poder vender.`}
                        tips={[
                            `Todos tus ${labels.itemPlural} aparecen en grilla grande para tocar rápido`,
                            'Buscador por nombre o código de barras',
                            'Filtros por categoría',
                            'Carrito lateral con total en vivo',
                            'Cobro rápido en 2 clicks'
                        ]}
                        example={
                            state.business.rubro === 'kiosco'
                                ? 'Típico kiosco: Coca 500ml $800, Paty 100g $1.200, Marlboro 20 $2.500...'
                                : state.business.rubro === 'restaurante'
                                    ? 'Típico restaurante: Milanesa con papas $8.500, Pizza Muzzarella $6.000, Coca litro $2.000...'
                                    : state.business.rubro === 'accesorios'
                                        ? 'Típica casa de accesorios: Collar plata $15.000, Aros perla $8.500, Cartera cuero $35.000...'
                                        : 'Cargá tus productos con código, nombre, categoría, precio de venta y stock.'
                        }
                    />
                </Card>
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                icon={ShoppingCart}
                title={labels.pos}
                subtitle={labels.posDesc}
                help={SECTION_HELP.pos}
                actions={
                    <span className="text-sm text-muted">
                        {cart.length} items · <span className="font-semibold" style={{ color: 'var(--accent)' }}>{fmtMoney(total, state.business.moneda)}</span>
                    </span>
                }
            />

            <div className="pos-layout">
                {/* PRODUCTS GRID */}
                <div className="pos-products">
                    <div className="pos-search">
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                className="input"
                                style={{ paddingLeft: 32 }}
                                placeholder={`Buscar ${labels.item.toLowerCase()} por nombre o código...`}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>

                    {categorias.length > 1 && (
                        <div className="pos-categories">
                            {categorias.map(c => (
                                <button
                                    key={c}
                                    className={`pos-category ${categoria === c ? 'active' : ''}`}
                                    onClick={() => setCategoria(c)}
                                >
                                    {c === 'all' ? 'Todos' : c}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="pos-grid">
                        {filteredProductos.length === 0 ? (
                            <div style={{ gridColumn: '1/-1', padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                                No se encontraron {labels.itemPlural}
                            </div>
                        ) : filteredProductos.map(p => {
                            const stock = Number(p.stock ?? 999);
                            const noStock = p.stock !== undefined && stock <= 0;
                            const lowStock = !noStock && stock > 0 && stock <= Number(p.stockMinimo || 0);
                            return (
                                <button
                                    key={p.id}
                                    className="pos-product"
                                    onClick={() => addToCart(p)}
                                    disabled={noStock}
                                    title={noStock ? 'Sin stock' : ''}
                                >
                                    <div className="pos-product-name">{p.nombre}</div>
                                    {p.codigo && <div className="pos-product-stock">#{p.codigo}</div>}
                                    <div className="pos-product-price">{fmtMoney(p.precioVenta, state.business.moneda)}</div>
                                    {p.stock !== undefined && (
                                        <div className={`pos-product-stock ${noStock ? 'none' : lowStock ? 'low' : ''}`}>
                                            {noStock ? 'Sin stock' : `Stock: ${stock}`}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* CART */}
                <div className="pos-cart">
                    <div className="pos-cart-header">
                        <div>
                            <div className="font-semibold">Ticket actual</div>
                            <div className="text-xs text-muted">{cart.length} items</div>
                        </div>
                        {cart.length > 0 && (
                            <button className="btn btn-ghost btn-sm" onClick={clearCart}>
                                <Trash2 size={12} /> Limpiar
                            </button>
                        )}
                    </div>

                    <div className="pos-cart-items">
                        {cart.length === 0 ? (
                            <div className="pos-cart-empty">
                                <ShoppingCart size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                                <div>Tocá un {labels.item.toLowerCase()} para agregarlo al ticket</div>
                            </div>
                        ) : cart.map(c => (
                            <div key={c.productoId} className="pos-cart-item">
                                <div className="pos-cart-item-info">
                                    <div className="pos-cart-item-name">{c.nombre}</div>
                                    <div className="pos-cart-item-price">{fmtMoney(c.precio, state.business.moneda)} c/u</div>
                                </div>
                                <div className="pos-qty-ctrl">
                                    <button className="pos-qty-btn" onClick={() => updateQty(c.productoId, -1)}><Minus size={10} /></button>
                                    <span className="pos-qty-value">{c.cantidad}</span>
                                    <button className="pos-qty-btn" onClick={() => updateQty(c.productoId, 1)}><Plus size={10} /></button>
                                </div>
                                <div className="pos-cart-item-subtotal">{fmtMoney(c.precio * c.cantidad, state.business.moneda)}</div>
                                <button className="btn btn-danger btn-sm btn-icon" onClick={() => removeFromCart(c.productoId)}><XIcon size={10} /></button>
                            </div>
                        ))}
                    </div>

                    <div className="pos-cart-footer">
                        <div className="pos-cart-row">
                            <span>Subtotal</span>
                            <span>{fmtMoney(subtotal, state.business.moneda)}</span>
                        </div>
                        <div className="pos-cart-row">
                            <span>Descuento</span>
                            <input
                                className="input"
                                type="number"
                                style={{ width: 100, textAlign: 'right', padding: '4px 8px' }}
                                value={descuento}
                                onChange={e => setDescuento(e.target.value)}
                                min="0"
                            />
                        </div>
                        <div className="pos-cart-total">
                            <span>TOTAL</span>
                            <span>{fmtMoney(total, state.business.moneda)}</span>
                        </div>
                        <button className="btn btn-primary btn-lg" onClick={openCheckout} disabled={cart.length === 0}>
                            <DollarSign size={16} /> Cobrar
                        </button>
                    </div>
                </div>
            </div>

            {/* CHECKOUT MODAL */}
            <Modal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} title="Confirmar venta">
                <InfoBox>
                    Antes de confirmar, verificá el método de pago y asignale la venta a un empleado (opcional pero recomendado para tener ranking de vendedores).
                </InfoBox>
                <div className="form-grid mt-3">
                    <Field label="Sucursal" required>
                        <select className="select" value={sucursalId} onChange={e => setSucursalId(e.target.value)}>
                            <option value="">Elegir...</option>
                            {state.sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                        </select>
                    </Field>
                    <Field label="Empleado (vendedor)" hint="Opcional — para ranking en Informes">
                        <select className="select" value={empleadoId} onChange={e => setEmpleadoId(e.target.value)}>
                            <option value="">Sin especificar</option>
                            {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellido}</option>)}
                        </select>
                    </Field>
                    <Field label="Cliente" hint="Opcional — para histórico">
                        <select className="select" value={clienteId} onChange={e => setClienteId(e.target.value)}>
                            <option value="">Consumidor final</option>
                            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                    </Field>
                    <Field label="Método de pago" required>
                        <select className="select" value={metodo} onChange={e => setMetodo(e.target.value)}>
                            {METODOS.map(m => <option key={m}>{m}</option>)}
                        </select>
                    </Field>
                </div>
                <div className="card mt-3" style={{ background: 'var(--bg-elevated)', padding: 14 }}>
                    <div className="flex justify-between mb-2"><span>Items</span><span className="font-semibold">{cart.length}</span></div>
                    <div className="flex justify-between mb-2"><span>Subtotal</span><span>{fmtMoney(subtotal, state.business.moneda)}</span></div>
                    {descuento > 0 && <div className="flex justify-between mb-2"><span>Descuento</span><span style={{ color: 'var(--danger)' }}>-{fmtMoney(descuento, state.business.moneda)}</span></div>}
                    <div className="flex justify-between text-lg font-bold" style={{ paddingTop: 8, borderTop: '1px solid var(--border-color)' }}>
                        <span>TOTAL</span>
                        <span style={{ color: 'var(--accent)' }}>{fmtMoney(total, state.business.moneda)}</span>
                    </div>
                </div>
                <div className="flex gap-2 mt-4 justify-end">
                    <button className="btn btn-ghost" onClick={() => setCheckoutOpen(false)}>Cancelar</button>
                    <button className="btn btn-primary btn-lg" onClick={confirmSale}>
                        <CheckCircle size={16} /> Confirmar {fmtMoney(total, state.business.moneda)}
                    </button>
                </div>
            </Modal>

            <Modal open={successOpen} onClose={() => setSuccessOpen(false)} title="¡Venta registrada!" size="sm">
                <div style={{ textAlign: 'center', padding: 20 }}>
                    <div style={{
                        width: 60, height: 60, borderRadius: '50%',
                        background: 'rgba(34,197,94,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px'
                    }}>
                        <CheckCircle size={32} color="var(--success)" />
                    </div>
                    <div className="text-lg font-bold mb-2">Venta completada</div>
                    <div className="text-sm text-muted mb-4">El stock se actualizó automáticamente</div>
                    <button className="btn btn-primary" onClick={() => setSuccessOpen(false)}>Continuar vendiendo</button>
                </div>
            </Modal>
        </div>
    );
}
