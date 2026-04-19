import React, { useState } from 'react';
import { UserCog, Plus, Pencil, Trash2, Shield } from 'lucide-react';
import { useData, SECTION_HELP } from '../store/DataContext';
import { PageHeader, Card, Modal, Field, EmptyState, Badge, InfoBox } from '../components/UI';

const ROLES = [
    { id: 'admin', nombre: 'Admin', color: 'danger', desc: 'Acceso total al sistema' },
    { id: 'gerente', nombre: 'Gerente', color: 'warning', desc: 'Toda la operación de su sucursal' },
    { id: 'vendedor', nombre: 'Vendedor', color: 'info', desc: 'POS + sus propias ventas' },
    { id: 'contador', nombre: 'Contador', color: 'success', desc: 'Solo informes y contabilidad' },
    { id: 'marketing', nombre: 'Marketing', color: 'default', desc: 'IG, TikTok, Analytics, agentes AI' }
];

const EMPTY = { nombre: '', email: '', rol: 'vendedor', sucursalId: '', activo: true, notas: '' };

export default function UsuariosPage() {
    const { state, actions } = useData();
    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState(EMPTY);

    const save = () => {
        if (!form.nombre.trim()) return alert('Nombre es obligatorio');
        if (!form.email.trim()) return alert('Email es obligatorio');
        if (editId) actions.update('usuarios', editId, form);
        else actions.add('usuarios', form);
        setOpen(false);
    };

    return (
        <div>
            <PageHeader
                icon={UserCog}
                title="Cuentas del sistema"
                subtitle="Usuarios que acceden al Dashboard"
                help={SECTION_HELP.usuarios}
                actions={<button className="btn btn-primary" onClick={() => { setForm(EMPTY); setEditId(null); setOpen(true); }}><Plus size={14} /> Nueva cuenta</button>}
            />

            <InfoBox>
                <strong>Diferencia clave:</strong> las <em>Cuentas</em> son personas que USAN el sistema (con email y rol). Los <em>Empleados</em> son tu equipo operativo (cajeros, vendedores, mozos, etc.). Un empleado puede o no tener una cuenta de usuario.
            </InfoBox>

            <div className="mt-3">
                <Card>
                    {state.usuarios.length === 0 ? (
                        <EmptyState
                            icon={UserCog}
                            title="Sin cuentas creadas"
                            description="Creá cuentas para que tu equipo pueda acceder al sistema con permisos específicos."
                            action={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={14} /> Crear primera cuenta</button>}
                            tips={[
                                '5 roles con distintos permisos',
                                'Asignación por sucursal (opcional)',
                                'Estado activo/inactivo para dar de baja sin borrar',
                                'Diferencia clara entre "cuenta" (login) y "empleado" (staff operativo)'
                            ]}
                            example="Ej: María García - maria@celavie.com - Rol Gerente - Sucursal Palermo"
                        />
                    ) : (
                        <div className="table-wrap">
                            <table className="table">
                                <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Sucursal</th><th>Estado</th><th></th></tr></thead>
                                <tbody>
                                    {state.usuarios.map(u => {
                                        const rol = ROLES.find(r => r.id === u.rol) || ROLES[2];
                                        return (
                                            <tr key={u.id}>
                                                <td className="font-semibold">{u.nombre}</td>
                                                <td className="text-sm">{u.email}</td>
                                                <td><Badge variant={rol.color}>{rol.nombre}</Badge></td>
                                                <td className="text-sm">{state.sucursales.find(s => s.id === u.sucursalId)?.nombre || 'Todas'}</td>
                                                <td>{u.activo ? <Badge variant="success">Activo</Badge> : <Badge variant="muted">Inactivo</Badge>}</td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setForm({ ...EMPTY, ...u }); setEditId(u.id); setOpen(true); }}><Pencil size={13} /></button>
                                                    <button className="btn btn-danger btn-sm btn-icon" onClick={() => { if (confirm('¿Eliminar?')) actions.remove('usuarios', u.id); }}><Trash2 size={13} /></button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </div>

            <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'Editar cuenta' : 'Nueva cuenta'}>
                <div className="form-grid">
                    <Field label="Nombre completo" required><input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></Field>
                    <Field label="Email" required><input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
                    <Field label="Rol" required>
                        <select className="select" value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })}>
                            {ROLES.map(r => <option key={r.id} value={r.id}>{r.nombre} — {r.desc}</option>)}
                        </select>
                    </Field>
                    <Field label="Sucursal" hint="Si lo dejás vacío ve todas">
                        <select className="select" value={form.sucursalId} onChange={e => setForm({ ...form, sucursalId: e.target.value })}>
                            <option value="">Todas las sucursales</option>
                            {state.sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                        </select>
                    </Field>
                    <Field label="Estado">
                        <select className="select" value={form.activo ? '1' : '0'} onChange={e => setForm({ ...form, activo: e.target.value === '1' })}>
                            <option value="1">Activo</option><option value="0">Inactivo</option>
                        </select>
                    </Field>
                </div>
                <div className="flex gap-2 mt-4 justify-end">
                    <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
                    <button className="btn btn-primary" onClick={save}>{editId ? 'Guardar' : 'Crear'}</button>
                </div>
            </Modal>
        </div>
    );
}
