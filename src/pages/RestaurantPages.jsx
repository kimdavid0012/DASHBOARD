import React, { useState } from 'react';
import {
    Armchair, Plus, Pencil, Trash2, CalendarClock, Users,
    CheckCircle, Clock, XCircle
} from 'lucide-react';
import { useData, filterBySucursal, SECTION_HELP } from '../store/DataContext';
import { PageHeader, Card, Modal, Field, EmptyState, Badge, KpiCard, fmtDate } from '../components/UI';

// ═══════════════════════════ MESAS ═══════════════════════════
export function MesasPage() {
    const { state, actions } = useData();
    const current = state.meta.currentSucursalId || 'all';
    const mesas = filterBySucursal(state.mesas, current);
    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const EMPTY = { numero: '', capacidad: 4, ubicacion: 'Salón', estado: 'libre', sucursalId: '', notas: '' };
    const [form, setForm] = useState(EMPTY);

    const save = () => {
        if (!form.numero) return alert('Número de mesa obligatorio');
        if (!form.sucursalId) return alert('Elegí sucursal');
        const patch = { ...form, capacidad: Number(form.capacidad), numero: Number(form.numero) };
        if (editId) actions.update('mesas', editId, patch);
        else actions.add('mesas', patch);
        setOpen(false);
    };

    const cambiarEstado = (id, estado) => actions.update('mesas', id, { estado });

    return (
        <div>
            <PageHeader
                icon={Armchair}
                title="Mesas"
                subtitle="Gestión de mesas del salón"
                help={SECTION_HELP.mesas}
                actions={
                    <button className="btn btn-primary" onClick={() => { setForm({ ...EMPTY, sucursalId: current !== 'all' ? current : (state.sucursales[0]?.id || '') }); setEditId(null); setOpen(true); }} disabled={state.sucursales.length === 0}>
                        <Plus size={14} /> Nueva mesa
                    </button>
                }
            />

            <div className="kpi-grid mb-4">
                <KpiCard icon={<Armchair size={20} />} label="Mesas totales" value={mesas.length} color="#63f1cb" />
                <KpiCard icon={<CheckCircle size={20} />} label="Libres" value={mesas.filter(m => m.estado === 'libre').length} color="#22c55e" />
                <KpiCard icon={<Users size={20} />} label="Ocupadas" value={mesas.filter(m => m.estado === 'ocupada').length} color="#f59e0b" />
                <KpiCard icon={<XCircle size={20} />} label="Reservadas" value={mesas.filter(m => m.estado === 'reservada').length} color="#a855f7" />
            </div>

            <Card>
                {mesas.length === 0 ? (
                    <EmptyState
                        icon={Armchair}
                        title="Todavía no hay mesas cargadas"
                        description="Agregá las mesas de tu salón para gestionar comandas y reservas."
                        action={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={14} /> Crear primera mesa</button>}
                        tips={[
                            'Número identificador y capacidad (personas)',
                            'Ubicación: salón, terraza, barra, reservado',
                            'Estado en tiempo real: libre / ocupada / reservada',
                            'Al hacer comandas podés asignarle la mesa'
                        ]}
                        example="Salón principal: mesas 1-15 (4 pax), mesas 16-20 (6 pax). Terraza: mesas 21-28. Barra: 6 banquetas."
                    />
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                        {mesas.sort((a, b) => a.numero - b.numero).map(m => {
                            const color = m.estado === 'libre' ? '#22c55e' : m.estado === 'ocupada' ? '#f59e0b' : '#a855f7';
                            return (
                                <div key={m.id} style={{
                                    background: 'var(--bg-elevated)',
                                    border: `2px solid ${color}`,
                                    borderRadius: 12,
                                    padding: 16,
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>
                                        {m.numero}
                                    </div>
                                    <div className="text-xs text-muted mt-1">
                                        <Users size={10} style={{ display: 'inline' }} /> {m.capacidad} pax · {m.ubicacion}
                                    </div>
                                    <Badge variant={m.estado === 'libre' ? 'success' : m.estado === 'ocupada' ? 'warning' : 'info'} >
                                        {m.estado}
                                    </Badge>
                                    <div className="flex gap-1 mt-2" style={{ justifyContent: 'center' }}>
                                        {['libre', 'ocupada', 'reservada'].filter(e => e !== m.estado).map(e => (
                                            <button key={e} className="btn btn-ghost btn-sm" style={{ fontSize: 9, padding: '2px 6px' }} onClick={() => cambiarEstado(m.id, e)}>{e}</button>
                                        ))}
                                    </div>
                                    <div className="flex gap-1 mt-2" style={{ justifyContent: 'center' }}>
                                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setForm({ ...EMPTY, ...m }); setEditId(m.id); setOpen(true); }}><Pencil size={10} /></button>
                                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => { if (confirm('¿Eliminar mesa?')) actions.remove('mesas', m.id); }}><Trash2 size={10} /></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>

            <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'Editar mesa' : 'Nueva mesa'}>
                <div className="form-grid">
                    <Field label="Número de mesa" required><input className="input" type="number" value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} /></Field>
                    <Field label="Capacidad (pax)"><input className="input" type="number" value={form.capacidad} onChange={e => setForm({ ...form, capacidad: e.target.value })} /></Field>
                    <Field label="Ubicación">
                        <select className="select" value={form.ubicacion} onChange={e => setForm({ ...form, ubicacion: e.target.value })}>
                            <option>Salón</option><option>Terraza</option><option>Barra</option><option>Reservado</option><option>VIP</option>
                        </select>
                    </Field>
                    <Field label="Sucursal" required>
                        <select className="select" value={form.sucursalId} onChange={e => setForm({ ...form, sucursalId: e.target.value })}>
                            <option value="">Elegir...</option>
                            {state.sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                        </select>
                    </Field>
                    <Field label="Estado">
                        <select className="select" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                            <option value="libre">Libre</option><option value="ocupada">Ocupada</option><option value="reservada">Reservada</option>
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

// ═══════════════════════════ RESERVAS ═══════════════════════════
export function ReservasPage() {
    const { state, actions } = useData();
    const current = state.meta.currentSucursalId || 'all';
    const reservas = filterBySucursal(state.reservas, current).slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const EMPTY = {
        clienteNombre: '', clienteTel: '',
        fecha: new Date().toISOString().slice(0, 10),
        hora: '20:30',
        personas: 2, mesaId: '',
        sucursalId: '', estado: 'confirmada', notas: ''
    };
    const [form, setForm] = useState(EMPTY);

    const save = () => {
        if (!form.clienteNombre) return alert('Nombre del cliente obligatorio');
        if (!form.sucursalId) return alert('Elegí sucursal');
        const patch = { ...form, personas: Number(form.personas) };
        if (editId) actions.update('reservas', editId, patch);
        else actions.add('reservas', patch);
        setOpen(false);
    };

    const hoy = new Date().toISOString().slice(0, 10);
    const reservasHoy = reservas.filter(r => r.fecha === hoy);
    const proximas = reservas.filter(r => r.fecha > hoy).length;

    return (
        <div>
            <PageHeader
                icon={CalendarClock}
                title="Reservas"
                subtitle={state.business.rubro === 'restaurante' ? 'Reservas de mesas' : 'Turnos y reservas'}
                help={SECTION_HELP.reservas}
                actions={
                    <button className="btn btn-primary" onClick={() => { setForm({ ...EMPTY, sucursalId: current !== 'all' ? current : (state.sucursales[0]?.id || '') }); setEditId(null); setOpen(true); }} disabled={state.sucursales.length === 0}>
                        <Plus size={14} /> Nueva reserva
                    </button>
                }
            />

            <div className="kpi-grid mb-4">
                <KpiCard icon={<CalendarClock size={20} />} label="Reservas totales" value={reservas.length} color="#63f1cb" />
                <KpiCard icon={<Clock size={20} />} label="Para hoy" value={reservasHoy.length} color="#f59e0b" />
                <KpiCard icon={<CalendarClock size={20} />} label="Próximas" value={proximas} color="#60a5fa" />
                <KpiCard icon={<Users size={20} />} label="Personas hoy" value={reservasHoy.reduce((s, r) => s + Number(r.personas || 0), 0)} color="#a855f7" />
            </div>

            <Card>
                {reservas.length === 0 ? (
                    <EmptyState
                        icon={CalendarClock}
                        title="Sin reservas cargadas"
                        description="Registrá reservas para organizar turnos y mesas."
                        action={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={14} /> Cargar primera reserva</button>}
                        tips={[
                            'Cliente, teléfono, fecha, hora y cantidad de personas',
                            state.business.rubro === 'restaurante' ? 'Asignación de mesa' : 'Asignación de empleado',
                            'Estados: confirmada, pendiente, cancelada, no show',
                            'Lista agrupada por día con totales'
                        ]}
                        example={state.business.rubro === 'restaurante'
                            ? 'Viernes 20:30 - Pérez (4 pax) - Mesa 12 - "Mesa ventana"'
                            : 'Turno Martes 10:00 - María López - 1h - "Sesión de coaching"'}
                    />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead><tr>
                                <th>Fecha / Hora</th><th>Cliente</th><th>Personas</th>
                                {state.business.rubro === 'restaurante' && <th>Mesa</th>}
                                <th>Sucursal</th><th>Estado</th><th></th>
                            </tr></thead>
                            <tbody>
                                {reservas.map(r => (
                                    <tr key={r.id}>
                                        <td>
                                            <div className="font-semibold">{fmtDate(r.fecha)}</div>
                                            <div className="text-xs text-muted">{r.hora}</div>
                                        </td>
                                        <td>
                                            <div className="font-semibold">{r.clienteNombre}</div>
                                            {r.clienteTel && <div className="text-xs text-muted">{r.clienteTel}</div>}
                                        </td>
                                        <td>{r.personas}</td>
                                        {state.business.rubro === 'restaurante' && <td>{(() => {
                                            const m = state.mesas.find(x => x.id === r.mesaId);
                                            return m ? `Mesa ${m.numero}` : '—';
                                        })()}</td>}
                                        <td className="text-sm">{state.sucursales.find(s => s.id === r.sucursalId)?.nombre || '—'}</td>
                                        <td><Badge variant={r.estado === 'confirmada' ? 'success' : r.estado === 'cancelada' ? 'danger' : 'warning'}>{r.estado}</Badge></td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setForm({ ...EMPTY, ...r }); setEditId(r.id); setOpen(true); }}><Pencil size={13} /></button>
                                            <button className="btn btn-danger btn-sm btn-icon" onClick={() => { if (confirm('¿Eliminar?')) actions.remove('reservas', r.id); }}><Trash2 size={13} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'Editar reserva' : 'Nueva reserva'}>
                <div className="form-grid">
                    <Field label="Cliente" required><input className="input" value={form.clienteNombre} onChange={e => setForm({ ...form, clienteNombre: e.target.value })} /></Field>
                    <Field label="Teléfono"><input className="input" value={form.clienteTel} onChange={e => setForm({ ...form, clienteTel: e.target.value })} /></Field>
                    <Field label="Fecha"><input className="input" type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} /></Field>
                    <Field label="Hora"><input className="input" type="time" value={form.hora} onChange={e => setForm({ ...form, hora: e.target.value })} /></Field>
                    <Field label="Personas"><input className="input" type="number" value={form.personas} onChange={e => setForm({ ...form, personas: e.target.value })} /></Field>
                    <Field label="Sucursal" required>
                        <select className="select" value={form.sucursalId} onChange={e => setForm({ ...form, sucursalId: e.target.value })}>
                            <option value="">Elegir...</option>
                            {state.sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                        </select>
                    </Field>
                    {state.business.rubro === 'restaurante' && (
                        <Field label="Mesa">
                            <select className="select" value={form.mesaId} onChange={e => setForm({ ...form, mesaId: e.target.value })}>
                                <option value="">Sin asignar</option>
                                {filterBySucursal(state.mesas, form.sucursalId).map(m => <option key={m.id} value={m.id}>Mesa {m.numero} ({m.capacidad} pax)</option>)}
                            </select>
                        </Field>
                    )}
                    <Field label="Estado">
                        <select className="select" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                            <option value="confirmada">Confirmada</option>
                            <option value="pendiente">Pendiente</option>
                            <option value="cancelada">Cancelada</option>
                            <option value="no_show">No show</option>
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
