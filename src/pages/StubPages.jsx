import React, { useState } from 'react';
import {
    Megaphone, Bot, Instagram, Music2, BarChart3, Globe,
    Landmark, CheckSquare, Plus, Trash2, ArrowRight, Settings2, Pencil
} from 'lucide-react';
import { useData, filterBySucursal, SECTION_HELP } from '../store/DataContext';
import { PageHeader, Card, Modal, Field, EmptyState, Badge, KpiCard, InfoBox, fmtMoney, fmtDate } from '../components/UI';

const ComingSoonCard = ({ icon: Icon, title, description, steps, onNavigate }) => (
    <Card>
        <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{
                width: 72, height: 72, borderRadius: 50,
                background: 'var(--accent-soft)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent)', marginBottom: 16
            }}>
                <Icon size={32} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>{title}</h3>
            <p className="text-sm text-muted" style={{ maxWidth: 500, margin: '0 auto 20px' }}>{description}</p>

            {steps && (
                <div style={{
                    textAlign: 'left',
                    display: 'inline-block',
                    background: 'var(--bg-elevated)',
                    padding: 20,
                    borderRadius: 12,
                    maxWidth: 500,
                    marginBottom: 16
                }}>
                    <div className="text-xs font-semibold mb-2" style={{ color: 'var(--accent)' }}>⚙️ CÓMO ACTIVARLO:</div>
                    <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.7 }}>
                        {steps.map((s, i) => <li key={i}>{s}</li>)}
                    </ol>
                </div>
            )}

            {onNavigate && (
                <div>
                    <button className="btn btn-primary" onClick={onNavigate}>
                        <Settings2 size={14} /> Ir a Configuración
                    </button>
                </div>
            )}
        </div>
    </Card>
);

// ═══════════════════════════ MARKETING ═══════════════════════════
export function MarketingPage({ onNavigate }) {
    const { state } = useData();
    const hasMeta = !!state.integraciones.metaAccessToken;
    return (
        <div>
            <PageHeader icon={Megaphone} title="Marketing" subtitle="Meta Ads, WhatsApp Business y Email Marketing" help={SECTION_HELP.marketing} />
            {!hasMeta ? (
                <ComingSoonCard
                    icon={Megaphone}
                    title="Conectá Meta Ads para empezar"
                    description="Cuando conectes tu cuenta de Meta Ads, vas a ver campañas activas, presupuesto, impresiones, clicks y conversiones."
                    steps={[
                        'Andá a Configuración → Integraciones',
                        'Pegá tu Meta Access Token',
                        'Pegá tu Pixel ID (opcional, para tracking web)',
                        'Volvé a esta pantalla y vas a ver tus campañas'
                    ]}
                    onNavigate={() => onNavigate?.('settings')}
                />
            ) : (
                <Card><EmptyState icon={Megaphone} title="Conectado ✓" description="Meta Ads configurado. La visualización de campañas requiere ejecutar un agente AI o conectar la API Graph. (próximamente)" /></Card>
            )}
        </div>
    );
}

// ═══════════════════════════ AGENTS AI ═══════════════════════════
export function AgentsPage({ onNavigate }) {
    const { state } = useData();
    const hasKey = !!(state.integraciones.openaiKey || state.integraciones.anthropicKey);
    const AGENTS = [
        { id: 'analista', name: 'Analista de ventas', desc: 'Detecta tendencias, días fuertes y productos ganadores' },
        { id: 'trend', name: 'Trend Scout', desc: 'Investiga tendencias del rubro y sugiere productos' },
        { id: 'content', name: 'Content Creator', desc: 'Genera copys para Instagram, TikTok y Email' },
        { id: 'estratega', name: 'Estratega', desc: 'Recomendaciones estratégicas y decisiones comerciales' },
        { id: 'ceo', name: 'CEO meta-agente', desc: 'Coordina a todos los otros agentes y te da un briefing ejecutivo' }
    ];

    return (
        <div>
            <PageHeader icon={Bot} title="Agentes AI" subtitle="Asistentes que analizan tu data y te dan insights" help={SECTION_HELP.agents} />
            {!hasKey ? (
                <ComingSoonCard
                    icon={Bot}
                    title="Conectá tu API Key para usar los agentes"
                    description="Los agentes usan OpenAI o Anthropic para analizar tu data y darte recomendaciones específicas."
                    steps={[
                        'Andá a Configuración → Integraciones',
                        'Pegá tu API Key de OpenAI o Anthropic',
                        'Volvé a esta pantalla y vas a ver los agentes disponibles',
                        'Ejecutá uno y mirá el resultado'
                    ]}
                    onNavigate={() => onNavigate?.('settings')}
                />
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                    {AGENTS.map(a => (
                        <Card key={a.id}>
                            <div className="flex items-center gap-3 mb-3">
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Bot size={20} />
                                </div>
                                <div>
                                    <div className="font-semibold">{a.name}</div>
                                    <div className="text-xs text-muted">{a.desc}</div>
                                </div>
                            </div>
                            <button className="btn btn-primary w-full" onClick={() => alert('La ejecución de agentes se activará en próximo release')}>
                                <Bot size={14} /> Ejecutar
                            </button>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════ INSTAGRAM ═══════════════════════════
export function InstagramPage({ onNavigate }) {
    const { state } = useData();
    const hasIG = !!state.integraciones.instagramBusinessId;
    return (
        <div>
            <PageHeader icon={Instagram} title="Instagram" subtitle="Analytics + planner de contenido" help={SECTION_HELP.instagram} />
            {!hasIG ? (
                <ComingSoonCard
                    icon={Instagram}
                    title="Conectá tu cuenta de Instagram Business"
                    description="Una vez conectado, vas a ver seguidores, alcance, engagement y un calendario para planificar posts."
                    steps={[
                        'Convertí tu cuenta de IG a "Business"',
                        'Conectala a una página de Facebook',
                        'Obtené el Instagram Business ID desde Meta Business Suite',
                        'Pegalo en Configuración → Integraciones',
                        'Volvé a esta pantalla'
                    ]}
                    onNavigate={() => onNavigate?.('settings')}
                />
            ) : (
                <Card><EmptyState icon={Instagram} title="Conectado ✓" description="IG Business ID guardado. Analytics se mostrarán cuando ejecutes el agente de IG. (próximamente)" /></Card>
            )}
        </div>
    );
}

// ═══════════════════════════ TIKTOK ═══════════════════════════
export function TikTokPage({ onNavigate }) {
    return (
        <div>
            <PageHeader icon={Music2} title="TikTok" subtitle="Analytics de videos y sugerencias" help={SECTION_HELP.tiktok} />
            <ComingSoonCard
                icon={Music2}
                title="TikTok Analytics & Planner"
                description="Analizá el rendimiento de tus videos y planificá contenido."
                steps={[
                    'Convertí tu cuenta a TikTok for Business',
                    'Generá un Access Token desde TikTok Developer',
                    'Pegalo en Configuración → Integraciones (próximamente)',
                    'Vas a ver: views, likes, shares, top videos, calendario'
                ]}
                onNavigate={() => onNavigate?.('settings')}
            />
        </div>
    );
}

// ═══════════════════════════ ANALYTICS ═══════════════════════════
export function AnalyticsPage({ onNavigate }) {
    const { state } = useData();
    const hasGA = !!state.integraciones.googleAnalyticsId;
    return (
        <div>
            <PageHeader icon={BarChart3} title="Analytics" subtitle="Tráfico de tu sitio web" help={SECTION_HELP.analytics} />
            {!hasGA ? (
                <ComingSoonCard
                    icon={BarChart3}
                    title="Conectá Google Analytics 4"
                    description="Vas a ver sesiones, usuarios, conversiones y orígenes de tráfico de tu web."
                    steps={[
                        'Creá una propiedad GA4 en analytics.google.com',
                        'Copiá el Measurement ID (formato G-XXXXXXXXXX)',
                        'Pegalo en Configuración → Integraciones',
                        'Volvé a esta pantalla'
                    ]}
                    onNavigate={() => onNavigate?.('settings')}
                />
            ) : (
                <Card><EmptyState icon={BarChart3} title="GA4 configurado ✓" description={`Measurement ID: ${state.integraciones.googleAnalyticsId}. Analytics en vivo se mostrarán en próximo release.`} /></Card>
            )}
        </div>
    );
}

// ═══════════════════════════ WEB / TIENDA ONLINE ═══════════════════════════
export function WebPage({ onNavigate }) {
    const { state } = useData();
    const hasWoo = !!state.integraciones.wooStoreUrl;
    return (
        <div>
            <PageHeader icon={Globe} title="Tienda online" subtitle="WooCommerce / Shopify" help={SECTION_HELP.web} />
            {!hasWoo ? (
                <ComingSoonCard
                    icon={Globe}
                    title="Conectá tu tienda online"
                    description="Sincronizá productos, stock y pedidos automáticamente desde WooCommerce o Shopify."
                    steps={[
                        'Andá a tu tienda WooCommerce → WooCommerce → Configuración → Avanzado → REST API',
                        'Creá una clave nueva con permisos de lectura/escritura',
                        'Copiá Consumer Key + Consumer Secret + URL de la tienda',
                        'Pegalos en Configuración → Integraciones'
                    ]}
                    onNavigate={() => onNavigate?.('settings')}
                />
            ) : (
                <Card><EmptyState icon={Globe} title="Tienda conectada ✓" description={`URL: ${state.integraciones.wooStoreUrl}`} /></Card>
            )}
        </div>
    );
}

// ═══════════════════════════ BANKING ═══════════════════════════
export function BankingPage() {
    const { state, actions } = useData();
    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const EMPTY = {
        fecha: new Date().toISOString().slice(0, 10),
        tipo: 'ingreso',
        concepto: '',
        monto: '',
        banco: '',
        sucursalId: '',
        notas: ''
    };
    const [form, setForm] = useState(EMPTY);

    const movs = (state.movimientosBancarios || []).slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    const totalIngresos = movs.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + Number(m.monto || 0), 0);
    const totalEgresos = movs.filter(m => m.tipo === 'egreso').reduce((s, m) => s + Number(m.monto || 0), 0);

    const save = () => {
        if (!form.concepto.trim()) return alert('Concepto obligatorio');
        if (!form.monto) return alert('Monto obligatorio');
        const patch = { ...form, monto: Number(form.monto) };
        if (editId) actions.update('movimientosBancarios', editId, patch);
        else actions.add('movimientosBancarios', patch);
        setOpen(false);
    };

    return (
        <div>
            <PageHeader
                icon={Landmark}
                title="Banco"
                subtitle="Movimientos bancarios manuales"
                help={SECTION_HELP.banking}
                actions={<button className="btn btn-primary" onClick={() => { setForm(EMPTY); setEditId(null); setOpen(true); }}><Plus size={14} /> Nuevo movimiento</button>}
            />
            <div className="kpi-grid mb-4">
                <KpiCard icon={<Landmark size={20} />} label="Movimientos" value={movs.length} color="#14b8a6" />
                <KpiCard icon={<Landmark size={20} />} label="Ingresos" value={fmtMoney(totalIngresos, state.business.moneda)} color="#22c55e" />
                <KpiCard icon={<Landmark size={20} />} label="Egresos" value={fmtMoney(totalEgresos, state.business.moneda)} color="#ef4444" />
                <KpiCard icon={<Landmark size={20} />} label="Neto" value={fmtMoney(totalIngresos - totalEgresos, state.business.moneda)} color="#0ea5e9" />
            </div>
            <Card>
                {movs.length === 0 ? (
                    <EmptyState
                        icon={Landmark}
                        title="Sin movimientos bancarios"
                        description="Trackeá transferencias, pagos a proveedores y depósitos."
                        action={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={14} /> Cargar primer movimiento</button>}
                        tips={['Ingresos y egresos', 'Banco y concepto', 'Complementa ventas y gastos']}
                        example="Ej: Transferencia recibida de cliente mayorista $800.000 - Banco Galicia"
                    />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead><tr><th>Fecha</th><th>Tipo</th><th>Concepto</th><th>Banco</th><th style={{ textAlign: 'right' }}>Monto</th><th></th></tr></thead>
                            <tbody>
                                {movs.slice(0, 100).map(m => (
                                    <tr key={m.id}>
                                        <td className="text-sm">{fmtDate(m.fecha)}</td>
                                        <td><Badge variant={m.tipo === 'ingreso' ? 'success' : 'danger'}>{m.tipo}</Badge></td>
                                        <td className="font-semibold">{m.concepto}</td>
                                        <td className="text-sm">{m.banco || '—'}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, color: m.tipo === 'ingreso' ? 'var(--success)' : 'var(--danger)' }}>
                                            {m.tipo === 'ingreso' ? '+' : '-'}{fmtMoney(m.monto, state.business.moneda)}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setForm({ ...EMPTY, ...m }); setEditId(m.id); setOpen(true); }}><Pencil size={13} /></button>
                                            <button className="btn btn-danger btn-sm btn-icon" onClick={() => { if (confirm('¿Eliminar?')) actions.remove('movimientosBancarios', m.id); }}><Trash2 size={13} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
            <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'Editar movimiento' : 'Nuevo movimiento bancario'}>
                <div className="form-grid">
                    <Field label="Fecha"><input className="input" type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} /></Field>
                    <Field label="Tipo">
                        <select className="select" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                            <option value="ingreso">Ingreso</option>
                            <option value="egreso">Egreso</option>
                        </select>
                    </Field>
                    <Field label="Concepto" required><input className="input" value={form.concepto} onChange={e => setForm({ ...form, concepto: e.target.value })} /></Field>
                    <Field label="Monto" required><input className="input" type="number" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} /></Field>
                    <Field label="Banco"><input className="input" placeholder="Galicia, Santander..." value={form.banco} onChange={e => setForm({ ...form, banco: e.target.value })} /></Field>
                    <Field label="Sucursal">
                        <select className="select" value={form.sucursalId} onChange={e => setForm({ ...form, sucursalId: e.target.value })}>
                            <option value="">General</option>
                            {state.sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
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

// ═══════════════════════════ TAREAS (Kanban) ═══════════════════════════
export function TareasPage() {
    const { state, actions } = useData();
    const [open, setOpen] = useState(false);
    const EMPTY = { titulo: '', descripcion: '', estado: 'pendiente', prioridad: 'normal', asignadoA: '', sucursalId: '', fechaLimite: '' };
    const [form, setForm] = useState(EMPTY);

    const ESTADOS = [
        { id: 'pendiente', label: 'Pendiente', color: '#f59e0b' },
        { id: 'progreso', label: 'En progreso', color: '#0ea5e9' },
        { id: 'completado', label: 'Completado', color: '#22c55e' }
    ];

    const save = () => {
        if (!form.titulo.trim()) return alert('Título obligatorio');
        actions.add('tareas', form);
        setOpen(false);
    };

    const moveTarea = (id, estado) => actions.update('tareas', id, { estado });

    return (
        <div>
            <PageHeader
                icon={CheckSquare}
                title="Tareas"
                subtitle="Kanban del equipo"
                help={SECTION_HELP.tareas}
                actions={<button className="btn btn-primary" onClick={() => { setForm(EMPTY); setOpen(true); }}><Plus size={14} /> Nueva tarea</button>}
            />
            {state.tareas.length === 0 ? (
                <Card>
                    <EmptyState
                        icon={CheckSquare}
                        title="Sin tareas"
                        description="Organizá el trabajo del equipo con un kanban simple."
                        action={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={14} /> Crear primera tarea</button>}
                        tips={['Título, descripción y prioridad', 'Asignación a empleado', 'Mover entre columnas: Pendiente → En progreso → Completado', 'Fecha límite opcional']}
                        example="Ej: 'Pedir mercadería a proveedor X' - Prioridad alta - Asignado a Juan - Vence viernes"
                    />
                </Card>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                    {ESTADOS.map(est => {
                        const tareas = state.tareas.filter(t => t.estado === est.id);
                        return (
                            <Card key={est.id} title={<span style={{ color: est.color }}>● {est.label} ({tareas.length})</span>}>
                                <div className="flex flex-col gap-2">
                                    {tareas.length === 0 ? (
                                        <div className="text-xs text-muted text-center" style={{ padding: 20 }}>Sin tareas</div>
                                    ) : tareas.map(t => (
                                        <div key={t.id} style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 8, borderLeft: `3px solid ${est.color}` }}>
                                            <div className="font-semibold text-sm">{t.titulo}</div>
                                            {t.descripcion && <div className="text-xs text-muted mt-1">{t.descripcion}</div>}
                                            <div className="flex gap-1 mt-2" style={{ flexWrap: 'wrap' }}>
                                                <Badge variant={t.prioridad === 'alta' ? 'danger' : t.prioridad === 'baja' ? 'muted' : 'warning'}>{t.prioridad}</Badge>
                                                {t.fechaLimite && <Badge variant="info">{fmtDate(t.fechaLimite)}</Badge>}
                                                {t.asignadoA && <Badge>{(() => { const e = state.empleados.find(x => x.id === t.asignadoA); return e ? `${e.nombre}` : '—'; })()}</Badge>}
                                            </div>
                                            <div className="flex gap-1 mt-2">
                                                {ESTADOS.filter(e => e.id !== est.id).map(e => (
                                                    <button key={e.id} className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => moveTarea(t.id, e.id)}>
                                                        <ArrowRight size={10} /> {e.label}
                                                    </button>
                                                ))}
                                                <button className="btn btn-danger btn-sm btn-icon" onClick={() => { if (confirm('¿Eliminar?')) actions.remove('tareas', t.id); }}><Trash2 size={10} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
            <Modal open={open} onClose={() => setOpen(false)} title="Nueva tarea">
                <div className="form-grid">
                    <Field label="Título" required><input className="input" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} /></Field>
                    <Field label="Prioridad">
                        <select className="select" value={form.prioridad} onChange={e => setForm({ ...form, prioridad: e.target.value })}>
                            <option value="baja">Baja</option><option value="normal">Normal</option><option value="alta">Alta</option>
                        </select>
                    </Field>
                    <Field label="Asignado a">
                        <select className="select" value={form.asignadoA} onChange={e => setForm({ ...form, asignadoA: e.target.value })}>
                            <option value="">Sin asignar</option>
                            {state.empleados.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellido || ''}</option>)}
                        </select>
                    </Field>
                    <Field label="Fecha límite"><input className="input" type="date" value={form.fechaLimite} onChange={e => setForm({ ...form, fechaLimite: e.target.value })} /></Field>
                </div>
                <div className="mt-3"><Field label="Descripción"><textarea className="textarea" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} /></Field></div>
                <div className="flex gap-2 mt-4 justify-end">
                    <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
                    <button className="btn btn-primary" onClick={save}>Crear</button>
                </div>
            </Modal>
        </div>
    );
}
