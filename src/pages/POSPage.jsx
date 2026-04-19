import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
    ShoppingCart, Search, X as XIcon, Plus, Minus, Trash2,
    Package, Store, CheckCircle, DollarSign, Barcode,
    Utensils, Armchair, Shirt, Briefcase, Clock, Flame,
    Coffee, Pizza, Wine, Sparkles, Printer
} from 'lucide-react';
import { useData, filterBySucursal, getRubroLabels, SECTION_HELP } from '../store/DataContext';
import { PageHeader, Card, Modal, Field, EmptyState, Badge, InfoBox, fmtMoney } from '../components/UI';
import { TicketPrinter } from '../utils/printer';

const METODOS = ['Efectivo', 'Tarjeta débito', 'Tarjeta crédito', 'Mercado Pago', 'Transferencia', 'QR'];

// ═══════════════════════════════════════════════════════════════════
// Rubro-specific product emoji defaults (fallback if product has no emoji)
// ═══════════════════════════════════════════════════════════════════
const PRODUCT_EMOJI_BY_CATEGORIA = {
    // Kiosco
    'Golosinas': '🍬', 'Cigarrillos': '🚬', 'Bebidas': '🥤', 'Galletitas': '🍪',
    'Lácteos': '🥛', 'Fiambres': '🥓', 'Panificados': '🥐', 'Limpieza': '🧴',
    'Almacén': '🥫', 'Revistas': '📰',
    // Restaurante
    'Entradas': '🥗', 'Principales': '🍽️', 'Pastas': '🍝', 'Carnes': '🥩',
    'Pescados': '🐟', 'Ensaladas': '🥬', 'Postres': '🍰', 'Vinos': '🍷',
    'Cafetería': '☕',
    // Accesorios
    'Aros': '👂', 'Collares': '📿', 'Pulseras': '⌚', 'Anillos': '💍',
    'Bolsos': '👜', 'Carteras': '👛', 'Cinturones': '⚖️', 'Bijouterie': '✨',
    'Ropa': '👕', 'Calzado': '👟',
    // Servicios
    'Consultoría': '💼', 'Clases': '📚', 'Sesiones': '⏱️', 'Asesoría': '🤝',
    'Mantenimiento': '🔧'
};

export default function POSPage() {
    const { state } = useData();
    const rubro = state.business.rubro;

    // Route to specialized POS based on rubro
    if (rubro === 'restaurante') return <POSRestaurant />;
    if (rubro === 'kiosco') return <POSKiosco />;
    if (rubro === 'accesorios') return <POSAccesorios />;
    if (rubro === 'servicios') return <POSServicios />;
    return <POSGeneral />;
}

// ═══════════════════════════════════════════════════════════════════
// SHARED CART COMPONENT
// ═══════════════════════════════════════════════════════════════════
function CartSidebar({ cart, setCart, state, onCheckout, labels, mesa, empleado, extra = null }) {
    const updateQty = (pid, delta) => {
        setCart(cart.map(c => {
            if (c._key !== pid) return c;
            const newQty = c.cantidad + delta;
            return newQty <= 0 ? null : { ...c, cantidad: newQty };
        }).filter(Boolean));
    };
    const removeFromCart = (pid) => setCart(cart.filter(c => c._key !== pid));

    const subtotal = cart.reduce((s, c) => s + c.precio * c.cantidad, 0);

    return (
        <div className="pos-cart">
            <div className="pos-cart-header">
                <div>
                    <div className="pos-cart-title">
                        {mesa ? `Mesa ${mesa.numero}` : 'Ticket actual'}
                    </div>
                    <div className="text-xs text-muted mt-1">
                        {cart.length} {cart.length === 1 ? 'ítem' : 'ítems'}
                        {empleado && <> · {empleado}</>}
                    </div>
                </div>
                {cart.length > 0 && (
                    <button className="btn btn-ghost btn-sm" onClick={() => setCart([])}>
                        <Trash2 size={12} />
                    </button>
                )}
            </div>

            <div className="pos-cart-items">
                {cart.length === 0 ? (
                    <div className="pos-cart-empty">
                        <ShoppingCart size={40} style={{ opacity: 0.25, marginBottom: 12 }} />
                        <div>Tocá un {labels.item.toLowerCase()} para agregarlo</div>
                    </div>
                ) : cart.map(c => (
                    <div key={c._key} className="pos-cart-item">
                        <div className="pos-cart-item-info">
                            <div className="pos-cart-item-name">{c.nombre}</div>
                            <div className="pos-cart-item-price">
                                {fmtMoney(c.precio, state.business.moneda)} c/u
                                {c.variante && <> · {c.variante}</>}
                            </div>
                        </div>
                        <div className="pos-qty-ctrl">
                            <button className="pos-qty-btn" onClick={() => updateQty(c._key, -1)}><Minus size={11} /></button>
                            <span className="pos-qty-value">{c.cantidad}</span>
                            <button className="pos-qty-btn" onClick={() => updateQty(c._key, 1)}><Plus size={11} /></button>
                        </div>
                        <div className="pos-cart-item-subtotal">{fmtMoney(c.precio * c.cantidad, state.business.moneda)}</div>
                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => removeFromCart(c._key)}><XIcon size={10} /></button>
                    </div>
                ))}
            </div>

            {extra}

            <div className="pos-cart-footer">
                <div className="pos-cart-row">
                    <span>Subtotal</span>
                    <span className="mono">{fmtMoney(subtotal, state.business.moneda)}</span>
                </div>
                <div className="pos-cart-total">
                    <span className="pos-cart-total-label">Total</span>
                    <span>{fmtMoney(subtotal, state.business.moneda)}</span>
                </div>
                <button className="btn btn-primary btn-lg" onClick={onCheckout} disabled={cart.length === 0}>
                    <CheckCircle size={18} /> Cobrar
                </button>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// CHECKOUT & SUCCESS (shared modals)
// ═══════════════════════════════════════════════════════════════════
function CheckoutModal({ open, onClose, cart, state, onConfirm, mesa = null }) {
    const [metodo, setMetodo] = useState('Efectivo');
    const [clienteId, setClienteId] = useState('');
    const [empleadoId, setEmpleadoId] = useState('');
    const [sucursalId, setSucursalId] = useState(state.meta.currentSucursalId !== 'all' ? state.meta.currentSucursalId : (state.sucursales[0]?.id || ''));
    const [descuento, setDescuento] = useState(0);

    const subtotal = cart.reduce((s, c) => s + c.precio * c.cantidad, 0);
    const total = Math.max(0, subtotal - Number(descuento || 0));

    const confirm = () => {
        if (!sucursalId) return alert('Elegí una sucursal');
        onConfirm({ metodo, clienteId, empleadoId, sucursalId, descuento: Number(descuento || 0), subtotal, total });
    };

    return (
        <Modal open={open} onClose={onClose} title="Confirmar cobro" size="md">
            <InfoBox>
                Asigná empleado para tener ranking de vendedores en informes.
            </InfoBox>
            <div className="form-grid mt-3">
                <Field label="Sucursal" required>
                    <select className="select" value={sucursalId} onChange={e => setSucursalId(e.target.value)}>
                        <option value="">Elegir...</option>
                        {state.sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                </Field>
                <Field label="Empleado" hint="Opcional">
                    <select className="select" value={empleadoId} onChange={e => setEmpleadoId(e.target.value)}>
                        <option value="">Sin especificar</option>
                        {state.empleados.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellido}</option>)}
                    </select>
                </Field>
                <Field label="Cliente" hint="Opcional">
                    <select className="select" value={clienteId} onChange={e => setClienteId(e.target.value)}>
                        <option value="">Consumidor final</option>
                        {state.clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                </Field>
                <Field label="Método de pago" required>
                    <select className="select" value={metodo} onChange={e => setMetodo(e.target.value)}>
                        {METODOS.map(m => <option key={m}>{m}</option>)}
                    </select>
                </Field>
                <Field label="Descuento" hint="En pesos">
                    <input className="input" type="number" value={descuento} onChange={e => setDescuento(e.target.value)} min="0" />
                </Field>
            </div>
            <div className="card mt-4" style={{ background: 'var(--bg-elevated)' }}>
                <div className="flex justify-between mb-2"><span>Ítems</span><span className="font-semibold mono">{cart.length}</span></div>
                <div className="flex justify-between mb-2"><span>Subtotal</span><span className="mono">{fmtMoney(subtotal, state.business.moneda)}</span></div>
                {descuento > 0 && <div className="flex justify-between mb-2"><span>Descuento</span><span style={{ color: 'var(--danger)' }} className="mono">-{fmtMoney(descuento, state.business.moneda)}</span></div>}
                <div className="flex justify-between pos-cart-total" style={{ borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                    <span className="pos-cart-total-label">TOTAL</span>
                    <span>{fmtMoney(total, state.business.moneda)}</span>
                </div>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
                <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
                <button className="btn btn-primary btn-lg" onClick={confirm}>
                    <CheckCircle size={18} /> Confirmar {fmtMoney(total, state.business.moneda)}
                </button>
            </div>
        </Modal>
    );
}

function SuccessModal({ open, onClose, lastSale }) {
    const [printing, setPrinting] = useState(false);
    const [printError, setPrintError] = useState('');

    const handlePrint = async () => {
        if (!lastSale) return;
        setPrinting(true);
        setPrintError('');
        try {
            await TicketPrinter.quickPrint(lastSale);
        } catch (err) {
            setPrintError(err.message || 'Error al imprimir');
        } finally {
            setPrinting(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose} title="¡Listo!" size="sm">
            <div style={{ textAlign: 'center', padding: 24 }}>
                <div style={{
                    width: 72, height: 72, borderRadius: '50%',
                    background: 'rgba(74, 222, 128, 0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 20px',
                    border: '2px solid var(--success)'
                }}>
                    <CheckCircle size={38} color="var(--success)" />
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, marginBottom: 8 }}>
                    Cobro registrado
                </div>
                <div className="text-sm text-muted mb-4">El stock se actualizó automáticamente</div>

                {printError && (
                    <div style={{ padding: 10, background: 'rgba(251, 113, 133, 0.1)', borderRadius: 8, marginBottom: 12, fontSize: 12, color: 'var(--danger, #fb7185)' }}>
                        {printError}
                    </div>
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {lastSale && (
                        <button className="btn btn-ghost btn-lg" onClick={handlePrint} disabled={printing}>
                            <Printer size={16} /> {printing ? 'Imprimiendo...' : 'Imprimir ticket'}
                        </button>
                    )}
                    <button className="btn btn-primary btn-lg" onClick={onClose}>
                        <Sparkles size={16} /> Seguir vendiendo
                    </button>
                </div>
            </div>
        </Modal>
    );
}

// ═══════════════════════════════════════════════════════════════════
// BASE POS HOOK (shared logic)
// ═══════════════════════════════════════════════════════════════════
function usePOSLogic() {
    const { state, actions } = useData();
    const labels = getRubroLabels(state.business.rubro);
    const [cart, setCart] = useState([]);
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [successOpen, setSuccessOpen] = useState(false);
    const [lastSale, setLastSale] = useState(null);

    const productos = (state.productos || []).filter(p => p.activo !== false);
    const current = state.meta.currentSucursalId || 'all';

    const addToCart = (p, extras = {}) => {
        const stock = Number(p.stock ?? 999);
        if (p.stock !== undefined && stock <= 0) return;

        // Build unique key for variantes
        const varianteKey = extras.variante ? `${p.id}_${extras.variante}` : p.id;

        const exist = cart.find(c => c._key === varianteKey);
        if (exist) {
            setCart(cart.map(c => c._key === varianteKey ? { ...c, cantidad: c.cantidad + 1 } : c));
        } else {
            setCart([...cart, {
                _key: varianteKey,
                productoId: p.id,
                nombre: p.nombre,
                precio: Number(p.precioVenta || 0),
                cantidad: 1,
                ...extras
            }]);
        }
    };

    const confirmSale = (checkoutData) => {
        const { metodo, clienteId, empleadoId, sucursalId, descuento, subtotal, total, mesaId } = checkoutData;

        actions.add('ventas', {
            fecha: new Date().toISOString(),
            sucursalId, empleadoId, clienteId, mesaId: mesaId || null,
            items: cart, subtotal, descuento, total, metodo
        });

        cart.forEach(c => {
            const p = productos.find(x => x.id === c.productoId);
            if (!p) return;

            // Si el item del cart apunta a una variante específica, descontamos de la variante
            if (c.varianteId && Array.isArray(p.variantes)) {
                const newVariantes = p.variantes.map(v => {
                    if (v.id !== c.varianteId) return v;
                    return { ...v, stock: Math.max(0, Number(v.stock || 0) - c.cantidad) };
                });
                // El stock base del producto = suma de variantes
                const newTotal = newVariantes.reduce((sum, v) => sum + Number(v.stock || 0), 0);
                actions.update('productos', p.id, { variantes: newVariantes, stock: newTotal });
            } else if (p.stock !== undefined) {
                // Producto sin variantes: comportamiento original
                actions.update('productos', p.id, { stock: Math.max(0, Number(p.stock || 0) - c.cantidad) });
            }
        });

        // Snapshot for ticket printing
        const sucursalObj = state.sucursales.find(s => s.id === sucursalId);
        const empleadoObj = state.empleados?.find(e => e.id === empleadoId);
        const clienteObj = state.clientes?.find(c => c.id === clienteId);
        const ventaNum = (state.ventas?.length || 0) + 1;

        setLastSale({
            business: state.business,
            sucursal: sucursalObj,
            empleado: empleadoObj,
            cliente: clienteObj,
            items: cart,
            subtotal, descuento, total,
            metodoPago: metodo,
            fecha: new Date(),
            numero: ventaNum
        });

        setCheckoutOpen(false);
        setSuccessOpen(true);
        setCart([]);
    };

    return {
        state, actions, labels, cart, setCart, productos, current,
        addToCart, checkoutOpen, setCheckoutOpen,
        successOpen, setSuccessOpen, confirmSale, lastSale
    };
}

// ═══════════════════════════════════════════════════════════════════
// 🍽️ POS RESTAURANT: tables bar on top + menu grid
// ═══════════════════════════════════════════════════════════════════
function POSRestaurant() {
    const {
        state, labels, cart, setCart, productos,
        addToCart, checkoutOpen, setCheckoutOpen,
        successOpen, setSuccessOpen, confirmSale, lastSale
    } = usePOSLogic();

    const [selectedMesaId, setSelectedMesaId] = useState(null);
    const [categoria, setCategoria] = useState('all');
    const [search, setSearch] = useState('');

    const current = state.meta.currentSucursalId || 'all';
    const mesas = filterBySucursal(state.mesas, current).slice().sort((a, b) => a.numero - b.numero);
    const selectedMesa = mesas.find(m => m.id === selectedMesaId);

    const categorias = useMemo(() => {
        const set = new Set(productos.map(p => p.categoria).filter(Boolean));
        return ['all', ...Array.from(set).sort()];
    }, [productos]);

    const filteredProductos = useMemo(() => productos.filter(p => {
        if (categoria !== 'all' && p.categoria !== categoria) return false;
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            return [p.nombre, p.codigo, p.categoria].some(v => (v || '').toLowerCase().includes(q));
        }
        return true;
    }), [productos, categoria, search]);

    if (state.sucursales.length === 0 || productos.length === 0) {
        return <POSEmpty state={state} labels={labels} />;
    }

    return (
        <div>
            <PageHeader
                icon={Utensils}
                title="Comanda rápida"
                subtitle="Elegí una mesa y cargá el pedido"
                help={SECTION_HELP.pos}
                actions={
                    <span className="text-sm text-muted">
                        {cart.length} ítems · <span className="font-semibold" style={{ color: 'var(--accent)' }}>
                            {fmtMoney(cart.reduce((s, c) => s + c.precio * c.cantidad, 0), state.business.moneda)}
                        </span>
                    </span>
                }
            />

            {/* Mesas bar */}
            {mesas.length > 0 && (
                <div className="pos-restaurant-tables">
                    <div
                        className={`pos-table-chip ${!selectedMesaId ? 'selected' : ''}`}
                        onClick={() => setSelectedMesaId(null)}
                        style={{ minWidth: 88 }}
                    >
                        <div style={{ fontSize: 18 }}>🍴</div>
                        <div style={{ fontSize: 11, marginTop: 4, fontWeight: 700 }}>Sin mesa</div>
                        <div className="pos-table-cap">Take away</div>
                    </div>
                    {mesas.map(m => (
                        <div
                            key={m.id}
                            className={`pos-table-chip ${m.estado} ${selectedMesaId === m.id ? 'selected' : ''}`}
                            onClick={() => setSelectedMesaId(m.id === selectedMesaId ? null : m.id)}
                        >
                            <div className="pos-table-num">{m.numero}</div>
                            <div className="pos-table-cap">{m.capacidad} pax</div>
                        </div>
                    ))}
                </div>
            )}

            <div className="pos-layout">
                <div className="pos-products">
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input className="pos-search-input" placeholder="Buscar plato o bebida..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>

                    {categorias.length > 1 && (
                        <div className="pos-categories">
                            {categorias.map(c => (
                                <button key={c} className={`pos-category ${categoria === c ? 'active' : ''}`} onClick={() => setCategoria(c)}>
                                    {c === 'all' ? 'Todo el menú' : c}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="pos-grid">
                        {filteredProductos.map(p => {
                            const emoji = PRODUCT_EMOJI_BY_CATEGORIA[p.categoria] || '🍽️';
                            return (
                                <button key={p.id} className="pos-product" onClick={() => addToCart(p)}>
                                    <div className="pos-product-emoji">{emoji}</div>
                                    <div className="pos-product-name">{p.nombre}</div>
                                    <div className="pos-product-price">{fmtMoney(p.precioVenta, state.business.moneda)}</div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <CartSidebar
                    cart={cart}
                    setCart={setCart}
                    state={state}
                    labels={labels}
                    mesa={selectedMesa}
                    onCheckout={() => {
                        if (cart.length === 0) return alert('Agregá al menos un item');
                        setCheckoutOpen(true);
                    }}
                />
            </div>

            <CheckoutModal
                open={checkoutOpen}
                onClose={() => setCheckoutOpen(false)}
                cart={cart}
                state={state}
                onConfirm={(data) => confirmSale({ ...data, mesaId: selectedMesaId })}
                mesa={selectedMesa}
            />
            <SuccessModal open={successOpen} onClose={() => setSuccessOpen(false)} lastSale={lastSale} />
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// 🏪 POS KIOSCO: barcode scanner + search + grid
// ═══════════════════════════════════════════════════════════════════
function POSKiosco() {
    const {
        state, labels, cart, setCart, productos,
        addToCart, checkoutOpen, setCheckoutOpen,
        successOpen, setSuccessOpen, confirmSale, lastSale
    } = usePOSLogic();

    const [barcode, setBarcode] = useState('');
    const [categoria, setCategoria] = useState('all');
    const [notFound, setNotFound] = useState('');
    const barcodeRef = useRef(null);

    useEffect(() => { barcodeRef.current?.focus(); }, []);

    const categorias = useMemo(() => {
        const set = new Set(productos.map(p => p.categoria).filter(Boolean));
        return ['all', ...Array.from(set).sort()];
    }, [productos]);

    const handleBarcodeSubmit = (e) => {
        e.preventDefault();
        if (!barcode.trim()) return;
        const p = productos.find(x => x.codigo === barcode.trim());
        if (p) {
            addToCart(p);
            setBarcode('');
            setNotFound('');
        } else {
            setNotFound(`No encontré el código ${barcode}`);
            setTimeout(() => setNotFound(''), 2500);
            setBarcode('');
        }
        barcodeRef.current?.focus();
    };

    const filteredProductos = useMemo(() => productos.filter(p => {
        if (categoria !== 'all' && p.categoria !== categoria) return false;
        return true;
    }), [productos, categoria]);

    if (state.sucursales.length === 0 || productos.length === 0) {
        return <POSEmpty state={state} labels={labels} />;
    }

    return (
        <div>
            <PageHeader
                icon={Store}
                title="Caja registradora"
                subtitle="Escaneá el código de barras o tocá el producto"
                help={SECTION_HELP.pos}
                actions={
                    <span className="text-sm text-muted">
                        {cart.length} ítems · <span className="font-semibold" style={{ color: 'var(--accent)' }}>
                            {fmtMoney(cart.reduce((s, c) => s + c.precio * c.cantidad, 0), state.business.moneda)}
                        </span>
                    </span>
                }
            />

            <div className="pos-layout">
                <div className="pos-products">
                    {/* BARCODE SCAN INPUT */}
                    <form onSubmit={handleBarcodeSubmit}>
                        <div className="pos-kiosco-scan">
                            <div className="pos-kiosco-scan-icon">
                                <Barcode size={24} />
                            </div>
                            <input
                                ref={barcodeRef}
                                className="pos-search-input pos-kiosco-input"
                                placeholder="Escaneá o escribí el código de barras..."
                                value={barcode}
                                onChange={e => setBarcode(e.target.value)}
                                style={{ flex: 1, paddingLeft: 16 }}
                            />
                            <button type="submit" className="btn btn-primary" disabled={!barcode.trim()}>
                                <Plus size={16} /> Agregar
                            </button>
                        </div>
                    </form>

                    {notFound && (
                        <div style={{ padding: 12, background: 'rgba(251, 113, 133, 0.1)', border: '1px solid var(--danger)', borderRadius: 10, color: 'var(--danger)', fontSize: 13, fontWeight: 600 }}>
                            {notFound}
                        </div>
                    )}

                    {categorias.length > 1 && (
                        <div className="pos-categories">
                            {categorias.map(c => (
                                <button key={c} className={`pos-category ${categoria === c ? 'active' : ''}`} onClick={() => setCategoria(c)}>
                                    {c === 'all' ? 'Todo' : c}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="pos-grid">
                        {filteredProductos.map(p => {
                            const stock = Number(p.stock ?? 999);
                            const noStock = p.stock !== undefined && stock <= 0;
                            const lowStock = !noStock && stock > 0 && stock <= Number(p.stockMinimo || 0);
                            const emoji = PRODUCT_EMOJI_BY_CATEGORIA[p.categoria] || '📦';
                            return (
                                <button key={p.id} className="pos-product" onClick={() => addToCart(p)} disabled={noStock}>
                                    <div className="pos-product-emoji">{emoji}</div>
                                    <div className="pos-product-name">{p.nombre}</div>
                                    {p.codigo && <div className="pos-product-stock mono">{p.codigo}</div>}
                                    <div className="pos-product-price">{fmtMoney(p.precioVenta, state.business.moneda)}</div>
                                    {p.stock !== undefined && (
                                        <div className={`pos-product-stock ${noStock ? 'none' : lowStock ? 'low' : ''}`}>
                                            {noStock ? 'Sin stock' : `Stock ${stock}`}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <CartSidebar
                    cart={cart}
                    setCart={setCart}
                    state={state}
                    labels={labels}
                    onCheckout={() => {
                        if (cart.length === 0) return alert('Agregá al menos un producto');
                        setCheckoutOpen(true);
                    }}
                />
            </div>

            <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} cart={cart} state={state} onConfirm={confirmSale} />
            <SuccessModal open={successOpen} onClose={() => setSuccessOpen(false)} lastSale={lastSale} />
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// 👗 POS ACCESORIOS: variante (talle/color) selector
// ═══════════════════════════════════════════════════════════════════
function POSAccesorios() {
    const {
        state, labels, cart, setCart, productos,
        addToCart, checkoutOpen, setCheckoutOpen,
        successOpen, setSuccessOpen, confirmSale, lastSale
    } = usePOSLogic();

    const [categoria, setCategoria] = useState('all');
    const [search, setSearch] = useState('');
    const [variantProduct, setVariantProduct] = useState(null);
    const [selectedTalle, setSelectedTalle] = useState('');
    const [selectedColor, setSelectedColor] = useState('');

    const categorias = useMemo(() => {
        const set = new Set(productos.map(p => p.categoria).filter(Boolean));
        return ['all', ...Array.from(set).sort()];
    }, [productos]);

    const filteredProductos = useMemo(() => productos.filter(p => {
        if (categoria !== 'all' && p.categoria !== categoria) return false;
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            return [p.nombre, p.codigo, p.categoria].some(v => (v || '').toLowerCase().includes(q));
        }
        return true;
    }), [productos, categoria, search]);

    const handleProductClick = (p) => {
        // Usa variantes reales si están, si no las strings viejas como fallback
        const hasRealVariantes = Array.isArray(p.variantes) && p.variantes.length > 0;
        const hasStringVariantes = (p.talles || '').trim() || (p.colores || '').trim();
        if (hasRealVariantes || hasStringVariantes) {
            setVariantProduct(p);
            setSelectedTalle('');
            setSelectedColor('');
        } else {
            addToCart(p);
        }
    };

    const addWithVariant = () => {
        if (!variantProduct) return;
        const hasRealVariantes = Array.isArray(variantProduct.variantes) && variantProduct.variantes.length > 0;

        if (hasRealVariantes) {
            // Busca la variante específica
            const variante = variantProduct.variantes.find(v =>
                (v.talle || '') === selectedTalle && (v.color || '') === selectedColor
            );
            if (!variante) {
                alert('Esa combinación no existe. Elegí una disponible.');
                return;
            }
            if (Number(variante.stock || 0) <= 0) {
                alert(`Sin stock de ${[selectedTalle, selectedColor].filter(Boolean).join(' / ')}`);
                return;
            }
            const label = [selectedTalle, selectedColor].filter(Boolean).join(' / ');
            const finalPrice = Number(variantProduct.precioVenta || 0) + Number(variante.precioDelta || 0);
            // Custom add for real variants
            const varianteKey = `${variantProduct.id}_v${variante.id}`;
            const exist = cart.find(c => c._key === varianteKey);
            if (exist) {
                if (exist.cantidad + 1 > Number(variante.stock || 0)) {
                    alert(`Solo quedan ${variante.stock} de ${label}`);
                    return;
                }
                setCart(cart.map(c => c._key === varianteKey ? { ...c, cantidad: c.cantidad + 1 } : c));
            } else {
                setCart([...cart, {
                    _key: varianteKey,
                    productoId: variantProduct.id,
                    varianteId: variante.id,
                    nombre: variantProduct.nombre,
                    variantLabel: label,
                    precio: finalPrice,
                    cantidad: 1
                }]);
            }
        } else {
            // Fallback al sistema viejo
            const variante = [selectedTalle, selectedColor].filter(Boolean).join(' / ');
            addToCart(variantProduct, { variante: variante || null, variantLabel: variante || null });
        }
        setVariantProduct(null);
    };

    if (state.sucursales.length === 0 || productos.length === 0) {
        return <POSEmpty state={state} labels={labels} />;
    }

    return (
        <div>
            <PageHeader
                icon={Shirt}
                title="POS Accesorios"
                subtitle="Tocá un producto para elegir talle y color"
                help={SECTION_HELP.pos}
                actions={
                    <span className="text-sm text-muted">
                        {cart.length} ítems · <span className="font-semibold" style={{ color: 'var(--accent)' }}>
                            {fmtMoney(cart.reduce((s, c) => s + c.precio * c.cantidad, 0), state.business.moneda)}
                        </span>
                    </span>
                }
            />

            <div className="pos-layout">
                <div className="pos-products">
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input className="pos-search-input" placeholder="Buscar accesorio..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>

                    {categorias.length > 1 && (
                        <div className="pos-categories">
                            {categorias.map(c => (
                                <button key={c} className={`pos-category ${categoria === c ? 'active' : ''}`} onClick={() => setCategoria(c)}>
                                    {c === 'all' ? 'Todos' : c}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="pos-grid">
                        {filteredProductos.map(p => {
                            const emoji = PRODUCT_EMOJI_BY_CATEGORIA[p.categoria] || '✨';
                            const hasVariants = (p.talles || '').trim() || (p.colores || '').trim();
                            return (
                                <button key={p.id} className="pos-product" onClick={() => handleProductClick(p)}>
                                    <div className="pos-product-emoji">{emoji}</div>
                                    <div className="pos-product-name">{p.nombre}</div>
                                    {hasVariants && <div className="pos-product-stock" style={{ color: 'var(--accent)' }}>📏 Elegir talle/color</div>}
                                    <div className="pos-product-price">{fmtMoney(p.precioVenta, state.business.moneda)}</div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <CartSidebar
                    cart={cart}
                    setCart={setCart}
                    state={state}
                    labels={labels}
                    onCheckout={() => {
                        if (cart.length === 0) return alert('Agregá al menos un ítem');
                        setCheckoutOpen(true);
                    }}
                />
            </div>

            {/* Variant picker modal */}
            <Modal open={!!variantProduct} onClose={() => setVariantProduct(null)} title={variantProduct?.nombre || ''} size="sm">
                {variantProduct && (() => {
                    const hasRealVariantes = Array.isArray(variantProduct.variantes) && variantProduct.variantes.length > 0;

                    // Real variants: extract unique talles + colores from the list
                    const talles = hasRealVariantes
                        ? [...new Set(variantProduct.variantes.map(v => v.talle).filter(Boolean))]
                        : (variantProduct.talles || '').split(',').map(s => s.trim()).filter(Boolean);
                    const colores = hasRealVariantes
                        ? [...new Set(variantProduct.variantes.map(v => v.color).filter(Boolean))]
                        : (variantProduct.colores || '').split(',').map(s => s.trim()).filter(Boolean);

                    // Helper: how much stock for current combo (real variants only)
                    const stockFor = (talle, color) => {
                        if (!hasRealVariantes) return null;
                        const v = variantProduct.variantes.find(x =>
                            (x.talle || '') === talle && (x.color || '') === color
                        );
                        return v ? Number(v.stock || 0) : 0;
                    };

                    // Check if a specific talle/color has any stock
                    const talleHasStock = (t) => {
                        if (!hasRealVariantes) return true;
                        return variantProduct.variantes.some(v => v.talle === t && Number(v.stock || 0) > 0);
                    };
                    const colorHasStock = (c) => {
                        if (!hasRealVariantes) return true;
                        return variantProduct.variantes.some(v => v.color === c && Number(v.stock || 0) > 0 &&
                            (!selectedTalle || v.talle === selectedTalle));
                    };

                    const currentStock = hasRealVariantes && selectedTalle !== null && selectedColor !== null
                        ? stockFor(selectedTalle, selectedColor)
                        : null;

                    const canAdd = hasRealVariantes
                        ? (currentStock !== null && currentStock > 0)
                        : (talles.length === 0 || selectedTalle) && (colores.length === 0 || selectedColor);

                    return (
                        <div>
                            <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 4 }}>
                                {PRODUCT_EMOJI_BY_CATEGORIA[variantProduct.categoria] || '✨'}
                            </div>
                            <div style={{ textAlign: 'center', marginBottom: 16, fontSize: 14, color: 'var(--text-muted)' }}>
                                Base: {fmtMoney(Number(variantProduct.precioVenta || 0), state.business.moneda)}
                            </div>

                            {talles.length > 0 && (
                                <div className="mb-4">
                                    <div className="field-label mb-2">Talle</div>
                                    <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                                        {talles.map(t => {
                                            const hasStock = talleHasStock(t);
                                            return (
                                                <button
                                                    key={t}
                                                    className={`pos-category ${selectedTalle === t ? 'active' : ''}`}
                                                    onClick={() => setSelectedTalle(t)}
                                                    disabled={!hasStock}
                                                    style={!hasStock ? { opacity: 0.4, textDecoration: 'line-through' } : {}}
                                                    title={!hasStock ? 'Sin stock' : ''}
                                                >
                                                    {t}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {colores.length > 0 && (
                                <div className="mb-4">
                                    <div className="field-label mb-2">Color</div>
                                    <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                                        {colores.map(c => {
                                            const hasStock = colorHasStock(c);
                                            return (
                                                <button
                                                    key={c}
                                                    className={`pos-category ${selectedColor === c ? 'active' : ''}`}
                                                    onClick={() => setSelectedColor(c)}
                                                    disabled={!hasStock}
                                                    style={!hasStock ? { opacity: 0.4, textDecoration: 'line-through' } : {}}
                                                    title={!hasStock ? 'Sin stock para ese talle' : ''}
                                                >
                                                    {c}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {hasRealVariantes && currentStock !== null && selectedTalle !== '' && selectedColor !== '' && (
                                <div style={{
                                    padding: 10,
                                    background: currentStock > 0 ? 'var(--accent-soft)' : 'rgba(251, 113, 133, 0.1)',
                                    border: `1px solid ${currentStock > 0 ? 'var(--border-accent)' : 'rgba(251, 113, 133, 0.3)'}`,
                                    borderRadius: 8,
                                    fontSize: 13,
                                    marginBottom: 12
                                }}>
                                    {currentStock > 0
                                        ? `✓ Stock disponible: ${currentStock}`
                                        : '✗ Sin stock de esta combinación'}
                                </div>
                            )}

                            <div className="flex gap-2 mt-4 justify-end">
                                <button className="btn btn-ghost" onClick={() => setVariantProduct(null)}>Cancelar</button>
                                <button className="btn btn-primary btn-lg" onClick={addWithVariant} disabled={!canAdd}>
                                    <Plus size={16} /> Agregar al ticket
                                </button>
                            </div>
                        </div>
                    );
                })()}
            </Modal>

            <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} cart={cart} state={state} onConfirm={confirmSale} />
            <SuccessModal open={successOpen} onClose={() => setSuccessOpen(false)} lastSale={lastSale} />
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// 💼 POS SERVICIOS: cliente-first + service list
// ═══════════════════════════════════════════════════════════════════
function POSServicios() {
    const {
        state, labels, cart, setCart, productos,
        addToCart, checkoutOpen, setCheckoutOpen,
        successOpen, setSuccessOpen, confirmSale, lastSale
    } = usePOSLogic();

    const [clienteId, setClienteId] = useState('');
    const [search, setSearch] = useState('');

    const filteredProductos = useMemo(() => productos.filter(p => {
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            return [p.nombre, p.categoria].some(v => (v || '').toLowerCase().includes(q));
        }
        return true;
    }), [productos, search]);

    const clienteObj = state.clientes.find(c => c.id === clienteId);

    if (state.sucursales.length === 0 || productos.length === 0) {
        return <POSEmpty state={state} labels={labels} />;
    }

    return (
        <div>
            <PageHeader
                icon={Briefcase}
                title="Cobro de servicios"
                subtitle="Elegí cliente y servicios prestados"
                help={SECTION_HELP.pos}
                actions={
                    <span className="text-sm text-muted">
                        {cart.length} ítems · <span className="font-semibold" style={{ color: 'var(--accent)' }}>
                            {fmtMoney(cart.reduce((s, c) => s + c.precio * c.cantidad, 0), state.business.moneda)}
                        </span>
                    </span>
                }
            />

            <div className="pos-layout">
                <div className="pos-products">
                    <div className="flex gap-2 items-center" style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 10, marginBottom: 12 }}>
                        <div className="field-label">Cliente:</div>
                        <select className="select" style={{ flex: 1 }} value={clienteId} onChange={e => setClienteId(e.target.value)}>
                            <option value="">Consumidor final</option>
                            {state.clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input className="pos-search-input" placeholder="Buscar servicio..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>

                    <div className="pos-grid">
                        {filteredProductos.map(p => {
                            const emoji = PRODUCT_EMOJI_BY_CATEGORIA[p.categoria] || '💼';
                            return (
                                <button key={p.id} className="pos-product" onClick={() => addToCart(p)}>
                                    <div className="pos-product-emoji">{emoji}</div>
                                    <div className="pos-product-name">{p.nombre}</div>
                                    {p.categoria && <div className="pos-product-stock">{p.categoria}</div>}
                                    <div className="pos-product-price">{fmtMoney(p.precioVenta, state.business.moneda)}</div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <CartSidebar
                    cart={cart}
                    setCart={setCart}
                    state={state}
                    labels={labels}
                    empleado={clienteObj?.nombre}
                    onCheckout={() => {
                        if (cart.length === 0) return alert('Agregá al menos un servicio');
                        setCheckoutOpen(true);
                    }}
                />
            </div>

            <CheckoutModal
                open={checkoutOpen}
                onClose={() => setCheckoutOpen(false)}
                cart={cart}
                state={state}
                onConfirm={(data) => confirmSale({ ...data, clienteId: data.clienteId || clienteId })}
            />
            <SuccessModal open={successOpen} onClose={() => setSuccessOpen(false)} lastSale={lastSale} />
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// 🛍️ POS GENERAL: fallback grid
// ═══════════════════════════════════════════════════════════════════
function POSGeneral() {
    const {
        state, labels, cart, setCart, productos,
        addToCart, checkoutOpen, setCheckoutOpen,
        successOpen, setSuccessOpen, confirmSale, lastSale
    } = usePOSLogic();

    const [search, setSearch] = useState('');
    const [categoria, setCategoria] = useState('all');

    const categorias = useMemo(() => {
        const set = new Set(productos.map(p => p.categoria).filter(Boolean));
        return ['all', ...Array.from(set).sort()];
    }, [productos]);

    const filteredProductos = useMemo(() => productos.filter(p => {
        if (categoria !== 'all' && p.categoria !== categoria) return false;
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            return [p.nombre, p.codigo, p.categoria].some(v => (v || '').toLowerCase().includes(q));
        }
        return true;
    }), [productos, categoria, search]);

    if (state.sucursales.length === 0 || productos.length === 0) {
        return <POSEmpty state={state} labels={labels} />;
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
                        {cart.length} ítems · <span className="font-semibold" style={{ color: 'var(--accent)' }}>
                            {fmtMoney(cart.reduce((s, c) => s + c.precio * c.cantidad, 0), state.business.moneda)}
                        </span>
                    </span>
                }
            />

            <div className="pos-layout">
                <div className="pos-products">
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input className="pos-search-input" placeholder={`Buscar ${labels.item.toLowerCase()}...`} value={search} onChange={e => setSearch(e.target.value)} autoFocus />
                    </div>

                    {categorias.length > 1 && (
                        <div className="pos-categories">
                            {categorias.map(c => (
                                <button key={c} className={`pos-category ${categoria === c ? 'active' : ''}`} onClick={() => setCategoria(c)}>
                                    {c === 'all' ? 'Todos' : c}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="pos-grid">
                        {filteredProductos.map(p => {
                            const stock = Number(p.stock ?? 999);
                            const noStock = p.stock !== undefined && stock <= 0;
                            const emoji = PRODUCT_EMOJI_BY_CATEGORIA[p.categoria] || '📦';
                            return (
                                <button key={p.id} className="pos-product" onClick={() => addToCart(p)} disabled={noStock}>
                                    <div className="pos-product-emoji">{emoji}</div>
                                    <div className="pos-product-name">{p.nombre}</div>
                                    <div className="pos-product-price">{fmtMoney(p.precioVenta, state.business.moneda)}</div>
                                    {p.stock !== undefined && <div className={`pos-product-stock ${noStock ? 'none' : ''}`}>{noStock ? 'Sin stock' : `Stock ${stock}`}</div>}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <CartSidebar
                    cart={cart}
                    setCart={setCart}
                    state={state}
                    labels={labels}
                    onCheckout={() => {
                        if (cart.length === 0) return alert('Agregá al menos un producto');
                        setCheckoutOpen(true);
                    }}
                />
            </div>

            <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} cart={cart} state={state} onConfirm={confirmSale} />
            <SuccessModal open={successOpen} onClose={() => setSuccessOpen(false)} lastSale={lastSale} />
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// Empty state
// ═══════════════════════════════════════════════════════════════════
function POSEmpty({ state, labels }) {
    if (state.sucursales.length === 0) {
        return (
            <div>
                <PageHeader icon={ShoppingCart} title={labels.pos} subtitle={labels.posDesc} help={SECTION_HELP.pos} />
                <Card>
                    <EmptyState
                        icon={Store}
                        title="Primero creá una sucursal"
                        description="Antes de vender necesitás al menos una sucursal configurada."
                    />
                </Card>
            </div>
        );
    }
    return (
        <div>
            <PageHeader icon={ShoppingCart} title={labels.pos} subtitle={labels.posDesc} help={SECTION_HELP.pos} />
            <Card>
                <EmptyState
                    icon={Package}
                    title={`Primero cargá tus ${labels.items.toLowerCase()}`}
                    description={`Necesitás tener ${labels.itemPlural} en el catálogo para poder vender.`}
                />
            </Card>
        </div>
    );
}
