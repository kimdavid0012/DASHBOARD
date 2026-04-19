import React, { useMemo, useState } from 'react';
import {
    Users2, Plus, Pencil, Trash2, Banknote, Receipt, CalendarDays,
    ArrowRightLeft, UserCheck, ShoppingBag, PiggyBank
} from 'lucide-react';
import { useData, filterBySucursal, getRubroLabels, SECTION_HELP } from '../store/DataContext';
import { PageHeader, Card, Modal, Field, EmptyState, Badge, KpiCard, BarChart, fmtMoney, fmtDate, CHART_COLORS, InfoBox } from '../components/UI';

// ═══════════════════════════ CLIENTES ═══════════════════════════
export function ClientesPage() {
    const { state, actions } = useData();
    const labels = getRubroLabels(state.business.rubro);
    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const EMPTY = { nombre: '', telefono: '', email: '', direccion: '', ciudad: '', notas: '' };
    const [form, setForm] = useState(EMPTY);

    const save = () => {
        if (!form.nombre.trim()) return alert('Nombre es obligatorio');
        if (editId) actions.update('clientes', editId, form);
        else actions.add('clientes', form);
        setOpen(false);
    };

    const totalPorCliente = (cid) => state.ventas.filter(v => v.clienteId === cid).reduce((s, v) => s + Number(v.total || 0), 0);

    return (
        <div>
            <PageHeader
                icon={Users2}
                title={labels.clients}
                subtitle="CRM básico"
                help={SECTION_HELP.clientes}
                actions={<button className="btn btn-primary" onClick={() => { setForm(EMPTY); setEditId(null); setOpen(true); }}><Plus size={14} /> Nuevo {labels.client.toLowerCase()}</button>}
            />
            <div className="kpi-grid mb-4">
                <KpiCard icon={<Users2 size={20} />} label={labels.clients} value={state.clientes.length} color="#63f1cb" />
                <KpiCard icon={<Users2 size={20} />} label="Con histórico" value={state.clientes.filter(c => state.ventas.some(v => v.clienteId === c.id)).length} color="#22c55e" />
            </div>
            <Card>
                {state.clientes.length === 0 ? (
                    <EmptyState
                        icon={Users2}
                        title={`Sin ${labels.clients.toLowerCase()} cargados`}
                        description={`Cargá ${labels.clients.toLowerCase()} para hacer seguimiento del histórico de compras.`}
                        action={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={14} /> Agregar {labels.client.toLowerCase()}</button>}
                        tips={['Nombre, teléfono, email y dirección', 'Al vender podés asociar la operación a un cliente', 'Histórico de compras y ranking de mejores clientes', 'Ideal para campañas de marketing dirigidas']}
                        example="Ej: María López - 11-1234-5678 - maria@mail.com - Palermo"
                    />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead><tr><th>{labels.client}</th><th>Contacto</th><th>Ubicación</th><th style={{ textAlign: 'right' }}>Total comprado</th><th></th></tr></thead>
                            <tbody>
                                {state.clientes.map(c => {
                                    const total = totalPorCliente(c.id);
                                    return (
                                        <tr key={c.id}>
                                            <td className="font-semibold">{c.nombre}</td>
                                            <td><div className="text-sm">{c.telefono || '—'}</div><div className="text-xs text-muted">{c.email || '—'}</div></td>
                                            <td className="text-sm">{[c.ciudad, c.direccion].filter(Boolean).join(' · ') || '—'}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600, color: total > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>{fmtMoney(total, state.business.moneda)}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setForm({ ...EMPTY, ...c }); setEditId(c.id); setOpen(true); }}><Pencil size={13} /></button>
                                                <button className="btn btn-danger btn-sm btn-icon" onClick={() => { if (confirm('¿Eliminar?')) actions.remove('clientes', c.id); }}><Trash2 size={13} /></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
            <Modal open={open} onClose={() => setOpen(false)} title={editId ? `Editar ${labels.client.toLowerCase()}` : `Nuevo ${labels.client.toLowerCase()}`}>
                <div className="form-grid">
                    <Field label="Nombre" required><input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></Field>
                    <Field label="Teléfono"><input className="input" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} /></Field>
                    <Field label="Email"><input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
                    <Field label="Ciudad"><input className="input" value={form.ciudad} onChange={e => setForm({ ...form, ciudad: e.target.value })} /></Field>
                    <Field label="Dirección"><input className="input" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} /></Field>
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

// ═══════════════════════════ GASTOS ═══════════════════════════
export function GastosPage() {
    const { state, actions } = useData();
    const current = state.meta.currentSucursalId || 'all';
    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const EMPTY = { concepto: '', monto: '', categoria: 'Alquiler', fecha: new Date().toISOString().slice(0, 10), sucursalId: '', metodo: 'Efectivo', notas: '', recurrente: false, frecuencia: 'mensual' };
    const [form, setForm] = useState(EMPTY);

    const CATEGORIAS = ['Alquiler', 'Sueldos', 'Servicios', 'Mercadería', 'Impuestos', 'Marketing', 'Mantenimiento', 'Transporte', 'Papelería', 'Otros'];
    const METODOS = ['Efectivo', 'Transferencia', 'Débito', 'Crédito', 'Cheque'];

    const gastos = filterBySucursal(state.gastos, current).slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    const totalMes = gastos.filter(g => (g.fecha || '').startsWith(new Date().toISOString().slice(0, 7))).reduce((s, g) => s + Number(g.monto || 0), 0);

    const porCategoria = useMemo(() => {
        const agg = {};
        gastos.forEach(g => { agg[g.categoria] = (agg[g.categoria] || 0) + Number(g.monto || 0); });
        return Object.entries(agg).sort((a, b) => b[1] - a[1]).map(([label, value], i) => ({ label, value, display: fmtMoney(value, state.business.moneda), color: CHART_COLORS[i % CHART_COLORS.length] }));
    }, [gastos, state.business.moneda]);

    const save = () => {
        if (!form.concepto.trim()) return alert('Concepto obligatorio');
        if (!form.monto) return alert('Monto obligatorio');
        if (!form.sucursalId) return alert('Sucursal obligatoria');
        const patch = { ...form, monto: Number(form.monto) };
        if (editId) actions.update('gastos', editId, patch);
        else actions.add('gastos', patch);
        setOpen(false);
    };

    return (
        <div>
            <PageHeader
                icon={Receipt}
                title="Gastos"
                subtitle="Todo lo que sale de caja"
                help={SECTION_HELP.gastos}
                actions={<button className="btn btn-primary" onClick={() => { setForm({ ...EMPTY, sucursalId: current !== 'all' ? current : (state.sucursales[0]?.id || '') }); setEditId(null); setOpen(true); }} disabled={state.sucursales.length === 0}><Plus size={14} /> Nuevo gasto</button>}
            />
            <div className="kpi-grid mb-4">
                <KpiCard icon={<Receipt size={20} />} label="Gastos totales" value={gastos.length} color="#63f1cb" />
                <KpiCard icon={<Receipt size={20} />} label="Gastado este mes" value={fmtMoney(totalMes, state.business.moneda)} color="#ef4444" />
                <KpiCard icon={<Receipt size={20} />} label="Total histórico" value={fmtMoney(gastos.reduce((s, g) => s + Number(g.monto || 0), 0), state.business.moneda)} color="#f59e0b" />
            </div>
            {porCategoria.length > 0 && <Card title="Gastos por categoría (histórico)" style={{ marginBottom: 16 }}><BarChart data={porCategoria} /></Card>}
            <Card>
                {gastos.length === 0 ? (
                    <EmptyState icon={Receipt} title="Sin gastos cargados" description="Registrá cada gasto para controlar el flujo real del negocio." action={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={14} /> Cargar primer gasto</button>} tips={['Alquiler, sueldos, proveedores, servicios, impuestos', 'Categorización automática para informes', 'Asociación a sucursal', 'Ranking por categoría y métodos de pago']} example="Ej: Alquiler local Palermo - $800.000 - Categoría Alquiler - Método Transferencia" />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th>Sucursal</th><th>Método</th><th style={{ textAlign: 'right' }}>Monto</th><th></th></tr></thead>
                            <tbody>
                                {gastos.slice(0, 100).map(g => (
                                    <tr key={g.id}>
                                        <td className="text-sm">{fmtDate(g.fecha)}</td>
                                        <td className="font-semibold">
                                            {g.concepto}
                                            {g.recurrente && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--accent)' }} title={`Recurrente ${g.frecuencia || 'mensual'}`}>🔁</span>}
                                            {g.generadoPor && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-muted)' }} title="Auto-generado">↻</span>}
                                        </td>
                                        <td><Badge>{g.categoria}</Badge></td>
                                        <td className="text-sm">{state.sucursales.find(s => s.id === g.sucursalId)?.nombre || '—'}</td>
                                        <td className="text-sm">{g.metodo}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--danger)' }}>-{fmtMoney(g.monto, state.business.moneda)}</td>
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
                    <Field label="Concepto" required><input className="input" value={form.concepto} onChange={e => setForm({ ...form, concepto: e.target.value })} /></Field>
                    <Field label="Monto" required><input className="input" type="number" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} /></Field>
                    <Field label="Fecha"><input className="input" type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} /></Field>
                    <Field label="Categoría"><select className="select" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>{CATEGORIAS.map(c => <option key={c}>{c}</option>)}</select></Field>
                    <Field label="Sucursal" required><select className="select" value={form.sucursalId} onChange={e => setForm({ ...form, sucursalId: e.target.value })}><option value="">Elegir...</option>{state.sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></Field>
                    <Field label="Método"><select className="select" value={form.metodo} onChange={e => setForm({ ...form, metodo: e.target.value })}>{METODOS.map(m => <option key={m}>{m}</option>)}</select></Field>
                </div>
                <div className="mt-3"><Field label="Notas"><textarea className="textarea" value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} /></Field></div>
                <div className="mt-3" style={{
                    padding: 12, background: form.recurrente ? 'rgba(99,241,203,0.05)' : 'var(--bg-elevated)',
                    borderRadius: 10, border: `1px solid ${form.recurrente ? 'var(--border-accent)' : 'var(--border-color)'}`
                }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={!!form.recurrente}
                            onChange={e => setForm({ ...form, recurrente: e.target.checked })}
                            style={{ width: 18, height: 18, cursor: 'pointer' }}
                        />
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>🔁 Gasto recurrente</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                Se auto-genera cada mes/semana para no cargarlo a mano
                            </div>
                        </div>
                    </label>
                    {form.recurrente && (
                        <div style={{ marginTop: 10, paddingLeft: 28 }}>
                            <Field label="Frecuencia">
                                <select className="select" value={form.frecuencia} onChange={e => setForm({ ...form, frecuencia: e.target.value })}>
                                    <option value="mensual">Mensual</option>
                                    <option value="semanal">Semanal</option>
                                    <option value="quincenal">Quincenal</option>
                                    <option value="anual">Anual</option>
                                </select>
                            </Field>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                                💡 Al guardar, este gasto se repetirá automáticamente cada mes/semana. Podés borrar cualquier ocurrencia desde la lista.
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex gap-2 mt-4 justify-end">
                    <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
                    <button className="btn btn-primary" onClick={save}>{editId ? 'Guardar' : 'Crear'}</button>
                </div>
            </Modal>
        </div>
    );
}

// ═══════════════════════════ CAJA DIARIA (cierre Z) ═══════════════════════════
export function CajaDiariaPage() {
    const { state, actions } = useData();
    const current = state.meta.currentSucursalId || 'all';
    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const EMPTY = {
        fecha: new Date().toISOString().slice(0, 10), sucursalId: '',
        apertura: 0, cierre: 0, notas: ''
    };
    const [form, setForm] = useState(EMPTY);

    const cajas = filterBySucursal(state.cajaDiaria, current).slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

    const ventasDelDia = (suc, fecha) => state.ventas.filter(v => v.sucursalId === suc && (v.fecha || '').slice(0, 10) === fecha).reduce((s, v) => s + Number(v.total || 0), 0);
    const gastosDelDia = (suc, fecha) => state.gastos.filter(g => g.sucursalId === suc && (g.fecha || '').slice(0, 10) === fecha).reduce((s, g) => s + Number(g.monto || 0), 0);

    const save = () => {
        if (!form.sucursalId) return alert('Sucursal obligatoria');
        const patch = { ...form, apertura: Number(form.apertura), cierre: Number(form.cierre) };
        if (editId) actions.update('cajaDiaria', editId, patch);
        else actions.add('cajaDiaria', patch);
        setOpen(false);
    };

    return (
        <div>
            <PageHeader
                icon={PiggyBank}
                title="Caja diaria"
                subtitle="Apertura y cierre Z por día"
                help={SECTION_HELP.caja}
                actions={<button className="btn btn-primary" onClick={() => { setForm({ ...EMPTY, sucursalId: current !== 'all' ? current : (state.sucursales[0]?.id || '') }); setEditId(null); setOpen(true); }} disabled={state.sucursales.length === 0}><Plus size={14} /> Nueva caja</button>}
            />
            <InfoBox variant="info">
                <strong>Fórmula:</strong> Esperado = Apertura + Ventas del día (efectivo) − Gastos del día. Diferencia = Cierre declarado − Esperado. Si la diferencia es negativa y grande, revisá.
            </InfoBox>
            <Card style={{ marginTop: 12 }}>
                {cajas.length === 0 ? (
                    <EmptyState
                        icon={PiggyBank}
                        title="Sin cierres de caja"
                        description="Registrá apertura y cierre diario para trackear diferencias."
                        action={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={14} /> Primer cierre</button>}
                        tips={['Monto de apertura al abrir el día', 'Ventas del día calculadas automáticamente', 'Gastos del día descontados', 'Cierre declarado vs esperado', 'Alerta de diferencias']}
                        example="Ej: Apertura $5.000 + Ventas $120.000 - Gastos $3.000 = Esperado $122.000"
                    />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead><tr><th>Fecha</th><th>Sucursal</th><th style={{ textAlign: 'right' }}>Apertura</th><th style={{ textAlign: 'right' }}>Ventas</th><th style={{ textAlign: 'right' }}>Gastos</th><th style={{ textAlign: 'right' }}>Esperado</th><th style={{ textAlign: 'right' }}>Cierre</th><th style={{ textAlign: 'right' }}>Dif.</th><th></th></tr></thead>
                            <tbody>
                                {cajas.map(c => {
                                    const v = ventasDelDia(c.sucursalId, c.fecha);
                                    const g = gastosDelDia(c.sucursalId, c.fecha);
                                    const esperado = Number(c.apertura || 0) + v - g;
                                    const diff = Number(c.cierre || 0) - esperado;
                                    return (
                                        <tr key={c.id}>
                                            <td className="text-sm">{fmtDate(c.fecha)}</td>
                                            <td className="text-sm">{state.sucursales.find(s => s.id === c.sucursalId)?.nombre || '—'}</td>
                                            <td style={{ textAlign: 'right' }}>{fmtMoney(c.apertura, state.business.moneda)}</td>
                                            <td style={{ textAlign: 'right', color: 'var(--success)' }}>+{fmtMoney(v, state.business.moneda)}</td>
                                            <td style={{ textAlign: 'right', color: 'var(--danger)' }}>-{fmtMoney(g, state.business.moneda)}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtMoney(esperado, state.business.moneda)}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtMoney(c.cierre, state.business.moneda)}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <Badge variant={Math.abs(diff) < 100 ? 'success' : diff < 0 ? 'danger' : 'warning'}>
                                                    {diff >= 0 ? '+' : ''}{fmtMoney(diff, state.business.moneda)}
                                                </Badge>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setForm({ ...EMPTY, ...c }); setEditId(c.id); setOpen(true); }}><Pencil size={13} /></button>
                                                <button className="btn btn-danger btn-sm btn-icon" onClick={() => { if (confirm('¿Eliminar?')) actions.remove('cajaDiaria', c.id); }}><Trash2 size={13} /></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
            <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'Editar cierre' : 'Nuevo cierre de caja'}>
                <div className="form-grid">
                    <Field label="Fecha" required><input className="input" type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} /></Field>
                    <Field label="Sucursal" required><select className="select" value={form.sucursalId} onChange={e => setForm({ ...form, sucursalId: e.target.value })}><option value="">Elegir...</option>{state.sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></Field>
                    <Field label="Apertura" hint="Lo que dejaste al abrir"><input className="input" type="number" value={form.apertura} onChange={e => setForm({ ...form, apertura: e.target.value })} /></Field>
                    <Field label="Cierre" hint="Lo que realmente hay en caja"><input className="input" type="number" value={form.cierre} onChange={e => setForm({ ...form, cierre: e.target.value })} /></Field>
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

// ═══════════════════════════ TRANSFERENCIAS ═══════════════════════════
export function TransferenciasPage() {
    const { state, actions } = useData();
    const [open, setOpen] = useState(false);
    const EMPTY = { fecha: new Date().toISOString().slice(0, 10), origenId: '', destinoId: '', productoId: '', cantidad: 1, notas: '' };
    const [form, setForm] = useState(EMPTY);

    const save = () => {
        if (!form.origenId || !form.destinoId || !form.productoId) return alert('Completá origen, destino y producto');
        if (form.origenId === form.destinoId) return alert('Origen y destino deben ser distintos');
        actions.add('transferencias', { ...form, cantidad: Number(form.cantidad) });
        setOpen(false);
    };

    return (
        <div>
            <PageHeader
                icon={ArrowRightLeft}
                title="Transferencias"
                subtitle="Movimiento de stock entre sucursales"
                help={SECTION_HELP.transferencias}
                actions={<button className="btn btn-primary" onClick={() => { setForm(EMPTY); setOpen(true); }} disabled={state.sucursales.length < 2}><Plus size={14} /> Nueva transferencia</button>}
            />
            <Card>
                {state.sucursales.length < 2 ? (
                    <EmptyState icon={ArrowRightLeft} title="Necesitás al menos 2 sucursales" description="Las transferencias son movimientos entre distintas sucursales." />
                ) : state.transferencias.length === 0 ? (
                    <EmptyState icon={ArrowRightLeft} title="Sin transferencias" description="Registrá movimientos de mercadería entre locales." action={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={14} /> Primera transferencia</button>} tips={['Origen y destino', 'Producto y cantidad', 'Trazabilidad de stock']} example="Ej: 10 unidades de Coca 500ml desde Depósito → Local Palermo" />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead><tr><th>Fecha</th><th>Desde</th><th>Hacia</th><th>Producto</th><th>Cantidad</th><th></th></tr></thead>
                            <tbody>
                                {state.transferencias.map(t => (
                                    <tr key={t.id}>
                                        <td className="text-sm">{fmtDate(t.fecha)}</td>
                                        <td>{state.sucursales.find(s => s.id === t.origenId)?.nombre || '—'}</td>
                                        <td>{state.sucursales.find(s => s.id === t.destinoId)?.nombre || '—'}</td>
                                        <td>{state.productos.find(p => p.id === t.productoId)?.nombre || '—'}</td>
                                        <td>{t.cantidad}</td>
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
                    <Field label="Origen" required><select className="select" value={form.origenId} onChange={e => setForm({ ...form, origenId: e.target.value })}><option value="">Elegir...</option>{state.sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></Field>
                    <Field label="Destino" required><select className="select" value={form.destinoId} onChange={e => setForm({ ...form, destinoId: e.target.value })}><option value="">Elegir...</option>{state.sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></Field>
                    <Field label="Producto" required><select className="select" value={form.productoId} onChange={e => setForm({ ...form, productoId: e.target.value })}><option value="">Elegir...</option>{state.productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></Field>
                    <Field label="Cantidad"><input className="input" type="number" value={form.cantidad} onChange={e => setForm({ ...form, cantidad: e.target.value })} /></Field>
                </div>
                <div className="mt-3"><Field label="Notas"><textarea className="textarea" value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} /></Field></div>
                <div className="flex gap-2 mt-4 justify-end">
                    <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
                    <button className="btn btn-primary" onClick={save}>Crear</button>
                </div>
            </Modal>
        </div>
    );
}

// ═══════════════════════════ ASISTENCIA ═══════════════════════════
export function AsistenciaPage() {
    const { state, actions } = useData();
    const current = state.meta.currentSucursalId || 'all';
    const [open, setOpen] = useState(false);
    const EMPTY = { fecha: new Date().toISOString().slice(0, 10), empleadoId: '', tipo: 'presente', notas: '' };
    const [form, setForm] = useState(EMPTY);
    const [viewMode, setViewMode] = useState('list'); // list | kiosk
    const [kioskMsg, setKioskMsg] = useState('');
    const [kioskLoading, setKioskLoading] = useState(false);
    const [webAuthnSupported, setWebAuthnSupported] = useState(false);

    React.useEffect(() => {
        import('../utils/webauthn').then(mod => {
            mod.isPlatformAuthenticatorAvailable().then(setWebAuthnSupported);
        });
    }, []);

    const empleados = filterBySucursal(state.empleados, current);
    const asistencia = state.asistencia.filter(a => empleados.some(e => e.id === a.empleadoId)).slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

    const TIPOS = [
        { id: 'presente', label: 'Presente', variant: 'success' },
        { id: 'ausente', label: 'Ausente', variant: 'danger' },
        { id: 'tardanza', label: 'Tardanza', variant: 'warning' },
        { id: 'licencia', label: 'Licencia', variant: 'info' },
        { id: 'feriado', label: 'Feriado', variant: 'muted' }
    ];

    const save = () => {
        if (!form.empleadoId) return alert('Elegí empleado');
        actions.add('asistencia', form);
        setOpen(false);
    };

    const enrollEmployeeBiometric = async (empleadoId) => {
        const emp = state.empleados.find(e => e.id === empleadoId);
        if (!emp) return;
        try {
            const { enrollEmployee } = await import('../utils/webauthn');
            const cred = await enrollEmployee({
                empleadoId,
                nombre: `${emp.nombre || ''} ${emp.apellido || ''}`.trim(),
                businessName: state.business.name || 'Dashboard'
            });
            actions.update('empleados', empleadoId, {
                webauthnCredentialId: cred.credentialId,
                webauthnRegisteredAt: cred.registeredAt
            });
            alert(`✅ ${emp.nombre} registrado. Ahora puede fichar con huella.`);
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    const kioskFichar = async () => {
        setKioskMsg(''); setKioskLoading(true);
        try {
            const { authenticateForAttendance } = await import('../utils/webauthn');
            const empleadosConCred = empleados.filter(e => e.webauthnCredentialId);
            if (empleadosConCred.length === 0) {
                setKioskMsg('⚠️ Primero registrá al menos un empleado con huella (modo Lista → botón Huella)');
                setKioskLoading(false);
                return;
            }
            const credentialId = await authenticateForAttendance({
                allowedCredentialIds: empleadosConCred.map(e => e.webauthnCredentialId)
            });
            const emp = empleadosConCred.find(e => e.webauthnCredentialId === credentialId);
            if (!emp) {
                setKioskMsg('⚠️ Credencial no reconocida');
                setKioskLoading(false);
                return;
            }
            const hoy = new Date().toISOString().slice(0, 10);
            // ¿Ya fichó hoy? Si sí, marcamos salida (update con hora)
            const hoyEntry = state.asistencia.find(a => a.empleadoId === emp.id && a.fecha === hoy);
            const now = new Date();
            const hora = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
            if (!hoyEntry) {
                actions.add('asistencia', {
                    empleadoId: emp.id, fecha: hoy, tipo: 'presente',
                    entrada: hora, notas: 'Fichaje biométrico'
                });
                setKioskMsg(`✅ ¡Bienvenido/a ${emp.nombre}! Entrada registrada a las ${hora}`);
            } else if (!hoyEntry.salida) {
                actions.update('asistencia', hoyEntry.id, { salida: hora });
                setKioskMsg(`👋 Hasta luego ${emp.nombre}. Salida ${hora}. ¡Buen trabajo!`);
            } else {
                setKioskMsg(`ℹ️ ${emp.nombre}, ya ficharon entrada y salida hoy.`);
            }
        } catch (err) {
            setKioskMsg('⚠️ ' + err.message);
        } finally {
            setKioskLoading(false);
        }
    };

    return (
        <div>
            <PageHeader
                icon={UserCheck}
                title="Asistencia"
                subtitle="Presentismo del equipo"
                help={SECTION_HELP.asistencia}
                actions={
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: 8, padding: 2 }}>
                            <button
                                onClick={() => setViewMode('list')}
                                style={{
                                    padding: '6px 12px',
                                    background: viewMode === 'list' ? 'var(--accent-soft)' : 'transparent',
                                    color: viewMode === 'list' ? 'var(--accent)' : 'var(--text-muted)',
                                    border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600
                                }}
                            >
                                📋 Lista
                            </button>
                            <button
                                onClick={() => setViewMode('kiosk')}
                                disabled={!webAuthnSupported}
                                title={webAuthnSupported ? 'Modo kiosk — fichaje con huella' : 'WebAuthn no disponible en este dispositivo'}
                                style={{
                                    padding: '6px 12px',
                                    background: viewMode === 'kiosk' ? 'var(--accent-soft)' : 'transparent',
                                    color: viewMode === 'kiosk' ? 'var(--accent)' : 'var(--text-muted)',
                                    border: 'none', borderRadius: 6,
                                    cursor: webAuthnSupported ? 'pointer' : 'not-allowed',
                                    opacity: webAuthnSupported ? 1 : 0.4,
                                    fontSize: 12, fontWeight: 600
                                }}
                            >
                                👆 Reloj kiosk
                            </button>
                        </div>
                        {viewMode === 'list' && (
                            <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setOpen(true); }} disabled={empleados.length === 0}>
                                <Plus size={14} /> Registrar
                            </button>
                        )}
                    </div>
                }
            />

            {viewMode === 'kiosk' ? (
                <Card>
                    <div style={{
                        minHeight: 400, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20
                    }}>
                        <div style={{
                            fontSize: 72, lineHeight: 1,
                            filter: 'drop-shadow(0 0 20px rgba(99,241,203,0.5))'
                        }}>
                            👆
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, margin: 0 }}>
                                Reloj de asistencia
                            </h2>
                            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>
                                {empleados.filter(e => e.webauthnCredentialId).length} empleado{empleados.filter(e => e.webauthnCredentialId).length !== 1 ? 's' : ''} con huella registrada
                            </div>
                            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 2 }}>
                                {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })} · {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>

                        <button
                            className="btn btn-primary"
                            onClick={kioskFichar}
                            disabled={kioskLoading}
                            style={{
                                padding: '18px 40px', fontSize: 18, fontWeight: 700,
                                borderRadius: 14, minWidth: 280
                            }}
                        >
                            {kioskLoading ? '⏳ Esperando huella...' : '👆 Fichar con huella'}
                        </button>

                        {kioskMsg && (
                            <div style={{
                                padding: '16px 24px',
                                background: kioskMsg.startsWith('✅') || kioskMsg.startsWith('👋')
                                    ? 'rgba(99,241,203,0.1)'
                                    : 'rgba(245,158,11,0.1)',
                                border: `1px solid ${kioskMsg.startsWith('✅') || kioskMsg.startsWith('👋') ? 'var(--border-accent)' : 'rgba(245,158,11,0.3)'}`,
                                borderRadius: 12,
                                fontSize: 16, fontWeight: 500,
                                textAlign: 'center', maxWidth: 500
                            }}>
                                {kioskMsg}
                            </div>
                        )}

                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 16, maxWidth: 500 }}>
                            💡 Este modo es para dejar una tablet/celular en la entrada del local.
                            Cada empleado ficha tocando el botón y usando su huella (la misma que usa para desbloquear su device).
                        </div>
                    </div>
                </Card>
            ) : (
            <Card>
                {empleados.length === 0 ? (
                    <EmptyState icon={UserCheck} title="Primero cargá empleados" description="Necesitás tener empleados para registrar asistencia." />
                ) : asistencia.length === 0 ? (
                    <EmptyState icon={UserCheck} title="Sin registros" description="Marcá día a día quién vino a trabajar." action={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={14} /> Primer registro</button>} tips={['Presente, ausente, tardanza, licencia, feriado', 'Histórico completo por empleado', '% de asistencia en Informes']} example="Ej: Viernes 18/04 - Juan Pérez - Presente" />
                ) : (
                    <>
                        {webAuthnSupported && empleados.length > 0 && (
                            <div style={{
                                padding: 12, marginBottom: 12,
                                background: 'var(--bg-elevated)', borderRadius: 10,
                                border: '1px solid var(--border-color)'
                            }}>
                                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                                    👆 Fichaje biométrico — empleados registrados:
                                </div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {empleados.map(emp => (
                                        <button
                                            key={emp.id}
                                            onClick={() => {
                                                if (emp.webauthnCredentialId) {
                                                    if (confirm(`¿Borrar la huella registrada de ${emp.nombre}?`)) {
                                                        actions.update('empleados', emp.id, { webauthnCredentialId: null });
                                                    }
                                                } else {
                                                    enrollEmployeeBiometric(emp.id);
                                                }
                                            }}
                                            style={{
                                                padding: '6px 12px',
                                                background: emp.webauthnCredentialId ? 'rgba(99,241,203,0.1)' : 'transparent',
                                                border: `1px solid ${emp.webauthnCredentialId ? 'var(--border-accent)' : 'var(--border-color)'}`,
                                                borderRadius: 8,
                                                cursor: 'pointer',
                                                fontSize: 12,
                                                color: emp.webauthnCredentialId ? 'var(--accent)' : 'var(--text-muted)'
                                            }}
                                        >
                                            {emp.webauthnCredentialId ? '✓' : '+'} {emp.nombre} {emp.apellido || ''}
                                        </button>
                                    ))}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                                    💡 Tocá a un empleado para registrarle la huella de este dispositivo. Después podés usar "Reloj kiosk" para fichar con huella/face.
                                </div>
                            </div>
                        )}
                        <div className="table-wrap">
                        <table className="table">
                            <thead><tr><th>Fecha</th><th>Empleado</th><th>Tipo</th><th>Notas</th><th></th></tr></thead>
                            <tbody>
                                {asistencia.slice(0, 100).map(a => {
                                    const emp = state.empleados.find(e => e.id === a.empleadoId);
                                    const tipo = TIPOS.find(t => t.id === a.tipo) || TIPOS[0];
                                    return (
                                        <tr key={a.id}>
                                            <td className="text-sm">{fmtDate(a.fecha)}</td>
                                            <td>{emp ? `${emp.nombre} ${emp.apellido || ''}` : '—'}</td>
                                            <td><Badge variant={tipo.variant}>{tipo.label}</Badge></td>
                                            <td className="text-sm text-muted">{a.notas || '—'}</td>
                                            <td style={{ textAlign: 'right' }}><button className="btn btn-danger btn-sm btn-icon" onClick={() => { if (confirm('¿Eliminar?')) actions.remove('asistencia', a.id); }}><Trash2 size={13} /></button></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        </div>
                    </>
                )}
            </Card>
            )}
            <Modal open={open} onClose={() => setOpen(false)} title="Registrar asistencia">
                <div className="form-grid">
                    <Field label="Fecha"><input className="input" type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} /></Field>
                    <Field label="Empleado" required><select className="select" value={form.empleadoId} onChange={e => setForm({ ...form, empleadoId: e.target.value })}><option value="">Elegir...</option>{empleados.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellido || ''}</option>)}</select></Field>
                    <Field label="Tipo"><select className="select" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>{TIPOS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select></Field>
                </div>
                <div className="mt-3"><Field label="Notas"><textarea className="textarea" value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} /></Field></div>
                <div className="flex gap-2 mt-4 justify-end">
                    <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
                    <button className="btn btn-primary" onClick={save}>Registrar</button>
                </div>
            </Modal>
        </div>
    );
}

// ═══════════════════════════ PEDIDOS ONLINE ═══════════════════════════
export function PedidosPage() {
    const { state, actions } = useData();
    const labels = getRubroLabels(state.business.rubro);
    const current = state.meta.currentSucursalId || 'all';
    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const EMPTY = { fecha: new Date().toISOString().slice(0, 10), canal: 'WhatsApp', clienteNombre: '', clienteTel: '', total: '', estado: 'pendiente', sucursalId: '', notas: '' };
    const [form, setForm] = useState(EMPTY);

    const CANALES = ['WhatsApp', 'Instagram', 'Web propia', 'Mercado Libre', 'PedidosYa', 'Rappi', 'Tienda Nube', 'Otro'];
    const ESTADOS = [
        { id: 'pendiente', label: 'Pendiente', variant: 'warning' },
        { id: 'preparando', label: 'Preparando', variant: 'info' },
        { id: 'enviado', label: 'Enviado', variant: 'default' },
        { id: 'entregado', label: 'Entregado', variant: 'success' },
        { id: 'cancelado', label: 'Cancelado', variant: 'danger' }
    ];

    const pedidos = filterBySucursal(state.pedidos, current).slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

    const save = () => {
        if (!form.clienteNombre.trim()) return alert('Nombre del cliente');
        if (!form.sucursalId) return alert('Sucursal obligatoria');
        const patch = { ...form, total: Number(form.total || 0) };
        if (editId) actions.update('pedidos', editId, patch);
        else actions.add('pedidos', patch);
        setOpen(false);
    };

    return (
        <div>
            <PageHeader
                icon={ShoppingBag}
                title={labels.orders}
                subtitle="Pedidos de canales digitales"
                help={SECTION_HELP.pedidos}
                actions={<button className="btn btn-primary" onClick={() => { setForm({ ...EMPTY, sucursalId: current !== 'all' ? current : (state.sucursales[0]?.id || '') }); setEditId(null); setOpen(true); }} disabled={state.sucursales.length === 0}><Plus size={14} /> Nuevo pedido</button>}
            />
            <div className="kpi-grid mb-4">
                <KpiCard icon={<ShoppingBag size={20} />} label="Pedidos totales" value={pedidos.length} color="#63f1cb" />
                <KpiCard icon={<ShoppingBag size={20} />} label="Pendientes" value={pedidos.filter(p => p.estado === 'pendiente').length} color="#f59e0b" />
                <KpiCard icon={<ShoppingBag size={20} />} label="En curso" value={pedidos.filter(p => ['preparando', 'enviado'].includes(p.estado)).length} color="#60a5fa" />
                <KpiCard icon={<ShoppingBag size={20} />} label="Entregados" value={pedidos.filter(p => p.estado === 'entregado').length} color="#22c55e" />
            </div>
            <Card>
                {pedidos.length === 0 ? (
                    <EmptyState icon={ShoppingBag} title="Sin pedidos" description="Registrá los pedidos que llegan por WhatsApp, IG, apps de delivery o tu web." action={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={14} /> Primer pedido</button>} tips={['Canal de origen (WA, IG, web, delivery apps)', 'Cliente y datos de contacto', 'Estados: pendiente → preparando → enviado → entregado', 'KPIs por estado']} example="Ej: Pedido WhatsApp de María López - Total $8.500 - Estado Preparando" />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead><tr><th>Fecha</th><th>Canal</th><th>Cliente</th><th>Sucursal</th><th>Estado</th><th style={{ textAlign: 'right' }}>Total</th><th></th></tr></thead>
                            <tbody>
                                {pedidos.map(p => {
                                    const estado = ESTADOS.find(e => e.id === p.estado) || ESTADOS[0];
                                    return (
                                        <tr key={p.id}>
                                            <td className="text-sm">{fmtDate(p.fecha)}</td>
                                            <td><Badge>{p.canal}</Badge></td>
                                            <td>
                                                <div className="font-semibold">{p.clienteNombre}</div>
                                                {p.clienteTel && <div className="text-xs text-muted">{p.clienteTel}</div>}
                                            </td>
                                            <td className="text-sm">{state.sucursales.find(s => s.id === p.sucursalId)?.nombre || '—'}</td>
                                            <td><Badge variant={estado.variant}>{estado.label}</Badge></td>
                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtMoney(p.total, state.business.moneda)}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setForm({ ...EMPTY, ...p }); setEditId(p.id); setOpen(true); }}><Pencil size={13} /></button>
                                                <button className="btn btn-danger btn-sm btn-icon" onClick={() => { if (confirm('¿Eliminar?')) actions.remove('pedidos', p.id); }}><Trash2 size={13} /></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
            <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'Editar pedido' : 'Nuevo pedido'}>
                <div className="form-grid">
                    <Field label="Fecha"><input className="input" type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} /></Field>
                    <Field label="Canal"><select className="select" value={form.canal} onChange={e => setForm({ ...form, canal: e.target.value })}>{CANALES.map(c => <option key={c}>{c}</option>)}</select></Field>
                    <Field label="Cliente" required><input className="input" value={form.clienteNombre} onChange={e => setForm({ ...form, clienteNombre: e.target.value })} /></Field>
                    <Field label="Teléfono"><input className="input" value={form.clienteTel} onChange={e => setForm({ ...form, clienteTel: e.target.value })} /></Field>
                    <Field label="Total"><input className="input" type="number" value={form.total} onChange={e => setForm({ ...form, total: e.target.value })} /></Field>
                    <Field label="Sucursal" required><select className="select" value={form.sucursalId} onChange={e => setForm({ ...form, sucursalId: e.target.value })}><option value="">Elegir...</option>{state.sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></Field>
                    <Field label="Estado"><select className="select" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>{ESTADOS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}</select></Field>
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
