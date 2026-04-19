import React, { useMemo, useState } from 'react';
import {
    Users, Plus, Pencil, Trash2, Phone, Mail, MapPin,
    FileText, DollarSign, Calendar, ClipboardList,
    CreditCard, Wallet, Repeat as RepeatIcon, TrendingDown
} from 'lucide-react';
import { useData, filterBySucursal } from '../store/DataContext';
import { Card, Modal, Field, EmptyState, Badge, KpiCard, fmtMoney, fmtDate, BarChart, CHART_COLORS } from '../components/UI';

// ═══════════════════════════════ CLIENTES ═══════════════════════════════
export function ClientesPage() {
    const { state, actions } = useData();
    const EMPTY = { nombre: '', telefono: '', email: '', dniCuit: '', direccion: '', ciudad: '', provincia: '', notas: '' };
    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [search, setSearch] = useState('');

    const clientes = state.clientes || [];
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return clientes;
        return clientes.filter(c => [c.nombre, c.telefono, c.email, c.dniCuit].some(v => (v || '').toLowerCase().includes(q)));
    }, [clientes, search]);

    // Compras por cliente
    const comprasPorCliente = useMemo(() => {
        const map = {};
        state.ventas.forEach(v => {
            if (!v.clienteId) return;
            map[v.clienteId] = (map[v.clienteId] || 0) + Number(v.total || 0);
        });
        return map;
    }, [state.ventas]);

    const save = () => {
        if (!form.nombre.trim()) return alert('Nombre obligatorio');
        if (editId) actions.update('clientes', editId, form);
        else actions.add('clientes', form);
        setOpen(false);
    };

    return (
        <div className="flex-col gap-4">
            <div className="kpi-grid">
                <KpiCard icon={<Users size={20} />} label="Clientes" value={clientes.length} color="#14b8a6" />
                <KpiCard icon={<Users size={20} />} label="Con compras" value={Object.keys(comprasPorCliente).length} color="#22c55e" />
                <KpiCard icon={<DollarSign size={20} />} label="Volumen total" value={fmtMoney(Object.values(comprasPorCliente).reduce((a, b) => a + b, 0), state.business.moneda)} color="#a855f7" />
            </div>
            <Card title="Clientes" actions={<button className="btn btn-primary" onClick={() => { setForm(EMPTY); setEditId(null); setOpen(true); }}><Plus size={14} /> Nuevo cliente</button>}>
                <div className="mb-3"><input className="input" style={{ maxWidth: 300 }} placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} /></div>
                {clientes.length === 0 ? (
                    <EmptyState icon={Users} title="Todavía no hay clientes"
                        description="Cargá a tus clientes para llevar el histórico de compras."
                        action={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={14} /> Agregar primero</button>}
                        tips={['Nombre, teléfono, email, CUIT/DNI y dirección', 'Total comprado por cliente', 'Filtros por ciudad/provincia', 'En Informes: top clientes por facturación']} />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead><tr><th>Cliente</th><th>Contacto</th><th>CUIT/DNI</th><th>Ubicación</th><th style={{ textAlign: 'right' }}>Comprado</th><th></th></tr></thead>
                            <tbody>
                                {filtered.map(c => (
                                    <tr key={c.id}>
                                        <td className="font-semibold">{c.nombre}</td>
                                        <td>{c.telefono && <div className="text-sm flex items-center gap-1"><Phone size={11} /> {c.telefono}</div>}{c.email && <div className="text-xs text-muted">{c.email}</div>}</td>
                                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.dniCuit || '—'}</td>
                                        <td className="text-sm">{[c.ciudad, c.provincia].filter(Boolean).join(', ') || '—'}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtMoney(comprasPorCliente[c.id] || 0, state.business.moneda)}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setForm({ ...EMPTY, ...c }); setEditId(c.id); setOpen(true); }}><Pencil size={13} /></button>
                                            <button className="btn btn-danger btn-sm btn-icon" onClick={() => { if (confirm('¿Eliminar?')) actions.remove('clientes', c.id); }}><Trash2 size={13} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
            <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'Editar cliente' : 'Nuevo cliente'}>
                <div className="form-grid">
                    <Field label="Nombre" required><input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></Field>
                    <Field label="Teléfono"><input className="input" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} /></Field>
                    <Field label="Email"><input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
                    <Field label="CUIT / DNI"><input className="input" value={form.dniCuit} onChange={e => setForm({ ...form, dniCuit: e.target.value })} /></Field>
                    <Field label="Dirección"><input className="input" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} /></Field>
                    <Field label="Ciudad"><input className="input" value={form.ciudad} onChange={e => setForm({ ...form, ciudad: e.target.value })} /></Field>
                    <Field label="Provincia"><input className="input" value={form.provincia} onChange={e => setForm({ ...form, provincia: e.target.value })} /></Field>
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

// ═══════════════════════════════ GASTOS ═══════════════════════════════
export function GastosPage() {
    const { state, actions } = useData();
    const current = state.meta.currentSucursalId || 'all';
    const gastos = filterBySucursal(state.gastos, current).slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    const CATS = ['Alquiler', 'Servicios', 'Proveedores', 'Sueldos', 'Impuestos', 'Publicidad', 'Logística', 'Mantenimiento', 'Insumos', 'Otro'];
    const EMPTY = { fecha: new Date().toISOString().slice(0, 10), concepto: '', categoria: 'Otro', monto: '', sucursalId: '', metodo: 'Efectivo', notas: '' };
    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState(EMPTY);

    const total = gastos.reduce((s, g) => s + Number(g.monto || 0), 0);
    const porCategoria = useMemo(() => {
        const m = {};
        gastos.forEach(g => { m[g.categoria || 'Otro'] = (m[g.categoria || 'Otro'] || 0) + Number(g.monto || 0); });
        return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([label, value], i) => ({
            label, value, display: fmtMoney(value, state.business.moneda), color: CHART_COLORS[i % CHART_COLORS.length]
        }));
    }, [gastos, state.business.moneda]);

    const save = () => {
        if (!form.concepto.trim() || !form.monto) return alert('Concepto y monto obligatorios');
        const patch = { ...form, monto: Number(form.monto) };
        if (editId) actions.update('gastos', editId, patch);
        else actions.add('gastos', patch);
        setOpen(false);
    };

    return (
        <div className="flex-col gap-4">
            <div className="kpi-grid">
                <KpiCard icon={<TrendingDown size={20} />} label="Gastos registrados" value={gastos.length} color="#ef4444" />
                <KpiCard icon={<DollarSign size={20} />} label="Total" value={fmtMoney(total, state.business.moneda)} color="#f59e0b" />
                <KpiCard icon={<DollarSign size={20} />} label="Este mes" value={fmtMoney(gastos.filter(g => (g.fecha || '').slice(0, 7) === new Date().toISOString().slice(0, 7)).reduce((s, g) => s + Number(g.monto || 0), 0), state.business.moneda)} color="#a855f7" />
            </div>
            {gastos.length > 0 && <Card title="Gastos por categoría"><BarChart data={porCategoria} /></Card>}
            <Card title="Gastos" subtitle={current === 'all' ? 'Todas las sucursales' : state.sucursales.find(s => s.id === current)?.nombre}
                actions={<button className="btn btn-primary" onClick={() => { setForm({ ...EMPTY, sucursalId: current !== 'all' ? current : (state.sucursales[0]?.id || '') }); setEditId(null); setOpen(true); }}><Plus size={14} /> Nuevo gasto</button>}>
                {gastos.length === 0 ? (
                    <EmptyState icon={TrendingDown} title="Todavía no registraste gastos"
                        description="Llevá el control de alquiler, sueldos, proveedores, servicios y más."
                        action={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={14} /> Agregar primero</button>}
                        tips={['Gastos categorizados (alquiler, sueldos, insumos, etc.)', 'Filtro por sucursal', 'Gráficos por categoría', 'Rentabilidad (ventas - gastos) en Informes']} />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th>Sucursal</th><th>Método</th><th style={{ textAlign: 'right' }}>Monto</th><th></th></tr></thead>
                            <tbody>
                                {gastos.map(g => (
                                    <tr key={g.id}>
                                        <td className="text-sm">{fmtDate(g.fecha)}</td>
                                        <td className="font-semibold">{g.concepto}</td>
                                        <td><Badge>{g.categoria}</Badge></td>
                                        <td className="text-sm">{state.sucursales.find(s => s.id === g.sucursalId)?.nombre || '—'}</td>
                                        <td className="text-sm">{g.metodo}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--danger)' }}>{fmtMoney(g.monto, state.business.moneda)}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setForm({ ...EMPTY, ...g }); setEditId(g.id); setOpen(true); }}><Pencil size={13} /></button>
                                            <button className="btn btn-danger btn-sm btn-icon" onClick={() => { if (confirm('¿Eliminar?')) actions.remove('gastos', g.id); }}><Trash2 size={13} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
            <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'Editar gasto' : 'Nuevo gasto'}>
                <div className="form-grid">
                    <Field label="Fecha"><input className="input" type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} /></Field>
                    <Field label="Concepto" required><input className="input" value={form.concepto} onChange={e => setForm({ ...form, concepto: e.target.value })} /></Field>
                    <Field label="Categoría"><select className="select" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>{CATS.map(c => <option key={c}>{c}</option>)}</select></Field>
                    <Field label="Sucursal"><select className="select" value={form.sucursalId} onChange={e => setForm({ ...form, sucursalId: e.target.value })}>
                        <option value="">Sin asignar</option>{state.sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select></Field>
                    <Field label="Monto" required><input className="input" type="number" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} /></Field>
                    <Field label="Método"><select className="select" value={form.metodo} onChange={e => setForm({ ...form, metodo: e.target.value })}>{['Efectivo', 'Transferencia', 'Tarjeta', 'Mercado Pago', 'Cheque'].map(m => <option key={m}>{m}</option>)}</select></Field>
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

// ═══════════════════════════════ CAJA DIARIA ═══════════════════════════════
export function CajaDiariaPage() {
    const { state, actions } = useData();
    const current = state.meta.currentSucursalId || 'all';
    const cajas = filterBySucursal(state.cajaDiaria, current).slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    const EMPTY = { fecha: new Date().toISOString().slice(0, 10), sucursalId: '', montoApertura: '', montoCierre: '', observaciones: '' };
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(EMPTY);

    const ventasDia = (fecha, sucId) => state.ventas.filter(v => (v.fecha || '').slice(0, 10) === fecha && v.sucursalId === sucId).reduce((s, v) => s + Number(v.total || 0), 0);
    const gastosDia = (fecha, sucId) => state.gastos.filter(g => (g.fecha || '').slice(0, 10) === fecha && g.sucursalId === sucId).reduce((s, g) => s + Number(g.monto || 0), 0);

    const save = () => {
        if (!form.sucursalId) return alert('Seleccioná sucursal');
        const ventas = ventasDia(form.fecha, form.sucursalId);
        const gastos = gastosDia(form.fecha, form.sucursalId);
        actions.add('cajaDiaria', { ...form, montoApertura: Number(form.montoApertura || 0), montoCierre: Number(form.montoCierre || 0), ventasDia: ventas, gastosDia: gastos });
        setOpen(false);
    };

    return (
        <div className="flex-col gap-4">
            <Card title="Caja diaria (Cierre Z)" subtitle="Apertura y cierre de caja por sucursal y fecha"
                actions={<button className="btn btn-primary" onClick={() => { setForm({ ...EMPTY, sucursalId: current !== 'all' ? current : (state.sucursales[0]?.id || '') }); setOpen(true); }}><Plus size={14} /> Registrar cierre</button>}>
                {cajas.length === 0 ? (
                    <EmptyState icon={Wallet} title="Todavía no registraste cierres de caja"
                        description="Registrá la apertura y cierre diario para cuadrar efectivo."
                        tips={['Apertura y cierre por sucursal y día', 'Cálculo automático de ventas y gastos del día', 'Diferencia esperado vs real (faltantes)', 'Historial completo para auditoría']} />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead><tr><th>Fecha</th><th>Sucursal</th><th style={{ textAlign: 'right' }}>Apertura</th><th style={{ textAlign: 'right' }}>Ventas</th><th style={{ textAlign: 'right' }}>Gastos</th><th style={{ textAlign: 'right' }}>Cierre</th><th style={{ textAlign: 'right' }}>Dif.</th><th></th></tr></thead>
                            <tbody>
                                {cajas.map(c => {
                                    const esperado = Number(c.montoApertura || 0) + Number(c.ventasDia || 0) - Number(c.gastosDia || 0);
                                    const dif = Number(c.montoCierre || 0) - esperado;
                                    return (
                                        <tr key={c.id}>
                                            <td>{fmtDate(c.fecha)}</td>
                                            <td className="text-sm">{state.sucursales.find(s => s.id === c.sucursalId)?.nombre || '—'}</td>
                                            <td style={{ textAlign: 'right' }}>{fmtMoney(c.montoApertura, state.business.moneda)}</td>
                                            <td style={{ textAlign: 'right', color: 'var(--success)' }}>{fmtMoney(c.ventasDia, state.business.moneda)}</td>
                                            <td style={{ textAlign: 'right', color: 'var(--danger)' }}>-{fmtMoney(c.gastosDia, state.business.moneda)}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtMoney(c.montoCierre, state.business.moneda)}</td>
                                            <td style={{ textAlign: 'right' }}><Badge variant={Math.abs(dif) < 1 ? 'success' : 'danger'}>{dif >= 0 ? '+' : ''}{fmtMoney(dif, state.business.moneda)}</Badge></td>
                                            <td style={{ textAlign: 'right' }}><button className="btn btn-danger btn-sm btn-icon" onClick={() => { if (confirm('¿Eliminar?')) actions.remove('cajaDiaria', c.id); }}><Trash2 size={13} /></button></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
            <Modal open={open} onClose={() => setOpen(false)} title="Cierre de caja">
                <div className="form-grid">
                    <Field label="Fecha"><input className="input" type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} /></Field>
                    <Field label="Sucursal" required><select className="select" value={form.sucursalId} onChange={e => setForm({ ...form, sucursalId: e.target.value })}><option value="">Elegir...</option>{state.sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></Field>
                    <Field label="Monto apertura"><input className="input" type="number" value={form.montoApertura} onChange={e => setForm({ ...form, montoApertura: e.target.value })} /></Field>
                    <Field label="Monto cierre (real)"><input className="input" type="number" value={form.montoCierre} onChange={e => setForm({ ...form, montoCierre: e.target.value })} /></Field>
                </div>
                {form.sucursalId && (
                    <div className="card mt-3" style={{ background: 'var(--bg-elevated)', padding: 12 }}>
                        <div className="text-xs text-muted mb-1">Cálculo del día</div>
                        <div className="flex justify-between text-sm"><span>Ventas del día:</span><span style={{ color: 'var(--success)' }}>{fmtMoney(ventasDia(form.fecha, form.sucursalId), state.business.moneda)}</span></div>
                        <div className="flex justify-between text-sm"><span>Gastos del día:</span><span style={{ color: 'var(--danger)' }}>-{fmtMoney(gastosDia(form.fecha, form.sucursalId), state.business.moneda)}</span></div>
                    </div>
                )}
                <div className="mt-3"><Field label="Observaciones"><textarea className="textarea" value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} /></Field></div>
                <div className="flex gap-2 mt-4" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
                    <button className="btn btn-primary" onClick={save}>Registrar</button>
                </div>
            </Modal>
        </div>
    );
}

// ═══════════════════════════════ TRANSFERENCIAS ═══════════════════════════════
export function TransferenciasPage() {
    const { state, actions } = useData();
    const EMPTY = { fecha: new Date().toISOString().slice(0, 10), fromSucursalId: '', toSucursalId: '', productoId: '', cantidad: '', notas: '' };
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(EMPTY);

    const save = () => {
        if (!form.fromSucursalId || !form.toSucursalId) return alert('Sucursales origen y destino son obligatorias');
        if (form.fromSucursalId === form.toSucursalId) return alert('Origen y destino no pueden ser iguales');
        actions.add('transferencias', { ...form, cantidad: Number(form.cantidad || 0) });
        setOpen(false);
    };

    const transfs = state.transferencias || [];

    return (
        <div className="flex-col gap-4">
            <Card title="Transferencias entre sucursales" subtitle="Movimiento de mercadería entre locales"
                actions={<button className="btn btn-primary" onClick={() => { setForm(EMPTY); setOpen(true); }} disabled={state.sucursales.length < 2}><Plus size={14} /> Nueva transferencia</button>}>
                {state.sucursales.length < 2 ? (
                    <EmptyState icon={RepeatIcon} title="Necesitás al menos 2 sucursales" description="Creá una segunda sucursal para poder transferir mercadería." />
                ) : transfs.length === 0 ? (
                    <EmptyState icon={RepeatIcon} title="Todavía no hay transferencias"
                        tips={['Registro de movimientos de mercadería entre sucursales', 'Historial con fecha, origen, destino y cantidad', 'Trazabilidad para auditoría']} />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead><tr><th>Fecha</th><th>Desde</th><th>Hacia</th><th>Producto</th><th style={{ textAlign: 'right' }}>Cantidad</th><th>Notas</th><th></th></tr></thead>
                            <tbody>
                                {transfs.map(t => (
                                    <tr key={t.id}>
                                        <td>{fmtDate(t.fecha)}</td>
                                        <td className="text-sm">{state.sucursales.find(s => s.id === t.fromSucursalId)?.nombre}</td>
                                        <td className="text-sm">{state.sucursales.find(s => s.id === t.toSucursalId)?.nombre}</td>
                                        <td className="text-sm">{state.productos.find(p => p.id === t.productoId)?.nombre || '—'}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{t.cantidad}</td>
                                        <td className="text-xs text-muted">{t.notas}</td>
                                        <td style={{ textAlign: 'right' }}><button className="btn btn-danger btn-sm btn-icon" onClick={() => { if (confirm('¿Eliminar?')) actions.remove('transferencias', t.id); }}><Trash2 size={13} /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
            <Modal open={open} onClose={() => setOpen(false)} title="Nueva transferencia">
                <div className="form-grid">
                    <Field label="Fecha"><input className="input" type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} /></Field>
                    <Field label="Producto"><select className="select" value={form.productoId} onChange={e => setForm({ ...form, productoId: e.target.value })}><option value="">Elegir...</option>{state.productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></Field>
                    <Field label="Desde sucursal" required><select className="select" value={form.fromSucursalId} onChange={e => setForm({ ...form, fromSucursalId: e.target.value })}><option value="">Elegir...</option>{state.sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></Field>
                    <Field label="Hacia sucursal" required><select className="select" value={form.toSucursalId} onChange={e => setForm({ ...form, toSucursalId: e.target.value })}><option value="">Elegir...</option>{state.sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></Field>
                    <Field label="Cantidad" required><input className="input" type="number" value={form.cantidad} onChange={e => setForm({ ...form, cantidad: e.target.value })} /></Field>
                </div>
                <div className="mt-3"><Field label="Notas"><textarea className="textarea" value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} /></Field></div>
                <div className="flex gap-2 mt-4" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
                    <button className="btn btn-primary" onClick={save}>Registrar</button>
                </div>
            </Modal>
        </div>
    );
}

// ═══════════════════════════════ ASISTENCIA ═══════════════════════════════
export function AsistenciaPage() {
    const { state, actions } = useData();
    const current = state.meta.currentSucursalId || 'all';
    const asist = filterBySucursal(state.asistencia, current).slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    const empleados = filterBySucursal(state.empleados, current);
    const EMPTY = { fecha: new Date().toISOString().slice(0, 10), empleadoId: '', sucursalId: '', tipo: 'presente', horaEntrada: '', horaSalida: '', notas: '' };
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(EMPTY);

    const save = () => {
        if (!form.empleadoId) return alert('Elegí un empleado');
        const emp = state.empleados.find(e => e.id === form.empleadoId);
        actions.add('asistencia', { ...form, sucursalId: emp?.sucursalId || form.sucursalId });
        setOpen(false);
    };

    return (
        <div className="flex-col gap-4">
            <Card title="Asistencia" subtitle="Registro de presentes, ausencias y horarios"
                actions={<button className="btn btn-primary" onClick={() => { setForm(EMPTY); setOpen(true); }} disabled={empleados.length === 0}><Plus size={14} /> Marcar asistencia</button>}>
                {empleados.length === 0 ? (
                    <EmptyState icon={Calendar} title="Primero cargá empleados" />
                ) : asist.length === 0 ? (
                    <EmptyState icon={Calendar} title="Sin registros de asistencia" tips={['Marca diaria: presente, ausente, tardanza, licencia', 'Hora de entrada y salida', 'Filtro por sucursal', 'En Informes: % asistencia por empleado']} />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead><tr><th>Fecha</th><th>Empleado</th><th>Sucursal</th><th>Tipo</th><th>Entrada</th><th>Salida</th><th>Notas</th><th></th></tr></thead>
                            <tbody>
                                {asist.slice(0, 100).map(a => (
                                    <tr key={a.id}>
                                        <td>{fmtDate(a.fecha)}</td>
                                        <td>{(() => { const e = state.empleados.find(x => x.id === a.empleadoId); return e ? `${e.nombre} ${e.apellido || ''}` : '—'; })()}</td>
                                        <td className="text-sm">{state.sucursales.find(s => s.id === a.sucursalId)?.nombre || '—'}</td>
                                        <td><Badge variant={a.tipo === 'presente' ? 'success' : a.tipo === 'ausente' ? 'danger' : 'warning'}>{a.tipo}</Badge></td>
                                        <td className="text-sm">{a.horaEntrada || '—'}</td>
                                        <td className="text-sm">{a.horaSalida || '—'}</td>
                                        <td className="text-xs text-muted">{a.notas}</td>
                                        <td style={{ textAlign: 'right' }}><button className="btn btn-danger btn-sm btn-icon" onClick={() => { if (confirm('¿Eliminar?')) actions.remove('asistencia', a.id); }}><Trash2 size={13} /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
            <Modal open={open} onClose={() => setOpen(false)} title="Registrar asistencia">
                <div className="form-grid">
                    <Field label="Fecha"><input className="input" type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} /></Field>
                    <Field label="Empleado" required><select className="select" value={form.empleadoId} onChange={e => setForm({ ...form, empleadoId: e.target.value })}><option value="">Elegir...</option>{state.empleados.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellido}</option>)}</select></Field>
                    <Field label="Tipo"><select className="select" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}><option value="presente">Presente</option><option value="ausente">Ausente</option><option value="tardanza">Tardanza</option><option value="licencia">Licencia</option><option value="feriado">Feriado</option></select></Field>
                    <Field label="Hora entrada"><input className="input" type="time" value={form.horaEntrada} onChange={e => setForm({ ...form, horaEntrada: e.target.value })} /></Field>
                    <Field label="Hora salida"><input className="input" type="time" value={form.horaSalida} onChange={e => setForm({ ...form, horaSalida: e.target.value })} /></Field>
                </div>
                <div className="mt-3"><Field label="Notas"><textarea className="textarea" value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} /></Field></div>
                <div className="flex gap-2 mt-4" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
                    <button className="btn btn-primary" onClick={save}>Guardar</button>
                </div>
            </Modal>
        </div>
    );
}

// ═══════════════════════════════ PEDIDOS ONLINE ═══════════════════════════════
export function PedidosPage() {
    const { state, actions } = useData();
    const EMPTY = { fecha: new Date().toISOString().slice(0, 10), clienteId: '', canal: 'Web', estado: 'pendiente', total: '', direccion: '', notas: '', sucursalId: '' };
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const pedidos = (state.pedidos || []).slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

    const save = () => {
        const patch = { ...form, total: Number(form.total || 0) };
        actions.add('pedidos', patch);
        setOpen(false);
    };

    return (
        <div className="flex-col gap-4">
            <Card title="Pedidos online" subtitle="Web, WhatsApp, Instagram, delivery apps"
                actions={<button className="btn btn-primary" onClick={() => { setForm(EMPTY); setOpen(true); }}><Plus size={14} /> Nuevo pedido</button>}>
                {pedidos.length === 0 ? (
                    <EmptyState icon={ClipboardList} title="Sin pedidos online" tips={['Pedidos por canal (Web, WA, IG, PedidosYa, Rappi)', 'Estados: pendiente → preparando → enviado → entregado', 'Total, dirección y cliente', 'Asignado a una sucursal para el fulfillment']} />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead><tr><th>Fecha</th><th>Cliente</th><th>Canal</th><th>Estado</th><th>Sucursal</th><th style={{ textAlign: 'right' }}>Total</th><th></th></tr></thead>
                            <tbody>
                                {pedidos.map(p => (
                                    <tr key={p.id}>
                                        <td>{fmtDate(p.fecha)}</td>
                                        <td className="text-sm">{state.clientes.find(c => c.id === p.clienteId)?.nombre || '—'}</td>
                                        <td><Badge>{p.canal}</Badge></td>
                                        <td><Badge variant={p.estado === 'entregado' ? 'success' : p.estado === 'pendiente' ? 'warning' : 'info'}>{p.estado}</Badge></td>
                                        <td className="text-sm">{state.sucursales.find(s => s.id === p.sucursalId)?.nombre || '—'}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtMoney(p.total, state.business.moneda)}</td>
                                        <td style={{ textAlign: 'right' }}><button className="btn btn-danger btn-sm btn-icon" onClick={() => { if (confirm('¿Eliminar?')) actions.remove('pedidos', p.id); }}><Trash2 size={13} /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
            <Modal open={open} onClose={() => setOpen(false)} title="Nuevo pedido">
                <div className="form-grid">
                    <Field label="Fecha"><input className="input" type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} /></Field>
                    <Field label="Canal"><select className="select" value={form.canal} onChange={e => setForm({ ...form, canal: e.target.value })}>{['Web', 'WhatsApp', 'Instagram', 'PedidosYa', 'Rappi', 'Otro'].map(c => <option key={c}>{c}</option>)}</select></Field>
                    <Field label="Cliente"><select className="select" value={form.clienteId} onChange={e => setForm({ ...form, clienteId: e.target.value })}><option value="">Sin especificar</option>{state.clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></Field>
                    <Field label="Estado"><select className="select" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>{['pendiente', 'preparando', 'enviado', 'entregado', 'cancelado'].map(e => <option key={e}>{e}</option>)}</select></Field>
                    <Field label="Sucursal"><select className="select" value={form.sucursalId} onChange={e => setForm({ ...form, sucursalId: e.target.value })}><option value="">Sin asignar</option>{state.sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></Field>
                    <Field label="Total"><input className="input" type="number" value={form.total} onChange={e => setForm({ ...form, total: e.target.value })} /></Field>
                </div>
                <div className="mt-3"><Field label="Dirección"><input className="input" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} /></Field></div>
                <div className="mt-3"><Field label="Notas"><textarea className="textarea" value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} /></Field></div>
                <div className="flex gap-2 mt-4" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
                    <button className="btn btn-primary" onClick={save}>Crear</button>
                </div>
            </Modal>
        </div>
    );
}
