import React, { useState } from 'react';
import { ArrowRight, Store, Sparkles, RefreshCw, Globe } from 'lucide-react';
import { useData } from '../store/DataContext';
import { useT, getLang, setLang, availableLangs } from '../i18n';

const RUBRO_IDS = ['kiosco', 'restaurante', 'accesorios', 'servicios', 'general', 'otro'];
const RUBRO_EMOJIS = {
    kiosco: '🏪', restaurante: '🍽️', accesorios: '👗',
    servicios: '💼', general: '🛍️', otro: '📋'
};

export default function OnboardingModal() {
    const { state, actions } = useData();
    const t = useT();
    const currentLang = getLang();

    // Build RUBROS from i18n
    const RUBROS = RUBRO_IDS.map(id => ({
        id,
        emoji: RUBRO_EMOJIS[id],
        nombre: t(`onboarding.rubros.${id}.name`),
        desc: t(`onboarding.rubros.${id}.desc`)
    }));

    // Detect reconfiguration mode: user already has data from a previous setup
    const isReconfiguring = !!(state.business.name || state.sucursales.length > 0);

    const [step, setStep] = useState(1);
    const [business, setBusiness] = useState({
        name: state.business.name || '',
        rubro: state.business.rubro || '',
        moneda: state.business.moneda || 'ARS',
        pais: state.business.pais || 'Argentina'
    });
    const [sucursal, setSucursal] = useState({
        nombre: 'Sucursal principal',
        direccion: '',
        ciudad: '',
        tipo: 'local',
        activa: true
    });

    const canStep1 = business.name.trim() && business.rubro;
    const skipStep2 = isReconfiguring && state.sucursales.length > 0;

    const finish = () => {
        actions.updateBusiness({
            ...business,
            createdAt: state.business.createdAt || new Date().toISOString()
        });
        if (!skipStep2 && sucursal.nombre.trim()) {
            actions.add('sucursales', sucursal);
        }
        actions.markOnboarded();
    };

    const finishReconfigureOnly = () => {
        actions.updateBusiness({
            ...business,
            createdAt: state.business.createdAt || new Date().toISOString()
        });
        actions.markOnboarded();
    };

    return (
        <div className="modal-backdrop" style={{ zIndex: 1000 }}>
            <div className="modal" style={{ maxWidth: 720 }}>
                <div className="flex items-center gap-2 mb-4">
                    <div style={{
                        width: 44, height: 44, borderRadius: 11,
                        background: 'linear-gradient(135deg, #63f1cb, #60a5fa)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#0a0a0f',
                        boxShadow: '0 4px 14px rgba(99, 241, 203, 0.3)'
                    }}>
                        {isReconfiguring ? <RefreshCw size={20} /> : <Sparkles size={20} />}
                    </div>
                    <div style={{ flex: 1 }}>
                        <h2 className="modal-title" style={{ margin: 0 }}>
                            {isReconfiguring ? t('onboarding.reconfigure_title') : t('onboarding.welcome')}
                        </h2>
                        <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                            {isReconfiguring
                                ? t('onboarding.reconfigure_desc')
                                : t('onboarding.quick_setup', { steps: skipStep2 ? t('onboarding.step_1') : '2 steps' }) +
                                ' · ' + t('onboarding.step_of', { current: step, total: skipStep2 ? 1 : 2 })}
                        </div>
                    </div>

                    {/* Language selector — always visible at top of onboarding */}
                    {!isReconfiguring && (
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center', background: 'var(--bg-elevated)', borderRadius: 10, padding: 4, border: '1px solid var(--border-color)' }}>
                            <Globe size={14} style={{ color: 'var(--text-muted)', marginLeft: 6 }} />
                            {availableLangs().map(lang => (
                                <button
                                    key={lang.code}
                                    onClick={() => setLang(lang.code)}
                                    title={lang.native}
                                    style={{
                                        padding: '4px 8px',
                                        borderRadius: 6,
                                        border: 'none',
                                        background: currentLang === lang.code ? 'var(--accent-soft)' : 'transparent',
                                        color: currentLang === lang.code ? 'var(--accent)' : 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        fontSize: 16,
                                        fontWeight: currentLang === lang.code ? 700 : 400
                                    }}
                                >
                                    {lang.flag}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {isReconfiguring && (
                    <div style={{
                        padding: 12,
                        background: 'rgba(99, 241, 203, 0.08)',
                        border: '1px solid var(--border-accent)',
                        borderRadius: 10,
                        marginBottom: 16,
                        fontSize: 13,
                        lineHeight: 1.5
                    }}>
                        {t('onboarding.reconfigure_notice')}
                    </div>
                )}

                {step === 1 && (
                    <div>
                        <div className="mb-4">
                            <label className="field-label">{t('onboarding.business_name_q')} *</label>
                            <input
                                className="input"
                                autoFocus
                                placeholder={t('onboarding.business_name_placeholder')}
                                value={business.name}
                                onChange={e => setBusiness({ ...business, name: e.target.value })}
                            />
                        </div>

                        <div className="mb-3">
                            <label className="field-label mb-2">{t('onboarding.business_type_q')} *</label>
                            <div className="text-xs text-muted mb-3">{t('onboarding.business_type_hint')}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                                {RUBROS.map(r => (
                                    <button
                                        key={r.id}
                                        onClick={() => setBusiness({ ...business, rubro: r.id })}
                                        style={{
                                            padding: 14,
                                            background: business.rubro === r.id ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                                            border: `2px solid ${business.rubro === r.id ? 'var(--accent)' : 'var(--border-color)'}`,
                                            borderRadius: 12,
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            color: 'inherit',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        <div style={{ fontSize: 26, marginBottom: 6 }}>{r.emoji}</div>
                                        <div className="font-semibold text-sm">{r.nombre}</div>
                                        <div className="text-xs text-muted mt-1" style={{ lineHeight: 1.4 }}>{r.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-grid mt-4">
                            <div>
                                <label className="field-label">{t('onboarding.currency')}</label>
                                <select className="select" value={business.moneda} onChange={e => setBusiness({ ...business, moneda: e.target.value })}>
                                    <option value="ARS">ARS (Peso argentino)</option>
                                    <option value="USD">USD (Dólar)</option>
                                    <option value="UYU">UYU (Peso uruguayo)</option>
                                    <option value="CLP">CLP (Peso chileno)</option>
                                    <option value="MXN">MXN (Peso mexicano)</option>
                                    <option value="KRW">KRW (원)</option>
                                </select>
                            </div>
                            <div>
                                <label className="field-label">{t('onboarding.country')}</label>
                                <input className="input" value={business.pais} onChange={e => setBusiness({ ...business, pais: e.target.value })} />
                            </div>
                        </div>

                        <div className="flex justify-end mt-4">
                            {skipStep2 ? (
                                <button className="btn btn-primary btn-lg" disabled={!canStep1} onClick={finishReconfigureOnly}>
                                    {t('onboarding.save_changes')} <ArrowRight size={14} />
                                </button>
                            ) : (
                                <button className="btn btn-primary btn-lg" disabled={!canStep1} onClick={() => setStep(2)}>
                                    {t('common.continue')} <ArrowRight size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {step === 2 && !skipStep2 && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Store size={18} style={{ color: 'var(--accent)' }} />
                            <div className="font-semibold">{t('onboarding.first_branch_title')}</div>
                        </div>
                        <div className="text-sm text-muted mb-3">
                            {t('onboarding.first_branch_desc')}
                        </div>

                        <div className="form-grid">
                            <div>
                                <label className="field-label">{t('onboarding.branch_name')}</label>
                                <input className="input" value={sucursal.nombre} onChange={e => setSucursal({ ...sucursal, nombre: e.target.value })} />
                            </div>
                            <div>
                                <label className="field-label">{t('onboarding.branch_type')}</label>
                                <select className="select" value={sucursal.tipo} onChange={e => setSucursal({ ...sucursal, tipo: e.target.value })}>
                                    <option value="local">Local / PDV</option>
                                    <option value="deposito">Depósito</option>
                                    <option value="oficina">Oficina</option>
                                    <option value="online">Tienda online</option>
                                </select>
                            </div>
                            <div>
                                <label className="field-label">{t('onboarding.branch_address')}</label>
                                <input className="input" value={sucursal.direccion} onChange={e => setSucursal({ ...sucursal, direccion: e.target.value })} />
                            </div>
                            <div>
                                <label className="field-label">{t('onboarding.branch_city')}</label>
                                <input className="input" value={sucursal.ciudad} onChange={e => setSucursal({ ...sucursal, ciudad: e.target.value })} />
                            </div>
                        </div>

                        <div className="flex justify-between mt-4">
                            <button className="btn btn-ghost" onClick={() => setStep(1)}>← {t('common.back')}</button>
                            <button className="btn btn-primary btn-lg" onClick={finish}>
                                {t('onboarding.start_using')} <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
