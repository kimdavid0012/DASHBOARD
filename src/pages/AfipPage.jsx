import React, { useState, useMemo } from 'react';
import {
    FileText, AlertCircle, CheckCircle2, Calendar, Plus, Trash2,
    Download, Printer, Copy, Landmark, TrendingUp, DollarSign,
    Pencil, ExternalLink, Info, FileCheck, BellRing
} from 'lucide-react';
import { useData, SECTION_HELP } from '../store/DataContext';
import { PageHeader, Card, Modal, Field, EmptyState, Badge, KpiCard, InfoBox, fmtMoney, fmtDate } from '../components/UI';
import { useT } from '../i18n';

// ═══════════════════════════════════════════════════════════════════
// AFIP — Control tributario, facturación, VEPs
// ═══════════════════════════════════════════════════════════════════

// Vencimientos tipo (RG AFIP - CUIT terminando en 0-1: día 11; 2-3: 12; etc)
const VENCIMIENTOS_TIPO = [
    { id: 'iva', nombre: 'IVA Mensual (F.2002)', freq: 'mensual', aplica: ['RI'], diaBase: 11, desc: 'Declaración y pago de IVA' },
    { id: 'ganancias', nombre: 'Ganancias (personas)', freq: 'anual', aplica: ['RI'], diaBase: 15, mesBase: 6, desc: 'Impuesto a las ganancias' },
    { id: 'monotributo', nombre: 'Monotributo', freq: 'mensual', aplica: ['MONOTRIBUTO'], diaBase: 20, desc: 'Cuota mensual de monotributo' },
    { id: 'iibb', nombre: 'Ingresos Brutos', freq: 'mensual', aplica: ['RI', 'MONOTRIBUTO'], diaBase: 15, desc: 'Convenio multilateral / local' },
    { id: 'sicore', nombre: 'SICORE (retenciones)', freq: 'mensual', aplica: ['RI'], diaBase: 10, desc: 'Declaración de retenciones/percepciones' }
];

const CONDICIONES_IVA = [
    { id: 'RI', label: 'Responsable Inscripto' },
    { id: 'MONOTRIBUTO', label: 'Monotributo' },
    { id: 'EXENTO', label: 'IVA Exento' },
    { id: 'CF', label: 'Consumidor Final' }
];

const TIPOS_FACTURA = [
    { id: 'A', label: 'Factura A', desc: 'RI a RI (con IVA discriminado)', requiresRI: true },
    { id: 'B', label: 'Factura B', desc: 'RI a CF / Monotributista', requiresRI: true },
    { id: 'C', label: 'Factura C', desc: 'Monotributo / Exento (sin IVA)', requiresRI: false },
    { id: 'E', label: 'Factura E', desc: 'Exportación', requiresRI: true }
];

export default function AfipPage() {
    const t = useT();
    const { state, actions } = useData();
    const [tab, setTab] = useState('dashboard');

    const condicionIva = state.business.condicionIva;
    const cuit = state.business.cuit;
    const hasAfipData = !!(cuit && condicionIva);

    const facturas = state.afipFacturas || [];
    const veps = state.afipVeps || [];

    // Próximos vencimientos basados en la condición IVA
    const proximosVencimientos = useMemo(() => {
        if (!condicionIva) return [];
        const aplicables = VENCIMIENTOS_TIPO.filter(v => v.aplica.includes(condicionIva));
        const now = new Date();
        const hoy = now.toISOString().slice(0, 10);
        return aplicables.map(v => {
            // Siguiente ocurrencia
            const next = new Date();
            if (v.freq === 'mensual') {
                next.setDate(v.diaBase);
                if (next < now) next.setMonth(next.getMonth() + 1);
            } else if (v.freq === 'anual') {
                next.setMonth(v.mesBase || 5);
                next.setDate(v.diaBase);
                if (next < now) next.setFullYear(next.getFullYear() + 1);
            }
            const dias = Math.ceil((next - now) / (1000 * 60 * 60 * 24));
            return {
                ...v,
                fecha: next.toISOString().slice(0, 10),
                diasRestantes: dias
            };
        }).sort((a, b) => a.diasRestantes - b.diasRestantes);
    }, [condicionIva]);

    // KPIs mes
    const kpis = useMemo(() => {
        const mes = new Date().toISOString().slice(0, 7);
        const facturasMes = facturas.filter(f => (f.fecha || '').slice(0, 7) === mes);
        const totalFacturadoMes = facturasMes.reduce((s, f) => s + Number(f.total || 0), 0);
        const ivaDebitoMes = facturasMes.reduce((s, f) => s + Number(f.iva || 0), 0);
        const vepsPendientes = veps.filter(v => v.estado === 'pendiente');
        const totalVepsPendientes = vepsPendientes.reduce((s, v) => s + Number(v.monto || 0), 0);
        return {
            facturasMes: facturasMes.length,
            totalFacturadoMes,
            ivaDebitoMes,
            vepsPendientes: vepsPendientes.length,
            totalVepsPendientes
        };
    }, [facturas, veps]);

    if (!hasAfipData) {
        return (
            <div>
                <PageHeader
                    icon={FileText}
                    title={t('afip.title')}
                    subtitle={t('afip.subtitle')}
                    help={SECTION_HELP.afip}
                />
                <Card>
                    <div style={{ padding: 24 }}>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, margin: '0 0 12px' }}>
                            📋 Cargá tus datos fiscales primero
                        </h3>
                        <p className="text-sm text-muted mb-4" style={{ maxWidth: 600, lineHeight: 1.6 }}>
                            Para usar la sección AFIP necesito algunos datos básicos de tu CUIT, condición frente al IVA y punto de venta.
                            <strong style={{ color: 'var(--accent)' }}> No se comparten con nadie — quedan locales en tu dispositivo.</strong>
                        </p>
                        <AfipConfigForm onSaved={() => setTab('dashboard')} />
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                icon={FileText}
                title={t('afip.title')}
                subtitle={`${state.business.razonSocial || cuit} · CUIT ${cuit} · ${CONDICIONES_IVA.find(c => c.id === condicionIva)?.label}`}
                help={SECTION_HELP.afip}
                actions={
                    <button className="btn btn-ghost btn-sm" onClick={() => setTab('config')}>
                        <Pencil size={13} /> Datos fiscales
                    </button>
                }
            />

            <div className="tabs">
                <button className={`tab ${tab === 'dashboard' ? 'active' : ''}`} onClick={() => setTab('dashboard')}>📊 Resumen</button>
                <button className={`tab ${tab === 'facturas' ? 'active' : ''}`} onClick={() => setTab('facturas')}>📄 Facturas</button>
                <button className={`tab ${tab === 'veps' ? 'active' : ''}`} onClick={() => setTab('veps')}>💸 VEPs</button>
                <button className={`tab ${tab === 'vencimientos' ? 'active' : ''}`} onClick={() => setTab('vencimientos')}>📅 Vencimientos</button>
                <button className={`tab ${tab === 'config' ? 'active' : ''}`} onClick={() => setTab('config')}>⚙️ Configuración</button>
            </div>

            {tab === 'dashboard' && (
                <div>
                    <div className="kpi-grid mb-4">
                        <KpiCard icon={<FileCheck size={20} />} label="Facturas este mes" value={kpis.facturasMes} color="#63f1cb" />
                        <KpiCard icon={<DollarSign size={20} />} label="Facturado mes" value={fmtMoney(kpis.totalFacturadoMes)} color="#60a5fa" />
                        <KpiCard icon={<TrendingUp size={20} />} label="IVA débito mes" value={fmtMoney(kpis.ivaDebitoMes)} color="#fbbf24" hint="21% del neto gravado" />
                        <KpiCard icon={<BellRing size={20} />} label="VEPs pendientes" value={kpis.vepsPendientes} color="#fb7185" hint={fmtMoney(kpis.totalVepsPendientes)} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
                        <Card title="Próximos vencimientos" subtitle="Según tu condición frente al IVA">
                            {proximosVencimientos.length === 0 ? (
                                <div className="text-sm text-muted">Sin vencimientos configurados.</div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {proximosVencimientos.slice(0, 5).map(v => {
                                        const urgency = v.diasRestantes <= 3 ? 'danger' : v.diasRestantes <= 7 ? 'warning' : 'muted';
                                        return (
                                            <div key={v.id} style={{
                                                padding: 12, background: 'var(--bg-elevated)', borderRadius: 10,
                                                borderLeft: `3px solid ${urgency === 'danger' ? 'var(--danger)' : urgency === 'warning' ? 'var(--warning)' : 'var(--border-color)'}`
                                            }}>
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <div className="font-semibold text-sm">{v.nombre}</div>
                                                        <div className="text-xs text-muted">{v.desc}</div>
                                                    </div>
                                                    <Badge variant={urgency}>
                                                        {v.diasRestantes === 0 ? 'HOY'
                                                            : v.diasRestantes < 0 ? `Vencido hace ${Math.abs(v.diasRestantes)}d`
                                                                : `En ${v.diasRestantes}d`}
                                                    </Badge>
                                                </div>
                                                <div className="text-xs text-muted mt-1">{fmtDate(v.fecha)}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>

                        <Card title="Últimas facturas emitidas">
                            {facturas.length === 0 ? (
                                <div className="text-sm text-muted">Sin facturas emitidas aún. Andá a la pestaña Facturas para emitir la primera.</div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {facturas.slice(0, 5).map(f => (
                                        <div key={f.id} style={{ padding: 10, background: 'var(--bg-elevated)', borderRadius: 10 }}>
                                            <div className="flex justify-between">
                                                <div>
                                                    <div className="font-semibold text-sm">{f.tipo} · {f.puntoVenta || '0001'}-{String(f.numero || 1).padStart(8, '0')}</div>
                                                    <div className="text-xs text-muted">{f.cliente || 'Consumidor final'}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-semibold mono text-sm">{fmtMoney(f.total)}</div>
                                                    <div className="text-xs text-muted">{fmtDate(f.fecha)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    </div>

                    <InfoBox variant="info" style={{ marginTop: 16 }}>
                        <strong>Nota sobre emisión real:</strong> Para emitir facturas con CAE real en tiempo real contra AFIP (WSFE/WSAA),
                        necesitás backend (certificado .p12 firmando SOAP). Esto se activa en <strong>Fase A</strong> con Firebase Cloud Functions.
                        Mientras tanto, desde acá podés generar PDFs correctamente numerados y llevar el tracking de todo.
                    </InfoBox>
                </div>
            )}

            {tab === 'facturas' && <FacturasTab state={state} actions={actions} />}
            {tab === 'veps' && <VepsTab state={state} actions={actions} />}
            {tab === 'vencimientos' && <VencimientosTab vencimientos={proximosVencimientos} />}
            {tab === 'config' && <div><AfipConfigForm /></div>}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// CONFIG FORM
// ═══════════════════════════════════════════════════════════════════
function AfipConfigForm({ onSaved }) {
    const { state, actions } = useData();
    const [form, setForm] = useState({
        cuit: state.business.cuit || '',
        razonSocial: state.business.razonSocial || '',
        condicionIva: state.business.condicionIva || '',
        ingresosBrutos: state.business.ingresosBrutos || '',
        puntoVenta: state.business.puntoVenta || '0001',
        domicilioFiscal: state.business.domicilioFiscal || ''
    });

    const save = () => {
        if (!form.cuit.trim() || !form.condicionIva) {
            alert('CUIT y Condición IVA son obligatorios');
            return;
        }
        // Validación básica de CUIT (11 dígitos)
        const cuitClean = form.cuit.replace(/[-.]/g, '');
        if (!/^\d{11}$/.test(cuitClean)) {
            alert('El CUIT debe tener 11 dígitos');
            return;
        }
        actions.updateBusiness({ ...form, cuit: cuitClean });
        alert('✓ Datos fiscales guardados');
        onSaved?.();
    };

    return (
        <Card>
            <div className="form-grid">
                <Field label="CUIT" required hint="Sin guiones (11 dígitos)">
                    <input
                        className="input mono"
                        placeholder="20123456789"
                        value={form.cuit}
                        onChange={e => setForm({ ...form, cuit: e.target.value.replace(/[^0-9]/g, '').slice(0, 11) })}
                    />
                </Field>
                <Field label="Razón Social / Nombre fiscal">
                    <input className="input" placeholder="Tu nombre o razón social tal como figura en AFIP" value={form.razonSocial} onChange={e => setForm({ ...form, razonSocial: e.target.value })} />
                </Field>
                <Field label="Condición IVA" required>
                    <select className="select" value={form.condicionIva} onChange={e => setForm({ ...form, condicionIva: e.target.value })}>
                        <option value="">Elegir...</option>
                        {CONDICIONES_IVA.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                </Field>
                <Field label="Punto de venta" hint="Ej: 0001, 0002">
                    <input className="input mono" value={form.puntoVenta} onChange={e => setForm({ ...form, puntoVenta: e.target.value })} />
                </Field>
                <Field label="Ingresos Brutos" hint="Opcional">
                    <input className="input" placeholder="Número de IIBB" value={form.ingresosBrutos} onChange={e => setForm({ ...form, ingresosBrutos: e.target.value })} />
                </Field>
                <Field label="Domicilio fiscal" hint="Opcional">
                    <input className="input" value={form.domicilioFiscal} onChange={e => setForm({ ...form, domicilioFiscal: e.target.value })} />
                </Field>
            </div>
            <InfoBox variant="info" style={{ marginTop: 16 }}>
                🔒 Esta información queda guardada en tu dispositivo (IndexedDB + localStorage). <strong>No se comparte con ningún servicio externo</strong>.
            </InfoBox>
            <div className="flex gap-2 mt-4 justify-end">
                <button className="btn btn-primary btn-lg" onClick={save}>
                    <CheckCircle2 size={16} /> Guardar datos fiscales
                </button>
            </div>
        </Card>
    );
}

// ═══════════════════════════════════════════════════════════════════
// FACTURAS TAB
// ═══════════════════════════════════════════════════════════════════
function FacturasTab({ state, actions }) {
    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const facturas = (state.afipFacturas || []).slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

    const condicionIva = state.business.condicionIva;
    const tiposDisponibles = TIPOS_FACTURA.filter(t => !t.requiresRI || condicionIva === 'RI');
    const defaultTipo = condicionIva === 'MONOTRIBUTO' ? 'C' : 'B';

    const EMPTY = {
        fecha: new Date().toISOString().slice(0, 10),
        tipo: defaultTipo,
        puntoVenta: state.business.puntoVenta || '0001',
        numero: (facturas[0]?.numero || 0) + 1,
        cliente: '',
        cuitCliente: '',
        condicionIvaCliente: 'CF',
        items: [{ descripcion: '', cantidad: 1, precioUnitario: 0 }],
        neto: 0,
        iva: 0,
        total: 0,
        metodoPago: 'Efectivo',
        cae: '',
        caeVto: '',
        observaciones: ''
    };
    const [form, setForm] = useState(EMPTY);

    // Recalcular totales al cambiar items
    const updateForm = (patch) => {
        const next = { ...form, ...patch };
        const items = next.items || [];
        const neto = items.reduce((s, it) => s + Number(it.cantidad || 0) * Number(it.precioUnitario || 0), 0);
        const aplicaIva = next.tipo === 'A' || next.tipo === 'B';
        const iva = aplicaIva ? neto * 0.21 : 0;
        const total = neto + iva;
        next.neto = neto;
        next.iva = iva;
        next.total = total;
        setForm(next);
    };

    const addItem = () => updateForm({ items: [...form.items, { descripcion: '', cantidad: 1, precioUnitario: 0 }] });
    const removeItem = (i) => updateForm({ items: form.items.filter((_, idx) => idx !== i) });
    const updateItem = (i, patch) => updateForm({ items: form.items.map((it, idx) => idx === i ? { ...it, ...patch } : it) });

    const save = () => {
        if (!form.items.length || form.items.some(it => !it.descripcion.trim())) {
            alert('Cada ítem debe tener descripción');
            return;
        }
        if (editId) actions.update('afipFacturas', editId, form);
        else actions.add('afipFacturas', form);
        setOpen(false);
        setForm(EMPTY);
        setEditId(null);
    };

    const generarPDF = (f) => {
        // Generador simple de factura en ventana aparte (imprimir/guardar como PDF)
        const business = state.business;
        const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Factura ${f.tipo} ${f.puntoVenta}-${String(f.numero).padStart(8,'0')}</title>
<style>
  body { font-family: 'Helvetica', sans-serif; max-width: 800px; margin: 20px auto; padding: 20px; color: #222; font-size: 13px; }
  .header { display: flex; justify-content: space-between; border-bottom: 2px solid #222; padding-bottom: 16px; margin-bottom: 20px; }
  .tipo-box { border: 2px solid #222; padding: 14px 30px; font-size: 48px; font-weight: bold; text-align: center; line-height: 1; }
  .tipo-box small { display: block; font-size: 11px; font-weight: normal; margin-top: 4px; }
  h1 { margin: 0; font-size: 18px; }
  .data { font-size: 12px; line-height: 1.6; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th, td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 12px; }
  th { background: #f5f5f5; }
  .right { text-align: right; }
  .totals { margin-top: 16px; display: flex; justify-content: flex-end; }
  .totals table { width: 300px; }
  .totals .total-row td { font-weight: bold; font-size: 14px; background: #222; color: #fff; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 10px; color: #666; text-align: center; }
  @media print { body { padding: 0; } }
</style></head><body>
  <div class="header">
    <div>
      <h1>${business.razonSocial || business.name || 'Mi Negocio'}</h1>
      <div class="data">
        ${business.domicilioFiscal ? business.domicilioFiscal + '<br>' : ''}
        CUIT: ${business.cuit}<br>
        Ingresos Brutos: ${business.ingresosBrutos || '—'}<br>
        Cond. IVA: ${CONDICIONES_IVA.find(c => c.id === business.condicionIva)?.label || '—'}
      </div>
    </div>
    <div style="text-align: center;">
      <div class="tipo-box">${f.tipo}<small>COD. ${f.tipo === 'A' ? '01' : f.tipo === 'B' ? '06' : f.tipo === 'C' ? '11' : '19'}</small></div>
      <div style="margin-top: 8px; font-size: 14px;"><strong>${f.puntoVenta}-${String(f.numero).padStart(8, '0')}</strong></div>
      <div style="font-size: 11px;">Fecha: ${fmtDate(f.fecha)}</div>
    </div>
  </div>
  <div class="data" style="margin-bottom: 16px;">
    <strong>Cliente:</strong> ${f.cliente || 'Consumidor Final'}<br>
    ${f.cuitCliente ? 'CUIT: ' + f.cuitCliente + '<br>' : ''}
    Condición IVA: ${CONDICIONES_IVA.find(c => c.id === f.condicionIvaCliente)?.label || '—'}
  </div>
  <table>
    <thead><tr>
      <th>Descripción</th><th class="right">Cant.</th><th class="right">P. Unit.</th><th class="right">Subtotal</th>
    </tr></thead>
    <tbody>
      ${f.items.map(it => `<tr>
        <td>${it.descripcion}</td>
        <td class="right">${it.cantidad}</td>
        <td class="right">$${Number(it.precioUnitario).toLocaleString('es-AR')}</td>
        <td class="right">$${(Number(it.cantidad) * Number(it.precioUnitario)).toLocaleString('es-AR')}</td>
      </tr>`).join('')}
    </tbody>
  </table>
  <div class="totals"><table>
    ${(f.tipo === 'A' || f.tipo === 'B') ? `
      <tr><td>Subtotal (sin IVA)</td><td class="right">$${Number(f.neto).toLocaleString('es-AR')}</td></tr>
      <tr><td>IVA 21%</td><td class="right">$${Number(f.iva).toLocaleString('es-AR')}</td></tr>
    ` : ''}
    <tr class="total-row"><td>TOTAL</td><td class="right">$${Number(f.total).toLocaleString('es-AR')}</td></tr>
  </table></div>
  ${f.observaciones ? `<div class="data" style="margin-top: 16px;"><strong>Observaciones:</strong><br>${f.observaciones}</div>` : ''}
  <div class="footer">
    ${f.cae ? `CAE: ${f.cae} · Vto CAE: ${f.caeVto || '—'}<br>` : '⚠️ Documento provisorio sin CAE real (activar con fase A de Firebase backend)<br>'}
    Generado por Dashboard · ${new Date().toLocaleString('es-AR')}
  </div>
  <script>setTimeout(() => window.print(), 300);</script>
</body></html>`;
        const w = window.open('', '_blank');
        w.document.write(html);
        w.document.close();
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <div>
                    <div className="text-sm text-muted">{facturas.length} facturas emitidas</div>
                </div>
                <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setEditId(null); setOpen(true); }}>
                    <Plus size={14} /> Nueva factura
                </button>
            </div>

            <Card>
                {facturas.length === 0 ? (
                    <EmptyState
                        icon={FileText}
                        title="Sin facturas emitidas"
                        description="Cargá tu primera factura. Se genera numeración automática y PDF listo para imprimir."
                        action={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={14} /> Primera factura</button>}
                    />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead><tr><th>Tipo</th><th>Número</th><th>Fecha</th><th>Cliente</th><th className="right">Neto</th><th className="right">IVA</th><th className="right">Total</th><th></th></tr></thead>
                            <tbody>
                                {facturas.slice(0, 100).map(f => (
                                    <tr key={f.id}>
                                        <td><Badge variant={f.tipo === 'A' ? 'info' : f.tipo === 'C' ? 'muted' : 'success'}>{f.tipo}</Badge></td>
                                        <td className="mono text-sm">{f.puntoVenta || '0001'}-{String(f.numero).padStart(8, '0')}</td>
                                        <td className="text-sm">{fmtDate(f.fecha)}</td>
                                        <td className="text-sm">{f.cliente || 'Consumidor Final'}</td>
                                        <td className="right mono">{fmtMoney(f.neto)}</td>
                                        <td className="right mono text-sm text-muted">{fmtMoney(f.iva)}</td>
                                        <td className="right mono font-semibold">{fmtMoney(f.total)}</td>
                                        <td className="right">
                                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => generarPDF(f)} title="Imprimir/PDF">
                                                <Printer size={13} />
                                            </button>
                                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setForm(f); setEditId(f.id); setOpen(true); }}>
                                                <Pencil size={13} />
                                            </button>
                                            <button className="btn btn-danger btn-sm btn-icon" onClick={() => { if (confirm('¿Eliminar factura?')) actions.remove('afipFacturas', f.id); }}>
                                                <Trash2 size={13} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'Editar factura' : 'Nueva factura'} size="lg">
                <div className="form-grid">
                    <Field label="Tipo" required>
                        <select className="select" value={form.tipo} onChange={e => updateForm({ tipo: e.target.value })}>
                            {tiposDisponibles.map(t => <option key={t.id} value={t.id}>{t.label} — {t.desc}</option>)}
                        </select>
                    </Field>
                    <Field label="Punto de venta"><input className="input mono" value={form.puntoVenta} onChange={e => updateForm({ puntoVenta: e.target.value })} /></Field>
                    <Field label="Número" hint="Se autoincrementa"><input className="input mono" type="number" value={form.numero} onChange={e => updateForm({ numero: Number(e.target.value) })} /></Field>
                    <Field label="Fecha"><input className="input" type="date" value={form.fecha} onChange={e => updateForm({ fecha: e.target.value })} /></Field>
                </div>

                <div className="form-grid mt-3">
                    <Field label="Cliente" hint="Razón social o nombre">
                        <input className="input" value={form.cliente} onChange={e => updateForm({ cliente: e.target.value })} placeholder="Consumidor Final" />
                    </Field>
                    <Field label="CUIT/DNI cliente"><input className="input mono" value={form.cuitCliente} onChange={e => updateForm({ cuitCliente: e.target.value })} /></Field>
                    <Field label="Condición IVA del cliente">
                        <select className="select" value={form.condicionIvaCliente} onChange={e => updateForm({ condicionIvaCliente: e.target.value })}>
                            {CONDICIONES_IVA.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                    </Field>
                </div>

                <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                        <div className="field-label">ítems</div>
                        <button className="btn btn-ghost btn-sm" onClick={addItem}><Plus size={12} /> Agregar</button>
                    </div>
                    <div className="flex flex-col gap-2">
                        {form.items.map((it, i) => (
                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px 120px 32px', gap: 6, alignItems: 'center' }}>
                                <input className="input" placeholder="Descripción" value={it.descripcion} onChange={e => updateItem(i, { descripcion: e.target.value })} />
                                <input className="input mono" type="number" placeholder="Cant." value={it.cantidad} onChange={e => updateItem(i, { cantidad: Number(e.target.value) })} />
                                <input className="input mono" type="number" placeholder="P. unit." value={it.precioUnitario} onChange={e => updateItem(i, { precioUnitario: Number(e.target.value) })} />
                                <div className="mono text-sm text-right" style={{ padding: '0 8px' }}>{fmtMoney(Number(it.cantidad) * Number(it.precioUnitario))}</div>
                                <button className="btn btn-danger btn-sm btn-icon" onClick={() => removeItem(i)} disabled={form.items.length === 1}><Trash2 size={12} /></button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card mt-4" style={{ background: 'var(--bg-elevated)' }}>
                    {(form.tipo === 'A' || form.tipo === 'B') && (
                        <>
                            <div className="flex justify-between mb-2"><span className="text-sm">Neto gravado</span><span className="mono">{fmtMoney(form.neto)}</span></div>
                            <div className="flex justify-between mb-2"><span className="text-sm">IVA 21%</span><span className="mono">{fmtMoney(form.iva)}</span></div>
                        </>
                    )}
                    <div className="flex justify-between" style={{ paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
                        <span className="font-semibold">TOTAL</span>
                        <span className="mono font-bold" style={{ fontSize: 20, color: 'var(--accent)' }}>{fmtMoney(form.total)}</span>
                    </div>
                </div>

                <div className="form-grid mt-3">
                    <Field label="CAE" hint="Obligatorio para factura real — vacío si aún no se validó">
                        <input className="input mono" value={form.cae} onChange={e => updateForm({ cae: e.target.value })} />
                    </Field>
                    <Field label="Vto CAE" hint="Fecha">
                        <input className="input" type="date" value={form.caeVto} onChange={e => updateForm({ caeVto: e.target.value })} />
                    </Field>
                </div>
                <div className="mt-3">
                    <Field label="Observaciones"><textarea className="textarea" value={form.observaciones} onChange={e => updateForm({ observaciones: e.target.value })} /></Field>
                </div>

                <div className="flex gap-2 mt-4 justify-end">
                    <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
                    <button className="btn btn-primary btn-lg" onClick={save}>{editId ? 'Guardar cambios' : 'Emitir factura'}</button>
                </div>
            </Modal>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// VEPS TAB
// ═══════════════════════════════════════════════════════════════════
function VepsTab({ state, actions }) {
    const [open, setOpen] = useState(false);
    const veps = (state.afipVeps || []).slice().sort((a, b) => (a.vencimiento || '').localeCompare(b.vencimiento || ''));
    const EMPTY = { concepto: '', monto: '', vencimiento: '', periodo: '', estado: 'pendiente', numeroVep: '', notas: '' };
    const [form, setForm] = useState(EMPTY);

    const save = () => {
        if (!form.concepto.trim() || !form.monto) return alert('Concepto y monto son obligatorios');
        actions.add('afipVeps', { ...form, monto: Number(form.monto) });
        setOpen(false);
        setForm(EMPTY);
    };

    const togglePagado = (v) => {
        actions.update('afipVeps', v.id, { estado: v.estado === 'pagado' ? 'pendiente' : 'pagado', pagadoEn: v.estado === 'pagado' ? null : new Date().toISOString() });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-muted">{veps.filter(v => v.estado === 'pendiente').length} pendientes · {veps.filter(v => v.estado === 'pagado').length} pagados</div>
                <button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={14} /> Cargar VEP</button>
            </div>
            <Card>
                {veps.length === 0 ? (
                    <EmptyState icon={DollarSign} title="Sin VEPs cargados" description="Cargá VEPs (Volantes Electrónicos de Pago) para trackear tus pagos a AFIP y organismos." action={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={14} /> Cargar primer VEP</button>} />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead><tr><th></th><th>Concepto</th><th>Período</th><th>N° VEP</th><th className="right">Monto</th><th>Vencimiento</th><th>Estado</th><th></th></tr></thead>
                            <tbody>
                                {veps.map(v => {
                                    const dias = v.vencimiento ? Math.ceil((new Date(v.vencimiento) - new Date()) / (1000 * 60 * 60 * 24)) : null;
                                    return (
                                        <tr key={v.id}>
                                            <td><input type="checkbox" checked={v.estado === 'pagado'} onChange={() => togglePagado(v)} /></td>
                                            <td className="font-semibold text-sm">{v.concepto}</td>
                                            <td className="text-sm text-muted">{v.periodo || '—'}</td>
                                            <td className="mono text-sm">{v.numeroVep || '—'}</td>
                                            <td className="right mono font-semibold">{fmtMoney(v.monto)}</td>
                                            <td className="text-sm">{v.vencimiento ? fmtDate(v.vencimiento) : '—'}</td>
                                            <td>
                                                {v.estado === 'pagado' ? <Badge variant="success">✓ Pagado</Badge>
                                                    : dias !== null && dias < 0 ? <Badge variant="danger">Vencido</Badge>
                                                    : dias !== null && dias <= 3 ? <Badge variant="danger">Vence en {dias}d</Badge>
                                                    : dias !== null && dias <= 7 ? <Badge variant="warning">Vence en {dias}d</Badge>
                                                    : <Badge variant="muted">Pendiente</Badge>}
                                            </td>
                                            <td className="right">
                                                <button className="btn btn-danger btn-sm btn-icon" onClick={() => { if (confirm('¿Eliminar?')) actions.remove('afipVeps', v.id); }}><Trash2 size={13} /></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
            <Modal open={open} onClose={() => setOpen(false)} title="Cargar VEP">
                <div className="form-grid">
                    <Field label="Concepto" required><input className="input" placeholder="IVA, IIBB, Monotributo..." value={form.concepto} onChange={e => setForm({ ...form, concepto: e.target.value })} /></Field>
                    <Field label="Monto" required><input className="input mono" type="number" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} /></Field>
                    <Field label="Período" hint="YYYY-MM"><input className="input mono" placeholder="2026-04" value={form.periodo} onChange={e => setForm({ ...form, periodo: e.target.value })} /></Field>
                    <Field label="N° VEP"><input className="input mono" value={form.numeroVep} onChange={e => setForm({ ...form, numeroVep: e.target.value })} /></Field>
                    <Field label="Vencimiento"><input className="input" type="date" value={form.vencimiento} onChange={e => setForm({ ...form, vencimiento: e.target.value })} /></Field>
                    <Field label="Estado">
                        <select className="select" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                            <option value="pendiente">Pendiente</option>
                            <option value="pagado">Pagado</option>
                        </select>
                    </Field>
                </div>
                <div className="mt-3"><Field label="Notas"><textarea className="textarea" value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} /></Field></div>
                <div className="flex gap-2 mt-4 justify-end">
                    <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
                    <button className="btn btn-primary" onClick={save}>Guardar VEP</button>
                </div>
            </Modal>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// VENCIMIENTOS TAB
// ═══════════════════════════════════════════════════════════════════
function VencimientosTab({ vencimientos }) {
    return (
        <div>
            <InfoBox variant="info">
                📌 Estos vencimientos se calculan automáticamente según tu condición IVA. Las fechas exactas pueden variar según la terminación de tu CUIT — <strong>verificá siempre en el sitio oficial de AFIP</strong>.
            </InfoBox>
            <div className="flex flex-col gap-2 mt-4">
                {vencimientos.length === 0 ? (
                    <Card><div className="text-sm text-muted">No hay vencimientos configurados para tu condición fiscal.</div></Card>
                ) : vencimientos.map(v => {
                    const urgency = v.diasRestantes <= 3 ? 'danger' : v.diasRestantes <= 7 ? 'warning' : 'muted';
                    return (
                        <Card key={v.id}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex gap-2 items-center mb-1">
                                        <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600 }}>{v.nombre}</h3>
                                        <Badge variant={v.freq === 'mensual' ? 'info' : 'success'}>{v.freq}</Badge>
                                    </div>
                                    <div className="text-sm text-muted mb-2">{v.desc}</div>
                                    <div className="text-sm">Próximo vencimiento: <strong>{fmtDate(v.fecha)}</strong></div>
                                </div>
                                <Badge variant={urgency}>
                                    {v.diasRestantes === 0 ? 'HOY'
                                        : v.diasRestantes < 0 ? `Vencido hace ${Math.abs(v.diasRestantes)}d`
                                            : `En ${v.diasRestantes}d`}
                                </Badge>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
