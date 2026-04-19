import React, { useMemo, useState } from 'react';
import { Truck, Plus, Pencil, Trash2, Phone, MapPin, DollarSign, Users, AlertCircle, TrendingUp } from 'lucide-react';
import { useData } from '../store/DataContext';
import { Card, Modal, Field, EmptyState, Badge, KpiCard, PieChart, BarChart, fmtMoney, CHART_COLORS } from '../components/UI';

const CATEGORIAS = ['General', 'Insumos', 'Mercadería', 'Servicios', 'Logística', 'Tecnología', 'Alimentos', 'Oficina', 'Mantenimiento', 'Marketing', 'Otro'];
const PROVINCIAS = ['Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero', 'Tierra del Fuego', 'Tucumán'];

const EMPTY = {
    nombre: '', razonSocial: '', telefono: '', email: '',
    provincia: 'Buenos Aires', domicilio: '', dniCuit: '',
    categoria: 'General', deuda: '', condicionPago: '',
    activo: true, notas: ''
};

export default function ProveedoresPage() {
    const { state, actions } = useData();
    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [search, setSearch] = useState('');
    const [filtroProv, setFiltroProv] = useState('');

    const proveedores = state.proveedores || [];

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return proveedores.filter(p => {
            if (filtroProv && p.provincia !== filtroProv) return false;
            if (!q) return true;
            return [p.nombre, p.razonSocial, p.dniCuit, p.telefono, p.email].some(v => (v || '').toLowerCase().includes(q));
        });
    }, [proveedores, search, filtroProv]);

    const stats = useMemo(() => {
        const total = proveedores.length;
        const conDeuda = proveedores.filter(p => Number(p.deuda || 0) > 0).length;
        const deudaTotal = proveedores.reduce((s, p) => s + Number(p.deuda || 0), 0);

        const porCategoria = {};
        const topDeudores = [];
        proveedores.forEach(p => {
            const cat = p.categoria || 'General';
            const deuda = Number(p.deuda || 0);
            if (deuda > 0) porCategoria[cat] = (porCategoria[cat] || 0) + deuda;
            if (deuda > 0) topDeudores.push({ nombre: p.nombre, deuda });
        });

        const catChart = Object.entries(porCategoria).sort((a, b) => b[1] - a[1])
            .map(([label, value], i) => ({ label, value, display: fmtMoney(value, state.business.moneda), color: CHART_COLORS[i % CHART_COLORS.length] }));

        const topChart = topDeudores.sort((a, b) => b.deuda - a.deuda).slice(0, 5)
            .map((p, i) => ({ label: p.nombre, value: p.deuda, display: fmtMoney(p.deuda, state.business.moneda), color: CHART_COLORS[i % CHART_COLORS.length] }));

        return { total, conDeuda, deudaTotal, catChart, topChart };
    }, [proveedores, state.business.moneda]);

    const save = () => {
        if (!form.nombre.trim()) return alert('El nombre es obligatorio');
        const patch = { ...form, deuda: Number(form.deuda || 0) };
        if (editId) actions.update('proveedores', editId, patch);
        else actions.add('proveedores', patch);
        setOpen(false);
    };

    return (
        <div className="flex-col gap-4">
            <div className="kpi-grid">
                <KpiCard icon={<Users size={20} />} label="Proveedores" value={stats.total} color="#14b8a6" />
                <KpiCard icon={<TrendingUp size={20} />} label="Activos" value={proveedores.filter(p => p.activo !== false).length} color="#22c55e" />
                <KpiCard icon={<AlertCircle size={20} />} label="Con deuda" value={stats.conDeuda} color="#f59e0b" />
                <KpiCard icon={<DollarSign size={20} />} label="Deuda total" value={fmtMoney(stats.deudaTotal, state.business.moneda)} color="#ef4444" />
            </div>

            {proveedores.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                    <Card title="Deuda por categoría">
                        <BarChart data={stats.catChart} />
                    </Card>
                    <Card title="Top 5 deudores">
                        <BarChart data={stats.topChart} />
                    </Card>
                </div>
            )}

            <Card
                title="Proveedores"
                actions={<button className="btn btn-primary" onClick={() => { setForm(EMPTY); setEditId(null); setOpen(true); }}><Plus size={14} /> Nuevo proveedor</button>}
            >
                <div className="flex gap-2 mb-3" style={{ flexWrap: 'wrap' }}>
                    <input className="input" style={{ flex: '1 1 200px', maxWidth: 300 }} placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
                    <select className="select" style={{ maxWidth: 220 }} value={filtroProv} onChange={e => setFiltroProv(e.target.value)}>
                        <option value="">Todas las provincias</option>
                        {PROVINCIAS.map(p => <option key={p}>{p}</option>)}
                    </select>
                </div>

                {filtered.length === 0 ? (
                    <EmptyState
                        icon={Truck}
                        title={proveedores.length === 0 ? 'Todavía no hay proveedores' : 'Sin resultados'}
                        description={proveedores.length === 0 ? 'Agregá a tus proveedores para llevar el control de deudas y contactos.' : 'Probá con otra búsqueda.'}
                        action={proveedores.length === 0 ? <button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={14} /> Agregar primero</button> : null}
                        tips={proveedores.length === 0 ? [
                            'Lista con todos los proveedores: nombre, CUIT, teléfono, provincia',
                            'Deuda pendiente por proveedor con semáforo',
                            'Gráficos de deuda por categoría y top deudores',
                            'Notas libres sobre condiciones de pago y acuerdos'
                        ] : undefined}
                    />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Proveedor</th><th>Contacto</th><th>Ubicación</th>
                                    <th>CUIT/DNI</th><th>Categoría</th>
                                    <th style={{ textAlign: 'right' }}>Deuda</th>
                                    <th style={{ textAlign: 'right' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(p => (
                                    <tr key={p.id}>
                                        <td>
                                            <div className="font-semibold">{p.nombre}</div>
                                            {p.razonSocial && <div className="text-xs text-muted">{p.razonSocial}</div>}
                                        </td>
                                        <td>
                                            {p.telefono && <div className="text-sm flex items-center gap-1"><Phone size={11} /> {p.telefono}</div>}
                                            {p.email && <div className="text-xs text-muted">{p.email}</div>}
                                        </td>
                                        <td>
                                            {p.provincia && <div className="text-sm flex items-center gap-1"><MapPin size={11} /> {p.provincia}</div>}
                                            {p.domicilio && <div className="text-xs text-muted">{p.domicilio}</div>}
                                        </td>
                                        <td><span style={{ fontFamily: 'monospace' }}>{p.dniCuit || '—'}</span></td>
                                        <td><Badge>{p.categoria}</Badge></td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, color: Number(p.deuda || 0) > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                                            {fmtMoney(p.deuda, state.business.moneda)}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setForm({ ...EMPTY, ...p }); setEditId(p.id); setOpen(true); }}><Pencil size={13} /></button>
                                            <button className="btn btn-danger btn-sm btn-icon" onClick={() => { if (confirm('¿Eliminar?')) actions.remove('proveedores', p.id); }}><Trash2 size={13} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'Editar proveedor' : 'Nuevo proveedor'}>
                <div className="form-grid">
                    <Field label="Nombre" required><input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></Field>
                    <Field label="Razón social"><input className="input" value={form.razonSocial} onChange={e => setForm({ ...form, razonSocial: e.target.value })} /></Field>
                    <Field label="Teléfono"><input className="input" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} /></Field>
                    <Field label="Email"><input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
                    <Field label="Provincia"><select className="select" value={form.provincia} onChange={e => setForm({ ...form, provincia: e.target.value })}>{PROVINCIAS.map(p => <option key={p}>{p}</option>)}</select></Field>
                    <Field label="Domicilio"><input className="input" value={form.domicilio} onChange={e => setForm({ ...form, domicilio: e.target.value })} /></Field>
                    <Field label="CUIT / DNI"><input className="input" value={form.dniCuit} onChange={e => setForm({ ...form, dniCuit: e.target.value })} /></Field>
                    <Field label="Categoría"><select className="select" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>{CATEGORIAS.map(c => <option key={c}>{c}</option>)}</select></Field>
                    <Field label="Deuda actual"><input className="input" type="number" value={form.deuda} onChange={e => setForm({ ...form, deuda: e.target.value })} /></Field>
                    <Field label="Condición de pago"><input className="input" value={form.condicionPago} onChange={e => setForm({ ...form, condicionPago: e.target.value })} placeholder="30 días, contado..." /></Field>
                </div>
                <div className="mt-3">
                    <Field label="Notas"><textarea className="textarea" value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} /></Field>
                </div>
                <div className="flex gap-2 mt-4" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
                    <button className="btn btn-primary" onClick={save}>{editId ? 'Guardar' : 'Crear'}</button>
                </div>
            </Modal>
        </div>
    );
}
