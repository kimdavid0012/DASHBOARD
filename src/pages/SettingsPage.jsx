import React, { useState } from 'react';
import { Settings as SettingsIcon, Download, Upload, Trash2, AlertTriangle, Check, Globe, Mic, Printer, Bluetooth, Usb } from 'lucide-react';
import { useData, SECTION_HELP } from '../store/DataContext';
import { PageHeader, Card, Field, InfoBox } from '../components/UI';
import { useT, getLang, setLang, availableLangs } from '../i18n';
import { ttsIsSupported, sttIsSupported } from '../utils/voice';
import { TicketPrinter, getPrintingCapabilities } from '../utils/printer';

const RUBROS = [
    { id: 'general', nombre: 'General', desc: 'Cualquier negocio' },
    { id: 'kiosco', nombre: 'Kiosco / Autoservicio', desc: 'Con código de barras, rotación alta' },
    { id: 'restaurante', nombre: 'Restaurante / Bar', desc: 'Incluye Mesas y Reservas' },
    { id: 'accesorios', nombre: 'Accesorios / Ropa', desc: 'Con talles y colores' },
    { id: 'servicios', nombre: 'Servicios', desc: 'Incluye Reservas y turnos' },
    { id: 'otro', nombre: 'Otro', desc: 'Configuración mínima' }
];

export default function SettingsPage() {
    const { state, actions } = useData();
    const [savedMsg, setSavedMsg] = useState('');
    const t = useT();
    const currentLang = getLang();

    const showSaved = () => { setSavedMsg(t('settings.saved')); setTimeout(() => setSavedMsg(''), 1500); };

    const onLangChange = (lang) => {
        setLang(lang);
        showSaved();
    };

    const onRubroChange = (rubro) => {
        actions.updateBusiness({ rubro });
        showSaved();
    };

    const exportData = () => {
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dashboard-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const importData = (file) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (!confirm('¿Importar este backup? Reemplaza todos los datos actuales.')) return;
                localStorage.setItem('dashboard_state_v1', JSON.stringify(data));
                window.location.reload();
            } catch {
                alert('Archivo inválido');
            }
        };
        reader.readAsText(file);
    };

    const resetAll = () => {
        if (!confirm('¿Borrar TODO? Esto elimina todos tus datos. Se recomienda exportar primero.')) return;
        if (!confirm('¿Seguro? Esta acción NO se puede deshacer.')) return;
        actions.reset();
        setTimeout(() => window.location.reload(), 200);
    };

    return (
        <div>
            <PageHeader
                icon={SettingsIcon}
                title={t('settings.title')}
                subtitle={t('settings.subtitle')}
                help={SECTION_HELP.settings}
                actions={savedMsg ? <span style={{ color: 'var(--success)', fontSize: 13 }}><Check size={14} /> {savedMsg}</span> : null}
            />

            <div style={{ display: 'grid', gap: 16 }}>
                {/* ═══════════ IDIOMA / LANGUAGE / 언어 ═══════════ */}
                <Card>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <Globe size={20} style={{ color: 'var(--accent)' }} />
                        <div>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500 }}>
                                {t('settings.language_section')}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                {t('settings.language_hint')}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginTop: 12 }}>
                        {availableLangs().map(lang => (
                            <button
                                key={lang.code}
                                onClick={() => onLangChange(lang.code)}
                                style={{
                                    padding: '14px 12px',
                                    borderRadius: 12,
                                    border: currentLang === lang.code ? '2px solid var(--accent)' : '1px solid var(--border-color)',
                                    background: currentLang === lang.code ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                                    color: currentLang === lang.code ? 'var(--accent)' : 'var(--text-primary)',
                                    cursor: 'pointer',
                                    fontFamily: 'var(--font-display)',
                                    fontSize: 14,
                                    fontWeight: currentLang === lang.code ? 700 : 500,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                    transition: 'all 0.2s'
                                }}
                            >
                                <span style={{ fontSize: 22 }}>{lang.flag}</span>
                                <span>{lang.native}</span>
                                {currentLang === lang.code && <Check size={16} />}
                            </button>
                        ))}
                    </div>
                </Card>

                {/* ═══════════ VOZ · Voice · 음성 ═══════════ */}
                <Card>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <Mic size={20} style={{ color: 'var(--accent)' }} />
                        <div>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500 }}>
                                🎙️ {t('voice.voice_mode')}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                {currentLang === 'ko'
                                    ? 'CELA 챗봇의 음성 기능. Web Speech API는 무료이며 브라우저에 내장되어 있습니다.'
                                    : currentLang === 'en'
                                        ? 'Voice capability for CELA chatbot. Web Speech API is free and built into browsers.'
                                        : 'Capacidad de voz para el chatbot CELA. Web Speech API es gratis y viene en el browser.'}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gap: 8, marginBottom: 14, fontSize: 13 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {sttIsSupported()
                                ? <span style={{ color: 'var(--success)' }}>✓</span>
                                : <span style={{ color: 'var(--danger)' }}>✗</span>}
                            <span>{currentLang === 'ko' ? '음성 인식 (STT)' : currentLang === 'en' ? 'Voice recognition (STT)' : 'Reconocimiento de voz (STT)'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {ttsIsSupported()
                                ? <span style={{ color: 'var(--success)' }}>✓</span>
                                : <span style={{ color: 'var(--danger)' }}>✗</span>}
                            <span>{currentLang === 'ko' ? '음성 합성 (TTS)' : currentLang === 'en' ? 'Voice synthesis (TTS)' : 'Síntesis de voz (TTS)'}</span>
                        </div>
                    </div>
                    <Field label={t('voice.elevenlabs_key')}>
                        <input
                            className="input"
                            type="password"
                            placeholder="sk_..."
                            value={state.integraciones.elevenLabsKey || ''}
                            onChange={e => { actions.updateIntegraciones({ elevenLabsKey: e.target.value }); showSaved(); }}
                        />
                    </Field>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                        {t('voice.elevenlabs_hint')}
                    </div>
                </Card>

                {/* ═══════════ IMPRESORA DE TICKETS 🖨️ ═══════════ */}
                <PrinterCard t={t} currentLang={currentLang} />

                {/* DATOS DEL NEGOCIO */}
                <Card title={t('settings.business_data')} subtitle={currentLang === 'ko' ? '기본 정보 및 업종' : currentLang === 'en' ? 'Basic info and industry' : 'Información básica y rubro'}>
                    <div className="form-grid">
                        <Field label="Nombre del negocio">
                            <input className="input" value={state.business.name || ''} onChange={e => { actions.updateBusiness({ name: e.target.value }); showSaved(); }} />
                        </Field>
                        <Field label="País">
                            <input className="input" value={state.business.pais || ''} onChange={e => { actions.updateBusiness({ pais: e.target.value }); showSaved(); }} />
                        </Field>
                        <Field label="Moneda">
                            <select className="select" value={state.business.moneda || 'ARS'} onChange={e => { actions.updateBusiness({ moneda: e.target.value }); showSaved(); }}>
                                <option value="ARS">ARS (Peso argentino)</option>
                                <option value="USD">USD (Dólar)</option>
                                <option value="UYU">UYU (Peso uruguayo)</option>
                                <option value="CLP">CLP (Peso chileno)</option>
                                <option value="MXN">MXN (Peso mexicano)</option>
                                <option value="EUR">EUR (Euro)</option>
                            </select>
                        </Field>
                    </div>
                </Card>

                {/* RUBRO */}
                <Card title="Rubro del negocio" subtitle="Esto adapta labels, secciones y ejemplos en toda la app">
                    <InfoBox>
                        Cambiar el rubro afecta los nombres de las secciones (ej: "Plato" vs "Producto"), oculta/muestra secciones específicas (Mesas solo en restaurantes) y adapta los ejemplos.
                    </InfoBox>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 16 }}>
                        {RUBROS.map(r => (
                            <button
                                key={r.id}
                                onClick={() => onRubroChange(r.id)}
                                style={{
                                    padding: 16,
                                    background: state.business.rubro === r.id ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                                    border: `2px solid ${state.business.rubro === r.id ? 'var(--accent)' : 'var(--border-color)'}`,
                                    borderRadius: 12,
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    color: 'inherit'
                                }}
                            >
                                <div className="font-semibold" style={{ color: state.business.rubro === r.id ? 'var(--accent)' : 'var(--text-primary)' }}>
                                    {state.business.rubro === r.id && '✓ '}{r.nombre}
                                </div>
                                <div className="text-xs text-muted mt-1">{r.desc}</div>
                            </button>
                        ))}
                    </div>
                </Card>

                {/* INTEGRACIONES */}
                <Card title="Integraciones" subtitle="Conectá APIs externas. Todo queda guardado en este navegador.">
                    <div className="form-grid">
                        <Field label="OpenAI API Key" hint="sk-proj-...">
                            <input className="input" type="password" value={state.integraciones.openaiKey || ''} onChange={e => { actions.updateIntegraciones({ openaiKey: e.target.value }); showSaved(); }} />
                        </Field>
                        <Field label="Anthropic API Key" hint="sk-ant-...">
                            <input className="input" type="password" value={state.integraciones.anthropicKey || ''} onChange={e => { actions.updateIntegraciones({ anthropicKey: e.target.value }); showSaved(); }} />
                        </Field>
                        <Field label="Meta Access Token" hint="Para Instagram y Meta Ads">
                            <input className="input" type="password" value={state.integraciones.metaAccessToken || ''} onChange={e => { actions.updateIntegraciones({ metaAccessToken: e.target.value }); showSaved(); }} />
                        </Field>
                        <Field label="Meta Pixel ID">
                            <input className="input" value={state.integraciones.metaPixelId || ''} onChange={e => { actions.updateIntegraciones({ metaPixelId: e.target.value }); showSaved(); }} />
                        </Field>
                        <Field label="Instagram Business ID">
                            <input className="input" value={state.integraciones.instagramBusinessId || ''} onChange={e => { actions.updateIntegraciones({ instagramBusinessId: e.target.value }); showSaved(); }} />
                        </Field>
                        <Field label="Google Analytics ID" hint="G-XXXXXXXXXX">
                            <input className="input" value={state.integraciones.googleAnalyticsId || ''} onChange={e => { actions.updateIntegraciones({ googleAnalyticsId: e.target.value }); showSaved(); }} />
                        </Field>
                        <Field label="WooCommerce Store URL">
                            <input className="input" placeholder="https://tu-tienda.com" value={state.integraciones.wooStoreUrl || ''} onChange={e => { actions.updateIntegraciones({ wooStoreUrl: e.target.value }); showSaved(); }} />
                        </Field>
                        <Field label="Woo Consumer Key">
                            <input className="input" type="password" value={state.integraciones.wooConsumerKey || ''} onChange={e => { actions.updateIntegraciones({ wooConsumerKey: e.target.value }); showSaved(); }} />
                        </Field>
                        <Field label="Woo Consumer Secret">
                            <input className="input" type="password" value={state.integraciones.wooConsumerSecret || ''} onChange={e => { actions.updateIntegraciones({ wooConsumerSecret: e.target.value }); showSaved(); }} />
                        </Field>
                        <Field label="Mercado Pago Access Token">
                            <input className="input" type="password" value={state.integraciones.mercadoPagoToken || ''} onChange={e => { actions.updateIntegraciones({ mercadoPagoToken: e.target.value }); showSaved(); }} />
                        </Field>
                    </div>
                </Card>

                {/* BACKUP */}
                <Card title="Backup y datos" subtitle="Exportá / importá tu data">
                    <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                        <button className="btn btn-primary" onClick={exportData}>
                            <Download size={14} /> Exportar backup (JSON)
                        </button>
                        <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
                            <Upload size={14} /> Importar backup
                            <input type="file" accept=".json" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && importData(e.target.files[0])} />
                        </label>
                        <button className="btn btn-danger" onClick={resetAll}>
                            <Trash2 size={14} /> Borrar todo
                        </button>
                    </div>
                    <InfoBox variant="warning" >
                        <div style={{ marginTop: 12 }}>
                            <AlertTriangle size={14} style={{ display: 'inline', marginRight: 4 }} />
                            Los datos están guardados en este navegador (localStorage). Si limpiás caché del navegador, se pierden. Exportá backups regularmente.
                        </div>
                    </InfoBox>
                </Card>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// PRINTER CONFIG CARD — test BT/Serial connect + print test
// ═══════════════════════════════════════════════════════════════════
function PrinterCard({ t, currentLang }) {
    const [status, setStatus] = useState('idle'); // idle | connecting | connected | error
    const [printerInfo, setPrinterInfo] = useState(null);
    const [error, setError] = useState('');
    const [testing, setTesting] = useState(false);
    const caps = getPrintingCapabilities();

    const label = (es, en, ko) => currentLang === 'ko' ? ko : currentLang === 'en' ? en : es;

    const connect = async (type) => {
        setError('');
        setStatus('connecting');
        try {
            const printer = await TicketPrinter.connect(type);
            setPrinterInfo({
                type: printer.type,
                name: printer.device?.name || (printer.type === 'html' ? 'PDF/Sistema' : 'USB Serial')
            });
            setStatus('connected');
        } catch (err) {
            setError(err.message);
            setStatus('error');
            setTimeout(() => setStatus('idle'), 5000);
        }
    };

    const test = async () => {
        setTesting(true);
        setError('');
        try {
            const printer = TicketPrinter.getPrinter();
            if (!printer) {
                setError(label(
                    'Primero conectá una impresora',
                    'Connect a printer first',
                    '먼저 프린터를 연결하세요'
                ));
                return;
            }
            await printer.testPrint();
        } catch (err) {
            setError(err.message);
        } finally {
            setTesting(false);
        }
    };

    const disconnect = async () => {
        await TicketPrinter.disconnect();
        setPrinterInfo(null);
        setStatus('idle');
    };

    return (
        <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <Printer size={20} style={{ color: 'var(--accent)' }} />
                <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500 }}>
                        🖨️ {label('Impresora de tickets', 'Receipt printer', '영수증 프린터')}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {label(
                            'Impresoras 58mm/80mm por Bluetooth o USB (ESC/POS). Fallback PDF para Safari/Firefox.',
                            '58mm/80mm printers via Bluetooth or USB (ESC/POS). PDF fallback for Safari/Firefox.',
                            '58mm/80mm 프린터 (블루투스 또는 USB, ESC/POS). Safari/Firefox 는 PDF 대체.'
                        )}
                    </div>
                </div>
            </div>

            {/* Status */}
            {printerInfo ? (
                <div style={{
                    padding: 12,
                    background: 'var(--accent-soft)',
                    border: '1px solid var(--border-accent)',
                    borderRadius: 10,
                    marginBottom: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10
                }}>
                    <Check size={18} style={{ color: 'var(--accent)' }} />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{label('Conectado', 'Connected', '연결됨')}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {printerInfo.name} · {printerInfo.type.toUpperCase()}
                        </div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={disconnect}>
                        {label('Desconectar', 'Disconnect', '연결 해제')}
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 12 }}>
                    <button
                        className="btn btn-primary"
                        disabled={!caps.bluetooth || status === 'connecting'}
                        onClick={() => connect('bluetooth')}
                        title={!caps.bluetooth ? label(
                            'Bluetooth no disponible en este browser',
                            'Bluetooth not available in this browser',
                            '이 브라우저에서 블루투스를 사용할 수 없습니다'
                        ) : ''}
                    >
                        <Bluetooth size={16} /> {label('Conectar BT', 'Connect BT', 'BT 연결')}
                    </button>
                    <button
                        className="btn btn-primary"
                        disabled={!caps.serial || status === 'connecting'}
                        onClick={() => connect('serial')}
                        title={!caps.serial ? label(
                            'Web Serial no disponible',
                            'Web Serial not available',
                            'Web Serial 사용 불가'
                        ) : ''}
                    >
                        <Usb size={16} /> {label('Conectar USB', 'Connect USB', 'USB 연결')}
                    </button>
                    <button
                        className="btn btn-ghost"
                        onClick={() => connect('html')}
                        title={label('Usa PDF y la impresora del sistema', 'Uses PDF and system printer', 'PDF 및 시스템 프린터 사용')}
                    >
                        <Printer size={16} /> {label('Modo PDF', 'PDF mode', 'PDF 모드')}
                    </button>
                </div>
            )}

            {status === 'connecting' && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
                    {label('Buscando impresoras…', 'Searching printers…', '프린터 검색 중…')}
                </div>
            )}

            {error && (
                <InfoBox variant="warning" style={{ marginBottom: 12 }}>
                    <strong>Error:</strong> {error}
                </InfoBox>
            )}

            {/* Test button */}
            {printerInfo && (
                <button className="btn btn-ghost" onClick={test} disabled={testing}>
                    {testing ? label('Imprimiendo…', 'Printing…', '인쇄 중…') : label('🧪 Imprimir test', '🧪 Print test', '🧪 테스트 인쇄')}
                </button>
            )}

            {/* Compatibility info */}
            <div style={{ marginTop: 12, padding: 10, background: 'var(--bg-elevated)', borderRadius: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                <div>
                    {caps.bluetooth ? '✓' : '✗'} Web Bluetooth (Chrome/Edge)
                </div>
                <div>
                    {caps.serial ? '✓' : '✗'} Web Serial (Chrome/Edge desktop)
                </div>
                <div>✓ PDF fallback ({label('siempre disponible', 'always available', '항상 사용 가능')})</div>
                {!caps.bluetooth && !caps.serial && (
                    <div style={{ marginTop: 4, color: 'var(--warning, #fbbf24)' }}>
                        {label(
                            '💡 Para impresión directa usá Chrome o Edge. En Safari/Firefox usamos el modo PDF.',
                            '💡 For direct printing use Chrome or Edge. On Safari/Firefox we use PDF mode.',
                            '💡 직접 인쇄는 Chrome 또는 Edge 를 사용하세요. Safari/Firefox 에서는 PDF 모드를 사용합니다.'
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
}
