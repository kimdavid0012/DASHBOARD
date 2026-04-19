import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X as XIcon, Send, Sparkles, Brain, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useData, getRubroLabels } from '../store/DataContext';
import { useT, getLang, langInstructions } from '../i18n';
import { createRecognizer, sttIsSupported, ttsIsSupported, speak, stopSpeaking, isSpeaking } from '../utils/voice';
import { BOT_TOOLS, executeTool } from './bot-tools';

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

1. ⚠️ IDIOMA CRÍTICO: ${langInstructions()} Esta instrucción tiene prioridad absoluta — incluso si el usuario te escribe en otro idioma, TU RESPUESTA debe estar en el idioma especificado arriba.
2. Sé directo y práctico. Sin rodeos. Sin "como modelo de lenguaje".
3. Cuando el usuario pregunte algo, usá los números de arriba. Si te piden data que no está, decilo.
4. Podés RECOMENDAR acciones concretas.
5. Podés ANALIZAR: ventas, rentabilidad, stock, empleados, proveedores.
6. ✨ **TENÉS HERRAMIENTAS PARA EJECUTAR ACCIONES REALES EN EL DASHBOARD** — cuando el usuario te pida cargar un producto, cliente, gasto, empleado, etc., USÁ LA TOOL CORRESPONDIENTE directamente en vez de explicar cómo hacerlo a mano. Tools disponibles: crear_producto, actualizar_stock, buscar_producto, crear_cliente, registrar_gasto, crear_empleado, crear_sucursal, crear_tarea, consultar_ventas, consultar_stock_bajo, consultar_pedidos_pendientes.
7. Si faltan datos para llamar una tool (ej: precio de un producto), preguntá UNA sola cosa y después ejecutá. No abuses de preguntas.
8. Pensá primero como un dueño experimentado del rubro. Después como un consultor.
9. Si detectás algo raro en la data (ej: caída de ventas, gasto anómalo, margen negativo), señalalo proactivamente.
10. Respuestas cortas y útiles. Bullet points cuando corresponda.

─── EJEMPLOS DE BUENAS RESPUESTAS ───

Usuario: "¿cómo voy?"
Vos: "Hoy llevás $${totalHoy.toLocaleString('es-AR')} en ${ventasHoy.length} operaciones. El mes va bien/mal/regular por... ${stockBajo.length > 0 ? `⚠️ Ojo con ${stockBajo.length} productos con stock bajo.` : ''}"

Usuario: "cargá aros argolla a 5000 pesos con stock 10"
Vos: [llamás la tool crear_producto con nombre="Aros argolla", precioVenta=5000, stock=10] → "Listo, agregué Aros argolla a $5000 con stock 10. ¿Algo más?"

Usuario: "cuánto vendí ayer"
Vos: [llamás consultar_ventas con periodo="ayer"] → [usás el resultado para responder naturalmente]

Usuario: "registrá un gasto de alquiler 180000"
Vos: [llamás registrar_gasto con concepto="Alquiler", monto=180000, categoria="Alquiler"] → "Registré el gasto de alquiler por $180.000."

Sé breve y útil. Nunca inventes números que no tengas. Si faltan datos, decile "esa info no la veo todavía, cargá X para que te lo pueda decir".`;
}

// ═══════════════════════════════════════════════════════════════════
// CELA BOT COMPONENT (floating chat)
// ═══════════════════════════════════════════════════════════════════
export default function CelaBot() {
    const { state, actions } = useData();
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [listening, setListening] = useState(false);
    const [speaking, setSpeaking] = useState(false);
    const [autoSpeak, setAutoSpeak] = useState(() => {
        return localStorage.getItem('cela_auto_speak') === 'true';
    });
    const [voiceError, setVoiceError] = useState('');
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const recognizerRef = useRef(null);

    const hasKey = !!(state.integraciones.anthropicKey || state.integraciones.openaiKey);
    const labels = getRubroLabels(state.business.rubro);
    const t = useT();
    const sttOk = sttIsSupported();
    const ttsOk = ttsIsSupported();
    const elevenLabsKey = state.integraciones.elevenLabsKey || null;

    // Toggle auto-speak preference
    const toggleAutoSpeak = () => {
        const next = !autoSpeak;
        setAutoSpeak(next);
        localStorage.setItem('cela_auto_speak', next ? 'true' : 'false');
        if (!next && speaking) {
            stopSpeaking();
            setSpeaking(false);
        }
    };

    // Start voice recognition
    const startListening = () => {
        if (!sttOk) {
            setVoiceError(t('voice.unsupported_stt'));
            setTimeout(() => setVoiceError(''), 4000);
            return;
        }
        if (listening) {
            recognizerRef.current?.stop();
            return;
        }
        // Stop any ongoing TTS before listening
        if (isSpeaking()) {
            stopSpeaking();
            setSpeaking(false);
        }

        setVoiceError('');
        try {
            const rec = createRecognizer({
                lang: getLang(),
                continuous: false,
                onResult: (text, isFinal) => {
                    setInput(text);
                    if (isFinal) {
                        // Auto-send when final transcript received
                        setTimeout(() => {
                            sendMessage(text);
                        }, 200);
                    }
                },
                onError: (err) => {
                    setVoiceError(err.message);
                    setListening(false);
                    setTimeout(() => setVoiceError(''), 5000);
                },
                onEnd: () => {
                    setListening(false);
                }
            });
            recognizerRef.current = rec;
            rec.start();
            setListening(true);
        } catch (err) {
            setVoiceError(err.message);
            setTimeout(() => setVoiceError(''), 5000);
        }
    };

    // Speak a given text in current language
    const speakText = async (text) => {
        if (!ttsOk || !text) return;
        try {
            setSpeaking(true);
            await speak(text, {
                lang: getLang(),
                elevenLabsKey,
                onEnd: () => setSpeaking(false)
            });
        } catch (err) {
            console.warn('TTS failed:', err);
            setSpeaking(false);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            recognizerRef.current?.abort();
            stopSpeaking();
        };
    }, []);

    // Welcome message on first open
    useEffect(() => {
        if (open && messages.length === 0) {
            const rubroGreeting = t(`bot.greetings_by_rubro.${state.business.rubro}`) || t('bot.greetings_by_rubro.general');
            const greeting = t('bot.greeting', {
                business: state.business.name || 'Dashboard',
                prompt: rubroGreeting
            });
            setMessages([{ role: 'assistant', content: greeting }]);
            // Auto-speak welcome if auto-speak enabled
            if (autoSpeak && ttsOk) {
                setTimeout(() => speakText(greeting), 300);
            }
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
                const reply = generateLocalReply(text, state);
                setMessages([...newMessages, { role: 'assistant', content: reply }]);
                setLoading(false);
                if (autoSpeak && ttsOk) speakText(reply);
                return;
            }

            const systemPrompt = buildSystemPrompt(state);

            // ═══════════ Claude con tool use (loop hasta stop_reason='end_turn') ═══════════
            if (state.integraciones.anthropicKey) {
                // Build message history — convertimos strings viejos a formato nuevo
                let conversationMessages = newMessages.map(m => ({
                    role: m.role,
                    content: typeof m.content === 'string' ? m.content : m.content
                }));

                let iteration = 0;
                const maxIterations = 5; // Max tool loops por mensaje
                let finalText = '';
                const executedTools = [];

                while (iteration < maxIterations) {
                    iteration++;

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
                            max_tokens: 1024,
                            system: systemPrompt,
                            tools: BOT_TOOLS,
                            messages: conversationMessages
                        })
                    });
                    const data = await res.json();
                    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

                    // Extraer texto + tool_use blocks
                    const textBlocks = (data.content || []).filter(b => b.type === 'text');
                    const toolUseBlocks = (data.content || []).filter(b => b.type === 'tool_use');

                    // Acumular texto parcial
                    const partialText = textBlocks.map(b => b.text).join('\n').trim();
                    if (partialText) finalText = (finalText ? finalText + '\n' : '') + partialText;

                    // Si no hay tools para ejecutar o stop_reason=end_turn, salimos
                    if (data.stop_reason === 'end_turn' || toolUseBlocks.length === 0) {
                        break;
                    }

                    // Si hay tools → ejecutarlas y agregar results
                    // Agregamos el mensaje del assistant (con tools) al historial
                    conversationMessages.push({
                        role: 'assistant',
                        content: data.content
                    });

                    // Ejecutamos cada tool y armamos tool_result
                    const toolResults = [];
                    for (const tu of toolUseBlocks) {
                        const result = await executeTool(tu.name, tu.input, state, actions);
                        executedTools.push({ name: tu.name, input: tu.input, result });
                        toolResults.push({
                            type: 'tool_result',
                            tool_use_id: tu.id,
                            content: result
                        });
                    }

                    // Agregamos el user con los tool_results
                    conversationMessages.push({
                        role: 'user',
                        content: toolResults
                    });
                }

                // Si no hubo texto pero sí tools ejecutadas, armamos un mensaje resumen
                if (!finalText && executedTools.length > 0) {
                    finalText = executedTools.map(t => t.result).join('\n\n');
                }
                if (!finalText) finalText = 'No recibí respuesta del modelo.';

                setMessages([...newMessages, { role: 'assistant', content: finalText }]);
                if (autoSpeak && ttsOk) speakText(finalText);

            } else if (state.integraciones.openaiKey) {
                // OpenAI — sin tool use por ahora (simple text)
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
                const reply = data.choices?.[0]?.message?.content || 'No recibí respuesta del modelo.';
                setMessages([...newMessages, { role: 'assistant', content: reply }]);
                if (autoSpeak && ttsOk) speakText(reply);
            }
        } catch (err) {
            const errMsg = t('bot.error_connect', { error: err.message });
            setMessages([...newMessages, { role: 'assistant', content: errMsg }]);
        } finally {
            setLoading(false);
        }
    };

    const quickActions = t(`bot.quick_actions.${state.business.rubro}`);
    const quickActionsList = Array.isArray(quickActions) ? quickActions : t('bot.quick_actions.general');

    return (
        <>
            {!open && (
                <button className="bot-fab" onClick={() => setOpen(true)} title={t('bot.title')}>
                    <Sparkles size={24} />
                </button>
            )}

            {open && (
                <div className="bot-panel">
                    <div className="bot-header">
                        <div className="bot-avatar">C</div>
                        <div style={{ flex: 1 }}>
                            <div className="bot-title">{t('bot.title')}</div>
                            <div className="bot-subtitle">
                                {hasKey ? t('bot.connected') : t('bot.basic_mode')}
                            </div>
                        </div>
                        {ttsOk && (
                            <button
                                className="btn btn-ghost btn-icon btn-sm"
                                onClick={() => {
                                    if (speaking) {
                                        stopSpeaking();
                                        setSpeaking(false);
                                    } else {
                                        toggleAutoSpeak();
                                    }
                                }}
                                title={speaking ? t('voice.stop_speaking') : autoSpeak ? t('voice.mute') : t('voice.speak_response')}
                                style={{
                                    color: speaking ? 'var(--accent)' : autoSpeak ? 'var(--accent)' : 'var(--text-muted)',
                                    animation: speaking ? 'pulse-voice 1s infinite' : 'none'
                                }}
                            >
                                {autoSpeak || speaking ? <Volume2 size={16} /> : <VolumeX size={16} />}
                            </button>
                        )}
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setOpen(false)}>
                            <XIcon size={16} />
                        </button>
                    </div>

                    <div className="bot-messages">
                        {messages.map((m, i) => (
                            <div key={i} className={`bot-msg ${m.role}`}>
                                {m.content}
                                {m.role === 'assistant' && ttsOk && (
                                    <button
                                        className="bot-msg-speak"
                                        onClick={() => speaking ? (stopSpeaking(), setSpeaking(false)) : speakText(m.content)}
                                        title={speaking ? t('voice.stop_speaking') : t('voice.speak_response')}
                                    >
                                        {speaking ? <VolumeX size={11} /> : <Volume2 size={11} />}
                                    </button>
                                )}
                            </div>
                        ))}

                        {loading && (
                            <div className="bot-thinking">
                                <span></span><span></span><span></span>
                            </div>
                        )}

                        {listening && (
                            <div className="bot-listening">
                                <Mic size={14} /> <span>{t('voice.listening')}</span>
                                <div className="listening-dots"><span></span><span></span><span></span></div>
                            </div>
                        )}

                        {voiceError && (
                            <div className="bot-voice-error">
                                ⚠️ {voiceError}
                            </div>
                        )}

                        {messages.length === 1 && !loading && !listening && Array.isArray(quickActionsList) && (
                            <div className="flex gap-2 mt-2" style={{ flexWrap: 'wrap' }}>
                                {quickActionsList.map(q => (
                                    <button key={q} className="bot-quick-action" onClick={() => sendMessage(q)}>
                                        {q}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    <form className="bot-input-area" onSubmit={(e) => { e.preventDefault(); sendMessage(); }}>
                        {sttOk && (
                            <button
                                type="button"
                                className={`bot-mic ${listening ? 'active' : ''}`}
                                onClick={startListening}
                                title={listening ? t('voice.stop_listening') : t('voice.listen')}
                            >
                                {listening ? <MicOff size={16} /> : <Mic size={16} />}
                            </button>
                        )}
                        <input
                            ref={inputRef}
                            className="bot-input"
                            placeholder={listening ? t('voice.listening') : t('bot.placeholder')}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            disabled={loading || listening}
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
