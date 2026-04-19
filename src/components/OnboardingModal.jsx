import React, { useState } from 'react';
import { ArrowRight, Store, Sparkles, RefreshCw } from 'lucide-react';
import { useData } from '../store/DataContext';

const RUBROS = [
    { id: 'kiosco', nombre: 'Kiosco / Autoservicio', emoji: '🏪', desc: 'Códigos de barras, rotación alta, caja registradora' },
    { id: 'restaurante', nombre: 'Restaurante / Bar', emoji: '🍽️', desc: 'Mesas, reservas, comandas, menú' },
    { id: 'accesorios', nombre: 'Ropa / Accesorios', emoji: '👗', desc: 'Talles, colores, variantes' },
    { id: 'servicios', nombre: 'Servicios profesionales', emoji: '💼', desc: 'Turnos, reservas, facturación de servicios' },
    { id: 'general', nombre: 'Comercio general', emoji: '🛍️', desc: 'Cualquier tipo de negocio' },
    { id: 'otro', nombre: 'Otro', emoji: '📋', desc: 'Configuración mínima' }
];

export default function OnboardingModal() {
    const { state, actions } = useData();

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
                            {isReconfiguring ? 'Reconfigurar negocio' : '¡Bienvenido a Dashboard!'}
                        </h2>
                        <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                            {isReconfiguring
                                ? 'Tus datos se mantienen intactos · solo actualizás nombre/rubro'
                                : `Configuremos tu negocio en ${skipStep2 ? '1 paso' : '2 pasos'} rápidos · Paso ${step} de ${skipStep2 ? 1 : 2}`}
                        </div>
                    </div>
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
                        💡 <strong>Modo reconfiguración:</strong> tus ventas, productos, empleados y clientes <strong>no se tocan</strong>.
                        Solo podés cambiar el nombre, rubro y moneda. Si querés crear más sucursales, andá directamente a la sección de Sucursales.
                    </div>
                )}

                {step === 1 && (
                    <div>
                        <div className="mb-4">
                            <label className="field-label">¿Cómo se llama tu negocio? *</label>
                            <input
                                className="input"
                                autoFocus
                                placeholder="Ej: Kiosco Don Juan, Restaurante La Parrilla..."
                                value={business.name}
                                onChange={e => setBusiness({ ...business, name: e.target.value })}
                            />
                        </div>

                        <div className="mb-3">
                            <label className="field-label mb-2">¿Qué tipo de negocio tenés? *</label>
                            <div className="text-xs text-muted mb-3">Esto adapta el sistema: labels, secciones y ejemplos se configuran automáticamente.</div>
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
                                <label className="field-label">Moneda</label>
                                <select className="select" value={business.moneda} onChange={e => setBusiness({ ...business, moneda: e.target.value })}>
                                    <option value="ARS">ARS (Peso argentino)</option>
                                    <option value="USD">USD (Dólar)</option>
                                    <option value="UYU">UYU (Peso uruguayo)</option>
                                    <option value="CLP">CLP (Peso chileno)</option>
                                    <option value="MXN">MXN (Peso mexicano)</option>
                                </select>
                            </div>
                            <div>
                                <label className="field-label">País</label>
                                <input className="input" value={business.pais} onChange={e => setBusiness({ ...business, pais: e.target.value })} />
                            </div>
                        </div>

                        <div className="flex justify-end mt-4">
                            {skipStep2 ? (
                                <button className="btn btn-primary btn-lg" disabled={!canStep1} onClick={finishReconfigureOnly}>
                                    Guardar cambios <ArrowRight size={14} />
                                </button>
                            ) : (
                                <button className="btn btn-primary btn-lg" disabled={!canStep1} onClick={() => setStep(2)}>
                                    Continuar <ArrowRight size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {step === 2 && !skipStep2 && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Store size={18} style={{ color: 'var(--accent)' }} />
                            <div className="font-semibold">Tu primera sucursal</div>
                        </div>
                        <div className="text-sm text-muted mb-3">
                            Todo en Dashboard funciona alrededor de sucursales. Creá la primera (podés editarla después).
                        </div>

                        <div className="form-grid">
                            <div>
                                <label className="field-label">Nombre de la sucursal</label>
                                <input className="input" value={sucursal.nombre} onChange={e => setSucursal({ ...sucursal, nombre: e.target.value })} />
                            </div>
                            <div>
                                <label className="field-label">Tipo</label>
                                <select className="select" value={sucursal.tipo} onChange={e => setSucursal({ ...sucursal, tipo: e.target.value })}>
                                    <option value="local">Local / PDV</option>
                                    <option value="deposito">Depósito</option>
                                    <option value="oficina">Oficina</option>
                                    <option value="online">Tienda online</option>
                                </select>
                            </div>
                            <div>
                                <label className="field-label">Dirección (opcional)</label>
                                <input className="input" value={sucursal.direccion} onChange={e => setSucursal({ ...sucursal, direccion: e.target.value })} />
                            </div>
                            <div>
                                <label className="field-label">Ciudad (opcional)</label>
                                <input className="input" value={sucursal.ciudad} onChange={e => setSucursal({ ...sucursal, ciudad: e.target.value })} />
                            </div>
                        </div>

                        <div className="flex justify-between mt-4">
                            <button className="btn btn-ghost" onClick={() => setStep(1)}>← Volver</button>
                            <button className="btn btn-primary btn-lg" onClick={finish}>
                                Empezar a usar Dashboard <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
