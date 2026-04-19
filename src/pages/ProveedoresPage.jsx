import React, { useMemo, useState } from 'react';
import { Truck, Plus, Pencil, Trash2, DollarSign, Phone, Mail } from 'lucide-react';
import { useData, SECTION_HELP } from '../store/DataContext';
import { PageHeader, Card, Modal, Field, EmptyState, Badge, KpiCard, BarChart, fmtMoney, CHART_COLORS } from '../components/UI';

const CATEGORIAS = ['Mercadería', 'Insumos', 'Servicios', 'Logística', 'Tecnología', 'Limpieza', 'Otros'];

const EMPTY = {
    nombre: '', contacto: '', telefono: '', email: '', direccion: '',
    cuit: '', categoria: 'Mercadería', deuda: 0, diasPago: 30,
    activo: true, notas: ''
};

export default function ProveedoresPage() {
    const { state, actions } = useData();
    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState(EMPTY);

    const proveedores = state.proveedores || [];

    const stats = useMemo(() => ({
        total: proveedores.length,
        activos: proveedores.filter(p => p.activo !== false).length,
        deudaTotal: proveedores.reduce((s, p) => s + Number(p.deuda || 0), 0),
        conDeuda: proveedores.filter(p => Number(p.deuda || 0) > 0).length
    }), [proveedores]);

    const deudaPorCategoria = useMemo(() => {
        const agg = {};
        proveedores.forEach(p => {
            const cat = p.categoria || 'Otros';
            agg[cat] = (agg[cat] || 0) + Number(p.deuda || 0);
        });
        return Object.entries(agg)
            .filter(([, v]) => v > 0)
            .map(([label, value], i) => ({ label, value, display: fmtMoney(value, state.business.moneda), color: CHART_COLORS[i % CHART_COLORS.length] }));
    }, [proveedores, state.business.moneda]);

    const topDeudores = useMemo(() => {
        return [...proveedores]
            .filter(p => Number(p.deuda || 0) > 0)
            .sort((a, b) => Number(b.deuda || 0) - Number(a.deuda || 0))
            .slice(0, 5)
            .map((p, i) => ({ label: p.nombre, value: Number(p.deuda || 0), display: fmtMoney(p.deuda, state.business.moneda), color: CHART_COLORS[i % CHART_COLORS.length] }));
    }, [proveedores, state.business.moneda]);

    const save = () => {
        if (!form.nombre.trim()) return alert('Nombre es obligatorio');
        const patch = { ...form, deuda: Number(form.deuda || 0), diasPago: Number(form.diasPago || 0) };
        if (editId) actions.update('proveedores', editId, patch);
        else actions.add('proveedores', patch);
        setOpen(false);
    };

    return (
        <div>
            <PageHeader
                icon={Truck}
                title="Proveedores"
                subtitle="Quienes te proveen mercadería, insumos o servicios"
                help={SECTION_HELP.proveedores}
                actions={<button className="btn btn-primary" onClick={() => { setForm(EMPTY); setEditId(null); setOpen(true); }}><Plus size={14} /> Nuevo proveedor</button>}
            />

            <div className="kpi-grid mb-4">
                <KpiCard icon={<Truck size={20} />} label="Proveedores" value={stats.total} color="#63f1cb" />
                <KpiCard icon={<Truck size={20} />} label="Activos" value={stats.activos} color="#22c55e" />
                <KpiCard icon={<DollarSign size={20} />} label="Deuda total" value={fmtMoney(stats.deudaTotal, state.business.moneda)} color="#ef4444" hint="Suma de deudas pendientes" />
                <KpiCard icon={<Truck size={20} />} label="Con deuda" value={stats.conDeuda} color="#f59e0b" />
            </div>

            {proveedores.length > 0 && (deudaPorCategoria.length > 0 || topDeudores.length > 0) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 16 }}>
                    {deudaPorCategoria.length > 0 && <Card title="Deuda por categoría"><BarChart data={deudaPorCategoria} /></Card>}
                    {topDeudores.length > 0 && <Card title="Top 5 deudores"><BarChart data={topDeudores} /></Card>}
                </div>
            )}

            <Card>
                {proveedores.length === 0 ? (
                    <EmptyState
                        icon={Truck}
                        title="Sin proveedores cargados"
                        description="Llevá control de a quiénes les comprás y cuánto les debés."
                        action={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={14} /> Agregar proveedor</button>}
                        tips={[
                            'Datos de contacto (teléfono, email, dirección)',
                            'CUIT para facturación',
                            'Categoría (Mercadería / Insumos / Servicios)',
                            'DEUDA actual y días de pago acordados',
                            'Gráficos: deuda por categoría + top 5 deudores'
                        ]}
                        example="Ej: Distribuidora Sur - CUIT 30-12345678-9 - Categoría Mercadería - Deuda $450.000 - Pago a 30 días"
                    />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead><tr>
                                <th>Proveedor</th><th>Categoría</th><th>Contacto</th><th>CUIT</th>
                                <th style={{ textAlign: 'right' }}>Deuda</th><th>Días pago</th><th>Estado</th><th></th>
                            </tr></thead>
                            <tbody>
                                {proveedores.map(p => (
                                    <tr key={p.id}>
                                        <td>
                                            <div className="font-semibold">{p.nombre}</div>
                                            {p.contacto && <div className="text-xs text-muted">{p.contacto}</div>}
                                        </td>
                                        <td><Badge>{p.categoria}</Badge></td>
                                        <td>
                                            {p.telefono && <div className="text-sm flex items-center gap-1"><Phone size={11} /> {p.telefono}</div>}
                                            {p.email && <div className="text-xs text-muted flex items-center gap-1"><Mail size={10} /> {p.email}</div>}
                                        </td>
                                        <td className="text-sm">{p.cuit || '—'}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, color: Number(p.deuda) > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                                            {fmtMoney(p.deuda, state.business.moneda)}
                                        </td>
                                        <td>{p.diasPago} días</td>
                                        <td>{p.activo ? <Badge variant="success">Activo</Badge> : <Badge variant="muted">Inactivo</Badge>}</td>
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
                    <Field label="Nombre / Razón social" required><input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></Field>
                    <Field label="Persona de contacto"><input className="input" value={form.contacto} onChange={e => setForm({ ...form, contacto: e.target.value })} /></Field>
                    <Field label="Teléfono"><input className="input" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} /></Field>
                    <Field label="Email"><input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
                    <Field label="CUIT"><input className="input" value={form.cuit} onChange={e => setForm({ ...form, cuit: e.target.value })} placeholder="30-12345678-9" /></Field>
                    <Field label="Categoría">
                        <select className="select" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                            {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                        </select>
                    </Field>
                    <Field label="Deuda actual" hint="Lo que le debés HOY"><input className="input" type="number" value={form.deuda} onChange={e => setForm({ ...form, deuda: e.target.value })} /></Field>
                    <Field label="Días de pago" hint="Plazo acordado"><input className="input" type="number" value={form.diasPago} onChange={e => setForm({ ...form, diasPago: e.target.value })} /></Field>
                    <Field label="Dirección"><input className="input" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} /></Field>
                    <Field label="Estado">
                        <select className="select" value={form.activo ? '1' : '0'} onChange={e => setForm({ ...form, activo: e.target.value === '1' })}>
                            <option value="1">Activo</option><option value="0">Inactivo</option>
                        </select>
                    </Field>
                </div>
                <div className="mt-3"><Field label="Notas"><textarea className="textarea" value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} /></Field></div>
                <div className="flex gap-2 mt-4 justify-end">
                    <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
                    <button className="btn btn-primary" onClick={save}>{editId ? 'Guardar' : 'Crear'}</button>
                </div>
            </Modal>
        </div>
    );
}
