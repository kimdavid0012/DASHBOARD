import React, { useMemo, useState } from 'react';
import { Package, Plus, Pencil, Trash2, AlertTriangle, TrendingUp, Archive } from 'lucide-react';
import { useData, getRubroLabels } from '../store/DataContext';
import { Card, Modal, Field, EmptyState, Badge, KpiCard, fmtMoney } from '../components/UI';

const EMPTY = {
    nombre: '', codigo: '', categoria: '', precioVenta: '', precioCosto: '',
    stock: 0, stockMinimo: 5, unidad: 'unidad',
    descripcion: '', proveedorId: '', activo: true
};

export default function ProductosPage() {
    const { state, actions } = useData();
    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [search, setSearch] = useState('');
    const labels = getRubroLabels(state.business.rubro);

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
        const patch = {
            ...form,
            precioVenta: Number(form.precioVenta || 0),
            precioCosto: Number(form.precioCosto || 0),
            stock: Number(form.stock || 0),
            stockMinimo: Number(form.stockMinimo || 0)
        };
        if (editId) actions.update('productos', editId, patch);
        else actions.add('productos', patch);
        setOpen(false);
    };

    return (
        <div className="flex-col gap-4">
            <div className="kpi-grid">
                <KpiCard icon={<Package size={20} />} label={`Total ${labels.items}`} value={stats.total} color="#14b8a6" />
                <KpiCard icon={<TrendingUp size={20} />} label="Activos" value={stats.activos} color="#22c55e" />
                <KpiCard icon={<AlertTriangle size={20} />} label="Stock bajo" value={stats.stockBajo} color="#f59e0b" />
                <KpiCard icon={<Archive size={20} />} label="Sin stock" value={stats.sinStock} color="#ef4444" />
                <KpiCard icon={<Package size={20} />} label="Valor inventario (costo)" value={fmtMoney(stats.valorInventario, state.business.moneda)} color="#a855f7" />
            </div>

            <Card
                title={labels.items}
                subtitle="Catálogo central — disponible en todas las sucursales"
                actions={<button className="btn btn-primary" onClick={() => { setForm(EMPTY); setEditId(null); setOpen(true); }}><Plus size={14} /> Nuevo {labels.item.toLowerCase()}</button>}
            >
                <div className="mb-3">
                    <input className="input" style={{ maxWidth: 300 }} placeholder="Buscar por nombre o código..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                {productos.length === 0 ? (
                    <EmptyState
                        icon={Package}
                        title={`Todavía no tenés ${labels.items.toLowerCase()}`}
                        description={`Cargá tu catálogo de ${labels.items.toLowerCase()} para que aparezcan en ventas, pedidos e informes.`}
                        action={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={14} /> Agregar primero</button>}
                        tips={[
                            'Código, nombre, categoría, precio de costo y venta',
                            'Stock actual y stock mínimo con alertas',
                            'Asociación a proveedor para ver quién provee qué',
                            'Valor total del inventario en la parte superior'
                        ]}
                    />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr><th>Código</th><th>{labels.item}</th><th>Categoría</th><th style={{ textAlign: 'right' }}>P. Costo</th><th style={{ textAlign: 'right' }}>P. Venta</th><th style={{ textAlign: 'right' }}>Stock</th><th>Proveedor</th><th style={{ textAlign: 'right' }}></th></tr>
                            </thead>
                            <tbody>
                                {filtered.map(p => {
                                    const lowStock = Number(p.stock || 0) > 0 && Number(p.stock || 0) <= Number(p.stockMinimo || 0);
                                    const outOfStock = Number(p.stock || 0) <= 0;
                                    return (
                                        <tr key={p.id}>
                                            <td><span style={{ fontFamily: 'monospace' }}>{p.codigo || '—'}</span></td>
                                            <td><div className="font-semibold">{p.nombre}</div>{p.descripcion && <div className="text-xs text-muted">{p.descripcion}</div>}</td>
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

            <Modal open={open} onClose={() => setOpen(false)} title={editId ? `Editar ${labels.item.toLowerCase()}` : `Nuevo ${labels.item.toLowerCase()}`}>
                <div className="form-grid">
                    <Field label="Nombre" required><input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></Field>
                    <Field label="Código / SKU"><input className="input" value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} /></Field>
                    <Field label="Categoría"><input className="input" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} /></Field>
                    <Field label="Unidad"><input className="input" placeholder="unidad, kg, litro..." value={form.unidad} onChange={e => setForm({ ...form, unidad: e.target.value })} /></Field>
                    <Field label="Precio de costo"><input className="input" type="number" value={form.precioCosto} onChange={e => setForm({ ...form, precioCosto: e.target.value })} /></Field>
                    <Field label="Precio de venta"><input className="input" type="number" value={form.precioVenta} onChange={e => setForm({ ...form, precioVenta: e.target.value })} /></Field>
                    <Field label="Stock actual"><input className="input" type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} /></Field>
                    <Field label="Stock mínimo"><input className="input" type="number" value={form.stockMinimo} onChange={e => setForm({ ...form, stockMinimo: e.target.value })} /></Field>
                    <Field label="Proveedor">
                        <select className="select" value={form.proveedorId} onChange={e => setForm({ ...form, proveedorId: e.target.value })}>
                            <option value="">Sin especificar</option>
                            {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                    </Field>
                </div>
                <div className="mt-3"><Field label="Descripción"><textarea className="textarea" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} /></Field></div>
                <div className="flex gap-2 mt-4" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
                    <button className="btn btn-primary" onClick={save}>{editId ? 'Guardar' : 'Crear'}</button>
                </div>
            </Modal>
        </div>
    );
}
