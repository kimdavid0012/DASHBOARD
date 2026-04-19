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
    const [viewMode, setViewMode] = useState(() => localStorage.getItem('mesas_view') || 'grid'); // grid | layout

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
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: 8, padding: 2 }}>
                            <button
                                onClick={() => { setViewMode('grid'); localStorage.setItem('mesas_view', 'grid'); }}
                                style={{
                                    padding: '6px 12px',
                                    background: viewMode === 'grid' ? 'var(--accent-soft)' : 'transparent',
                                    color: viewMode === 'grid' ? 'var(--accent)' : 'var(--text-muted)',
                                    border: 'none',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    fontWeight: 600
                                }}
                            >
                                📋 Grid
                            </button>
                            <button
                                onClick={() => { setViewMode('layout'); localStorage.setItem('mesas_view', 'layout'); }}
                                style={{
                                    padding: '6px 12px',
                                    background: viewMode === 'layout' ? 'var(--accent-soft)' : 'transparent',
                                    color: viewMode === 'layout' ? 'var(--accent)' : 'var(--text-muted)',
                                    border: 'none',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    fontWeight: 600
                                }}
                            >
                                🗺️ Salón
                            </button>
                        </div>
                        <button className="btn btn-primary" onClick={() => { setForm({ ...EMPTY, sucursalId: current !== 'all' ? current : (state.sucursales[0]?.id || '') }); setEditId(null); setOpen(true); }} disabled={state.sucursales.length === 0}>
                            <Plus size={14} /> Nueva mesa
                        </button>
                    </div>
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
                ) : viewMode === 'layout' ? (
                    <SalonLayout
                        mesas={mesas}
                        state={state}
                        actions={actions}
                        cambiarEstado={cambiarEstado}
                        setForm={setForm}
                        setEditId={setEditId}
                        setOpen={setOpen}
                        EMPTY={EMPTY}
                    />
                ) : (() => {
                    // Agrupar por ubicación
                    const grupos = {};
                    mesas.forEach(m => {
                        const loc = m.ubicacion || 'Salón';
                        if (!grupos[loc]) grupos[loc] = [];
                        grupos[loc].push(m);
                    });

                    // Para cada mesa, buscar si tiene comanda activa (venta con kdsEstado != entregada)
                    const comandaDe = (mesaId) => {
                        return (state.ventas || []).find(v =>
                            v.mesaId === mesaId &&
                            v.kdsEstado !== 'entregada' &&
                            (Date.now() - new Date(v.fecha).getTime()) < 8 * 60 * 60 * 1000
                        );
                    };

                    const mesaEmoji = (cap) => {
                        if (cap <= 2) return '🪑'; if (cap <= 4) return '🪑🪑';
                        if (cap <= 6) return '🪑×6'; return '🪑×' + cap;
                    };

                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            {Object.keys(grupos).sort().map(loc => (
                                <div key={loc}>
                                    <div style={{
                                        fontFamily: 'var(--font-display)',
                                        fontSize: 16, fontWeight: 700,
                                        marginBottom: 12,
                                        color: 'var(--text-primary)',
                                        borderLeft: '3px solid var(--accent)',
                                        paddingLeft: 10
                                    }}>
                                        📍 {loc} <span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 400 }}>· {grupos[loc].length} mesa{grupos[loc].length !== 1 ? 's' : ''}</span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                                        {grupos[loc].sort((a, b) => a.numero - b.numero).map(m => {
                                            const comanda = comandaDe(m.id);
                                            const estado = comanda ? 'ocupada' : m.estado;
                                            const color = estado === 'libre' ? '#22c55e' : estado === 'ocupada' ? '#f59e0b' : '#a855f7';
                                            const bg = estado === 'libre' ? 'rgba(34,197,94,0.06)' : estado === 'ocupada' ? 'rgba(245,158,11,0.08)' : 'rgba(168,85,247,0.06)';
                                            const ageMin = comanda ? Math.floor((Date.now() - new Date(comanda.fecha).getTime()) / 60000) : 0;
                                            const total = comanda ? Number(comanda.total || 0) : 0;

                                            return (
                                                <div key={m.id} style={{
                                                    background: bg,
                                                    border: `2px solid ${color}`,
                                                    borderRadius: 14,
                                                    padding: 14,
                                                    textAlign: 'center',
                                                    position: 'relative',
                                                    transition: 'transform 0.15s var(--ease)',
                                                    cursor: 'pointer'
                                                }}
                                                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                                onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                                                    <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                                                        {m.numero}
                                                    </div>
                                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                                                        <Users size={9} style={{ display: 'inline', verticalAlign: 'middle' }} /> {m.capacidad} pax
                                                    </div>

                                                    {/* Estado badge */}
                                                    <div style={{
                                                        display: 'inline-block',
                                                        padding: '3px 10px',
                                                        background: color,
                                                        color: '#0a0a0f',
                                                        fontSize: 10,
                                                        fontWeight: 700,
                                                        textTransform: 'uppercase',
                                                        borderRadius: 20,
                                                        marginTop: 8
                                                    }}>
                                                        {estado}
                                                    </div>

                                                    {/* Comanda info */}
                                                    {comanda && (
                                                        <div style={{
                                                            marginTop: 8, padding: '6px 8px',
                                                            background: 'rgba(0,0,0,0.15)',
                                                            borderRadius: 8,
                                                            fontSize: 11,
                                                            lineHeight: 1.4
                                                        }}>
                                                            <div><strong>${total.toLocaleString('es-AR')}</strong></div>
                                                            <div style={{ color: ageMin > 60 ? 'var(--danger, #fb7185)' : 'var(--text-muted)' }}>
                                                                ⏱️ {ageMin}min {ageMin > 60 ? '⚠️' : ''}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Quick estado buttons */}
                                                    <div style={{ display: 'flex', gap: 2, marginTop: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                                                        {['libre', 'ocupada', 'reservada'].filter(e => e !== m.estado).map(e => (
                                                            <button key={e} className="btn btn-ghost"
                                                                style={{ fontSize: 9, padding: '3px 6px', minHeight: 'auto' }}
                                                                onClick={() => cambiarEstado(m.id, e)}>
                                                                {e === 'libre' ? '✓' : e === 'ocupada' ? '👥' : '📅'}
                                                            </button>
                                                        ))}
                                                        <button className="btn btn-ghost" style={{ fontSize: 9, padding: '3px 6px', minHeight: 'auto' }}
                                                            onClick={() => { setForm({ ...EMPTY, ...m }); setEditId(m.id); setOpen(true); }}>
                                                            <Pencil size={10} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                })()}
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
import { CookingPot, CheckCheck, Timer, Flame, Volume2, VolumeX, Printer } from 'lucide-react';
import { TicketPrinter } from '../utils/printer';

// WebAudio beep — sin archivos, generado on-the-fly
function playBeep(frequency = 880, duration = 180) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = frequency;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration / 1000);
        setTimeout(() => ctx.close(), duration + 100);
    } catch { /* user hasn't interacted yet */ }
}

export function KDSPage() {
    const { state, actions } = useData();
    const [tick, setTick] = useState(0);
    const [soundOn, setSoundOn] = useState(() => localStorage.getItem('kds_sound') !== 'off');
    const [lastComandaIds, setLastComandaIds] = useState(new Set());

    // Re-render cada 30s para actualizar 'hace 3min'
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

    // Sonido al llegar comanda nueva
    React.useEffect(() => {
        const newIds = new Set(nuevas.map(c => c.id));
        const fresh = [...newIds].filter(id => !lastComandaIds.has(id));
        if (fresh.length > 0 && lastComandaIds.size > 0 && soundOn) {
            // 2 beeps rápidos
            playBeep(880, 150);
            setTimeout(() => playBeep(1100, 200), 180);

            // Notificación local si no estamos en la tab activa
            if (document.visibilityState !== 'visible') {
                import('../utils/notifications').then(({ showLocalNotification }) => {
                    const mesa = state.mesas?.find(m => m.id === fresh[0] && nuevas.find(n => n.id === fresh[0])?.mesaId);
                    showLocalNotification({
                        title: '🍳 Nueva comanda',
                        body: `${fresh.length} comanda${fresh.length > 1 ? 's' : ''} nueva${fresh.length > 1 ? 's' : ''} en cocina`,
                        tag: 'kds-new',
                        url: '/'
                    });
                });
            }
        }
        setLastComandaIds(newIds);
    }, [nuevas.length]);

    // Stats del día: promedio de tiempo en cocina
    const statsCocina = React.useMemo(() => {
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        const entregadas = (state.ventas || [])
            .filter(v => v.mesaId && v.kdsEstado === 'entregada' && new Date(v.fecha).getTime() >= hoy.getTime());
        if (entregadas.length === 0) return { count: 0, avgMin: 0 };
        const tiempos = entregadas
            .map(v => {
                if (!v.kdsUpdatedAt) return null;
                return (new Date(v.kdsUpdatedAt).getTime() - new Date(v.fecha).getTime()) / 60000;
            })
            .filter(t => t !== null && t > 0 && t < 180); // filtra outliers > 3h
        if (tiempos.length === 0) return { count: entregadas.length, avgMin: 0 };
        const avg = tiempos.reduce((a, b) => a + b, 0) / tiempos.length;
        return { count: entregadas.length, avgMin: Math.round(avg) };
    }, [state.ventas, tick]);

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

    const printCocina = async (venta) => {
        // Ticket de cocina: sin precios, solo items
        try {
            await TicketPrinter.quickPrint({
                business: { name: `🍳 COCINA — ${mesaDe(venta)}` },
                items: (venta.items || []).map(it => ({
                    nombre: it.nombre + (it.variantLabel ? ` (${it.variantLabel})` : ''),
                    cantidad: it.cantidad,
                    precio: 0 // oculto
                })),
                total: 0,
                fecha: new Date(venta.fecha),
                numero: `COC-${String(venta.id).slice(-6)}`
            });
        } catch (err) {
            alert('Error al imprimir: ' + err.message);
        }
    };

    const toggleSound = () => {
        const next = !soundOn;
        setSoundOn(next);
        localStorage.setItem('kds_sound', next ? 'on' : 'off');
        if (next) playBeep(660, 120);
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
                <div style={{ display: 'flex', gap: 6 }}>
                    <button
                        className="btn"
                        style={{
                            flex: 1,
                            minHeight: 48,
                            fontSize: 15,
                            background: accent || 'var(--accent)',
                            color: '#0a0a0f'
                        }}
                        onClick={() => updateEstado(venta.id, nextState)}
                    >
                        <Icon size={18} /> {buttonLabel}
                    </button>
                    {nextState === 'preparando' && (
                        <button
                            className="btn btn-ghost btn-icon"
                            style={{ minHeight: 48, width: 48 }}
                            onClick={() => printCocina(venta)}
                            title="Imprimir comanda de cocina"
                        >
                            <Printer size={18} />
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div>
            <PageHeader
                icon={CookingPot}
                title="KDS · Cocina en vivo"
                subtitle={`${nuevas.length + preparando.length + listas.length} comandas activas · ${statsCocina.count > 0 ? `⏱️ promedio cocina hoy: ${statsCocina.avgMin}min` : 'actualización automática'}`}
                actions={
                    <button
                        className="btn btn-ghost"
                        onClick={toggleSound}
                        title={soundOn ? 'Desactivar sonido' : 'Activar sonido'}
                    >
                        {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
                        {soundOn ? ' Sonido ON' : ' Sonido OFF'}
                    </button>
                }
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

// ═══════════════════════════════════════════════════════════════════
// SALON LAYOUT — canvas visual con drag-and-drop de mesas
// Cada mesa guarda x,y en el producto. Se puede arrastrar para posicionar.
// Dueño guarda el layout del local y el mozo ve estado en vivo.
// ═══════════════════════════════════════════════════════════════════
function SalonLayout({ mesas, state, actions, cambiarEstado, setForm, setEditId, setOpen, EMPTY }) {
    const canvasRef = React.useRef(null);
    const [draggingId, setDraggingId] = React.useState(null);
    const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });
    const [editMode, setEditMode] = React.useState(false);
    const [zoom, setZoom] = React.useState(1);

    // Comanda activa por mesa (para mostrar tiempo)
    const comandaDe = (mesaId) => {
        const cutoff = Date.now() - 8 * 60 * 60 * 1000;
        return (state.ventas || []).find(v =>
            v.mesaId === mesaId &&
            v.kdsEstado !== 'entregada' &&
            new Date(v.fecha).getTime() > cutoff
        );
    };

    // Pointer handlers — mouse + touch
    const onPointerDown = (e, mesa) => {
        if (!editMode) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / zoom;
        const y = (e.clientY - rect.top) / zoom;
        setDraggingId(mesa.id);
        setDragOffset({
            x: x - (mesa.x || 50),
            y: y - (mesa.y || 50)
        });
    };

    const onPointerMove = (e) => {
        if (!draggingId) return;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = Math.max(0, Math.min((e.clientX - rect.left) / zoom - dragOffset.x, rect.width / zoom - 80));
        const y = Math.max(0, Math.min((e.clientY - rect.top) / zoom - dragOffset.y, rect.height / zoom - 80));
        // Optimistic update solo en memoria mientras arrastramos
        actions.update('mesas', draggingId, { x, y });
    };

    const onPointerUp = () => {
        setDraggingId(null);
    };

    // Auto-organizar las mesas sin posición en grid
    React.useEffect(() => {
        let changed = false;
        const patches = [];
        mesas.forEach((m, i) => {
            if (m.x === undefined || m.y === undefined) {
                const col = i % 5;
                const row = Math.floor(i / 5);
                patches.push({ id: m.id, x: 40 + col * 110, y: 40 + row * 110 });
                changed = true;
            }
        });
        if (changed) {
            patches.forEach(p => actions.update('mesas', p.id, { x: p.x, y: p.y }));
        }
    }, [mesas.length]);

    return (
        <div>
            {/* Toolbar */}
            <div style={{
                display: 'flex',
                gap: 10,
                marginBottom: 12,
                padding: 10,
                background: 'var(--bg-elevated)',
                borderRadius: 10,
                alignItems: 'center',
                flexWrap: 'wrap'
            }}>
                <button
                    className={editMode ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                    onClick={() => setEditMode(!editMode)}
                >
                    {editMode ? '✓ Modo edición (arrastrá mesas)' : '✏️ Editar layout'}
                </button>

                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}>−</button>
                    <span style={{ fontSize: 12, minWidth: 40, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => setZoom(Math.min(1.5, zoom + 0.1))}>+</button>
                </div>

                <div style={{ flex: 1, fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
                    {editMode
                        ? '💡 Arrastrá las mesas para posicionarlas. El layout se guarda automáticamente.'
                        : '👁️ Vista salón — activá "Editar" para mover las mesas.'}
                </div>
            </div>

            {/* Canvas */}
            <div
                ref={canvasRef}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
                style={{
                    position: 'relative',
                    width: '100%',
                    height: 560,
                    background: `
                        repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(99,241,203,0.05) 39px, rgba(99,241,203,0.05) 40px),
                        repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(99,241,203,0.05) 39px, rgba(99,241,203,0.05) 40px),
                        var(--bg-app)
                    `,
                    border: '1px solid var(--border-color)',
                    borderRadius: 12,
                    overflow: 'hidden',
                    touchAction: editMode ? 'none' : 'auto'
                }}
            >
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    transform: `scale(${zoom})`,
                    transformOrigin: '0 0',
                    width: `${100 / zoom}%`,
                    height: `${100 / zoom}%`
                }}>
                    {mesas.map(m => {
                        const comanda = comandaDe(m.id);
                        const estado = comanda ? 'ocupada' : (m.estado || 'libre');
                        const color = estado === 'libre' ? '#22c55e' : estado === 'ocupada' ? '#f59e0b' : '#a855f7';
                        const bg = estado === 'libre' ? 'rgba(34,197,94,0.15)' : estado === 'ocupada' ? 'rgba(245,158,11,0.15)' : 'rgba(168,85,247,0.15)';
                        const ageMin = comanda ? Math.floor((Date.now() - new Date(comanda.fecha).getTime()) / 60000) : 0;
                        const urgent = ageMin > 60;
                        const size = Math.max(70, Math.min(110, 60 + m.capacidad * 6));

                        return (
                            <div
                                key={m.id}
                                onPointerDown={e => onPointerDown(e, m)}
                                onClick={e => {
                                    if (editMode || draggingId) return;
                                    // En modo view: click cicla estado libre→ocupada→reservada→libre
                                    const nextEstado = m.estado === 'libre' ? 'ocupada' : m.estado === 'ocupada' ? 'reservada' : 'libre';
                                    cambiarEstado(m.id, nextEstado);
                                }}
                                onDoubleClick={() => {
                                    if (editMode) return;
                                    setForm({ ...EMPTY, ...m });
                                    setEditId(m.id);
                                    setOpen(true);
                                }}
                                style={{
                                    position: 'absolute',
                                    left: m.x || 50,
                                    top: m.y || 50,
                                    width: size,
                                    height: size,
                                    borderRadius: m.capacidad >= 6 ? '18px' : '50%',
                                    background: bg,
                                    border: `3px solid ${color}`,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: editMode ? 'grab' : 'pointer',
                                    userSelect: 'none',
                                    touchAction: editMode ? 'none' : 'auto',
                                    transition: draggingId === m.id ? 'none' : 'transform 0.15s, box-shadow 0.15s',
                                    transform: draggingId === m.id ? 'scale(1.08)' : 'scale(1)',
                                    boxShadow: draggingId === m.id ? '0 12px 30px rgba(0,0,0,0.4)' : urgent ? '0 0 0 3px rgba(239,68,68,0.4)' : 'none',
                                    zIndex: draggingId === m.id ? 100 : 1
                                }}
                                title={editMode ? 'Arrastrá para mover' : 'Click: cambiar estado · Doble-click: editar'}
                            >
                                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                                    {m.numero}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                                    {m.capacidad} pax
                                </div>
                                {comanda && (
                                    <div style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color: urgent ? '#ef4444' : color,
                                        marginTop: 3
                                    }}>
                                        ⏱️ {ageMin}m
                                    </div>
                                )}
                                {editMode && (
                                    <div style={{
                                        position: 'absolute',
                                        top: -6, right: -6,
                                        background: 'var(--accent)',
                                        color: '#0a0a0f',
                                        width: 18, height: 18,
                                        borderRadius: '50%',
                                        fontSize: 10,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        ⇕
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Leyenda */}
            <div style={{
                display: 'flex',
                gap: 16,
                marginTop: 12,
                padding: 10,
                background: 'var(--bg-elevated)',
                borderRadius: 10,
                fontSize: 12,
                flexWrap: 'wrap',
                justifyContent: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'rgba(34,197,94,0.2)', border: '2px solid #22c55e' }} />
                    <span>Libre</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'rgba(245,158,11,0.2)', border: '2px solid #f59e0b' }} />
                    <span>Ocupada</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'rgba(168,85,247,0.2)', border: '2px solid #a855f7' }} />
                    <span>Reservada</span>
                </div>
                <div style={{ color: 'var(--text-muted)' }}>
                    · Circular = hasta 4 pax · Redondeada = 6+ pax
                </div>
            </div>
        </div>
    );
}
