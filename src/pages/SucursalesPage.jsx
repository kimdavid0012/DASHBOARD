import React, { useState } from 'react';
import { Store, Plus, Pencil, Trash2, MapPin, Phone, User as UserIcon } from 'lucide-react';
import { useData, SECTION_HELP } from '../store/DataContext';
import { PageHeader, Card, Modal, Field, EmptyState, Badge, KpiCard } from '../components/UI';

const PROVINCIAS = ['Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero', 'Tierra del Fuego', 'Tucumán'];

const EMPTY = {
    nombre: '', direccion: '', ciudad: '', provincia: 'Buenos Aires', pais: 'Argentina',
    telefono: '', responsable: '', horario: '', tipo: 'local',
    activa: true, notas: ''
};

export default function SucursalesPage() {
    const { state, actions } = useData();
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY);

    const openNew = () => { setForm(EMPTY); setEditingId(null); setModalOpen(true); };
    const openEdit = (s) => { setForm({ ...EMPTY, ...s }); setEditingId(s.id); setModalOpen(true); };

    const save = () => {
        if (!form.nombre.trim()) return alert('El nombre es obligatorio');
        if (editingId) actions.update('sucursales', editingId, form);
        else actions.add('sucursales', form);
        setModalOpen(false);
    };

    const remove = (id) => {
        if (!confirm('¿Eliminar esta sucursal? Los registros asociados quedarán huérfanos.')) return;
        actions.remove('sucursales', id);
    };

    const statsFor = (sucId) => {
        const ventas = state.ventas.filter(v => v.sucursalId === sucId);
        const empleados = state.empleados.filter(e => e.sucursalId === sucId);
        const total = ventas.reduce((s, v) => s + Number(v.total || 0), 0);
        return { ventasCount: ventas.length, empleadosCount: empleados.length, total };
    };

    const sucursales = state.sucursales || [];

    return (
        <div>
            <PageHeader
                icon={Store}
                title="Sucursales"
                subtitle="Locales, depósitos y tiendas online"
                help={SECTION_HELP.sucursales}
                actions={<button className="btn btn-primary" onClick={openNew}><Plus size={14} /> Nueva sucursal</button>}
            />

            <div className="kpi-grid mb-4">
                <KpiCard icon={<Store size={20} />} label="Sucursales totales" value={sucursales.length} color="#63f1cb" />
                <KpiCard icon={<Store size={20} />} label="Activas" value={sucursales.filter(s => s.activa).length} color="#22c55e" />
                <KpiCard icon={<UserIcon size={20} />} label="Empleados totales" value={state.empleados.length} color="#60a5fa" />
                <KpiCard icon={<MapPin size={20} />} label="Ciudades cubiertas" value={new Set(sucursales.map(s => s.ciudad).filter(Boolean)).size} color="#a855f7" />
            </div>

            <Card>
                {sucursales.length === 0 ? (
                    <EmptyState
                        icon={Store}
                        title="Todavía no tenés sucursales"
                        description="Creá tu primera sucursal para empezar. Todo el sistema funciona alrededor de esto."
                        action={<button className="btn btn-primary" onClick={openNew}><Plus size={14} /> Crear mi primera sucursal</button>}
                        tips={[
                            'Nombre, dirección y ciudad de cada local',
                            'Tipo: local / depósito / oficina / online',
                            'Responsable y horario de atención',
                            'Estadísticas automáticas: ventas, empleados',
                            'Selector en la barra superior para filtrar toda la app'
                        ]}
                        example="Si tenés 1 local: 'Casa central - Av. Corrientes 1234, CABA'. Si tenés varios: 'Sucursal Palermo', 'Sucursal Belgrano', etc."
                    />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Sucursal</th><th>Ubicación</th><th>Contacto</th>
                                    <th>Ventas</th><th>Empleados</th><th>Estado</th>
                                    <th style={{ textAlign: 'right' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sucursales.map(s => {
                                    const st = statsFor(s.id);
                                    return (
                                        <tr key={s.id}>
                                            <td>
                                                <div className="font-semibold">{s.nombre}</div>
                                                <div className="text-xs text-muted">{s.tipo === 'local' ? 'Local / PDV' : s.tipo === 'deposito' ? 'Depósito' : s.tipo}</div>
                                            </td>
                                            <td>
                                                <div className="text-sm">{s.direccion}</div>
                                                <div className="text-xs text-muted">{[s.ciudad, s.provincia].filter(Boolean).join(', ')}</div>
                                            </td>
                                            <td>
                                                {s.telefono && <div className="text-sm flex items-center gap-1"><Phone size={11} /> {s.telefono}</div>}
                                                {s.responsable && <div className="text-xs text-muted">A cargo: {s.responsable}</div>}
                                            </td>
                                            <td><div className="font-semibold">{st.ventasCount}</div><div className="text-xs text-muted">operaciones</div></td>
                                            <td><div className="font-semibold">{st.empleadosCount}</div></td>
                                            <td>{s.activa ? <Badge variant="success">Activa</Badge> : <Badge variant="muted">Inactiva</Badge>}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(s)}><Pencil size={13} /></button>
                                                <button className="btn btn-danger btn-sm btn-icon" onClick={() => remove(s.id)}><Trash2 size={13} /></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar sucursal' : 'Nueva sucursal'}>
                <div className="form-grid">
                    <Field label="Nombre" required hint="Ej: Casa Central, Sucursal Palermo"><input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} autoFocus /></Field>
                    <Field label="Tipo">
                        <select className="select" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                            <option value="local">Local / Punto de venta</option>
                            <option value="deposito">Depósito</option>
                            <option value="oficina">Oficina</option>
                            <option value="online">Tienda online</option>
                        </select>
                    </Field>
                    <Field label="Dirección"><input className="input" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} /></Field>
                    <Field label="Ciudad"><input className="input" value={form.ciudad} onChange={e => setForm({ ...form, ciudad: e.target.value })} /></Field>
                    <Field label="Provincia">
                        <select className="select" value={form.provincia} onChange={e => setForm({ ...form, provincia: e.target.value })}>
                            {PROVINCIAS.map(p => <option key={p}>{p}</option>)}
                        </select>
                    </Field>
                    <Field label="Teléfono"><input className="input" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} /></Field>
                    <Field label="Responsable" hint="Nombre del encargado/a"><input className="input" value={form.responsable} onChange={e => setForm({ ...form, responsable: e.target.value })} /></Field>
                    <Field label="Horario"><input className="input" placeholder="Lun a Vie 9-18hs" value={form.horario} onChange={e => setForm({ ...form, horario: e.target.value })} /></Field>
                    <Field label="Estado">
                        <select className="select" value={form.activa ? '1' : '0'} onChange={e => setForm({ ...form, activa: e.target.value === '1' })}>
                            <option value="1">Activa</option>
                            <option value="0">Inactiva</option>
                        </select>
                    </Field>
                </div>
                <div className="mt-3">
                    <Field label="Notas"><textarea className="textarea" value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} /></Field>
                </div>
                <div className="flex gap-2 mt-4 justify-end">
                    <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
                    <button className="btn btn-primary" onClick={save}>{editingId ? 'Guardar' : 'Crear'}</button>
                </div>
            </Modal>
        </div>
    );
}
