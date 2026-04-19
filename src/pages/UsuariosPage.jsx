import React, { useState } from 'react';
import { UserPlus, Plus, Pencil, Trash2, Shield, Mail, Store as StoreIcon } from 'lucide-react';
import { useData } from '../store/DataContext';
import { Card, Modal, Field, EmptyState, Badge, KpiCard } from '../components/UI';

const ROLES = [
    { value: 'admin', label: 'Administrador', descripcion: 'Acceso total al sistema' },
    { value: 'gerente', label: 'Gerente', descripcion: 'Gestiona sucursal y equipo' },
    { value: 'encargado', label: 'Encargado/a', descripcion: 'Operación diaria del local' },
    { value: 'vendedor', label: 'Vendedor/a', descripcion: 'POS y atención al cliente' },
    { value: 'deposito', label: 'Depósito', descripcion: 'Inventario y conteo' },
    { value: 'marketing', label: 'Marketing', descripcion: 'Contenido y publicidad' },
    { value: 'contador', label: 'Contador', descripcion: 'Solo reportes financieros' }
];

const EMPTY = {
    nombre: '', apellido: '', email: '', cargo: '',
    rol: 'vendedor', sucursalId: '',
    telefono: '', activo: true, notas: ''
};

export default function UsuariosPage() {
    const { state, actions } = useData();
    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState(EMPTY);

    const usuarios = state.usuarios || [];
    const sucursales = state.sucursales || [];

    const save = () => {
        if (!form.nombre.trim() || !form.email.trim()) return alert('Nombre y email son obligatorios');
        if (editId) actions.update('usuarios', editId, form);
        else actions.add('usuarios', form);
        setOpen(false);
    };

    return (
        <div className="flex-col gap-4">
            <div className="kpi-grid">
                <KpiCard icon={<UserPlus size={20} />} label="Cuentas creadas" value={usuarios.length} color="#14b8a6" />
                <KpiCard icon={<Shield size={20} />} label="Administradores" value={usuarios.filter(u => u.rol === 'admin').length} color="#a855f7" />
                <KpiCard icon={<StoreIcon size={20} />} label="Con sucursal asignada" value={usuarios.filter(u => u.sucursalId).length} color="#0ea5e9" />
                <KpiCard icon={<UserPlus size={20} />} label="Activos" value={usuarios.filter(u => u.activo).length} color="#22c55e" />
            </div>

            <Card
                title="Usuarios del sistema"
                subtitle="Gestión de cuentas que acceden al dashboard"
                actions={<button className="btn btn-primary" onClick={() => { setForm(EMPTY); setEditId(null); setOpen(true); }}><Plus size={14} /> Nueva cuenta</button>}
            >
                {usuarios.length === 0 ? (
                    <EmptyState
                        icon={UserPlus}
                        title="Todavía no agregaste cuentas"
                        description="Acá podés crear cuentas para tu equipo asignando rol, cargo y sucursal."
                        action={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={14} /> Crear primera cuenta</button>}
                        tips={[
                            'Una cuenta por persona con email único',
                            'Rol (admin, gerente, vendedor, etc.) — define los permisos',
                            'Sucursal asignada — el dropdown global se ajusta a lo que puede ver',
                            'Activar/desactivar sin borrar el histórico',
                            'Cuando conectes Firebase Auth, estas cuentas van a poder loguearse'
                        ]}
                    />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Cargo</th><th>Sucursal</th><th>Estado</th><th style={{ textAlign: 'right' }}>Acciones</th></tr>
                            </thead>
                            <tbody>
                                {usuarios.map(u => (
                                    <tr key={u.id}>
                                        <td><div className="font-semibold">{u.nombre} {u.apellido}</div></td>
                                        <td><div className="text-sm flex items-center gap-1"><Mail size={11} /> {u.email}</div></td>
                                        <td><Badge variant={u.rol === 'admin' ? 'info' : 'default'}>{ROLES.find(r => r.value === u.rol)?.label || u.rol}</Badge></td>
                                        <td className="text-sm">{u.cargo || '—'}</td>
                                        <td className="text-sm">{sucursales.find(s => s.id === u.sucursalId)?.nombre || '—'}</td>
                                        <td>{u.activo ? <Badge variant="success">Activo</Badge> : <Badge variant="muted">Inactivo</Badge>}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setForm({ ...EMPTY, ...u }); setEditId(u.id); setOpen(true); }}><Pencil size={13} /></button>
                                            <button className="btn btn-danger btn-sm btn-icon" onClick={() => { if (confirm('¿Eliminar?')) actions.remove('usuarios', u.id); }}><Trash2 size={13} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Card title="Info de seguridad" style={{ background: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.2)' }}>
                <div className="text-sm text-muted">
                    Este Dashboard funciona <strong>sin login</strong> para que sea simple de probar.
                    Si querés activar autenticación real (login con email/contraseña o Google), podés conectar Firebase Auth en Configuración.
                    Las cuentas creadas acá quedan registradas y listas para migrar cuando actives el login.
                </div>
            </Card>

            <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'Editar cuenta' : 'Nueva cuenta'}>
                <div className="form-grid">
                    <Field label="Nombre" required><input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></Field>
                    <Field label="Apellido"><input className="input" value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })} /></Field>
                    <Field label="Email" required><input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
                    <Field label="Teléfono"><input className="input" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} /></Field>
                    <Field label="Cargo" hint="Cargo que ocupa en la empresa"><input className="input" placeholder="Ej: Encargado de local" value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })} /></Field>
                    <Field label="Rol en el sistema" hint={ROLES.find(r => r.value === form.rol)?.descripcion}>
                        <select className="select" value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })}>
                            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                    </Field>
                    <Field label="Sucursal asignada">
                        <select className="select" value={form.sucursalId} onChange={e => setForm({ ...form, sucursalId: e.target.value })}>
                            <option value="">Todas (solo admin/gerente)</option>
                            {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                        </select>
                    </Field>
                    <Field label="Estado">
                        <select className="select" value={form.activo ? '1' : '0'} onChange={e => setForm({ ...form, activo: e.target.value === '1' })}>
                            <option value="1">Activo</option><option value="0">Inactivo</option>
                        </select>
                    </Field>
                </div>
                <div className="mt-3"><Field label="Notas"><textarea className="textarea" value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} /></Field></div>
                <div className="flex gap-2 mt-4" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
                    <button className="btn btn-primary" onClick={save}>{editId ? 'Guardar' : 'Crear cuenta'}</button>
                </div>
            </Modal>
        </div>
    );
}
