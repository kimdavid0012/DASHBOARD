import React, { useState } from 'react';
import {
    Megaphone, Bot, Instagram, Music2, BarChart3, Globe,
    Landmark, CheckSquare, Plus, Trash2, ArrowRight, Settings2, Pencil,
    Play, Calendar, Clock, Zap, TrendingUp, Eye, Target,
    Lightbulb, PenTool, Users2, Package, DollarSign, AlertCircle,
    ShoppingCart, AlertTriangle
} from 'lucide-react';
import { useData, filterBySucursal, getRubroLabels, SECTION_HELP } from '../store/DataContext';
import { PageHeader, Card, Modal, Field, EmptyState, Badge, KpiCard, InfoBox, fmtMoney, fmtDate, BarChart, PieChart, LineChart, CHART_COLORS, DateRangeFilter, filterByDateRange, describeDateRange } from '../components/UI';
import { useT, langInstructions } from '../i18n';

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
    const t = useT();
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
            const basePrompt = agent.buildPrompt(state, labels);
            // Prefix language instruction — overrides default Spanish in the prompts
            const prompt = `⚠️ CRITICAL LANGUAGE RULE: ${langInstructions()}\n\n---\n\n${basePrompt}`;

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

    // ═══════════════════════════════════════════════════════════════════
    // RUN ALL — ejecuta todos los agentes excepto CEO, luego CEO que sintetiza
    // ═══════════════════════════════════════════════════════════════════
    const runAllAgents = async () => {
        if (!hasKey) return alert('Cargá una API key en Configuración → Integraciones');
        if (!confirm('Esto va a ejecutar los 8 agentes uno tras otro. Puede tardar 1-2 minutos y consume tokens. ¿Continuar?')) return;

        // 1. Marcar todos como running
        const allRunning = {};
        AGENTS.forEach(a => { allRunning[a.id] = true; });
        setRunning(allRunning);

        const newOutputs = { ...outputs };
        const subAgentes = AGENTS.filter(a => a.id !== 'ceo');

        // 2. Ejecutar sub-agentes en secuencia
        for (const agent of subAgentes) {
            try {
                const basePrompt = agent.buildPrompt(state, labels);
                const prompt = `⚠️ CRITICAL LANGUAGE RULE: ${langInstructions()}\n\n---\n\n${basePrompt}`;
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
                        body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] })
                    });
                    const data = await res.json();
                    if (data.error) throw new Error(data.error.message);
                    reply = data.content?.[0]?.text || '';
                } else if (state.integraciones.openaiKey) {
                    const res = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.integraciones.openaiKey}` },
                        body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] })
                    });
                    const data = await res.json();
                    if (data.error) throw new Error(data.error.message);
                    reply = data.choices?.[0]?.message?.content || '';
                }

                newOutputs[agent.id] = { text: reply, at: new Date().toISOString() };
                setOutputs({ ...newOutputs });
                setRunning(r => ({ ...r, [agent.id]: false }));
            } catch (err) {
                newOutputs[agent.id] = { text: `❌ Error: ${err.message}`, at: new Date().toISOString() };
                setOutputs({ ...newOutputs });
                setRunning(r => ({ ...r, [agent.id]: false }));
            }
        }

        // 3. CEO sintetiza los outputs de los otros
        try {
            const subOutputs = subAgentes
                .map(a => `### ${a.emoji} ${a.nombre}\n${newOutputs[a.id]?.text || '(sin output)'}`)
                .join('\n\n---\n\n');

            const ceoPrompt = `⚠️ CRITICAL LANGUAGE RULE: ${langInstructions()}\n\n---\n\nSos el CEO virtual de ${state.business.name || 'este negocio'}.

Acabás de recibir los reportes de TODOS tus agentes. Tu trabajo es SINTETIZAR todo en un briefing ejecutivo de máximo 10 bullets que el dueño pueda leer en 60 segundos.

═══ REPORTES DE LOS AGENTES ═══

${subOutputs}

═══════════════════════════════════════

Ahora generá el BRIEFING EJECUTIVO:

- 🎯 Estado general del negocio (1 frase)
- 💰 Número más importante hoy
- 🚨 Fuego (si algún agente detectó algo urgente)
- 📈 Oportunidad destacada (combiná lo que vieron los agentes)
- 🛑 Alerta de stock/caja/clientes
- ⚡ 3 acciones concretas para los próximos 2 días
- 🧠 Decisión estratégica pendiente esta semana
- 🤝 Qué agente tuvo la mejor insight y por qué

Estilo: conciso, nivel board, sin rodeos. Sintetizás, no repetís.`;

            let ceoReply = '';
            if (state.integraciones.anthropicKey) {
                const res = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-api-key': state.integraciones.anthropicKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
                    body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 2000, messages: [{ role: 'user', content: ceoPrompt }] })
                });
                const data = await res.json();
                if (data.error) throw new Error(data.error.message);
                ceoReply = data.content?.[0]?.text || '';
            } else {
                const res = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.integraciones.openaiKey}` },
                    body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 2000, messages: [{ role: 'user', content: ceoPrompt }] })
                });
                const data = await res.json();
                if (data.error) throw new Error(data.error.message);
                ceoReply = data.choices?.[0]?.message?.content || '';
            }

            newOutputs['ceo'] = { text: ceoReply, at: new Date().toISOString(), synthesizedFrom: subAgentes.map(a => a.id) };
            setOutputs({ ...newOutputs });
        } catch (err) {
            newOutputs['ceo'] = { text: `❌ Error CEO: ${err.message}`, at: new Date().toISOString() };
            setOutputs({ ...newOutputs });
        } finally {
            setRunning(r => ({ ...r, ceo: false }));
        }
    };

    return (
        <div>
            <PageHeader
                icon={Bot}
                title={t('agents.title')}
                subtitle={t('agents.subtitle', {n: AGENTS.length, rubro: state.business.rubro})}
                help={SECTION_HELP.agents}
                actions={
                    hasKey ? (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <Badge variant="success">● API conectada</Badge>
                            <button
                                className="btn btn-primary"
                                onClick={runAllAgents}
                                disabled={Object.values(running).some(Boolean)}
                            >
                                🚀 Correr todos los agentes
                            </button>
                        </div>
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
    const t = useT();
    const { state } = useData();
    const [tab, setTab] = useState('email');
    const hasMeta = !!state.integraciones.metaAccessToken;
    const hasAnthropic = !!state.integraciones.anthropicKey;

    return (
        <div>
            <PageHeader icon={Megaphone} title={t('pages.marketing.title')} subtitle="Email marketing con IA, Meta Ads y más" help={SECTION_HELP.marketing} />

            <div className="tabs" style={{ marginBottom: 16 }}>
                <button className={`tab ${tab === 'email' ? 'active' : ''}`} onClick={() => setTab('email')}>
                    📧 Email Campaigns
                </button>
                <button className={`tab ${tab === 'meta' ? 'active' : ''}`} onClick={() => setTab('meta')}>
                    📘 Meta Ads
                </button>
            </div>

            {tab === 'email' && (
                hasAnthropic ? <EmailCampaigns state={state} /> :
                    <ComingSoonCard
                        icon={Megaphone}
                        title="Activá IA para generar emails"
                        description="Email campaigns usa Claude para generar emails personalizados por segmento de cliente."
                        steps={['Configuración → Integraciones', 'Pegá tu Anthropic API Key', 'Volvé a esta pestaña']}
                        onNavigate={() => onNavigate?.('settings')}
                    />
            )}

            {tab === 'meta' && (
                !hasMeta ? (
                    <ComingSoonCard
                        icon={Megaphone}
                        title="Conectá Meta Ads"
                        description="Vas a ver campañas activas, presupuesto, impresiones y conversiones."
                        steps={['Andá a Configuración → Integraciones', 'Pegá tu Meta Access Token', 'Pegá tu Ad Account ID (act_XXXXXXXXXX)', 'Volvé acá']}
                        onNavigate={() => onNavigate?.('settings')}
                    />
                ) : (
                    <MetaAdsDashboard state={state} />
                )
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// META ADS DASHBOARD REAL
// ═══════════════════════════════════════════════════════════════════
function MetaAdsDashboard({ state }) {
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [data, setData] = React.useState(() => {
        try {
            const cached = localStorage.getItem('meta_ads_cache_v1');
            return cached ? JSON.parse(cached) : null;
        } catch { return null; }
    });

    const token = state.integraciones.metaAccessToken;
    const adAccountId = state.integraciones.metaAdAccountId;

    const fetchAds = async () => {
        if (!adAccountId) {
            setError('Falta Ad Account ID (act_XXXXXXXXXX). Configuralo en Integraciones.');
            return;
        }
        setLoading(true); setError('');
        try {
            const accountUrl = `https://graph.facebook.com/v19.0/${adAccountId}?fields=name,currency,amount_spent,balance&access_token=${token}`;
            const fieldsExpr = 'id,name,status,objective,daily_budget,lifetime_budget,insights.date_preset(last_30d){impressions,clicks,spend,reach,cpc,cpm,ctr,conversions}';
            const campaignsUrl = `https://graph.facebook.com/v19.0/${adAccountId}/campaigns?fields=${encodeURIComponent(fieldsExpr)}&limit=25&access_token=${token}`;

            const [accountRes, campaignsRes] = await Promise.all([
                fetch(accountUrl),
                fetch(campaignsUrl)
            ]);

            if (!accountRes.ok) {
                const errTxt = await accountRes.text();
                throw new Error(`Error ${accountRes.status}: ${errTxt.slice(0, 200)}`);
            }

            const account = await accountRes.json();
            const campaignsData = campaignsRes.ok ? await campaignsRes.json() : { data: [] };

            const payload = {
                account,
                campaigns: campaignsData.data || [],
                fetchedAt: new Date().toISOString()
            };
            setData(payload);
            localStorage.setItem('meta_ads_cache_v1', JSON.stringify(payload));
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => { if (adAccountId && !data) fetchAds(); }, [adAccountId]);

    const account = data?.account;
    const campaigns = data?.campaigns || [];

    // Total stats
    const totalImp = campaigns.reduce((s, c) => s + Number(c.insights?.data?.[0]?.impressions || 0), 0);
    const totalClicks = campaigns.reduce((s, c) => s + Number(c.insights?.data?.[0]?.clicks || 0), 0);
    const totalSpend = campaigns.reduce((s, c) => s + Number(c.insights?.data?.[0]?.spend || 0), 0);
    const avgCtr = totalImp > 0 ? (totalClicks / totalImp * 100) : 0;

    return (
        <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                    {account && (
                        <>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{account.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                Moneda: {account.currency} · Gastado: {account.amount_spent}
                            </div>
                        </>
                    )}
                </div>
                <button className="btn btn-primary btn-sm" onClick={fetchAds} disabled={loading}>
                    🔄 {loading ? 'Cargando...' : 'Actualizar'}
                </button>
            </div>

            {error && (
                <InfoBox variant="warning">
                    <strong>Error:</strong> {error}
                    <div style={{ fontSize: 12, marginTop: 8 }}>
                        💡 Verificá: (1) Token vigente, (2) Ad Account ID correcto (empieza con "act_"),
                        (3) El token tiene permisos ads_read + ads_management.
                    </div>
                </InfoBox>
            )}

            {data && (
                <>
                    <div className="kpi-grid mb-4">
                        <KpiCard icon={<Megaphone size={20} />} label="Campañas (30d)" value={campaigns.length} color="#1877f2" />
                        <KpiCard icon={<Eye size={20} />} label="Impresiones" value={totalImp.toLocaleString('es-AR')} color="#63f1cb" />
                        <KpiCard icon={<Target size={20} />} label="Clicks" value={totalClicks.toLocaleString('es-AR')} color="#fbbf24" />
                        <KpiCard icon={<DollarSign size={20} />} label="Gasto total" value={`$${totalSpend.toFixed(0)}`} color="#ef4444" />
                        <KpiCard icon={<TrendingUp size={20} />} label="CTR promedio" value={`${avgCtr.toFixed(2)}%`} color="#a78bfa" />
                    </div>

                    {campaigns.length > 0 && (
                        <Card title="📊 Campañas activas" subtitle="Últimos 30 días">
                            <div className="table-wrap">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Campaña</th>
                                            <th>Estado</th>
                                            <th>Objetivo</th>
                                            <th style={{ textAlign: 'right' }}>Imp.</th>
                                            <th style={{ textAlign: 'right' }}>Clicks</th>
                                            <th style={{ textAlign: 'right' }}>CTR</th>
                                            <th style={{ textAlign: 'right' }}>CPC</th>
                                            <th style={{ textAlign: 'right' }}>Gasto</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {campaigns.map(c => {
                                            const ins = c.insights?.data?.[0] || {};
                                            return (
                                                <tr key={c.id}>
                                                    <td className="font-semibold">{c.name}</td>
                                                    <td>
                                                        <Badge variant={c.status === 'ACTIVE' ? 'success' : c.status === 'PAUSED' ? 'warning' : 'muted'}>
                                                            {c.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="text-sm text-muted">{c.objective || '—'}</td>
                                                    <td style={{ textAlign: 'right' }} className="mono">{Number(ins.impressions || 0).toLocaleString('es-AR')}</td>
                                                    <td style={{ textAlign: 'right' }} className="mono">{Number(ins.clicks || 0).toLocaleString('es-AR')}</td>
                                                    <td style={{ textAlign: 'right' }} className="mono">{Number(ins.ctr || 0).toFixed(2)}%</td>
                                                    <td style={{ textAlign: 'right' }} className="mono">${Number(ins.cpc || 0).toFixed(2)}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--danger)' }} className="mono">${Number(ins.spend || 0).toFixed(2)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}

                    {campaigns.length === 0 && (
                        <Card>
                            <EmptyState icon={Megaphone} title="Sin campañas activas" description="No encontramos campañas en tu Ad Account en los últimos 30 días." />
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// EMAIL CAMPAIGNS — generador con IA
// ═══════════════════════════════════════════════════════════════════
function EmailCampaigns({ state }) {
    const { actions } = useData();
    const [ocasion, setOcasion] = React.useState('promo');
    const [segmento, setSegmento] = React.useState('all');
    const [descuento, setDescuento] = React.useState('');
    const [cupon, setCupon] = React.useState('');
    const [productoId, setProductoId] = React.useState('');
    const [generating, setGenerating] = React.useState(false);
    const [email, setEmail] = React.useState(null);
    const [error, setError] = React.useState('');
    const [ocasiones, setOcasiones] = React.useState([]);
    const [segmentos, setSegmentos] = React.useState([]);
    const [clientesSegmentados, setClientesSegmentados] = React.useState([]);
    const [showTemplates, setShowTemplates] = React.useState(false);
    const [sending, setSending] = React.useState(false);
    const [sendResult, setSendResult] = React.useState(null);

    const templates = state.emailTemplates || [];

    React.useEffect(() => {
        import('../utils/emailCampaigns').then(mod => {
            setOcasiones(mod.EMAIL_OCASIONES);
            setSegmentos(mod.EMAIL_SEGMENTOS);
        });
    }, []);

    React.useEffect(() => {
        if (segmentos.length === 0) return;
        import('../utils/emailCampaigns').then(({ segmentCustomers }) => {
            setClientesSegmentados(segmentCustomers(state.clientes || [], state.ventas || [], segmento));
        });
    }, [segmento, state.clientes, state.ventas, segmentos.length]);

    const generate = async () => {
        setGenerating(true); setError(''); setEmail(null);
        try {
            const { generateEmail } = await import('../utils/emailCampaigns');
            const producto = state.productos?.find(p => p.id === productoId);
            const result = await generateEmail({
                apiKey: state.integraciones.anthropicKey,
                ocasion,
                business: state.business,
                segmento,
                context: {
                    descuento: descuento || undefined,
                    cupon: cupon || undefined,
                    productoDestacado: producto ? { nombre: producto.nombre, precioVenta: producto.precioVenta } : undefined
                }
            });
            setEmail(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setGenerating(false);
        }
    };

    const copyAll = () => {
        if (!email) return;
        const text = 'SUBJECT: ' + email.subject + '\n\n' + email.body_text;
        navigator.clipboard.writeText(text);
        alert('✅ Copiado al portapapeles');
    };

    const openInMailto = () => {
        if (!email) return;
        const emails = clientesSegmentados.map(c => c.email).filter(Boolean).join(',');
        const subject = encodeURIComponent(email.subject);
        const body = encodeURIComponent(email.body_text);
        window.location.href = 'mailto:?bcc=' + emails + '&subject=' + subject + '&body=' + body;
    };

    const sendViaResend = async () => {
        if (!email) return;
        const apiKey = state.integraciones.resendApiKey;
        const fromEmail = state.integraciones.resendFromEmail;
        if (!apiKey) { alert('Falta Resend API Key. Configurala en Configuración → Integraciones.'); return; }
        if (!fromEmail) { alert('Falta email remitente.'); return; }
        const recipients = clientesSegmentados.filter(c => c.email);
        if (recipients.length === 0) { alert('Ningún cliente tiene email registrado.'); return; }
        if (!confirm('¿Enviar este email a ' + recipients.length + ' persona(s)?')) return;

        setSending(true); setSendResult(null);
        try {
            const { sendEmailsViaResend } = await import('../utils/emailCampaigns');
            const result = await sendEmailsViaResend({
                apiKey, fromEmail,
                fromName: state.integraciones.resendFromName,
                recipients, subject: email.subject, html: email.body_html, text: email.body_text
            });
            setSendResult(result);
        } catch (err) {
            setSendResult({ sent: 0, failed: recipients.length, errors: [{ error: err.message }] });
        } finally {
            setSending(false);
        }
    };

    const scheduleEmail = () => {
        if (!email) return;
        const recipients = clientesSegmentados.filter(c => c.email);
        if (recipients.length === 0) { alert('Ningún cliente tiene email registrado.'); return; }
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        const defaultVal = tomorrow.toISOString().slice(0, 16).replace('T', ' ');
        const when = prompt('¿Cuándo enviar? Formato: YYYY-MM-DD HH:MM', defaultVal);
        if (!when) return;
        const sendAt = new Date(when.replace(' ', 'T'));
        if (isNaN(sendAt.getTime())) { alert('Fecha inválida'); return; }
        if (sendAt.getTime() < Date.now()) { alert('La fecha tiene que ser futura'); return; }
        actions.add('emailScheduled', {
            sendAt: sendAt.toISOString(),
            subject: email.subject, preheader: email.preheader,
            body_html: email.body_html, body_text: email.body_text,
            recipients: recipients.map(r => ({ email: r.email, nombre: r.nombre })),
            status: 'pending', createdAt: new Date().toISOString(),
            ocasion, segmento
        });
        const dateStr = sendAt.toLocaleDateString('es-AR');
        alert('✅ Email programado para ' + dateStr + '. El dashboard debe estar abierto a esa hora.');
    };

    const saveAsTemplate = () => {
        if (!email) return;
        const name = prompt('Nombre de la plantilla:', email.subject.slice(0, 40));
        if (!name) return;
        actions.add('emailTemplates', {
            nombre: name, ocasion, segmento,
            subject: email.subject, preheader: email.preheader,
            body_html: email.body_html, body_text: email.body_text
        });
        alert('✅ Plantilla "' + name + '" guardada.');
    };

    const loadTemplate = (tpl) => {
        setEmail({
            subject: tpl.subject, preheader: tpl.preheader,
            body_html: tpl.body_html, body_text: tpl.body_text
        });
        setOcasion(tpl.ocasion || 'promo');
        setSegmento(tpl.segmento || 'all');
        setShowTemplates(false);
    };

    const deleteTemplate = (id) => {
        if (!confirm('¿Eliminar esta plantilla?')) return;
        actions.remove('emailTemplates', id);
    };

    const withEmailCount = clientesSegmentados.filter(c => c.email).length;

    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
                {/* Config panel */}
                <Card title="🎯 Generar email con IA">
                    <div className="form-grid">
                        <Field label="Ocasión">
                            <select className="select" value={ocasion} onChange={e => setOcasion(e.target.value)}>
                                {ocasiones.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                            </select>
                        </Field>
                        <Field label="Segmento destinatario">
                            <select className="select" value={segmento} onChange={e => setSegmento(e.target.value)}>
                                {segmentos.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                            </select>
                        </Field>
                        <Field label="Descuento (opcional)">
                            <input className="input" placeholder="15% / $5000" value={descuento} onChange={e => setDescuento(e.target.value)} />
                        </Field>
                        <Field label="Código cupón (opcional)">
                            <input className="input" placeholder="VIP15" value={cupon} onChange={e => setCupon(e.target.value)} />
                        </Field>
                        <Field label="Producto destacado (opcional)">
                            <select className="select" value={productoId} onChange={e => setProductoId(e.target.value)}>
                                <option value="">— Ninguno —</option>
                                {(state.productos || []).slice(0, 50).map(p => (
                                    <option key={p.id} value={p.id}>{p.nombre}</option>
                                ))}
                            </select>
                        </Field>
                    </div>

                    <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-elevated)', borderRadius: 10, fontSize: 13 }}>
                        <strong>📊 Destinatarios:</strong> {clientesSegmentados.length} cliente(s) en este segmento
                        {clientesSegmentados.length > 0 && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                {withEmailCount} con email registrado
                            </div>
                        )}
                    </div>

                    <button className="btn btn-primary" style={{ marginTop: 16, width: '100%' }} onClick={generate} disabled={generating}>
                        {generating ? '⏳ Generando...' : '✨ Generar email con IA'}
                    </button>

                    {templates.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowTemplates(!showTemplates)} style={{ width: '100%' }}>
                                📁 {showTemplates ? 'Ocultar' : 'Mis plantillas'} ({templates.length})
                            </button>
                            {showTemplates && (
                                <div style={{ marginTop: 8, padding: 10, background: 'var(--bg-elevated)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                                    {templates.map(tpl => (
                                        <div key={tpl.id} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: 8, background: 'var(--bg-card)', borderRadius: 8, fontSize: 12 }}>
                                            <button onClick={() => loadTemplate(tpl)} style={{ flex: 1, textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 12 }}>
                                                <div style={{ fontWeight: 600 }}>{tpl.nombre}</div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                                                    {ocasiones.find(o => o.id === tpl.ocasion)?.label || tpl.ocasion}
                                                </div>
                                            </button>
                                            <button className="btn btn-danger btn-sm btn-icon" onClick={() => deleteTemplate(tpl.id)} title="Eliminar">
                                                <Trash2 size={11} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {error && <InfoBox variant="warning" style={{ marginTop: 12 }}><strong>Error:</strong> {error}</InfoBox>}
                </Card>

                {/* Preview panel */}
                <Card title="📬 Preview del email">
                    {!email ? (
                        <EmptyState icon={Megaphone} title="Tu email aparecerá acá" description="Configurá la ocasión y segmento, luego tocá Generar." />
                    ) : (
                        <div>
                            <div style={{ padding: 12, background: 'var(--bg-elevated)', borderRadius: 10, marginBottom: 12 }}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>SUBJECT:</div>
                                <div style={{ fontWeight: 600, fontSize: 15 }}>{email.subject}</div>
                                {email.preheader && (
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                                        <em>{email.preheader}</em>
                                    </div>
                                )}
                            </div>

                            <div style={{ padding: 16, background: 'white', color: '#222', borderRadius: 10, minHeight: 200, fontSize: 14, lineHeight: 1.5 }}>
                                <div dangerouslySetInnerHTML={{ __html: email.body_html }} />
                            </div>

                            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                                <button className="btn btn-ghost btn-sm" onClick={copyAll}>📋 Copiar</button>
                                <button className="btn btn-ghost btn-sm" onClick={saveAsTemplate}>💾 Guardar plantilla</button>
                                <button className="btn btn-ghost btn-sm" onClick={scheduleEmail} disabled={withEmailCount === 0}>⏰ Programar</button>
                                <button className="btn btn-ghost btn-sm" onClick={openInMailto} disabled={withEmailCount === 0}>✉️ Abrir en Mail ({withEmailCount})</button>
                                {state.integraciones.resendApiKey && (
                                    <button className="btn btn-primary btn-sm" onClick={sendViaResend} disabled={sending || withEmailCount === 0}>
                                        {sending ? '⏳ Enviando...' : '🚀 Enviar ahora (' + withEmailCount + ')'}
                                    </button>
                                )}
                                <button className="btn btn-ghost btn-sm" onClick={() => { setEmail(null); setSendResult(null); }}>✕ Descartar</button>
                            </div>

                            {sendResult && (
                                <div style={{ marginTop: 12, padding: 12, background: sendResult.failed === 0 ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', borderRadius: 10, fontSize: 13 }}>
                                    {sendResult.sent > 0 && <div>✅ Enviados: {sendResult.sent}</div>}
                                    {sendResult.failed > 0 && <div>⚠️ Fallaron: {sendResult.failed}</div>}
                                    {sendResult.errors?.length > 0 && (
                                        <details style={{ marginTop: 8, fontSize: 11 }}>
                                            <summary style={{ cursor: 'pointer' }}>Ver errores</summary>
                                            <div style={{ marginTop: 6 }}>
                                                {sendResult.errors.slice(0, 5).map((err, idx) => (
                                                    <div key={idx}>{err.email || 'N/A'}: {err.error}</div>
                                                ))}
                                            </div>
                                        </details>
                                    )}
                                </div>
                            )}

                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12, padding: 10, background: 'rgba(99,241,203,0.05)', borderRadius: 8 }}>
                                💡 Tip: el placeholder <code>{'\u007Bnombre\u007D'}</code> se reemplaza por el primer nombre del cliente al enviar.
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
export function InstagramPage({ onNavigate }) {
    const t = useT();
    const { state } = useData();
    const hasIG = !!state.integraciones.instagramBusinessId && !!state.integraciones.metaAccessToken;

    if (!hasIG) {
        return (
            <div>
                <PageHeader icon={Instagram} title={t('pages.instagram.title')} subtitle="Analytics + planner de contenido" help={SECTION_HELP.instagram} />
                <ComingSoonCard
                    icon={Instagram}
                    title="Conectá tu cuenta de Instagram Business"
                    description="Seguidores, alcance, engagement y últimos posts."
                    steps={['Convertí tu IG a Business', 'Conectala a tu Facebook', 'Obtené IG Business ID + Meta Access Token', 'Pegalos en Configuración']}
                    onNavigate={() => onNavigate?.('settings')}
                />
            </div>
        );
    }

    return <InstagramDashboard state={state} />;
}

function InstagramDashboard({ state }) {
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [data, setData] = React.useState(() => {
        try {
            const cached = localStorage.getItem('ig_cache_v1');
            return cached ? JSON.parse(cached) : null;
        } catch { return null; }
    });
    const [selected, setSelected] = React.useState(new Set());
    const { actions } = useData();

    const igId = state.integraciones.instagramBusinessId;
    const token = state.integraciones.metaAccessToken;

    const fetchIG = async () => {
        setLoading(true); setError('');
        try {
            // IG Graph API sí soporta CORS desde browser — no necesita proxy
            const profileUrl = `https://graph.facebook.com/v19.0/${igId}?fields=name,username,biography,followers_count,follows_count,media_count,profile_picture_url&access_token=${token}`;
            const mediaUrl = `https://graph.facebook.com/v19.0/${igId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=12&access_token=${token}`;

            const [profileRes, mediaRes] = await Promise.all([
                fetch(profileUrl),
                fetch(mediaUrl)
            ]);

            if (!profileRes.ok) {
                const errTxt = await profileRes.text();
                throw new Error(`Error ${profileRes.status}: ${errTxt.slice(0, 200)}`);
            }

            const profile = await profileRes.json();
            const mediaData = mediaRes.ok ? await mediaRes.json() : { data: [] };

            const payload = {
                profile,
                media: mediaData.data || [],
                fetchedAt: new Date().toISOString()
            };
            setData(payload);
            localStorage.setItem('ig_cache_v1', JSON.stringify(payload));
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => { if (!data) fetchIG(); }, []);

    const profile = data?.profile;
    const media = data?.media || [];

    // Engagement stats
    const totalLikes = media.reduce((s, m) => s + (m.like_count || 0), 0);
    const totalComments = media.reduce((s, m) => s + (m.comments_count || 0), 0);
    const engagementRate = profile?.followers_count && media.length > 0
        ? ((totalLikes + totalComments) / (media.length * profile.followers_count) * 100).toFixed(2)
        : 0;
    const avgLikes = media.length > 0 ? Math.round(totalLikes / media.length) : 0;

    return (
        <div>
            <PageHeader
                icon={Instagram}
                title={profile ? `@${profile.username}` : 'Instagram'}
                subtitle={profile?.name || 'Analytics de tu cuenta'}
                help={SECTION_HELP.instagram}
                actions={
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {data?.fetchedAt && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                {new Date(data.fetchedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                        <button className="btn btn-primary" onClick={fetchIG} disabled={loading}>
                            🔄 {loading ? 'Cargando...' : 'Actualizar'}
                        </button>
                    </div>
                }
            />

            {error && (
                <InfoBox variant="warning">
                    <strong>Error:</strong> {error}
                    <div style={{ fontSize: 12, marginTop: 8 }}>
                        💡 Revisá que tu Meta Access Token esté vigente (caducan cada 60 días). Generá uno nuevo en developers.facebook.com.
                    </div>
                </InfoBox>
            )}

            {profile && (
                <>
                    <div className="kpi-grid mb-4">
                        <KpiCard icon={<Users2 size={20} />} label="Seguidores" value={(profile.followers_count || 0).toLocaleString('es-AR')} color="#e1306c" />
                        <KpiCard icon={<Instagram size={20} />} label="Publicaciones" value={profile.media_count || 0} color="#63f1cb" />
                        <KpiCard icon={<Eye size={20} />} label="Likes promedio" value={avgLikes.toLocaleString('es-AR')} color="#fbbf24" />
                        <KpiCard icon={<TrendingUp size={20} />} label="Engagement" value={engagementRate + '%'} color="#a78bfa" hint="Últimos 12 posts" />
                    </div>

                    {media.length > 0 && (
                        <Card
                            title="📸 Últimos posts"
                            subtitle={`${media.length} publicaciones · ${selected.size} seleccionado${selected.size !== 1 ? 's' : ''}`}
                            actions={
                                selected.size > 0 ? (
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>
                                            Limpiar
                                        </button>
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={() => {
                                                if (!confirm(`¿Crear ${selected.size} producto(s) con las fotos de Instagram seleccionadas?`)) return;
                                                const posts = media.filter(m => selected.has(m.id));
                                                const nuevos = posts.map((m, i) => {
                                                    const caption = (m.caption || '').slice(0, 100);
                                                    return {
                                                        nombre: caption.split('\n')[0] || ('Post IG #' + (i + 1)),
                                                        codigo: 'IG-' + m.id.slice(-8),
                                                        categoria: 'Instagram',
                                                        precioVenta: 0,
                                                        precioCosto: 0,
                                                        stock: 0,
                                                        stockMinimo: 0,
                                                        unidad: 'unidad',
                                                        descripcion: (m.caption || '').slice(0, 500),
                                                        activo: true,
                                                        imagen: m.thumbnail_url || m.media_url,
                                                        imagenes: [m.thumbnail_url || m.media_url, m.media_url].filter(Boolean),
                                                        igPostId: m.id,
                                                        igPermalink: m.permalink,
                                                        origen: 'instagram'
                                                    };
                                                });
                                                actions.bulkAdd('productos', nuevos);
                                                alert('✅ ' + nuevos.length + ' producto(s) creado(s) desde Instagram. Editá precios y stock en la sección de Productos.');
                                                setSelected(new Set());
                                            }}
                                        >
                                            🏷️ Crear {selected.size} producto{selected.size !== 1 ? 's' : ''}
                                        </button>
                                    </div>
                                ) : null
                            }
                        >
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                                💡 <strong>Tip:</strong> Hacé click en los posts para seleccionarlos, después convertilos en productos del catálogo (con foto incluida).
                            </div>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                                gap: 10
                            }}>
                                {media.map(m => {
                                    const isSel = selected.has(m.id);
                                    return (
                                        <div
                                            key={m.id}
                                            onClick={() => {
                                                const next = new Set(selected);
                                                if (next.has(m.id)) next.delete(m.id);
                                                else next.add(m.id);
                                                setSelected(next);
                                            }}
                                            style={{
                                                position: 'relative',
                                                aspectRatio: '1',
                                                borderRadius: 10,
                                                overflow: 'hidden',
                                                background: 'var(--bg-elevated)',
                                                cursor: 'pointer',
                                                border: isSel ? '3px solid var(--accent)' : '3px solid transparent',
                                                transition: 'border 0.15s',
                                                boxShadow: isSel ? '0 0 20px var(--accent-glow)' : 'none'
                                            }}
                                        >
                                            <img
                                                src={m.thumbnail_url || m.media_url}
                                                alt=""
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                            {/* Selection overlay */}
                                            {isSel && (
                                                <div style={{
                                                    position: 'absolute', top: 6, left: 6,
                                                    width: 24, height: 24, borderRadius: '50%',
                                                    background: 'var(--accent)', color: '#0a0a0f',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 14, fontWeight: 800
                                                }}>✓</div>
                                            )}
                                            {/* Link externo */}
                                            <a
                                                href={m.permalink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={e => e.stopPropagation()}
                                                style={{
                                                    position: 'absolute', top: 6, right: 6,
                                                    width: 28, height: 28, borderRadius: '50%',
                                                    background: 'rgba(0,0,0,0.6)', color: 'white',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 12, textDecoration: 'none'
                                                }}
                                                title="Abrir en Instagram"
                                            >↗</a>
                                            <div style={{
                                                position: 'absolute',
                                                bottom: 0, left: 0, right: 0,
                                                padding: '24px 8px 8px',
                                                background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                                                color: 'white',
                                                fontSize: 11,
                                                display: 'flex',
                                                gap: 8,
                                                justifyContent: 'space-between'
                                            }}>
                                                <span>❤️ {(m.like_count || 0).toLocaleString('es-AR')}</span>
                                                <span>💬 {(m.comments_count || 0).toLocaleString('es-AR')}</span>
                                            </div>
                                            {m.media_type === 'VIDEO' && (
                                                <div style={{ position: 'absolute', top: 8, right: 40, fontSize: 14 }}>🎬</div>
                                            )}
                                            {m.media_type === 'CAROUSEL_ALBUM' && (
                                                <div style={{ position: 'absolute', top: 8, right: 40, fontSize: 14 }}>🎞️</div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    )}
                </>
            )}

            {loading && !data && (
                <Card>
                    <div style={{ textAlign: 'center', padding: 40 }}>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                        <div>Cargando tu Instagram...</div>
                    </div>
                </Card>
            )}
        </div>
    );
}

export function TikTokPage({ onNavigate }) {
    const t = useT();
    return (
        <div>
            <PageHeader icon={Music2} title={t('pages.tiktok.title')} subtitle="Analytics y planner de videos" help={SECTION_HELP.tiktok} />
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
    const t = useT();
    const { state } = useData();
    const [range, setRange] = React.useState({ type: 'month' });

    const ventas = React.useMemo(() =>
        filterByDateRange(state.ventas || [], range, v => v.fecha),
    [state.ventas, range]);

    const gastos = React.useMemo(() =>
        filterByDateRange(state.gastos || [], range, g => g.fecha),
    [state.gastos, range]);

    // Ingresos vs gastos
    const totalVentas = ventas.reduce((s, v) => s + Number(v.total || 0), 0);
    const totalGastos = gastos.reduce((s, g) => s + Number(g.monto || 0), 0);
    const margen = totalVentas - totalGastos;
    const margenPct = totalVentas > 0 ? (margen / totalVentas * 100) : 0;

    // Clientes: top por facturación
    const topClientes = React.useMemo(() => {
        const agg = {};
        ventas.forEach(v => {
            if (!v.clienteId) return;
            agg[v.clienteId] = (agg[v.clienteId] || 0) + Number(v.total || 0);
        });
        return Object.entries(agg)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([id, total], i) => {
                const c = state.clientes?.find(x => x.id === id);
                return {
                    label: c?.nombre || 'Cliente desconocido',
                    value: total,
                    display: fmtMoney(total, state.business.moneda),
                    color: CHART_COLORS[i % CHART_COLORS.length]
                };
            });
    }, [ventas, state.clientes, state.business.moneda]);

    // Productos: top por cantidad
    const topProductos = React.useMemo(() => {
        const count = {};
        ventas.forEach(v => (v.items || []).forEach(it => {
            if (!count[it.productoId]) count[it.productoId] = { cant: 0, total: 0 };
            count[it.productoId].cant += Number(it.cantidad || 0);
            count[it.productoId].total += Number(it.subtotal || it.total || 0);
        }));
        return Object.entries(count)
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 10)
            .map(([pid, v], i) => {
                const p = state.productos?.find(x => x.id === pid);
                return {
                    label: p?.nombre || 'Desconocido',
                    value: v.total,
                    display: `${v.cant} ud · ${fmtMoney(v.total, state.business.moneda)}`,
                    color: CHART_COLORS[i % CHART_COLORS.length]
                };
            });
    }, [ventas, state.productos, state.business.moneda]);

    // Gastos por categoría
    const gastosPorCat = React.useMemo(() => {
        const agg = {};
        gastos.forEach(g => {
            agg[g.categoria || 'Otros'] = (agg[g.categoria || 'Otros'] || 0) + Number(g.monto || 0);
        });
        return Object.entries(agg)
            .sort((a, b) => b[1] - a[1])
            .map(([label, value], i) => ({
                label, value,
                display: fmtMoney(value, state.business.moneda),
                color: CHART_COLORS[i % CHART_COLORS.length]
            }));
    }, [gastos, state.business.moneda]);

    // Método de pago
    const metodosPago = React.useMemo(() => {
        const agg = {};
        ventas.forEach(v => {
            const m = v.metodo || 'efectivo';
            agg[m] = (agg[m] || 0) + Number(v.total || 0);
        });
        return Object.entries(agg).map(([label, value], i) => ({
            label, value,
            display: fmtMoney(value, state.business.moneda),
            color: CHART_COLORS[i % CHART_COLORS.length]
        }));
    }, [ventas, state.business.moneda]);

    // Hora del día con más ventas
    const ventasPorHora = React.useMemo(() => {
        const horas = new Array(24).fill(0);
        ventas.forEach(v => {
            const fecha = new Date(v.fecha || 0);
            const h = fecha.getHours();
            if (h >= 0 && h < 24) horas[h] += Number(v.total || 0);
        });
        return horas.map((total, i) => ({
            label: `${i}h`,
            value: total,
            color: '#63f1cb'
        })).filter((_, i) => i >= 8 && i <= 23); // 8am-11pm
    }, [ventas]);

    // Día de la semana
    const ventasPorDia = React.useMemo(() => {
        const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const totals = new Array(7).fill(0);
        ventas.forEach(v => {
            const d = new Date(v.fecha || 0).getDay();
            totals[d] += Number(v.total || 0);
        });
        return totals.map((total, i) => ({
            label: dias[i],
            value: total,
            display: fmtMoney(total, state.business.moneda),
            color: CHART_COLORS[i % CHART_COLORS.length]
        }));
    }, [ventas, state.business.moneda]);

    return (
        <div>
            <PageHeader icon={BarChart3} title="Analytics" subtitle="Métricas avanzadas del negocio" help={SECTION_HELP.analytics} />

            <div style={{ marginBottom: 16 }}>
                <DateRangeFilter value={range} onChange={setRange} />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                    📅 {describeDateRange(range)} · {ventas.length} ventas · {gastos.length} gastos
                </div>
            </div>

            <div className="kpi-grid mb-4">
                <KpiCard icon={<DollarSign size={20} />} label="Ingresos" value={fmtMoney(totalVentas, state.business.moneda)} color="#22c55e" />
                <KpiCard icon={<Receipt size={20} />} label="Egresos" value={fmtMoney(totalGastos, state.business.moneda)} color="#ef4444" />
                <KpiCard
                    icon={<TrendingUp size={20} />}
                    label="Margen bruto"
                    value={fmtMoney(margen, state.business.moneda)}
                    color={margen >= 0 ? '#63f1cb' : '#ef4444'}
                    hint={`${margenPct.toFixed(1)}% de los ingresos`}
                />
                <KpiCard
                    icon={<ShoppingCart size={20} />}
                    label="Ticket promedio"
                    value={fmtMoney(ventas.length > 0 ? totalVentas / ventas.length : 0, state.business.moneda)}
                    color="#a78bfa"
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
                {topClientes.length > 0 && (
                    <Card title="👥 Top 10 clientes" subtitle="Por facturación">
                        <BarChart data={topClientes} />
                    </Card>
                )}
                {topProductos.length > 0 && (
                    <Card title="📦 Top 10 productos" subtitle="Más vendidos">
                        <BarChart data={topProductos} />
                    </Card>
                )}
                {gastosPorCat.length > 0 && (
                    <Card title="💸 Gastos por categoría">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 16, alignItems: 'center' }}>
                            <BarChart data={gastosPorCat} />
                            <div style={{ textAlign: 'center' }}>
                                <PieChart data={gastosPorCat} size={150} />
                            </div>
                        </div>
                    </Card>
                )}
                {metodosPago.length > 0 && (
                    <Card title="💳 Métodos de pago">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 16, alignItems: 'center' }}>
                            <BarChart data={metodosPago} />
                            <div style={{ textAlign: 'center' }}>
                                <PieChart data={metodosPago} size={150} />
                            </div>
                        </div>
                    </Card>
                )}
                {ventasPorDia.some(d => d.value > 0) && (
                    <Card title="📅 Ventas por día de semana" subtitle="¿Qué día vendés más?">
                        <BarChart data={ventasPorDia} />
                    </Card>
                )}
                {ventasPorHora.some(h => h.value > 0) && (
                    <Card title="🕐 Ventas por hora del día" subtitle="Horario de mayor actividad (8am-11pm)">
                        <BarChart data={ventasPorHora} />
                    </Card>
                )}
            </div>

            {ventas.length === 0 && gastos.length === 0 && (
                <Card>
                    <EmptyState
                        icon={BarChart3}
                        title="Sin datos para analizar"
                        description="Cargá ventas y gastos para ver métricas avanzadas acá."
                        tips={[
                            'Top 10 clientes por facturación',
                            'Productos más vendidos',
                            'Gastos por categoría',
                            'Horarios de mayor venta'
                        ]}
                    />
                </Card>
            )}
        </div>
    );
}

export function WebPage({ onNavigate }) {
    const t = useT();
    const { state } = useData();
    const hasWoo = !!state.integraciones.wooStoreUrl;
    const hasCreds = !!(state.integraciones.wooConsumerKey && state.integraciones.wooConsumerSecret);

    if (!hasWoo) {
        return (
            <div>
                <PageHeader icon={Globe} title="Tienda online" subtitle="WooCommerce / Shopify" help={SECTION_HELP.web} />
                <ComingSoonCard
                    icon={Globe}
                    title="Conectá tu tienda online"
                    description="Sincronizá productos y pedidos desde WooCommerce/Shopify."
                    steps={['WooCommerce → REST API → Crear clave', 'Copiá Consumer Key + Secret + URL', 'Pegalos en Configuración']}
                    onNavigate={() => onNavigate?.('settings')}
                />
            </div>
        );
    }

    return <WooCommerceDashboard state={state} onNavigate={onNavigate} hasCreds={hasCreds} />;
}

function WooCommerceDashboard({ state, onNavigate, hasCreds }) {
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [data, setData] = React.useState(() => {
        try {
            const cached = localStorage.getItem('woo_cache_v1');
            return cached ? JSON.parse(cached) : null;
        } catch { return null; }
    });
    const [range, setRange] = React.useState({ type: 'month' });

    const storeUrl = state.integraciones.wooStoreUrl?.replace(/\/$/, '');
    const ck = state.integraciones.wooConsumerKey;
    const cs = state.integraciones.wooConsumerSecret;

    const fetchWoo = async () => {
        if (!hasCreds) {
            setError('Faltan Consumer Key / Secret. Andá a Configuración → Integraciones.');
            return;
        }
        setLoading(true); setError('');
        try {
            const { wooFetchAll } = await import('../utils/wooClient');
            const result = await wooFetchAll({
                storeUrl,
                consumerKey: ck,
                consumerSecret: cs
            });

            if (result.errors.length > 0 && result.orders.length === 0) {
                throw new Error(result.errors[0]);
            }

            const payload = {
                orders: result.orders,
                products: result.products,
                reports: result.reports,
                via: result.via,
                fetchedAt: new Date().toISOString()
            };
            setData(payload);
            localStorage.setItem('woo_cache_v1', JSON.stringify(payload));
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => { if (hasCreds && !data) fetchWoo(); }, [hasCreds]);

    const orders = data?.orders || [];
    const products = data?.products || [];

    // Filter orders by date range
    const filteredOrders = React.useMemo(() => {
        return filterByDateRange(orders, range, o => o.date_created);
    }, [orders, range]);

    const totalVentas = filteredOrders.reduce((s, o) => s + parseFloat(o.total || 0), 0);
    const totalPedidos = filteredOrders.length;
    const ticketPromedio = totalPedidos > 0 ? totalVentas / totalPedidos : 0;
    const pendientes = orders.filter(o => ['pending', 'processing', 'on-hold'].includes(o.status)).length;

    // Estados de pedidos
    const statusMap = {};
    filteredOrders.forEach(o => { statusMap[o.status] = (statusMap[o.status] || 0) + 1; });
    const statusChart = Object.entries(statusMap).map(([label, value], i) => ({
        label, value, color: CHART_COLORS[i % CHART_COLORS.length]
    }));

    // Top productos
    const productCount = {};
    filteredOrders.forEach(o => {
        (o.line_items || []).forEach(it => {
            const key = it.name;
            if (!productCount[key]) productCount[key] = { label: key, value: 0, cantidad: 0 };
            productCount[key].value += parseFloat(it.total || 0);
            productCount[key].cantidad += Number(it.quantity || 0);
        });
    });
    const topProducts = Object.values(productCount)
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)
        .map((p, i) => ({
            ...p,
            display: fmtMoney(p.value, 'ARS'),
            color: CHART_COLORS[i % CHART_COLORS.length]
        }));

    // Stock crítico
    const stockCritico = products
        .filter(p => p.manage_stock && Number(p.stock_quantity || 0) <= 5)
        .sort((a, b) => Number(a.stock_quantity || 0) - Number(b.stock_quantity || 0))
        .slice(0, 10);

    return (
        <div>
            <PageHeader
                icon={Globe}
                title="Tienda online"
                subtitle={storeUrl?.replace(/^https?:\/\//, '')}
                help={SECTION_HELP.web}
                actions={
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {data?.via && (
                            <Badge variant={data.via === 'cloud' ? 'success' : data.via === 'direct' ? 'info' : 'warning'}>
                                {data.via === 'cloud' ? '☁️ Cloud' : data.via === 'direct' ? '🌐 Directo' : '🔄 Proxy'}
                            </Badge>
                        )}
                        {data?.fetchedAt && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                Actualizado: {new Date(data.fetchedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                        <button className="btn btn-primary" onClick={fetchWoo} disabled={loading}>
                            🔄 {loading ? 'Sincronizando...' : 'Sincronizar'}
                        </button>
                        <button className="btn btn-ghost" onClick={() => window.open(storeUrl, '_blank')}>
                            ↗ Ver tienda
                        </button>
                    </div>
                }
            />

            {error && (
                <InfoBox variant="warning">
                    <strong>No se pudo conectar con WooCommerce</strong>
                    <div style={{ fontSize: 13, marginTop: 8, whiteSpace: 'pre-wrap' }}>{error}</div>
                    <div style={{ fontSize: 12, marginTop: 12, padding: 10, background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                        <strong>💡 Soluciones posibles:</strong>
                        <ol style={{ margin: '6px 0 0 20px', padding: 0 }}>
                            <li>Verificá que Consumer Key y Secret estén correctos</li>
                            <li>Activá Cloud mode (Cuenta → Entrar con Google) para usar proxy seguro</li>
                            <li>Instalá el plugin "WP CORS" en tu WordPress para permitir fetch directo</li>
                            <li>Verificá que tu sitio sea accesible con HTTPS</li>
                        </ol>
                    </div>
                </InfoBox>
            )}

            {!data && !error && loading && (
                <Card>
                    <div style={{ textAlign: 'center', padding: 40 }}>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                        <div>Sincronizando con WooCommerce...</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                            Trayendo pedidos, productos y reportes
                        </div>
                    </div>
                </Card>
            )}

            {data && (
                <>
                    <div style={{ marginBottom: 16 }}>
                        <DateRangeFilter value={range} onChange={setRange} />
                    </div>

                    <div className="kpi-grid mb-4">
                        <KpiCard
                            icon={<DollarSign size={20} />}
                            label="Ventas online"
                            value={fmtMoney(totalVentas, 'ARS')}
                            color="#63f1cb"
                            hint={describeDateRange(range)}
                        />
                        <KpiCard
                            icon={<ShoppingCart size={20} />}
                            label="Pedidos"
                            value={totalPedidos}
                            color="#60a5fa"
                        />
                        <KpiCard
                            icon={<TrendingUp size={20} />}
                            label="Ticket promedio"
                            value={fmtMoney(ticketPromedio, 'ARS')}
                            color="#a78bfa"
                        />
                        <KpiCard
                            icon={<Package size={20} />}
                            label="Pendientes"
                            value={pendientes}
                            color="#f59e0b"
                            hint="Total (sin filtro)"
                        />
                        <KpiCard
                            icon={<Package size={20} />}
                            label="Productos"
                            value={products.length}
                            color="#ec4899"
                        />
                        <KpiCard
                            icon={<AlertTriangle size={20} />}
                            label="Stock crítico"
                            value={stockCritico.length}
                            color="#ef4444"
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
                        <Card title="Estado de pedidos" subtitle={describeDateRange(range)}>
                            {statusChart.length === 0 ? (
                                <EmptyState title="Sin pedidos en el período" />
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 16, alignItems: 'center' }}>
                                    <BarChart data={statusChart} />
                                    <div style={{ textAlign: 'center' }}>
                                        <PieChart data={statusChart} size={160} />
                                    </div>
                                </div>
                            )}
                        </Card>

                        <Card title="Top 10 productos vendidos" subtitle="Por facturación">
                            {topProducts.length === 0 ? (
                                <EmptyState title="Sin ventas en el período" />
                            ) : (
                                <BarChart data={topProducts} />
                            )}
                        </Card>

                        {stockCritico.length > 0 && (
                            <Card title="⚠️ Stock crítico" subtitle="Productos con 5 o menos unidades">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {stockCritico.map(p => (
                                        <div key={p.id} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '8px 10px',
                                            background: Number(p.stock_quantity) === 0 ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
                                            border: `1px solid ${Number(p.stock_quantity) === 0 ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                                            borderRadius: 8, fontSize: 13
                                        }}>
                                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {p.name}
                                            </span>
                                            <span style={{
                                                fontSize: 11, fontWeight: 700,
                                                color: Number(p.stock_quantity) === 0 ? '#ef4444' : '#f59e0b',
                                                marginLeft: 8
                                            }}>
                                                {Number(p.stock_quantity) === 0 ? '⚠️ SIN STOCK' : `${p.stock_quantity} ud`}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}

                        <Card title="Últimos pedidos">
                            {orders.length === 0 ? (
                                <EmptyState title="Sin pedidos" />
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {orders.slice(0, 10).map(o => (
                                        <div key={o.id} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '10px 12px', background: 'var(--bg-elevated)',
                                            borderRadius: 8, fontSize: 13
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>
                                                    #{o.number} · {o.billing?.first_name || 'Cliente'}
                                                </div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                                    {new Date(o.date_created).toLocaleDateString('es-AR')} ·
                                                    <Badge variant={o.status === 'completed' ? 'success' : o.status === 'processing' ? 'info' : 'warning'}>
                                                        {o.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div style={{ fontWeight: 600, color: 'var(--accent)' }}>
                                                {fmtMoney(parseFloat(o.total), o.currency || 'ARS')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    </div>
                </>
            )}

            {!hasCreds && (
                <InfoBox variant="warning" style={{ marginTop: 16 }}>
                    <strong>Faltan credenciales WooCommerce</strong>
                    <div style={{ fontSize: 13, marginTop: 4 }}>
                        Para traer data real necesitás el Consumer Key + Secret.
                        Generalos en tu WooCommerce: <code>Ajustes → Avanzado → API REST → Añadir clave</code>.
                        Después pegalos en Configuración → Integraciones.
                    </div>
                </InfoBox>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// BANKING
// ═══════════════════════════════════════════════════════════════════
export function BankingPage() {
    const t = useT();
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
    const t = useT();
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
