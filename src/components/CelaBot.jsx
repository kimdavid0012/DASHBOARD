import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X as XIcon, Send, Sparkles, Brain } from 'lucide-react';
import { useData, getRubroLabels } from '../store/DataContext';

// ═══════════════════════════════════════════════════════════════════
// RUBRO-SPECIFIC SYSTEM PROMPTS
// ═══════════════════════════════════════════════════════════════════
function buildSystemPrompt(state) {
    const rubro = state.business.rubro;
    const labels = getRubroLabels(rubro);
    const bname = state.business.name || 'este negocio';

    const rubroContext = {
        kiosco: `Este es un KIOSCO/AUTOSERVICIO. Pensá en términos de: rotación alta de productos, márgenes chicos (10-30%), stock con vencimientos, cigarrillos/bebidas como productos estrella, venta por unidad rápida, control de caja riguroso. Las categorías típicas son golosinas, cigarrillos, bebidas, galletitas, lácteos, fiambres. El rubro vive de volumen, no de margen individual.`,
        restaurante: `Este es un RESTAURANTE/BAR. Pensá en términos de: costeo de platos (food cost ~30%), mesas rotando, comandas a cocina, horario pico viernes/sábado noche, mermas por producto, bebidas con mejor margen que platos, reservas. El rubro gana mucho en bebidas y postres, el plato principal a veces es casi break-even.`,
        accesorios: `Este es un NEGOCIO DE ACCESORIOS/ROPA. Pensá en términos de: márgenes altos (60-150%), rotación estacional, talles y colores como variantes críticas, Instagram como principal canal de venta, mayorista vs minorista, moda pasando rápido. El rubro gana en márgenes pero tiene que renovar colección seguido.`,
        servicios: `Este es un NEGOCIO DE SERVICIOS. Pensá en términos de: facturación por hora/sesión, agenda/turnos, capacity utilization, recurrencia de clientes, upselling de servicios premium. El rubro gana más por retener clientes que por vender una sola vez.`,
        general: `Este es un comercio general. Usá sentido común según el tipo de productos que vea en el catálogo.`,
        otro: `Es un negocio con configuración personalizada.`
    }[rubro] || '';

    // Data snapshot
    const ventas = state.ventas || [];
    const productos = state.productos || [];
    const hoy = new Date().toISOString().slice(0, 10);
    const mes = hoy.slice(0, 7);
    const ventasHoy = ventas.filter(v => (v.fecha || '').slice(0, 10) === hoy);
    const ventasMes = ventas.filter(v => (v.fecha || '').slice(0, 7) === mes);
    const totalHoy = ventasHoy.reduce((s, v) => s + Number(v.total || 0), 0);
    const totalMes = ventasMes.reduce((s, v) => s + Number(v.total || 0), 0);
    const stockBajo = productos.filter(p => Number(p.stock || 0) > 0 && Number(p.stock || 0) <= Number(p.stockMinimo || 5));
    const sinStock = productos.filter(p => Number(p.stock || 0) <= 0);

    const topProductos = (() => {
        const count = {};
        ventas.forEach(v => (v.items || []).forEach(it => {
            count[it.productoId] = (count[it.productoId] || 0) + Number(it.cantidad || 0);
        }));
        return Object.entries(count)
            .map(([pid, cant]) => ({ p: productos.find(x => x.id === pid), cant }))
            .filter(x => x.p)
            .sort((a, b) => b.cant - a.cant)
            .slice(0, 5)
            .map(x => `${x.p.nombre} (${x.cant} vendidos)`);
    })();

    const gastosEsteMes = state.gastos.filter(g => (g.fecha || '').slice(0, 7) === mes).reduce((s, g) => s + Number(g.monto || 0), 0);

    return `Sos CELA, un agente experto en gestión de negocios argentinos, especializado en el rubro de ${bname}.

${rubroContext}

─── CONTEXTO DEL NEGOCIO (datos actuales) ───

Nombre: ${bname}
Rubro: ${rubro}
Moneda: ${state.business.moneda || 'ARS'}
Sucursales activas: ${state.sucursales.length} (${state.sucursales.map(s => s.nombre).join(', ') || 'ninguna'})
Empleados: ${state.empleados.length}
${labels.clients}: ${state.clientes.length}
${labels.items} en catálogo: ${productos.length}
Proveedores: ${state.proveedores.length}

─── NÚMEROS DEL MOMENTO ───

Ventas HOY: ${ventasHoy.length} operaciones · $${totalHoy.toLocaleString('es-AR')}
Ventas ESTE MES: ${ventasMes.length} operaciones · $${totalMes.toLocaleString('es-AR')}
Gastos este mes: $${gastosEsteMes.toLocaleString('es-AR')}
Margen bruto mes: $${(totalMes - gastosEsteMes).toLocaleString('es-AR')} ${totalMes > 0 ? `(${(((totalMes - gastosEsteMes) / totalMes) * 100).toFixed(1)}%)` : ''}
Stock bajo: ${stockBajo.length} productos
Sin stock: ${sinStock.length} productos
Top 5 más vendidos: ${topProductos.join(', ') || 'aún no hay ventas'}

─── TU ROL ───

1. Respondé SIEMPRE en español argentino (usando "vos", "tenés", "querés"). 
2. Sé directo y práctico. Sin rodeos. Sin "como modelo de lenguaje".
3. Cuando el usuario pregunte algo, usá los números de arriba. Si te piden data que no está, decilo.
4. Podés RECOMENDAR acciones concretas (ej: "deberías reponer X productos", "subí el precio de Y porque...").
5. Podés ANALIZAR: ventas, rentabilidad, stock, empleados, proveedores.
6. NO PODÉS operar el POS ni registrar ventas por el usuario. Sí podés ayudar a cargar productos, gastos, empleados, clientes, proveedores, etc. guiando paso a paso.
7. Cuando respondas, pensá primero como un dueño experimentado del rubro. Después como un consultor.
8. Si detectás algo raro en la data (ej: caída de ventas, gasto anómalo, margen negativo), señalalo proactivamente.
9. Respuestas cortas y útiles. Bullet points cuando corresponda. Evitá párrafos largos.

─── EJEMPLOS DE BUENAS RESPUESTAS ───

Usuario: "¿cómo voy?"
Vos: "Hoy llevás $${totalHoy.toLocaleString('es-AR')} en ${ventasHoy.length} operaciones. El mes va bien/mal/regular por... ${stockBajo.length > 0 ? `⚠️ Ojo con ${stockBajo.length} productos con stock bajo.` : ''}"

Usuario: "qué vendo mejor?"
Vos: "Tu top 5: ${topProductos.slice(0, 3).join(', ')}. Si querés el detalle completo andá a Informes → Por empleado."

Usuario: "cargá un producto nuevo"
Vos: "Dale, pasame: nombre, precio de costo, precio de venta y stock inicial. Después lo agregás vos en ${labels.items} (no puedo tocar el catálogo por seguridad, pero te armo los datos listos para pegar).

Sé breve y útil. Nunca inventes números que no tengas. Si faltan datos, decile "esa info no la veo todavía, cargá X para que te lo pueda decir".`;
}

// ═══════════════════════════════════════════════════════════════════
// CELA BOT COMPONENT (floating chat)
// ═══════════════════════════════════════════════════════════════════
export default function CelaBot() {
    const { state } = useData();
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const hasKey = !!(state.integraciones.anthropicKey || state.integraciones.openaiKey);
    const labels = getRubroLabels(state.business.rubro);

    // Welcome message on first open
    useEffect(() => {
        if (open && messages.length === 0) {
            const rubroGreeting = {
                kiosco: '¿Querés saber cómo van las ventas del día, qué reponer o algún análisis puntual?',
                restaurante: '¿Querés analizar qué platos rinden más, revisar costos o ver cómo va la semana?',
                accesorios: '¿Hablamos de qué se vende mejor, qué conviene reponer o analizamos margen por producto?',
                servicios: '¿Querés ver clientes activos, facturación del mes o analizar retención?',
                general: '¿En qué te puedo ayudar hoy?'
            }[state.business.rubro] || '¿En qué te ayudo?';

            setMessages([{
                role: 'assistant',
                content: `¡Hola! Soy CELA, tu asistente de ${state.business.name || 'Dashboard'}. ${rubroGreeting}`
            }]);
        }
    }, [open]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 100);
    }, [open]);

    const sendMessage = async (textOverride) => {
        const text = (textOverride || input).trim();
        if (!text || loading) return;

        const newMessages = [...messages, { role: 'user', content: text }];
        setMessages(newMessages);
        setInput('');
        setLoading(true);

        try {
            if (!hasKey) {
                // Local fallback: simulated answers with basic data
                const reply = generateLocalReply(text, state);
                setMessages([...newMessages, { role: 'assistant', content: reply }]);
                setLoading(false);
                return;
            }

            const systemPrompt = buildSystemPrompt(state);
            let reply = '';

            if (state.integraciones.anthropicKey) {
                // Call Anthropic
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
                        max_tokens: 800,
                        system: systemPrompt,
                        messages: newMessages.map(m => ({ role: m.role, content: m.content }))
                    })
                });
                const data = await res.json();
                if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
                reply = data.content?.[0]?.text || 'No recibí respuesta del modelo.';
            } else if (state.integraciones.openaiKey) {
                const res = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${state.integraciones.openaiKey}`
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        max_tokens: 800,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            ...newMessages.map(m => ({ role: m.role, content: m.content }))
                        ]
                    })
                });
                const data = await res.json();
                if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
                reply = data.choices?.[0]?.message?.content || 'No recibí respuesta del modelo.';
            }

            setMessages([...newMessages, { role: 'assistant', content: reply }]);
        } catch (err) {
            setMessages([...newMessages, {
                role: 'assistant',
                content: `⚠️ No pude conectar con la IA: ${err.message}\n\nRevisá tu API key en Configuración → Integraciones. Mientras tanto puedo responder con datos básicos.`
            }]);
        } finally {
            setLoading(false);
        }
    };

    const quickActions = {
        kiosco: ['¿Cómo voy hoy?', 'Qué reponer', 'Productos con mayor margen'],
        restaurante: ['Ventas de hoy', 'Platos más pedidos', 'Análisis de mesas'],
        accesorios: ['Top ventas', 'Stock bajo', 'Margen por categoría'],
        servicios: ['Mis clientes', 'Servicios más pedidos', 'Facturación del mes'],
        general: ['¿Cómo va el negocio?', 'Qué debería vigilar', 'Resumen del mes']
    }[state.business.rubro] || ['¿Cómo voy?', 'Resumen', 'Análisis'];

    return (
        <>
            {!open && (
                <button className="bot-fab" onClick={() => setOpen(true)} title="Hablar con CELA">
                    <Sparkles size={24} />
                </button>
            )}

            {open && (
                <div className="bot-panel">
                    <div className="bot-header">
                        <div className="bot-avatar">C</div>
                        <div style={{ flex: 1 }}>
                            <div className="bot-title">CELA</div>
                            <div className="bot-subtitle">
                                {hasKey ? '● Inteligencia conectada' : '○ Modo básico (sin API key)'}
                            </div>
                        </div>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setOpen(false)}>
                            <XIcon size={16} />
                        </button>
                    </div>

                    <div className="bot-messages">
                        {messages.map((m, i) => (
                            <div key={i} className={`bot-msg ${m.role}`}>{m.content}</div>
                        ))}

                        {loading && (
                            <div className="bot-thinking">
                                <span></span><span></span><span></span>
                            </div>
                        )}

                        {messages.length === 1 && !loading && (
                            <div className="flex gap-2 mt-2" style={{ flexWrap: 'wrap' }}>
                                {quickActions.map(q => (
                                    <button key={q} className="bot-quick-action" onClick={() => sendMessage(q)}>
                                        {q}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    <form className="bot-input-area" onSubmit={(e) => { e.preventDefault(); sendMessage(); }}>
                        <input
                            ref={inputRef}
                            className="bot-input"
                            placeholder="Preguntale a CELA..."
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            disabled={loading}
                        />
                        <button type="submit" className="bot-send" disabled={!input.trim() || loading}>
                            <Send size={16} />
                        </button>
                    </form>
                </div>
            )}
        </>
    );
}

// ═══════════════════════════════════════════════════════════════════
// Local fallback when no API key (gives basic numeric answers)
// ═══════════════════════════════════════════════════════════════════
function generateLocalReply(userText, state) {
    const q = userText.toLowerCase();
    const labels = getRubroLabels(state.business.rubro);
    const ventas = state.ventas || [];
    const productos = state.productos || [];
    const hoy = new Date().toISOString().slice(0, 10);
    const mes = hoy.slice(0, 7);
    const ventasHoy = ventas.filter(v => (v.fecha || '').slice(0, 10) === hoy);
    const totalHoy = ventasHoy.reduce((s, v) => s + Number(v.total || 0), 0);
    const ventasMes = ventas.filter(v => (v.fecha || '').slice(0, 7) === mes);
    const totalMes = ventasMes.reduce((s, v) => s + Number(v.total || 0), 0);
    const stockBajo = productos.filter(p => Number(p.stock || 0) > 0 && Number(p.stock || 0) <= Number(p.stockMinimo || 5));
    const fmt = n => '$' + Math.round(n).toLocaleString('es-AR');

    if (q.includes('hoy') || q.includes('día') || q.includes('voy')) {
        return `Hoy llevás ${ventasHoy.length} operaciones por ${fmt(totalHoy)}. ${stockBajo.length > 0 ? `⚠️ Tenés ${stockBajo.length} productos con stock bajo.` : '✓ Stock OK.'}`;
    }
    if (q.includes('mes') || q.includes('mensual') || q.includes('resumen')) {
        return `Este mes: ${ventasMes.length} ventas por ${fmt(totalMes)}. Promedio diario: ${fmt(totalMes / Math.max(1, new Date().getDate()))}. Cargá tu API key para análisis inteligente.`;
    }
    if (q.includes('stock') || q.includes('repon')) {
        if (stockBajo.length === 0) return 'Tu stock está OK. No tenés productos por debajo del mínimo.';
        return `Tenés ${stockBajo.length} productos con stock bajo: ${stockBajo.slice(0, 5).map(p => `${p.nombre} (${p.stock} unidades)`).join(', ')}${stockBajo.length > 5 ? '...' : ''}`;
    }
    if (q.includes('top') || q.includes('mejor') || q.includes('más vend')) {
        const count = {};
        ventas.forEach(v => (v.items || []).forEach(it => {
            count[it.productoId] = (count[it.productoId] || 0) + Number(it.cantidad || 0);
        }));
        const top = Object.entries(count)
            .map(([pid, c]) => ({ p: productos.find(x => x.id === pid), c }))
            .filter(x => x.p)
            .sort((a, b) => b.c - a.c)
            .slice(0, 5);
        if (top.length === 0) return 'Aún no hay ventas registradas.';
        return `Top 5: ${top.map((t, i) => `${i + 1}. ${t.p.nombre} (${t.c})`).join(', ')}`;
    }

    return `Para respuestas inteligentes necesito una API key de Anthropic u OpenAI. Podés cargarla en Configuración → Integraciones. Mientras tanto te puedo responder:\n\n• "¿Cómo voy hoy?"\n• "Resumen del mes"\n• "Stock bajo"\n• "Top ventas"`;
}
