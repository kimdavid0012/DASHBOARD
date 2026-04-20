import React, { useState } from 'react';
import { UserCog, Plus, Pencil, Trash2, Shield, Link2, Key } from 'lucide-react';
import { useData, SECTION_HELP } from '../store/DataContext';
import { PageHeader, Card, Modal, Field, EmptyState, Badge, InfoBox } from '../components/UI';
import { useT } from '../i18n';

const ROLES = [
    { id: 'admin', nombre: 'Admin', color: 'danger', desc: 'Acceso total al sistema' },
    { id: 'gerente', nombre: 'Gerente', color: 'warning', desc: 'Toda la operación de su sucursal' },
    { id: 'vendedor', nombre: 'Vendedor', color: 'info', desc: 'POS + sus propias ventas' },
    { id: 'contador', nombre: 'Contador', color: 'success', desc: 'Solo informes y contabilidad' },
    { id: 'marketing', nombre: 'Marketing', color: 'default', desc: 'IG, TikTok, Analytics, agentes AI' }
];

const EMPTY = {
    nombre: '', email: '', rol: 'vendedor', sucursalId: '',
    activo: true, notas: '',
    password: '', empleadoId: '', firebaseUid: ''
};

export default function UsuariosPage() {
    const t = useT();
    const { state, actions } = useData();
    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [mode, setMode] = useState('nuevo');
    const [creating, setCreating] = useState(false);
    const [msg, setMsg] = useState('');

    const empleadosSinCuenta = (state.empleados || []).filter(e => {
        return !(state.usuarios || []).some(u => u.empleadoId === e.id);
    });

    const mapRolEmpleado = (rolEmp) => {
        const r = (rolEmp || '').toLowerCase();
        if (r.includes('gerente') || r.includes('encargad')) return 'gerente';
        if (r.includes('cont')) return 'contador';
        if (r.includes('mark') || r.includes('redes')) return 'marketing';
        return 'vendedor';
    };

    const vincularEmpleado = (empleadoId) => {
        const emp = state.empleados.find(e => e.id === empleadoId);
        if (!emp) return;
        setForm({
            ...EMPTY,
            empleadoId,
            nombre: ((emp.nombre || '') + ' ' + (emp.apellido || '')).trim(),
            email: emp.email || '',
            sucursalId: emp.sucursalId || '',
            rol: mapRolEmpleado(emp.rol)
        });
    };

    const save = async () => {
        if (!form.nombre.trim()) return alert('Nombre es obligatorio');
        if (!form.email.trim()) return alert('Email es obligatorio');

        setCreating(true); setMsg('');
        try {
            let firebaseUid = form.firebaseUid || '';

            if (form.password && form.password.length >= 6 && !editId) {
                try {
                    const { callFunction, isFirebaseConfigured, getCurrentUser } = await import('../utils/firebase');
                    const currentUser = await getCurrentUser();
                    if (isFirebaseConfigured() && currentUser) {
                        const result = await callFunction('createEmployeeUser', {
                            email: form.email,
                            password: form.password,
                            displayName: form.nombre,
                            rol: form.rol
                        });
                        firebaseUid = result.uid || '';
                        setMsg('✅ Usuario creado en Firebase Auth — puede ingresar con email + contraseña');
                    } else {
                        setMsg('⚠️ Cloud mode inactivo. Password guardada solo localmente.');
                    }
                } catch (err) {
                    setMsg('⚠️ No se pudo crear en Firebase: ' + err.message);
                }
            }

            const patch = {
                nombre: form.nombre,
                email: form.email,
                rol: form.rol,
                sucursalId: form.sucursalId,
                activo: form.activo,
                notas: form.notas,
                empleadoId: form.empleadoId || null,
                firebaseUid: firebaseUid || null,
                hasPassword: !!form.password
            };

            if (editId) actions.update('usuarios', editId, patch);
            else actions.add('usuarios', patch);

            setTimeout(() => { setOpen(false); setMsg(''); }, 1500);
        } catch (err) {
            setMsg('⚠️ Error: ' + err.message);
        } finally {
            setCreating(false);
        }
    };

    const openNew = () => {
        setForm(EMPTY); setEditId(null); setMode('nuevo'); setMsg(''); setOpen(true);
    };

    const openFromEmployee = () => {
        setForm(EMPTY); setEditId(null); setMode('desde-empleado'); setMsg(''); setOpen(true);
    };

    return (
        <div>
            <PageHeader
                icon={UserCog} title="Cuentas de usuario" subtitle="Personas que acceden al sistema"
                help={SECTION_HELP.usuarios}
                actions={
                    <div style={{ display: 'flex', gap: 8 }}>
                        {empleadosSinCuenta.length > 0 && (
                            <button className="btn btn-ghost" onClick={openFromEmployee}>
                                <Link2 size={14} /> Desde empleado
                            </button>
                        )}
                        <button className="btn btn-primary" onClick={openNew}>
                            <Plus size={14} /> Nueva cuenta
                        </button>
                    </div>
                }
            />

            <InfoBox>
                <strong>Diferencia clave:</strong> las <em>Cuentas</em> son personas que USAN el sistema (email, password, rol).
                Los <em>Empleados</em> son tu equipo operativo. Un empleado puede o no tener cuenta.
                Si usás Cloud mode, al crear una cuenta con password se crea el usuario automáticamente en Firebase Auth.
            </InfoBox>

            <div className="mt-3">
                <Card>
                    {state.usuarios.length === 0 ? (
                        <EmptyState
                            icon={UserCog}
                            title="Sin cuentas creadas"
                            description="Creá cuentas para que tu equipo pueda acceder al sistema."
                            action={<button className="btn btn-primary" onClick={openNew}><Plus size={14} /> Crear primera cuenta</button>}
                            tips={[
                                'Email + contraseña (6+ chars) para login',
                                'Rol determina permisos',
                                'Podés vincular a empleado existente',
                                'Cloud mode: crea usuario en Firebase Auth automáticamente'
                            ]}
                        />
                    ) : (
                        <div className="table-wrap">
                            <table className="table">
                                <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Sucursal</th><th>Empleado</th><th>Auth</th><th>Estado</th><th></th></tr></thead>
                                <tbody>
                                    {state.usuarios.map(u => {
                                        const rol = ROLES.find(r => r.id === u.rol) || ROLES[2];
                                        const suc = state.sucursales.find(s => s.id === u.sucursalId);
                                        const emp = u.empleadoId ? state.empleados.find(e => e.id === u.empleadoId) : null;
                                        return (
                                            <tr key={u.id}>
                                                <td className="font-semibold">{u.nombre}</td>
                                                <td className="text-sm">{u.email}</td>
                                                <td><Badge variant={rol.color}>{rol.nombre}</Badge></td>
                                                <td className="text-sm">{suc?.nombre || <span className="text-muted">Todas</span>}</td>
                                                <td className="text-sm">{emp ? <Badge variant="info">👷 {emp.nombre}</Badge> : <span className="text-muted">—</span>}</td>
                                                <td>{u.firebaseUid ? <Badge variant="success"><Key size={10} /> Sí</Badge> : u.hasPassword ? <Badge variant="warning">Local</Badge> : <Badge variant="muted">Sin pass</Badge>}</td>
                                                <td><Badge variant={u.activo ? 'success' : 'muted'}>{u.activo ? '● Activo' : 'Inactivo'}</Badge></td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => {
                                                        setForm({ ...EMPTY, nombre: u.nombre, email: u.email, rol: u.rol, sucursalId: u.sucursalId, activo: u.activo, notas: u.notas || '', empleadoId: u.empleadoId || '', firebaseUid: u.firebaseUid || '', password: '' });
                                                        setEditId(u.id); setMode('nuevo'); setOpen(true);
                                                    }}><Pencil size={13} /></button>
                                                    <button className="btn btn-danger btn-sm btn-icon" onClick={() => { if (confirm('¿Eliminar esta cuenta?')) actions.remove('usuarios', u.id); }}><Trash2 size={13} /></button>
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

            <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'Editar cuenta' : mode === 'desde-empleado' ? 'Nueva cuenta desde empleado' : 'Nueva cuenta'} size="md">
                {mode === 'desde-empleado' && !form.empleadoId && (
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 13, marginBottom: 10, color: 'var(--text-muted)' }}>Elegí un empleado — se auto-completan los datos:</div>
                        <div style={{ display: 'grid', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                            {empleadosSinCuenta.map(emp => (
                                <button key={emp.id} onClick={() => vincularEmpleado(emp.id)} style={{ padding: 12, background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 10, textAlign: 'left', cursor: 'pointer', color: 'var(--text-primary)' }}>
                                    <div style={{ fontWeight: 600 }}>{emp.nombre} {emp.apellido || ''}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{emp.rol || 'Sin rol'}{emp.email ? ' · ' + emp.email : ''}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {(mode === 'nuevo' || form.empleadoId || editId) && (
                    <>
                        {form.empleadoId && (
                            <InfoBox variant="success" style={{ marginBottom: 12 }}>
                                ✓ Vinculado a empleado: <strong>{state.empleados.find(e => e.id === form.empleadoId)?.nombre}</strong>
                                <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8, padding: '2px 8px' }} onClick={() => setForm({ ...form, empleadoId: '' })}>Quitar vínculo</button>
                            </InfoBox>
                        )}

                        <div className="form-grid">
                            <Field label="Nombre completo" required><input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></Field>
                            <Field label="Email" required hint="Con este email ingresa al sistema"><input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
                            <Field label="Rol" required>
                                <select className="select" value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })}>
                                    {ROLES.map(r => <option key={r.id} value={r.id}>{r.nombre} — {r.desc}</option>)}
                                </select>
                            </Field>
                            <Field label="Sucursal" hint="Vacío = todas">
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
                            {!editId && (
                                <Field label="Contraseña" hint="Min 6 chars. Cloud mode: crea en Firebase Auth.">
                                    <input className="input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Dejá vacío si no va a ingresar" />
                                </Field>
                            )}
                        </div>

                        {msg && (
                            <div style={{ marginTop: 12, padding: 10, background: msg.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', borderRadius: 8, fontSize: 12 }}>{msg}</div>
                        )}

                        <div className="flex gap-2 mt-4 justify-end">
                            <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={save} disabled={creating}>
                                {creating ? '⏳ Creando...' : editId ? 'Guardar' : 'Crear cuenta'}
                            </button>
                        </div>
                    </>
                )}
            </Modal>
        </div>
    );
}
