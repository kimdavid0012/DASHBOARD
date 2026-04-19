import React, { useState } from 'react';
import {
    Megaphone, Bot, Instagram, Music2, BarChart3, Globe,
    Landmark, CheckSquare, Plus, Trash2, ArrowRight, Settings2, Pencil,
    Play, Calendar, Clock, Zap, TrendingUp, Eye, Target,
    Lightbulb, PenTool, Users2, Package, DollarSign, AlertCircle
} from 'lucide-react';
import { useData, filterBySucursal, getRubroLabels, SECTION_HELP } from '../store/DataContext';
import { PageHeader, Card, Modal, Field, EmptyState, Badge, KpiCard, InfoBox, fmtMoney, fmtDate } from '../components/UI';

// ═══════════════════════════════════════════════════════════════════
// 🤖 AGENTS — universal, rubro-aware, 24/7 ready
// ═══════════════════════════════════════════════════════════════════
const AGENT_DEFINITIONS = {
    analista: {
        id: 'analista', emoji: '📊', color: '#63f1cb',
        nombre: 'Analista de datos',
        desc: 'Analiza ventas, detecta patrones y reporta insights',
        icon: TrendingUp,
        canSchedule: true,
        defaultSchedule: 'daily-morning',
        buildPrompt: (state, labels) => `Sos un analista experto en datos de negocios ${state.business.rubro}.

Analizá los datos de ${state.business.name || 'el negocio'} y dame:

1. **📈 Tendencia de ventas últimos 7 días**: comparada con semana anterior
2. **🎯 Top 3 ganadores**: ${labels.itemPlural} que más crecieron
3. **⚠️ Alertas**: caídas bruscas, productos frenados, stock crítico
4. **💡 1 insight accionable**: algo que el dueño tiene que hacer esta semana

Respondé en máximo 6 bullet points. Directo al grano. En español argentino.`
    },
    trendscout: {
        id: 'trendscout', emoji: '🔍', color: '#60a5fa',
        nombre: 'Trend Scout',
        desc: 'Busca tendencias del rubro y sugiere productos',
        icon: Eye,
        canSchedule: true,
        defaultSchedule: 'weekly',
        buildPrompt: (state, labels) => {
            const rubroTrends = {
                kiosco: 'bebidas energéticas, snacks saludables, productos sin TACC, nuevos sabores de chocolates/golosinas, vapes y productos relacionados',
                restaurante: 'tendencias gastronómicas en Argentina (ej: plant-based, opciones sin gluten, sourdough, cocteles de autor, brunch), menús estacionales',
                accesorios: 'tendencias de moda argentina 2026, influencers locales del rubro, colores y siluetas del momento, Instagram shopping',
                servicios: 'tendencias de servicios digitales, suscripciones, membresías, formatos virtuales',
                general: 'tendencias de consumo del momento'
            }[state.business.rubro];

            return `Sos un investigador de tendencias experto en el rubro ${state.business.rubro} en Argentina.

Tu tarea: dame un reporte de tendencias actuales que un negocio como ${state.business.name || 'este'} debería considerar.

Enfocate en: ${rubroTrends}

Formato:
1. **🔥 Top 3 tendencias ACTUALES** (qué se mueve ahora)
2. **📈 Top 2 tendencias EMERGENTES** (qué va a venir en 3-6 meses)
3. **🎯 Acción concreta**: qué ${labels.itemPlural} debería evaluar incorporar al catálogo

Sé específico, nada de genérico. Español argentino.`;
        }
    },
    content: {
        id: 'content', emoji: '✍️', color: '#c084fc',
        nombre: 'Content Creator',
        desc: 'Genera posts para Instagram, TikTok y WhatsApp',
        icon: PenTool,
        canSchedule: true,
        defaultSchedule: 'daily-morning',
        buildPrompt: (state, labels) => `Sos un copywriter experto en redes sociales para negocios argentinos del rubro ${state.business.rubro}.

Generá para ${state.business.name || 'el negocio'}:

1. **📸 Post Instagram de HOY** (con emojis, hashtags argentinos, call to action)
2. **📱 Texto corto para Stories** (máx 10 palabras)
3. **🎵 Idea de TikTok** (concepto de 15-30 seg)
4. **💬 Mensaje masivo WhatsApp** para promoción

Ajustá el tono al rubro. Usá lenguaje argentino cercano. Si hay un ${labels.item.toLowerCase()} estrella en el catálogo, destacalo.`
    },
    estratega: {
        id: 'estratega', emoji: '♟️', color: '#fbbf24',
        nombre: 'Estratega',
        desc: 'Recomendaciones estratégicas de negocio',
        icon: Target,
        canSchedule: true,
        defaultSchedule: 'weekly',
        buildPrompt: (state, labels) => `Sos un consultor de negocios senior, especializado en pymes argentinas del rubro ${state.business.rubro}.

Analizá la situación de ${state.business.name || 'el negocio'} y dame 3 recomendaciones estratégicas priorizadas:

1. **🎯 Prioridad 1** (lo que HAY QUE hacer esta semana): explicá QUÉ, POR QUÉ y CÓMO medirlo
2. **📊 Prioridad 2** (próximas 2-4 semanas)
3. **🚀 Prioridad 3** (mes-trimestre)

Considerá: contexto argentino actual (inflación, dólar, consumo), la escala del negocio (${state.sucursales.length} sucursales, ${state.empleados.length} empleados), márgenes del rubro, estacionalidad.

Nada de genérico. Que cada recomendación tenga números y acción concreta.`
    },
    precios: {
        id: 'precios', emoji: '💰', color: '#f4a261',
        nombre: 'Auditor de precios',
        desc: 'Revisa márgenes y sugiere ajustes de precios',
        icon: DollarSign,
        canSchedule: true,
        defaultSchedule: 'monthly',
        buildPrompt: (state, labels) => `Sos un auditor de pricing experto. Analizá los ${labels.itemPlural} de ${state.business.name || 'el negocio'}.

Dame un reporte:
1. **🚨 ${labels.items} con MARGEN BAJO** (menos del 20% en kiosco, 50% en resto): lista con % y sugerencia de precio
2. **💎 ${labels.items} MEJOR VALORADOS**: margen alto + rotación alta → mantener o subir ligeramente
3. **📉 ${labels.items} con MARGEN NEGATIVO** (si hay): alerta inmediata
4. **📊 Distribución general de márgenes**

Tené en cuenta inflación ARG actual. Sé conservador al sugerir subas (recordá que el cliente también sufre la suba).`
    },
    stockbot: {
        id: 'stockbot', emoji: '📦', color: '#fb7185',
        nombre: 'Gestor de stock',
        desc: 'Alerta reposiciones y predice quiebres',
        icon: Package,
        canSchedule: true,
        defaultSchedule: 'daily-evening',
        buildPrompt: (state, labels) => `Sos un experto en gestión de inventarios para ${state.business.rubro}.

Analizá el stock actual de ${state.business.name || 'el negocio'} y dame:

1. **🚨 URGENTE** (reponer hoy): productos sin stock o a punto
2. **⚠️ PRONTO** (próxima semana): stock crítico
3. **📈 Predicción de quiebre**: basado en velocidad de venta, cuándo se van a agotar los top sellers
4. **💸 Capital inmovilizado**: ${labels.items} con mucho stock y poca rotación

Sé específico con nombres y números. Ordená por prioridad de acción.`
    },
    clientebot: {
        id: 'clientebot', emoji: '🎯', color: '#a78bfa',
        nombre: 'CRM / Clientes',
        desc: 'Segmenta clientes y sugiere acciones',
        icon: Users2,
        canSchedule: true,
        defaultSchedule: 'weekly',
        buildPrompt: (state, labels) => `Sos un experto en CRM y fidelización. Analizá los ${labels.clients.toLowerCase()} de ${state.business.name || 'el negocio'}.

Dame:
1. **💎 Top 10 ${labels.clients.toLowerCase()}** (los que más compraron)
2. **😴 ${labels.clients} dormidos**: los que compraban y dejaron de hacerlo hace +30 días
3. **🆕 Nuevos ${labels.clients.toLowerCase()} este mes**
4. **💡 Acción sugerida**: para cada grupo qué mensaje/campaña mandar (concreto, con copy listo)

Español argentino. Accionable.`
    },
    ceo: {
        id: 'ceo', emoji: '👑', color: '#f4c15a',
        nombre: 'CEO meta-agente',
        desc: 'Resume todo lo que dicen los demás agentes',
        icon: Zap,
        canSchedule: true,
        defaultSchedule: 'daily-morning',
        buildPrompt: (state, labels) => `Sos el CEO virtual de ${state.business.name || 'este negocio'}. Escuchás a todos los otros agentes (analista, trend scout, estratega, precios, stock, CRM).

Dame un BRIEFING EJECUTIVO en máximo 8 bullets. Lo que el dueño tiene que leer en 30 segundos para tomar decisiones:

- 🎯 Estado del negocio: 1 frase
- 💰 Número clave hoy: 1 frase
- 🚨 Fuego (si hay): lo más urgente
- 📈 Oportunidad: la mejor palanca esta semana
- ⚡ 3 acciones para hoy/mañana
- 🧠 Decisión pendiente: qué tiene que pensar el dueño esta semana

Estilo: conciso, de alto nivel, como memo a un board.`
    }
};

const SCHEDULE_OPTIONS = [
    { id: 'manual', label: 'Solo manual', icon: '✋' },
    { id: 'daily-morning', label: 'Diario 9:00', icon: '🌅' },
    { id: 'daily-evening', label: 'Diario 20:00', icon: '🌙' },
    { id: 'weekly', label: 'Semanal (lunes)', icon: '📅' },
    { id: 'monthly', label: 'Mensual (día 1)', icon: '📆' }
];

export function AgentsPage({ onNavigate }) {
    const { state, actions } = useData();
    const [outputs, setOutputs] = useState({});
    const [running, setRunning] = useState({});
    const [schedules, setSchedules] = useState(() => {
        try { return JSON.parse(localStorage.getItem('agent_schedules') || '{}'); }
        catch { return {}; }
    });

    const labels = getRubroLabels(state.business.rubro);
    const hasKey = !!(state.integraciones.anthropicKey || state.integraciones.openaiKey);
    const AGENTS = Object.values(AGENT_DEFINITIONS);

    const updateSchedule = (agentId, scheduleId) => {
        const next = { ...schedules, [agentId]: scheduleId };
        setSchedules(next);
        localStorage.setItem('agent_schedules', JSON.stringify(next));
    };

    const runAgent = async (agent) => {
        if (!hasKey) return alert('Cargá una API key en Configuración → Integraciones');
        setRunning({ ...running, [agent.id]: true });

        try {
            const prompt = agent.buildPrompt(state, labels);

            let reply = '';
            if (state.integraciones.anthropicKey) {
                const res = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': state.integraciones.anthropicKey,
                        'anthropic-version': '2023-06-01',
                        'anthropic-dangerous-direct-browser-access': 'true'
                    },
                    body: JSON.stringify({
                        model: 'claude-sonnet-4-5',
                        max_tokens: 1500,
                        messages: [{ role: 'user', content: prompt }]
                    })
                });
                const data = await res.json();
                if (data.error) throw new Error(data.error.message);
                reply = data.content?.[0]?.text || '';
            } else if (state.integraciones.openaiKey) {
                const res = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${state.integraciones.openaiKey}`
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        max_tokens: 1500,
                        messages: [{ role: 'user', content: prompt }]
                    })
                });
                const data = await res.json();
                if (data.error) throw new Error(data.error.message);
                reply = data.choices?.[0]?.message?.content || '';
            }

            setOutputs({ ...outputs, [agent.id]: { text: reply, at: new Date().toISOString() } });
        } catch (err) {
            setOutputs({ ...outputs, [agent.id]: { text: `❌ Error: ${err.message}`, at: new Date().toISOString() } });
        } finally {
            setRunning({ ...running, [agent.id]: false });
        }
    };

    return (
        <div>
            <PageHeader
                icon={Bot}
                title="Agentes AI"
                subtitle={`${AGENTS.length} agentes especializados para tu ${state.business.rubro}`}
                help={SECTION_HELP.agents}
                actions={
                    hasKey ? (
                        <Badge variant="success">● API conectada</Badge>
                    ) : (
                        <button className="btn btn-primary" onClick={() => onNavigate?.('settings')}>
                            <Settings2 size={14} /> Conectar API
                        </button>
                    )
                }
            />

            {!hasKey && (
                <InfoBox variant="warning">
                    <strong>Para usar los agentes necesitás una API key.</strong> Andá a Configuración → Integraciones y pegá tu clave de Anthropic (recomendado) o OpenAI. Los agentes usan tu data actual para generar análisis personalizados.
                </InfoBox>
            )}

            <div className="mt-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
                {AGENTS.map(agent => {
                    const out = outputs[agent.id];
                    const isRunning = running[agent.id];
                    const schedule = schedules[agent.id] || 'manual';
                    const Icon = agent.icon;

                    return (
                        <div key={agent.id} className="agent-card">
                            <div className="agent-card-header">
                                <div
                                    className="agent-card-icon"
                                    style={{ background: `${agent.color}20`, color: agent.color, border: `1px solid ${agent.color}40` }}
                                >
                                    <span>{agent.emoji}</span>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div className="agent-card-title">{agent.nombre}</div>
                                    <div className="agent-card-desc">{agent.desc}</div>
                                </div>
                            </div>

                            <div className="flex gap-2 items-center">
                                <select
                                    className={`agent-schedule-toggle ${schedule !== 'manual' ? 'active' : ''}`}
                                    value={schedule}
                                    onChange={e => updateSchedule(agent.id, e.target.value)}
                                    style={{ flex: 1, cursor: 'pointer', border: schedule !== 'manual' ? '1px solid var(--border-accent)' : undefined, color: schedule !== 'manual' ? 'var(--accent)' : 'var(--text-muted)', background: schedule !== 'manual' ? 'var(--accent-soft)' : 'var(--bg-elevated)' }}
                                >
                                    {SCHEDULE_OPTIONS.map(s => (
                                        <option key={s.id} value={s.id}>{s.icon} {s.label}</option>
                                    ))}
                                </select>

                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => runAgent(agent)}
                                    disabled={isRunning || !hasKey}
                                    style={{ minWidth: 110 }}
                                >
                                    {isRunning ? <><Clock size={14} /> Pensando...</> : <><Play size={14} /> Ejecutar</>}
                                </button>
                            </div>

                            {schedule !== 'manual' && (
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '6px 10px', background: 'rgba(244, 193, 90, 0.08)', borderRadius: 8, border: '1px dashed rgba(244, 193, 90, 0.3)' }}>
                                    ⏰ Programado {SCHEDULE_OPTIONS.find(s => s.id === schedule)?.label.toLowerCase()}. <strong>Se activará cuando implementes Firebase</strong> (ahora solo guarda la preferencia).
                                </div>
                            )}

                            {out && (
                                <div className="agent-output">
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
                                        ÚLTIMO OUTPUT · {new Date(out.at).toLocaleString('es-AR')}
                                    </div>
                                    {out.text}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// Stubs/placeholders - keep them minimal for now
// ═══════════════════════════════════════════════════════════════════
const ComingSoonCard = ({ icon: Icon, title, description, steps, onNavigate }) => (
    <Card>
        <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{
                width: 80, height: 80, borderRadius: 50,
                background: 'var(--accent-soft)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent)', marginBottom: 16,
                border: '1px solid var(--border-accent)'
            }}>
                <Icon size={36} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500 }}>{title}</h3>
            <p className="text-sm text-muted" style={{ maxWidth: 520, margin: '0 auto 20px', lineHeight: 1.6 }}>{description}</p>
            {steps && (
                <div style={{ textAlign: 'left', display: 'inline-block', background: 'var(--bg-elevated)', padding: 20, borderRadius: 12, maxWidth: 500, marginBottom: 16, border: '1px solid var(--border-color)' }}>
                    <div className="text-xs font-semibold mb-2" style={{ color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>⚙️ Cómo activarlo</div>
                    <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.7 }}>{steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
                </div>
            )}
            {onNavigate && <div><button className="btn btn-primary" onClick={onNavigate}><Settings2 size={14} /> Ir a Configuración</button></div>}
        </div>
    </Card>
);

export function MarketingPage({ onNavigate }) {
    const { state } = useData();
    const hasMeta = !!state.integraciones.metaAccessToken;
    return (
        <div>
            <PageHeader icon={Megaphone} title="Marketing" subtitle="Meta Ads, WhatsApp y Email Marketing" help={SECTION_HELP.marketing} />
            {!hasMeta ? (
                <ComingSoonCard
                    icon={Megaphone}
                    title="Conectá Meta Ads"
                    description="Vas a ver campañas activas, presupuesto, impresiones y conversiones."
                    steps={['Andá a Configuración → Integraciones', 'Pegá tu Meta Access Token', 'Pegá tu Pixel ID (opcional)', 'Volvé acá']}
                    onNavigate={() => onNavigate?.('settings')}
                />
            ) : (
                <Card><EmptyState icon={Megaphone} title="Meta conectado ✓" description="Dashboard de campañas se activará al ejecutar el agente de Marketing (próximamente)." /></Card>
            )}
        </div>
    );
}

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
                    description="Seguidores, alcance, engagement y calendario de contenido."
                    steps={['Convertí tu IG a Business', 'Conectala a tu Facebook', 'Obtené el IG Business ID', 'Pegalo en Configuración']}
                    onNavigate={() => onNavigate?.('settings')}
                />
            ) : (
                <Card><EmptyState icon={Instagram} title="IG Business conectado ✓" description="Analytics se activarán al ejecutar el agente de contenido." /></Card>
            )}
        </div>
    );
}

export function TikTokPage({ onNavigate }) {
    return (
        <div>
            <PageHeader icon={Music2} title="TikTok" subtitle="Analytics y planner de videos" help={SECTION_HELP.tiktok} />
            <ComingSoonCard
                icon={Music2}
                title="TikTok Analytics"
                description="Análisis de videos y sugerencias."
                steps={['Convertí tu cuenta a TikTok for Business', 'Generá Access Token', 'Pegalo en Configuración']}
                onNavigate={() => onNavigate?.('settings')}
            />
        </div>
    );
}

export function AnalyticsPage({ onNavigate }) {
    const { state } = useData();
    const hasGA = !!state.integraciones.googleAnalyticsId;
    return (
        <div>
            <PageHeader icon={BarChart3} title="Analytics" subtitle="Tráfico web (GA4)" help={SECTION_HELP.analytics} />
            {!hasGA ? (
                <ComingSoonCard
                    icon={BarChart3}
                    title="Conectá Google Analytics 4"
                    description="Sesiones, usuarios, conversiones y orígenes de tráfico."
                    steps={['Creá propiedad GA4', 'Copiá Measurement ID (G-XXXXXXXXXX)', 'Pegalo en Configuración']}
                    onNavigate={() => onNavigate?.('settings')}
                />
            ) : (
                <Card><EmptyState icon={BarChart3} title="GA4 conectado ✓" description={`ID: ${state.integraciones.googleAnalyticsId}`} /></Card>
            )}
        </div>
    );
}

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
                    description="Sincronizá productos y pedidos desde WooCommerce/Shopify."
                    steps={['WooCommerce → REST API → Crear clave', 'Copiá Consumer Key + Secret + URL', 'Pegalos en Configuración']}
                    onNavigate={() => onNavigate?.('settings')}
                />
            ) : (
                <Card><EmptyState icon={Globe} title="Tienda conectada ✓" description={`URL: ${state.integraciones.wooStoreUrl}`} /></Card>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// BANKING
// ═══════════════════════════════════════════════════════════════════
export function BankingPage() {
    const { state, actions } = useData();
    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const EMPTY = {
        fecha: new Date().toISOString().slice(0, 10),
        tipo: 'ingreso', concepto: '', monto: '', banco: '', sucursalId: '', notas: ''
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
                subtitle="Movimientos bancarios"
                help={SECTION_HELP.banking}
                actions={<button className="btn btn-primary" onClick={() => { setForm(EMPTY); setEditId(null); setOpen(true); }}><Plus size={14} /> Nuevo movimiento</button>}
            />
            <div className="kpi-grid mb-4">
                <KpiCard icon={<Landmark size={20} />} label="Movimientos" value={movs.length} color="#63f1cb" />
                <KpiCard icon={<Landmark size={20} />} label="Ingresos" value={fmtMoney(totalIngresos, state.business.moneda)} color="#4ade80" />
                <KpiCard icon={<Landmark size={20} />} label="Egresos" value={fmtMoney(totalEgresos, state.business.moneda)} color="#fb7185" />
                <KpiCard icon={<Landmark size={20} />} label="Neto" value={fmtMoney(totalIngresos - totalEgresos, state.business.moneda)} color="#60a5fa" />
            </div>
            <Card>
                {movs.length === 0 ? (
                    <EmptyState icon={Landmark} title="Sin movimientos bancarios" description="Trackeá transferencias, pagos a proveedores y depósitos." action={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={14} /> Cargar primero</button>} tips={['Ingresos y egresos', 'Banco y concepto', 'Complementa ventas y gastos']} example="Ej: Transferencia de cliente $800.000 - Banco Galicia" />
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
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: m.tipo === 'ingreso' ? 'var(--success)' : 'var(--danger)' }} className="mono">
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
            <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'Editar movimiento' : 'Nuevo movimiento'}>
                <div className="form-grid">
                    <Field label="Fecha"><input className="input" type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} /></Field>
                    <Field label="Tipo"><select className="select" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}><option value="ingreso">Ingreso</option><option value="egreso">Egreso</option></select></Field>
                    <Field label="Concepto" required><input className="input" value={form.concepto} onChange={e => setForm({ ...form, concepto: e.target.value })} /></Field>
                    <Field label="Monto" required><input className="input" type="number" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} /></Field>
                    <Field label="Banco"><input className="input" placeholder="Galicia, Santander..." value={form.banco} onChange={e => setForm({ ...form, banco: e.target.value })} /></Field>
                    <Field label="Sucursal"><select className="select" value={form.sucursalId} onChange={e => setForm({ ...form, sucursalId: e.target.value })}><option value="">General</option>{state.sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></Field>
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
// TAREAS (Kanban)
// ═══════════════════════════════════════════════════════════════════
export function TareasPage() {
    const { state, actions } = useData();
    const [open, setOpen] = useState(false);
    const EMPTY = { titulo: '', descripcion: '', estado: 'pendiente', prioridad: 'normal', asignadoA: '', sucursalId: '', fechaLimite: '' };
    const [form, setForm] = useState(EMPTY);

    const ESTADOS = [
        { id: 'pendiente', label: 'Pendiente', color: '#fbbf24' },
        { id: 'progreso', label: 'En progreso', color: '#60a5fa' },
        { id: 'completado', label: 'Completado', color: '#4ade80' }
    ];

    const save = () => {
        if (!form.titulo.trim()) return alert('Título obligatorio');
        actions.add('tareas', form);
        setOpen(false);
    };

    const moveTarea = (id, estado) => actions.update('tareas', id, { estado });

    return (
        <div>
            <PageHeader icon={CheckSquare} title="Tareas" subtitle="Kanban del equipo" help={SECTION_HELP.tareas}
                actions={<button className="btn btn-primary" onClick={() => { setForm(EMPTY); setOpen(true); }}><Plus size={14} /> Nueva tarea</button>}
            />
            {state.tareas.length === 0 ? (
                <Card>
                    <EmptyState icon={CheckSquare} title="Sin tareas" description="Organizá el trabajo del equipo." action={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={14} /> Primera tarea</button>} tips={['Prioridad y asignado', 'Mover entre columnas', 'Fecha límite opcional']} example="Ej: 'Pedir mercadería' - Alta - Juan - Vence viernes" />
                </Card>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                    {ESTADOS.map(est => {
                        const tareas = state.tareas.filter(t => t.estado === est.id);
                        return (
                            <Card key={est.id} title={<span style={{ color: est.color }}>● {est.label} ({tareas.length})</span>}>
                                <div className="flex flex-col gap-2">
                                    {tareas.length === 0 ? (
                                        <div className="text-xs text-muted text-center" style={{ padding: 20 }}>Sin tareas</div>
                                    ) : tareas.map(t => (
                                        <div key={t.id} style={{ padding: 14, background: 'var(--bg-elevated)', borderRadius: 10, borderLeft: `3px solid ${est.color}` }}>
                                            <div className="font-semibold text-sm">{t.titulo}</div>
                                            {t.descripcion && <div className="text-xs text-muted mt-1">{t.descripcion}</div>}
                                            <div className="flex gap-1 mt-2" style={{ flexWrap: 'wrap' }}>
                                                <Badge variant={t.prioridad === 'alta' ? 'danger' : t.prioridad === 'baja' ? 'muted' : 'warning'}>{t.prioridad}</Badge>
                                                {t.fechaLimite && <Badge variant="info">{fmtDate(t.fechaLimite)}</Badge>}
                                                {t.asignadoA && <Badge>{(() => { const e = state.empleados.find(x => x.id === t.asignadoA); return e ? e.nombre : '—'; })()}</Badge>}
                                            </div>
                                            <div className="flex gap-1 mt-2">
                                                {ESTADOS.filter(e => e.id !== est.id).map(e => (
                                                    <button key={e.id} className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => moveTarea(t.id, e.id)}>
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
                    <Field label="Prioridad"><select className="select" value={form.prioridad} onChange={e => setForm({ ...form, prioridad: e.target.value })}><option value="baja">Baja</option><option value="normal">Normal</option><option value="alta">Alta</option></select></Field>
                    <Field label="Asignado a"><select className="select" value={form.asignadoA} onChange={e => setForm({ ...form, asignadoA: e.target.value })}><option value="">Sin asignar</option>{state.empleados.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellido || ''}</option>)}</select></Field>
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
