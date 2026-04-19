import React, { useState } from 'react';
import {
    Megaphone, Bot, Instagram, Music2, BarChart3, Globe, Landmark,
    ListTodo, Plus, Trash2, Pencil, Mail, MessageCircle, Sparkles,
    Key, ExternalLink, Zap, TrendingUp, Eye, Heart, Share2, DollarSign, AlertCircle
} from 'lucide-react';
import { useData } from '../store/DataContext';
import { Card, Modal, Field, EmptyState, Badge, KpiCard, fmtDate, fmtMoney } from '../components/UI';

// ═══════════════════════════ MARKETING ═══════════════════════════
export function MarketingPage() {
    const { state } = useData();
    const hasMeta = !!state.integraciones.metaAccessToken;
    const hasPixel = !!state.integraciones.metaPixelId;

    return (
        <div className="flex-col gap-4">
            <div className="kpi-grid">
                <KpiCard icon={<Eye size={20} />} label="Impresiones (30d)" value="—" color="#14b8a6" />
                <KpiCard icon={<Heart size={20} />} label="Engagement (30d)" value="—" color="#ef4444" />
                <KpiCard icon={<Share2 size={20} />} label="Clicks a web" value="—" color="#0ea5e9" />
                <KpiCard icon={<DollarSign size={20} />} label="Inversión en ads" value="—" color="#f59e0b" />
            </div>

            <Card
                title="Meta Ads (Facebook + Instagram)"
                subtitle={hasMeta ? 'Conectado' : 'Pendiente de conexión'}
                actions={hasMeta ? <Badge variant="success">Conectado</Badge> : <Badge variant="warning">Sin conectar</Badge>}
            >
                {!hasMeta ? (
                    <EmptyState
                        icon={Megaphone}
                        title="Conectá tu cuenta de Meta Business"
                        description="Una vez que conectes, vas a ver reportes automáticos de tus campañas."
                        action={<button className="btn btn-primary" onClick={() => alert('Ir a Configuración → Integraciones → Meta Access Token')}><Key size={14} /> Configurar Access Token</button>}
                        tips={[
                            'Gastos, impresiones y CTR por campaña',
                            'ROAS (retorno sobre inversión publicitaria)',
                            'Audiencias personalizadas desde tu base de clientes',
                            'Pixel events y eventos de compra',
                            'Creación de campañas desde acá'
                        ]}
                    />
                ) : (
                    <div className="text-sm text-muted">
                        Token configurado. Los reportes se actualizan cada 15 min.
                        {!hasPixel && <div className="mt-2"><Badge variant="warning">Falta configurar Meta Pixel ID</Badge></div>}
                    </div>
                )}
            </Card>

            <Card title="WhatsApp Business">
                <EmptyState
                    icon={MessageCircle}
                    title="Automatización de WhatsApp"
                    description="Respondé consultas, enviá promos y recordatorios de pedidos."
                    tips={[
                        'Plantillas de mensajes por ocasión (bienvenida, confirmación, promo)',
                        'Envíos masivos segmentados por cliente o sucursal',
                        'Automatizaciones: carrito abandonado, cumpleaños, reactivación',
                        'Requiere WhatsApp Business API (se configura en Configuración)'
                    ]}
                />
            </Card>

            <Card title="Email marketing">
                <EmptyState
                    icon={Mail}
                    title="Campañas de email"
                    description="Mandá newsletters y promociones a tu base de clientes."
                    tips={[
                        'Segmentación por categoría de cliente, sucursal o ticket promedio',
                        'Templates responsive listos para editar',
                        'Métricas de apertura y click-through',
                        'Integración con Resend / Mailgun / SendGrid'
                    ]}
                />
            </Card>
        </div>
    );
}

// ═══════════════════════════ AGENTES AI ═══════════════════════════
const AGENTS = [
    { id: 'analyst', name: 'Analista de Negocio', desc: 'Resume KPIs, identifica tendencias y alerta sobre anomalías.', icon: BarChart3, area: 'Business' },
    { id: 'content', name: 'Content Creator', desc: 'Genera captions, posts y copys para tus redes.', icon: Sparkles, area: 'Marketing' },
    { id: 'trends', name: 'Trend Scout', desc: 'Detecta tendencias virales relevantes a tu rubro.', icon: TrendingUp, area: 'Marketing' },
    { id: 'strategist', name: 'Estratega', desc: 'Propone planes de acción basados en tu data.', icon: Zap, area: 'Business' },
    { id: 'copywriter', name: 'Copywriter', desc: 'Escribe descripciones de productos, slogans y anuncios.', icon: Sparkles, area: 'Marketing' },
    { id: 'customer', name: 'Atención al cliente', desc: 'Sugiere respuestas a reseñas y mensajes.', icon: MessageCircle, area: 'CX' },
    { id: 'finance', name: 'Financiero', desc: 'Analiza gastos, detecta fugas y sugiere ajustes de precios.', icon: DollarSign, area: 'Finanzas' },
    { id: 'inventory', name: 'Inventario', desc: 'Predice stock necesario y detecta faltantes críticos.', icon: AlertCircle, area: 'Operaciones' }
];

export function AgentsPage() {
    const { state } = useData();
    const hasOpenAI = !!state.integraciones.openaiKey;
    const hasAnthropic = !!state.integraciones.anthropicKey;
    const configured = hasOpenAI || hasAnthropic;

    return (
        <div className="flex-col gap-4">
            <Card
                title="Agentes AI"
                subtitle="Asistentes especializados que trabajan sobre tu data"
                actions={configured ? <Badge variant="success">Configurado</Badge> : <Badge variant="warning">Sin API Key</Badge>}
            >
                {!configured && (
                    <div className="card mb-3" style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.2)' }}>
                        <div className="flex items-center gap-2 mb-1"><Key size={14} /><strong>Configurá una API key para activar los agentes</strong></div>
                        <div className="text-sm text-muted">Podés usar OpenAI o Anthropic. Las claves se guardan localmente en tu navegador y nunca se envían a ningún servidor externo más que al del proveedor elegido.</div>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                    {AGENTS.map(a => (
                        <div key={a.id} className="card" style={{ padding: 16 }}>
                            <div className="flex items-center gap-3 mb-2">
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><a.icon size={20} /></div>
                                <div>
                                    <div className="font-semibold">{a.name}</div>
                                    <div className="text-xs text-muted">{a.area}</div>
                                </div>
                            </div>
                            <div className="text-sm text-muted mb-3">{a.desc}</div>
                            <button className="btn btn-ghost" style={{ width: '100%' }} disabled={!configured}>
                                {configured ? 'Ejecutar' : 'Configurar API key'}
                            </button>
                        </div>
                    ))}
                </div>
            </Card>

            <Card title="Historial de ejecuciones">
                <EmptyState icon={Bot} title="Aún sin ejecuciones registradas" tips={['Cada vez que ejecutes un agente vas a ver acá el input, output y tokens consumidos', 'Historial por agente y fecha', 'Exportable a PDF para compartir con tu equipo']} />
            </Card>
        </div>
    );
}

// ═══════════════════════════ INSTAGRAM PLANNER ═══════════════════════════
export function InstagramPage() {
    const { state } = useData();
    const hasIG = !!state.integraciones.instagramBusinessId;

    return (
        <div className="flex-col gap-4">
            <div className="kpi-grid">
                <KpiCard icon={<Eye size={20} />} label="Alcance (30d)" value="—" color="#ec4899" />
                <KpiCard icon={<Heart size={20} />} label="Likes promedio" value="—" color="#ef4444" />
                <KpiCard icon={<Share2 size={20} />} label="Saves" value="—" color="#a855f7" />
                <KpiCard icon={<TrendingUp size={20} />} label="Seguidores" value="—" color="#f59e0b" />
            </div>

            <Card title="Planner de contenido" actions={<button className="btn btn-primary" disabled={!hasIG}><Plus size={14} /> Nuevo post</button>}>
                {!hasIG ? (
                    <EmptyState
                        icon={Instagram}
                        title="Conectá tu cuenta de Instagram Business"
                        description="Necesitás conectar la cuenta para planificar y publicar."
                        action={<button className="btn btn-primary"><Key size={14} /> Configurar Instagram Business ID</button>}
                        tips={[
                            'Calendario mensual de posts',
                            'Arrastrar y soltar imágenes',
                            'Generación de captions con AI',
                            'Hashtag research por rubro',
                            'Programación automática (si conectás Meta Access Token)',
                            'Grilla de vista previa antes de publicar'
                        ]}
                    />
                ) : (
                    <EmptyState icon={Instagram} title="Sin posts planificados" />
                )}
            </Card>
        </div>
    );
}

// ═══════════════════════════ TIKTOK ═══════════════════════════
export function TikTokPage() {
    return (
        <Card title="TikTok">
            <EmptyState
                icon={Music2}
                title="TikTok Analytics & Planner"
                description="Analizá el rendimiento de tus videos y planificá contenido."
                tips={[
                    'Views, likes, compartidos y CTR por video',
                    'Videos top de la semana/mes',
                    'Sugerencias de sonidos trending',
                    'Calendario de publicaciones',
                    'Conectando la API oficial de TikTok (desde Configuración)'
                ]}
            />
        </Card>
    );
}

// ═══════════════════════════ GOOGLE ANALYTICS ═══════════════════════════
export function AnalyticsPage() {
    const { state } = useData();
    const hasGA = !!state.integraciones.googleAnalyticsId;

    return (
        <Card title="Google Analytics">
            {!hasGA ? (
                <EmptyState
                    icon={BarChart3}
                    title="Conectá tu Google Analytics 4"
                    description="Necesitás el Measurement ID (G-XXXXXXXXXX) de tu propiedad GA4."
                    action={<button className="btn btn-primary"><Key size={14} /> Configurar GA4 ID</button>}
                    tips={[
                        'Sesiones, usuarios y bounce rate en tiempo real',
                        'Top páginas y orígenes de tráfico',
                        'Conversiones por fuente (organic, paid, direct, social)',
                        'Embudo de compra: visita → carrito → checkout → compra',
                        'Comparativa semana actual vs anterior'
                    ]}
                />
            ) : (
                <EmptyState icon={BarChart3} title="Esperando datos de GA4" description="Los datos se sincronizan cada 1 hora." />
            )}
        </Card>
    );
}

// ═══════════════════════════ PÁGINA WEB (WooCommerce / Shopify) ═══════════════════════════
export function WebPage() {
    const { state } = useData();
    const hasWoo = !!state.integraciones.wooStoreUrl;

    return (
        <Card title="Tienda online">
            {!hasWoo ? (
                <EmptyState
                    icon={Globe}
                    title="Conectá tu tienda online"
                    description="Dashboard soporta WooCommerce y Shopify (próximamente)."
                    action={<button className="btn btn-primary"><ExternalLink size={14} /> Configurar URL + claves</button>}
                    tips={[
                        'Catálogo sincronizado con el inventario del Dashboard',
                        'Pedidos online aparecen automáticamente en la sección Pedidos',
                        'Descuento automático de stock al vender online',
                        'Métricas: conversión, ticket promedio, productos más vistos',
                        'Cupones y descuentos gestionables desde acá'
                    ]}
                />
            ) : (
                <EmptyState icon={Globe} title={`Conectado a ${state.integraciones.wooStoreUrl}`} description="Sincronizando..." />
            )}
        </Card>
    );
}

// ═══════════════════════════ BANKING ═══════════════════════════
export function BankingPage() {
    const { state, actions } = useData();
    const EMPTY = { fecha: new Date().toISOString().slice(0, 10), concepto: '', tipo: 'ingreso', monto: '', cuenta: 'Banco', sucursalId: '' };
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(EMPTY);

    const mov = (state.movimientosBancarios || []).slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    const ingresos = mov.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + Number(m.monto || 0), 0);
    const egresos = mov.filter(m => m.tipo === 'egreso').reduce((s, m) => s + Number(m.monto || 0), 0);

    const save = () => {
        if (!form.concepto || !form.monto) return alert('Concepto y monto obligatorios');
        actions.add('movimientosBancarios', { ...form, monto: Number(form.monto) });
        setOpen(false);
    };

    return (
        <div className="flex-col gap-4">
            <div className="kpi-grid">
                <KpiCard icon={<TrendingUp size={20} />} label="Ingresos" value={fmtMoney(ingresos, state.business.moneda)} color="#22c55e" />
                <KpiCard icon={<TrendingUp size={20} />} label="Egresos" value={fmtMoney(egresos, state.business.moneda)} color="#ef4444" />
                <KpiCard icon={<Landmark size={20} />} label="Saldo neto" value={fmtMoney(ingresos - egresos, state.business.moneda)} color="#14b8a6" />
            </div>
            <Card title="Movimientos bancarios" actions={<button className="btn btn-primary" onClick={() => { setForm(EMPTY); setOpen(true); }}><Plus size={14} /> Nuevo movimiento</button>}>
                {mov.length === 0 ? (
                    <EmptyState icon={Landmark} title="Sin movimientos" tips={['Registro manual de ingresos y egresos bancarios', 'Conciliación con ventas en efectivo / MP / transferencia', 'Filtros por cuenta (Banco 1, Banco 2, Mercado Pago)', 'Integración con Mercado Pago API (desde Configuración)']} />
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead><tr><th>Fecha</th><th>Concepto</th><th>Cuenta</th><th>Tipo</th><th>Sucursal</th><th style={{ textAlign: 'right' }}>Monto</th><th></th></tr></thead>
                            <tbody>
                                {mov.map(m => (
                                    <tr key={m.id}>
                                        <td>{fmtDate(m.fecha)}</td>
                                        <td className="font-semibold">{m.concepto}</td>
                                        <td className="text-sm">{m.cuenta}</td>
                                        <td><Badge variant={m.tipo === 'ingreso' ? 'success' : 'danger'}>{m.tipo}</Badge></td>
                                        <td className="text-sm">{state.sucursales.find(s => s.id === m.sucursalId)?.nombre || '—'}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, color: m.tipo === 'ingreso' ? 'var(--success)' : 'var(--danger)' }}>{m.tipo === 'ingreso' ? '+' : '-'}{fmtMoney(m.monto, state.business.moneda)}</td>
                                        <td style={{ textAlign: 'right' }}><button className="btn btn-danger btn-sm btn-icon" onClick={() => { if (confirm('¿Eliminar?')) actions.remove('movimientosBancarios', m.id); }}><Trash2 size={13} /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
            <Modal open={open} onClose={() => setOpen(false)} title="Nuevo movimiento">
                <div className="form-grid">
                    <Field label="Fecha"><input className="input" type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} /></Field>
                    <Field label="Concepto" required><input className="input" value={form.concepto} onChange={e => setForm({ ...form, concepto: e.target.value })} /></Field>
                    <Field label="Tipo"><select className="select" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}><option value="ingreso">Ingreso</option><option value="egreso">Egreso</option></select></Field>
                    <Field label="Cuenta"><input className="input" value={form.cuenta} onChange={e => setForm({ ...form, cuenta: e.target.value })} /></Field>
                    <Field label="Monto" required><input className="input" type="number" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} /></Field>
                    <Field label="Sucursal"><select className="select" value={form.sucursalId} onChange={e => setForm({ ...form, sucursalId: e.target.value })}><option value="">Sin asignar</option>{state.sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></Field>
                </div>
                <div className="flex gap-2 mt-4" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
                    <button className="btn btn-primary" onClick={save}>Guardar</button>
                </div>
            </Modal>
        </div>
    );
}

// ═══════════════════════════ TAREAS (Kanban simple) ═══════════════════════════
export function TareasPage() {
    const { state, actions } = useData();
    const COLS = [
        { id: 'pendiente', label: 'Pendiente', color: '#64748b' },
        { id: 'en_progreso', label: 'En progreso', color: '#0ea5e9' },
        { id: 'completado', label: 'Completado', color: '#22c55e' }
    ];
    const EMPTY = { titulo: '', descripcion: '', estado: 'pendiente', asignadoA: '', sucursalId: '', prioridad: 'media', fechaLimite: '' };
    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState(EMPTY);

    const tareas = state.tareas || [];

    const save = () => {
        if (!form.titulo) return alert('Título obligatorio');
        if (editId) actions.update('tareas', editId, form);
        else actions.add('tareas', form);
        setOpen(false);
    };

    const mover = (id, estado) => actions.update('tareas', id, { estado });

    return (
        <div className="flex-col gap-4">
            <Card title="Tareas" subtitle="Kanban de tareas del equipo" actions={<button className="btn btn-primary" onClick={() => { setForm(EMPTY); setEditId(null); setOpen(true); }}><Plus size={14} /> Nueva tarea</button>}>
                {tareas.length === 0 ? (
                    <EmptyState icon={ListTodo} title="Sin tareas" tips={['Tablero Kanban con 3 columnas (pendiente/en progreso/completado)', 'Asignación a empleados', 'Prioridad (baja/media/alta)', 'Fecha límite', 'Filtro por sucursal']} />
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                        {COLS.map(col => (
                            <div key={col.id} style={{ background: 'var(--bg-app)', borderRadius: 10, padding: 12 }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span style={{ width: 8, height: 8, borderRadius: 4, background: col.color }} />
                                    <strong className="text-sm">{col.label}</strong>
                                    <span className="text-xs text-muted">({tareas.filter(t => t.estado === col.id).length})</span>
                                </div>
                                {tareas.filter(t => t.estado === col.id).map(t => (
                                    <div key={t.id} className="card mb-2" style={{ padding: 10, cursor: 'pointer' }} onClick={() => { setForm({ ...EMPTY, ...t }); setEditId(t.id); setOpen(true); }}>
                                        <div className="font-semibold text-sm mb-1">{t.titulo}</div>
                                        {t.descripcion && <div className="text-xs text-muted mb-2">{t.descripcion.slice(0, 80)}</div>}
                                        <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
                                            <Badge variant={t.prioridad === 'alta' ? 'danger' : t.prioridad === 'media' ? 'warning' : 'muted'}>{t.prioridad}</Badge>
                                            {t.sucursalId && <Badge variant="info">{state.sucursales.find(s => s.id === t.sucursalId)?.nombre}</Badge>}
                                            {t.fechaLimite && <Badge>{fmtDate(t.fechaLimite)}</Badge>}
                                        </div>
                                        <div className="flex gap-1 mt-2">
                                            {COLS.filter(c => c.id !== t.estado).map(c => (
                                                <button key={c.id} className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', fontSize: 10 }} onClick={(e) => { e.stopPropagation(); mover(t.id, c.id); }}>→ {c.label}</button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'Editar tarea' : 'Nueva tarea'}>
                <div className="form-grid">
                    <Field label="Título" required><input className="input" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} /></Field>
                    <Field label="Prioridad"><select className="select" value={form.prioridad} onChange={e => setForm({ ...form, prioridad: e.target.value })}><option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option></select></Field>
                    <Field label="Estado"><select className="select" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}><option value="pendiente">Pendiente</option><option value="en_progreso">En progreso</option><option value="completado">Completado</option></select></Field>
                    <Field label="Asignado a"><select className="select" value={form.asignadoA} onChange={e => setForm({ ...form, asignadoA: e.target.value })}><option value="">Sin asignar</option>{state.empleados.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellido}</option>)}</select></Field>
                    <Field label="Sucursal"><select className="select" value={form.sucursalId} onChange={e => setForm({ ...form, sucursalId: e.target.value })}><option value="">Sin asignar</option>{state.sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></Field>
                    <Field label="Fecha límite"><input className="input" type="date" value={form.fechaLimite} onChange={e => setForm({ ...form, fechaLimite: e.target.value })} /></Field>
                </div>
                <div className="mt-3"><Field label="Descripción"><textarea className="textarea" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} /></Field></div>
                <div className="flex gap-2 mt-4" style={{ justifyContent: 'space-between' }}>
                    {editId ? <button className="btn btn-danger" onClick={() => { if (confirm('¿Eliminar?')) { actions.remove('tareas', editId); setOpen(false); } }}><Trash2 size={14} /> Eliminar</button> : <div />}
                    <div className="flex gap-2">
                        <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
                        <button className="btn btn-primary" onClick={save}>{editId ? 'Guardar' : 'Crear'}</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
