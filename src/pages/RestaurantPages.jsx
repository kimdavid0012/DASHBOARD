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

// ═══════════════════════════════════════════════════════════════════
// KDS — Kitchen Display System
// Muestra comandas en tiempo real desde ventas con mesaId
// Flujo: nueva → preparando → lista → entregada
// ═══════════════════════════════════════════════════════════════════
import { CookingPot, CheckCheck, Timer, Flame } from 'lucide-react';

export function KDSPage() {
    const { state, actions } = useData();
    const [tick, setTick] = useState(0); // Forzar re-render cada 30s para tiempos

    // Re-render cada 30s para actualizar "hace 3min"
    React.useEffect(() => {
        const t = setInterval(() => setTick(n => n + 1), 30000);
        return () => clearInterval(t);
    }, []);

    // Todas las ventas (comandas) que tengan mesaId asignado
    // Filtradas a las últimas 12hs para no saturar la pantalla
    const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
    const comandasTodas = (state.ventas || [])
        .filter(v => v.mesaId && new Date(v.fecha).getTime() > twelveHoursAgo)
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    // Agrupar por estado (default nueva si no tiene kdsEstado)
    const nuevas = comandasTodas.filter(v => !v.kdsEstado || v.kdsEstado === 'nueva');
    const preparando = comandasTodas.filter(v => v.kdsEstado === 'preparando');
    const listas = comandasTodas.filter(v => v.kdsEstado === 'lista');

    const mesaDe = (v) => {
        const m = state.mesas?.find(x => x.id === v.mesaId);
        return m ? (m.nombre || `#${m.numero}`) : '?';
    };

    const minutesAgo = (iso) => {
        const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
        if (mins < 1) return 'ahora';
        if (mins < 60) return `${mins}min`;
        return `${Math.floor(mins / 60)}h ${mins % 60}m`;
    };

    const updateEstado = (ventaId, nuevoEstado) => {
        actions.update('ventas', ventaId, {
            kdsEstado: nuevoEstado,
            kdsUpdatedAt: new Date().toISOString()
        });
    };

    const ComandaCard = ({ venta, nextState, buttonLabel, buttonIcon: Icon, accent }) => {
        const ageMin = Math.floor((Date.now() - new Date(venta.fecha).getTime()) / 60000);
        const isUrgent = ageMin > 15; // Más de 15 min = urgente

        return (
            <div style={{
                background: isUrgent ? 'rgba(251, 113, 133, 0.08)' : 'var(--bg-card)',
                border: `2px solid ${isUrgent ? 'rgba(251, 113, 133, 0.5)' : 'var(--border-color)'}`,
                borderRadius: 14,
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                position: 'relative'
            }}>
                {isUrgent && (
                    <div style={{
                        position: 'absolute', top: -8, right: -8,
                        background: 'var(--danger, #fb7185)',
                        color: 'white', fontSize: 10, fontWeight: 700,
                        padding: '3px 8px', borderRadius: 12,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                    }}>
                        🔥 URGENTE
                    </div>
                )}

                {/* Header: Mesa + tiempo */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 22,
                        fontWeight: 700,
                        color: 'var(--accent)'
                    }}>
                        🪑 {mesaDe(venta)}
                    </div>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        fontSize: 13,
                        color: isUrgent ? 'var(--danger, #fb7185)' : 'var(--text-muted)',
                        fontWeight: 600
                    }}>
                        <Timer size={13} /> {minutesAgo(venta.fecha)}
                    </div>
                </div>

                {/* Items */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 10 }}>
                    {(venta.items || []).map((it, i) => (
                        <div key={i} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '4px 0',
                            fontSize: 15,
                            lineHeight: 1.4
                        }}>
                            <span style={{ flex: 1 }}>
                                <strong style={{ color: 'var(--accent)', marginRight: 6 }}>
                                    {it.cantidad}×
                                </strong>
                                {it.nombre}
                                {it.variantLabel && (
                                    <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>
                                        ({it.variantLabel})
                                    </span>
                                )}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Action button */}
                <button
                    className="btn btn-primary btn-lg"
                    style={{
                        width: '100%',
                        minHeight: 48,
                        fontSize: 15,
                        background: accent || 'var(--accent)',
                        color: '#0a0a0f'
                    }}
                    onClick={() => updateEstado(venta.id, nextState)}
                >
                    <Icon size={18} /> {buttonLabel}
                </button>
            </div>
        );
    };

    return (
        <div>
            <PageHeader
                icon={CookingPot}
                title="KDS · Cocina en vivo"
                subtitle={`${nuevas.length + preparando.length + listas.length} comandas activas · actualización automática`}
            />

            {comandasTodas.length === 0 ? (
                <EmptyState
                    icon={CookingPot}
                    title="Cocina libre 🍳"
                    description="Cuando llegue una comanda desde el POS va a aparecer acá en vivo. Dejá esta pantalla abierta en un tablet en la cocina."
                />
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 16,
                    marginTop: 4
                }} className="kds-grid">
                    {/* Columna 1: Nuevas */}
                    <div>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '10px 14px',
                            background: 'rgba(99, 241, 203, 0.1)',
                            border: '1px solid var(--border-accent)',
                            borderRadius: 10,
                            marginBottom: 12,
                            fontFamily: 'var(--font-display)',
                            fontWeight: 700
                        }}>
                            📋 Nuevas ({nuevas.length})
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {nuevas.length === 0 && (
                                <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 20, textAlign: 'center' }}>
                                    Nada nuevo
                                </div>
                            )}
                            {nuevas.map(v => (
                                <ComandaCard
                                    key={v.id}
                                    venta={v}
                                    nextState="preparando"
                                    buttonLabel="Empezar a preparar"
                                    buttonIcon={Flame}
                                    accent="#fbbf24"
                                />
                            ))}
                        </div>
                    </div>

                    {/* Columna 2: Preparando */}
                    <div>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '10px 14px',
                            background: 'rgba(251, 191, 36, 0.1)',
                            border: '1px solid rgba(251, 191, 36, 0.4)',
                            borderRadius: 10,
                            marginBottom: 12,
                            fontFamily: 'var(--font-display)',
                            fontWeight: 700
                        }}>
                            🍳 Preparando ({preparando.length})
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {preparando.length === 0 && (
                                <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 20, textAlign: 'center' }}>
                                    Cocina libre
                                </div>
                            )}
                            {preparando.map(v => (
                                <ComandaCard
                                    key={v.id}
                                    venta={v}
                                    nextState="lista"
                                    buttonLabel="Marcar lista"
                                    buttonIcon={CheckCircle}
                                    accent="#60a5fa"
                                />
                            ))}
                        </div>
                    </div>

                    {/* Columna 3: Listas */}
                    <div>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '10px 14px',
                            background: 'rgba(96, 165, 250, 0.1)',
                            border: '1px solid rgba(96, 165, 250, 0.4)',
                            borderRadius: 10,
                            marginBottom: 12,
                            fontFamily: 'var(--font-display)',
                            fontWeight: 700
                        }}>
                            ✅ Listas para servir ({listas.length})
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {listas.length === 0 && (
                                <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 20, textAlign: 'center' }}>
                                    Sin pedidos esperando
                                </div>
                            )}
                            {listas.map(v => (
                                <ComandaCard
                                    key={v.id}
                                    venta={v}
                                    nextState="entregada"
                                    buttonLabel="Entregada"
                                    buttonIcon={CheckCheck}
                                    accent="#4ade80"
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
