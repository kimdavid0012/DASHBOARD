import React, { useMemo, useState } from 'react';
import { Package, Plus, Pencil, Trash2, AlertTriangle, TrendingUp, Archive, Barcode } from 'lucide-react';
import { useData, getRubroLabels, getRubroConfig, SECTION_HELP } from '../store/DataContext';
import { PageHeader, Card, Modal, Field, EmptyState, Badge, KpiCard, fmtMoney, InfoBox } from '../components/UI';
import { useT } from '../i18n';

export default function ProductosPage() {
    const t = useT();
    const { state, actions } = useData();
    const labels = getRubroLabels(state.business.rubro);
    const rubroConfig = getRubroConfig(state.business.rubro);

    const EMPTY = {
        nombre: '', codigo: '', categoria: rubroConfig.defaultCategorias[0] || 'General',
        precioVenta: '', precioCosto: '',
        stock: 0, stockMinimo: 5, unidad: state.business.rubro === 'restaurante' ? 'porción' : 'unidad',
        descripcion: '', proveedorId: '', activo: true,
        // Rubro specific
        talles: '', colores: '', // accesorios
        esCombo: false // kiosco/restaurante
    };

    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [search, setSearch] = useState('');

    const productos = state.productos || [];
    const proveedores = state.proveedores || [];

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return productos;
        return productos.filter(p => [p.nombre, p.codigo, p.categoria].some(v => (v || '').toLowerCase().includes(q)));
    }, [productos, search]);

    const stats = useMemo(() => ({
        total: productos.length,
        activos: productos.filter(p => p.activo !== false).length,
        stockBajo: productos.filter(p => Number(p.stock || 0) > 0 && Number(p.stock || 0) <= Number(p.stockMinimo || 0)).length,
        sinStock: productos.filter(p => Number(p.stock || 0) <= 0).length,
        valorInventario: productos.reduce((s, p) => s + (Number(p.stock || 0) * Number(p.precioCosto || 0)), 0)
    }), [productos]);

    const save = () => {
        if (!form.nombre.trim()) return alert('Nombre es obligatorio');

        // Normalize variants and compute total stock
        const variantes = (form.variantes || []).map(v => ({
            ...v,
            stock: Number(v.stock || 0),
            precioDelta: Number(v.precioDelta || 0),
            talle: (v.talle || '').trim(),
            color: (v.color || '').trim(),
            sku: (v.sku || '').trim()
        })).filter(v => v.talle || v.color || v.sku);

        const stockFromVariantes = variantes.reduce((sum, v) => sum + v.stock, 0);
        const finalStock = variantes.length > 0 ? stockFromVariantes : Number(form.stock || 0);

        const patch = {
            ...form,
            precioVenta: Number(form.precioVenta || 0),
            precioCosto: Number(form.precioCosto || 0),
            stock: finalStock,
            stockMinimo: Number(form.stockMinimo || 0),
            variantes: variantes.length > 0 ? variantes : null,
            _showVariantes: undefined // no persistir flag de UI
        };
        if (editId) actions.update('productos', editId, patch);
        else actions.add('productos', patch);
        setOpen(false);
    };

    const showTalles = state.business.rubro === 'accesorios';
    const showBarcode = state.business.rubro === 'kiosco';

    return (
        <div>
            <PageHeader
                icon={Package}
                title={labels.items}
                subtitle={`Catálogo central de ${labels.itemPlural}`}
                help={SECTION_HELP.productos}
                actions={<button className="btn btn-primary" onClick={() => { setForm(EMPTY); setEditId(null); setOpen(true); }}><Plus size={14} /> Nuevo {labels.item.toLowerCase()}</button>}
            />

            <div className="kpi-grid mb-4">
                <KpiCard icon={<Package size={20} />} label={`Total ${labels.items}`} value={stats.total} color="#63f1cb" />
                <KpiCard icon={<TrendingUp size={20} />} label="Activos" value={stats.activos} color="#22c55e" />
                <KpiCard icon={<AlertTriangle size={20} />} label="Stock bajo" value={stats.stockBajo} color="#f59e0b" hint="Productos con stock debajo del mínimo" />
                <KpiCard icon={<Archive size={20} />} label="Sin stock" value={stats.sinStock} color="#ef4444" />
                <KpiCard icon={<Package size={20} />} label="Valor inventario" value={fmtMoney(stats.valorInventario, state.business.moneda)} color="#a855f7" hint="Calculado a precio de costo" />
            </div>

            <Card>
                <div className="mb-3">
                    <input className="input" style={{ maxWidth: 320 }} placeholder={`Buscar ${labels.item.toLowerCase()} por nombre o código...`} value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                {productos.length === 0 ? (
                    <EmptyState
                        icon={Package}
                        title={`Todavía no tenés ${labels.items.toLowerCase()}`}
                        description={`Cargá tu catálogo de ${labels.itemPlural} para que aparezcan en POS, ventas y reportes.`}
                        action={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={14} /> Agregar primero</button>}
                        tips={[
                            `Nombre, código/SKU, categoría y precios`,
                            `Stock actual y stock mínimo (para alertas automáticas)`,
                            `Asociación a proveedor`,
                            showTalles ? 'Talles y colores (opcional)' : 'Unidad de medida (unidad, kg, litro...)',
                            'Valor total del inventario calculado automático'
                        ]}
                        example={
                            state.business.rubro === 'kiosco'
                                ? 'Ej: Coca 500ml - Cód. 7790895000010 - Categoría "Bebidas" - Costo $500 - Venta $800 - Stock 48'
                                : state.business.rubro === 'restaurante'
                                    ? 'Ej: Milanesa Napolitana con papas - Categoría "Principales" - Costo ingredientes $3.500 - Venta $8.500 - 1 porción'
                                    : state.business.rubro === 'accesorios'
                                        ? 'Ej: Collar plata 925 - Cód. COL001 - Categoría "Collares" - Costo $8.000 - Venta $18.000 - Stock 12'
                                        : 'Ej: Producto A - Código SKU-001 - Precio de costo $100 - Precio de venta $250 - Stock 50'
                        }
                    />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Código</th><th>{labels.item}</th><th>{labels.category}</th>
                                    <th style={{ textAlign: 'right' }}>P. Costo</th>
                                    <th style={{ textAlign: 'right' }}>P. Venta</th>
                                    <th style={{ textAlign: 'right' }}>Stock</th>
                                    <th>Proveedor</th>
                                    <th style={{ textAlign: 'right' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(p => {
                                    const lowStock = Number(p.stock || 0) > 0 && Number(p.stock || 0) <= Number(p.stockMinimo || 0);
                                    const outOfStock = Number(p.stock || 0) <= 0;
                                    return (
                                        <tr key={p.id}>
                                            <td><span style={{ fontFamily: 'monospace' }}>{p.codigo || '—'}</span></td>
                                            <td>
                                                <div className="font-semibold">{p.nombre}</div>
                                                {p.descripcion && <div className="text-xs text-muted">{p.descripcion}</div>}
                                            </td>
                                            <td>{p.categoria && <Badge>{p.categoria}</Badge>}</td>
                                            <td style={{ textAlign: 'right' }}>{fmtMoney(p.precioCosto, state.business.moneda)}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtMoney(p.precioVenta, state.business.moneda)}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                {outOfStock ? <Badge variant="danger">Sin stock</Badge> :
                                                    lowStock ? <Badge variant="warning">{p.stock}</Badge> :
                                                        <span>{p.stock} {p.unidad}</span>}
                                            </td>
                                            <td className="text-sm">{proveedores.find(x => x.id === p.proveedorId)?.nombre || '—'}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setForm({ ...EMPTY, ...p }); setEditId(p.id); setOpen(true); }}><Pencil size={13} /></button>
                                                <button className="btn btn-danger btn-sm btn-icon" onClick={() => { if (confirm('¿Eliminar?')) actions.remove('productos', p.id); }}><Trash2 size={13} /></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal open={open} onClose={() => setOpen(false)} title={editId ? `Editar ${labels.item.toLowerCase()}` : `Nuevo ${labels.item.toLowerCase()}`} size="lg">
                <div className="form-grid">
                    <Field label="Nombre" required><input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} autoFocus /></Field>
                    <Field label={showBarcode ? 'Código de barras' : 'Código / SKU'} hint={showBarcode ? 'EAN-13 o similar' : 'Opcional, para búsqueda rápida'}>
                        <input className="input" value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} placeholder={showBarcode ? '7790895000010' : 'SKU-001'} />
                    </Field>
                    <Field label={labels.category}>
                        <select className="select" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                            {rubroConfig.defaultCategorias.map(c => <option key={c}>{c}</option>)}
                            <option value="__other__">+ Otra categoría</option>
                        </select>
                    </Field>
                    {form.categoria === '__other__' && (
                        <Field label="Nueva categoría"><input className="input" placeholder="Escribí la nueva categoría" value={form._nuevaCat || ''} onChange={e => setForm({ ...form, _nuevaCat: e.target.value, categoria: e.target.value || '__other__' })} /></Field>
                    )}
                    <Field label="Unidad"><input className="input" placeholder={state.business.rubro === 'restaurante' ? 'porción, plato, vaso' : 'unidad, kg, litro'} value={form.unidad} onChange={e => setForm({ ...form, unidad: e.target.value })} /></Field>
                    <Field label="Precio de costo" hint="Lo que a vos te sale">
                        <input className="input" type="number" value={form.precioCosto} onChange={e => setForm({ ...form, precioCosto: e.target.value })} />
                    </Field>
                    <Field label="Precio de venta" hint="Lo que le cobrás al cliente" required>
                        <input className="input" type="number" value={form.precioVenta} onChange={e => setForm({ ...form, precioVenta: e.target.value })} />
                    </Field>
                    <Field label={labels.stock + ' actual'}><input className="input" type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} /></Field>
                    <Field label="Stock mínimo" hint="Te avisamos cuando bajes de este número"><input className="input" type="number" value={form.stockMinimo} onChange={e => setForm({ ...form, stockMinimo: e.target.value })} /></Field>
                    <Field label="Proveedor">
                        <select className="select" value={form.proveedorId} onChange={e => setForm({ ...form, proveedorId: e.target.value })}>
                            <option value="">Sin especificar</option>
                            {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                    </Field>
                    {showTalles && (
                        <>
                            <Field label="Talles disponibles" hint="Separar con coma: S,M,L,XL"><input className="input" value={form.talles} onChange={e => setForm({ ...form, talles: e.target.value })} /></Field>
                            <Field label="Colores disponibles" hint="Separar con coma: Negro,Blanco,Rojo"><input className="input" value={form.colores} onChange={e => setForm({ ...form, colores: e.target.value })} /></Field>
                        </>
                    )}
                </div>
                <div className="mt-3"><Field label="Descripción"><textarea className="textarea" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} /></Field></div>

                {/* ═══ VARIANTES REALES (stock separado por talle/color) ═══ */}
                <VariantesEditor form={form} setForm={setForm} labels={labels} />

                {form.precioCosto && form.precioVenta && (
                    <InfoBox variant="success">
                        <strong>Margen:</strong> {(((Number(form.precioVenta) - Number(form.precioCosto)) / Number(form.precioCosto)) * 100).toFixed(0)}% · <strong>Ganancia por unidad:</strong> {fmtMoney(Number(form.precioVenta) - Number(form.precioCosto), state.business.moneda)}
                    </InfoBox>
                )}
                <div className="flex gap-2 mt-4 justify-end">
                    <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
                    <button className="btn btn-primary" onClick={save}>{editId ? 'Guardar' : 'Crear'}</button>
                </div>
            </Modal>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// VARIANTES EDITOR - stock separado por talle/color/SKU real
// ═══════════════════════════════════════════════════════════════════
function VariantesEditor({ form, setForm, labels }) {
    const variantes = form.variantes || [];

    const addVariante = () => {
        const newVar = {
            id: crypto.randomUUID ? crypto.randomUUID() : `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            talle: '',
            color: '',
            sku: '',
            stock: 0,
            precioDelta: 0
        };
        setForm({ ...form, variantes: [...variantes, newVar] });
    };

    const updateVariante = (id, patch) => {
        setForm({
            ...form,
            variantes: variantes.map(v => v.id === id ? { ...v, ...patch } : v)
        });
    };

    const removeVariante = (id) => {
        setForm({
            ...form,
            variantes: variantes.filter(v => v.id !== id)
        });
    };

    // Auto-generate variantes from talles × colores strings
    const generateFromStrings = () => {
        const talles = (form.talles || '').split(',').map(s => s.trim()).filter(Boolean);
        const colores = (form.colores || '').split(',').map(s => s.trim()).filter(Boolean);
        if (talles.length === 0 && colores.length === 0) return;

        const combos = [];
        if (talles.length && colores.length) {
            for (const t of talles) for (const c of colores) combos.push({ talle: t, color: c });
        } else if (talles.length) {
            for (const t of talles) combos.push({ talle: t, color: '' });
        } else {
            for (const c of colores) combos.push({ talle: '', color: c });
        }

        const existing = new Set(variantes.map(v => `${v.talle}|${v.color}`));
        const newOnes = combos
            .filter(c => !existing.has(`${c.talle}|${c.color}`))
            .map(c => ({
                id: crypto.randomUUID ? crypto.randomUUID() : `v_${Date.now()}_${Math.random()}`,
                talle: c.talle,
                color: c.color,
                sku: '',
                stock: 0,
                precioDelta: 0
            }));

        if (newOnes.length === 0) {
            alert(`Todas las combinaciones ya existen (${combos.length} combinaciones, ${existing.size} ya cargadas).`);
            return;
        }
        setForm({ ...form, variantes: [...variantes, ...newOnes] });
    };

    const totalStock = variantes.reduce((sum, v) => sum + Number(v.stock || 0), 0);

    if (!form._showVariantes && variantes.length === 0) {
        return (
            <div style={{
                marginTop: 16,
                padding: 12,
                border: '1px dashed var(--border-color)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                justifyContent: 'space-between'
            }}>
                <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>🎨 Variantes (talles / colores / SKUs)</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        Activá si este producto tiene stock distinto por talle o color.
                    </div>
                </div>
                <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setForm({ ...form, _showVariantes: true })}
                >
                    + Agregar variantes
                </button>
            </div>
        );
    }

    return (
        <div style={{
            marginTop: 16,
            padding: 14,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-accent)',
            borderRadius: 12
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                        🎨 Variantes ({variantes.length})
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Stock total: <strong>{totalStock}</strong> · Al vender se descuenta de la variante elegida
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(form.talles || form.colores) && (
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={generateFromStrings}
                            title="Generar todas las combinaciones de talles × colores"
                        >
                            ⚡ Generar combinaciones
                        </button>
                    )}
                    <button type="button" className="btn btn-ghost btn-sm" onClick={addVariante}>
                        + Agregar
                    </button>
                </div>
            </div>

            {variantes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, fontSize: 13, color: 'var(--text-muted)' }}>
                    Sin variantes. Agregá una o usá "⚡ Generar combinaciones" si cargaste talles/colores arriba.
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: 11 }}>
                                <th style={{ padding: '6px 4px' }}>Talle</th>
                                <th style={{ padding: '6px 4px' }}>Color</th>
                                <th style={{ padding: '6px 4px' }}>SKU</th>
                                <th style={{ padding: '6px 4px', width: 80 }}>Stock</th>
                                <th style={{ padding: '6px 4px', width: 90 }}>± Precio</th>
                                <th style={{ width: 40 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {variantes.map(v => (
                                <tr key={v.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '4px' }}>
                                        <input className="input" style={{ padding: 6, fontSize: 13 }} value={v.talle} onChange={e => updateVariante(v.id, { talle: e.target.value })} placeholder="S, M, 38..." />
                                    </td>
                                    <td style={{ padding: '4px' }}>
                                        <input className="input" style={{ padding: 6, fontSize: 13 }} value={v.color} onChange={e => updateVariante(v.id, { color: e.target.value })} placeholder="Negro, Rojo..." />
                                    </td>
                                    <td style={{ padding: '4px' }}>
                                        <input className="input" style={{ padding: 6, fontSize: 13 }} value={v.sku} onChange={e => updateVariante(v.id, { sku: e.target.value })} placeholder="auto" />
                                    </td>
                                    <td style={{ padding: '4px' }}>
                                        <input className="input" type="number" min="0" style={{ padding: 6, fontSize: 13 }} value={v.stock} onChange={e => updateVariante(v.id, { stock: e.target.value })} />
                                    </td>
                                    <td style={{ padding: '4px' }}>
                                        <input className="input" type="number" style={{ padding: 6, fontSize: 13 }} value={v.precioDelta || 0} onChange={e => updateVariante(v.id, { precioDelta: e.target.value })} title="Suma o resta del precio base de esta variante" placeholder="0" />
                                    </td>
                                    <td style={{ padding: '4px' }}>
                                        <button type="button" onClick={() => removeVariante(v.id)} className="btn btn-ghost btn-icon btn-sm" title="Eliminar variante">
                                            <Trash2 size={13} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.5 }}>
                <strong>💡 Tip:</strong> Si llenás "Talles" y "Colores" arriba y tocás "⚡ Generar combinaciones", creamos automáticamente todas las variantes vacías para que solo cargues el stock de cada una. El campo "± Precio" permite ajustar el precio por variante (ej: talle XXL +500).
            </div>
        </div>
    );
}
