import React, { useMemo, useState } from 'react';
import { Users, Plus, Pencil, Trash2, Phone, Mail, Calendar, Clock, DollarSign } from 'lucide-react';
import { useData, filterBySucursal } from '../store/DataContext';
import { Card, Modal, Field, EmptyState, Badge, KpiCard, BarChart, fmtMoney, CHART_COLORS } from '../components/UI';

const CARGOS = ['Empleado', 'Cajero', 'Vendedor/a', 'Encargado/a', 'Mozo/a', 'Cocinero/a', 'Repartidor/a', 'Administrativo', 'Responsable de sucursal', 'Otro'];

const EMPTY = {
    nombre: '', apellido: '', dni: '', telefono: '', email: '',
    cargo: 'Empleado', sucursalId: '',
    fechaIngreso: new Date().toISOString().slice(0, 10),
    sueldoBase: '', comisionPct: '',
    horario: '', activo: true, notas: ''
};

export default function EmpleadosPage() {
    const { state, actions } = useData();
    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState(EMPTY);

    const current = state.meta.currentSucursalId || 'all';
    const visibles = filterBySucursal(state.empleados, current);
    const sucursales = state.sucursales || [];

    const byCargo = useMemo(() => {
        const count = {};
        visibles.forEach(e => { count[e.cargo] = (count[e.cargo] || 0) + 1; });
        return Object.entries(count).map(([label, value], i) => ({ label, value, color: CHART_COLORS[i % CHART_COLORS.length] }));
    }, [visibles]);

    const bySucursal = useMemo(() => {
        return sucursales.map((s, i) => ({
            label: s.nombre,
            value: state.empleados.filter(e => e.sucursalId === s.id).length,
            color: CHART_COLORS[i % CHART_COLORS.length]
        }));
    }, [sucursales, state.empleados]);

    const sueldosMes = useMemo(() => {
        return visibles.filter(e => e.activo !== false).reduce((s, e) => s + Number(e.sueldoBase || 0), 0);
    }, [visibles]);

    const save = () => {
        if (!form.nombre.trim()) return alert('El nombre es obligatorio');
        const patch = { ...form, sueldoBase: Number(form.sueldoBase || 0), comisionPct: Number(form.comisionPct || 0) };
        if (editId) actions.update('empleados', editId, patch);
        else actions.add('empleados', patch);
        setOpen(false);
    };

    return (
        <div className="flex-col gap-4">
            <div className="kpi-grid">
                <KpiCard icon={<Users size={20} />} label="Empleados" value={visibles.length} color="#14b8a6" />
                <KpiCard icon={<Users size={20} />} label="Activos" value={visibles.filter(e => e.activo !== false).length} color="#22c55e" />
                <KpiCard icon={<DollarSign size={20} />} label="Sueldos base mensuales" value={fmtMoney(sueldosMes, state.business.moneda)} color="#f59e0b" />
                <KpiCard icon={<Users size={20} />} label="Sucursales con staff" value={new Set(visibles.map(e => e.sucursalId).filter(Boolean)).size} color="#a855f7" />
            </div>

            {visibles.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                    <Card title="Por cargo"><BarChart data={byCargo} /></Card>
                    {sucursales.length > 0 && <Card title="Distribución por sucursal"><BarChart data={bySucursal} /></Card>}
                </div>
            )}

            <Card
                title="Empleados"
                subtitle={current === 'all' ? 'Todas las sucursales' : sucursales.find(s => s.id === current)?.nombre}
                actions={<button className="btn btn-primary" onClick={() => { setForm({ ...EMPTY, sucursalId: current !== 'all' ? current : (sucursales[0]?.id || '') }); setEditId(null); setOpen(true); }} disabled={sucursales.length === 0}><Plus size={14} /> Nuevo empleado</button>}
            >
                {sucursales.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title="Primero creá al menos una sucursal"
                        description="Los empleados se asignan a sucursales. Cargá una sucursal en el menú lateral."
                    />
                ) : visibles.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title="Todavía no tenés empleados"
                        description="Agregá a tu equipo para llevar el control de asistencias, sueldos y ventas por vendedor."
                        action={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={14} /> Agregar empleado</button>}
                        tips={[
                            'Listado con nombre, DNI, cargo, sucursal y fecha de ingreso',
                            'Sueldo base y % de comisión por empleado',
                            'Filtro global por sucursal (selector arriba a la derecha)',
                            'En Informes vas a ver ventas por empleado y asistencia'
                        ]}
                    />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Empleado</th><th>Cargo</th><th>Sucursal</th>
                                    <th>Contacto</th><th>Ingreso</th>
                                    <th style={{ textAlign: 'right' }}>Sueldo base</th>
                                    <th>Estado</th>
                                    <th style={{ textAlign: 'right' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibles.map(e => (
                                    <tr key={e.id}>
                                        <td>
                                            <div className="font-semibold">{e.nombre} {e.apellido}</div>
                                            {e.dni && <div className="text-xs text-muted">DNI {e.dni}</div>}
                                        </td>
                                        <td><Badge>{e.cargo}</Badge></td>
                                        <td className="text-sm">{sucursales.find(s => s.id === e.sucursalId)?.nombre || '—'}</td>
                                        <td>
                                            {e.telefono && <div className="text-sm flex items-center gap-1"><Phone size={11} /> {e.telefono}</div>}
                                            {e.email && <div className="text-xs text-muted">{e.email}</div>}
                                        </td>
                                        <td className="text-sm">{e.fechaIngreso || '—'}</td>
                                        <td style={{ textAlign: 'right' }}>{fmtMoney(e.sueldoBase, state.business.moneda)}</td>
                                        <td>{e.activo ? <Badge variant="success">Activo</Badge> : <Badge variant="muted">Inactivo</Badge>}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setForm({ ...EMPTY, ...e }); setEditId(e.id); setOpen(true); }}><Pencil size={13} /></button>
                                            <button className="btn btn-danger btn-sm btn-icon" onClick={() => { if (confirm('¿Eliminar?')) actions.remove('empleados', e.id); }}><Trash2 size={13} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'Editar empleado' : 'Nuevo empleado'}>
                <div className="form-grid">
                    <Field label="Nombre" required><input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></Field>
                    <Field label="Apellido"><input className="input" value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })} /></Field>
                    <Field label="DNI"><input className="input" value={form.dni} onChange={e => setForm({ ...form, dni: e.target.value })} /></Field>
                    <Field label="Cargo"><select className="select" value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })}>{CARGOS.map(c => <option key={c}>{c}</option>)}</select></Field>
                    <Field label="Sucursal" required>
                        <select className="select" value={form.sucursalId} onChange={e => setForm({ ...form, sucursalId: e.target.value })}>
                            <option value="">Elegir...</option>
                            {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                        </select>
                    </Field>
                    <Field label="Teléfono"><input className="input" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} /></Field>
                    <Field label="Email"><input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
                    <Field label="Fecha de ingreso"><input className="input" type="date" value={form.fechaIngreso} onChange={e => setForm({ ...form, fechaIngreso: e.target.value })} /></Field>
                    <Field label="Sueldo base"><input className="input" type="number" value={form.sueldoBase} onChange={e => setForm({ ...form, sueldoBase: e.target.value })} /></Field>
                    <Field label="Comisión % s/ventas"><input className="input" type="number" value={form.comisionPct} onChange={e => setForm({ ...form, comisionPct: e.target.value })} /></Field>
                    <Field label="Horario"><input className="input" value={form.horario} placeholder="Lun a Vie 9-18hs" onChange={e => setForm({ ...form, horario: e.target.value })} /></Field>
                    <Field label="Estado">
                        <select className="select" value={form.activo ? '1' : '0'} onChange={e => setForm({ ...form, activo: e.target.value === '1' })}>
                            <option value="1">Activo</option><option value="0">Inactivo</option>
                        </select>
                    </Field>
                </div>
                <div className="mt-3"><Field label="Notas"><textarea className="textarea" value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} /></Field></div>
                <div className="flex gap-2 mt-4" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
                    <button className="btn btn-primary" onClick={save}>{editId ? 'Guardar' : 'Crear'}</button>
                </div>
            </Modal>
        </div>
    );
}
