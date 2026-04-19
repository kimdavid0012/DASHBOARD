import React, { useState } from 'react';
import { Sparkles, Store, ArrowRight } from 'lucide-react';
import { useData } from '../store/DataContext';
import { Field } from './UI';

const RUBROS = [
    { value: 'general', label: '🏪 Multi-rubro / General', desc: 'Para todo tipo de negocio' },
    { value: 'kiosco', label: '🍫 Kiosco / Almacén', desc: 'Venta rápida, muchos productos' },
    { value: 'restaurante', label: '🍽️ Restaurante / Bar', desc: 'Menú, mesas, delivery' },
    { value: 'accesorios', label: '👜 Casa de accesorios', desc: 'Ropa, joyas, regalería' },
    { value: 'servicios', label: '💼 Servicios', desc: 'Consultoría, reservas, turnos' },
    { value: 'otro', label: '📦 Otro', desc: 'Configuración libre' }
];

export default function OnboardingModal() {
    const { state, actions } = useData();
    const [step, setStep] = useState(1);
    const [business, setBusiness] = useState({
        name: '',
        rubro: 'general',
        moneda: 'ARS',
        pais: 'Argentina'
    });
    const [sucursal, setSucursal] = useState({
        nombre: '',
        direccion: '',
        ciudad: '',
        provincia: 'Buenos Aires',
        telefono: '',
        tipo: 'local',
        activa: true
    });

    if (state.meta.onboarded) return null;

    const finish = () => {
        if (!business.name.trim()) return alert('Falta el nombre del negocio');
        if (!sucursal.nombre.trim()) return alert('Falta el nombre de la sucursal');
        actions.updateBusiness({ ...business, createdAt: new Date().toISOString() });
        actions.add('sucursales', sucursal);
        actions.markOnboarded();
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(10,14,26,0.95)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 200, padding: 16
        }}>
            <div style={{
                background: 'var(--bg-card)', borderRadius: 16,
                maxWidth: 600, width: '100%', padding: 32,
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-lg)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{
                        width: 56, height: 56, margin: '0 auto 12px',
                        borderRadius: 16, background: 'linear-gradient(135deg, #14b8a6, #0ea5e9)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Sparkles size={26} color="#fff" />
                    </div>
                    <h1 style={{ margin: 0, fontSize: 24 }}>Bienvenido a Dashboard</h1>
                    <p className="text-sm text-muted mt-2">
                        {step === 1 ? 'Primero, contanos de tu negocio' : 'Ahora, agregá tu primera sucursal'}
                    </p>
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 24, justifyContent: 'center' }}>
                    {[1, 2].map(n => (
                        <div key={n} style={{
                            width: 30, height: 4, borderRadius: 2,
                            background: n <= step ? 'var(--accent)' : 'var(--border-color)',
                            transition: 'background 0.2s'
                        }} />
                    ))}
                </div>

                {step === 1 && (
                    <div className="flex-col gap-3">
                        <Field label="Nombre de tu negocio" required>
                            <input className="input" placeholder="Ej: Kiosco San Martín" autoFocus value={business.name} onChange={e => setBusiness({ ...business, name: e.target.value })} />
                        </Field>

                        <div>
                            <div className="field-label mb-2">¿Qué tipo de negocio tenés?</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                                {RUBROS.map(r => (
                                    <button
                                        key={r.value}
                                        className="card"
                                        onClick={() => setBusiness({ ...business, rubro: r.value })}
                                        style={{
                                            padding: 12, textAlign: 'left', cursor: 'pointer',
                                            borderColor: business.rubro === r.value ? 'var(--accent)' : 'var(--border-color)',
                                            background: business.rubro === r.value ? 'var(--accent-soft)' : 'var(--bg-elevated)'
                                        }}
                                    >
                                        <div className="font-semibold text-sm">{r.label}</div>
                                        <div className="text-xs text-muted mt-1">{r.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-grid">
                            <Field label="Moneda">
                                <select className="select" value={business.moneda} onChange={e => setBusiness({ ...business, moneda: e.target.value })}>
                                    {['ARS', 'USD', 'EUR', 'BRL', 'UYU', 'CLP'].map(m => <option key={m}>{m}</option>)}
                                </select>
                            </Field>
                            <Field label="País">
                                <input className="input" value={business.pais} onChange={e => setBusiness({ ...business, pais: e.target.value })} />
                            </Field>
                        </div>

                        <button className="btn btn-primary mt-3" onClick={() => business.name.trim() ? setStep(2) : alert('Poné un nombre para el negocio')} style={{ width: '100%' }}>
                            Siguiente <ArrowRight size={14} />
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="flex-col gap-3">
                        <div className="flex items-center gap-2 mb-2 text-sm text-muted">
                            <Store size={16} /> Primera sucursal
                        </div>
                        <div className="form-grid">
                            <Field label="Nombre" required><input className="input" placeholder="Ej: Casa central" autoFocus value={sucursal.nombre} onChange={e => setSucursal({ ...sucursal, nombre: e.target.value })} /></Field>
                            <Field label="Tipo"><select className="select" value={sucursal.tipo} onChange={e => setSucursal({ ...sucursal, tipo: e.target.value })}><option value="local">Local / PDV</option><option value="deposito">Depósito</option><option value="online">Tienda online</option></select></Field>
                            <Field label="Dirección"><input className="input" value={sucursal.direccion} onChange={e => setSucursal({ ...sucursal, direccion: e.target.value })} /></Field>
                            <Field label="Ciudad"><input className="input" value={sucursal.ciudad} onChange={e => setSucursal({ ...sucursal, ciudad: e.target.value })} /></Field>
                            <Field label="Teléfono"><input className="input" value={sucursal.telefono} onChange={e => setSucursal({ ...sucursal, telefono: e.target.value })} /></Field>
                        </div>
                        <div className="text-xs text-muted mt-2">
                            💡 Podés agregar más sucursales después desde el menú lateral → Sucursales.
                        </div>
                        <div className="flex gap-2 mt-3">
                            <button className="btn btn-ghost" onClick={() => setStep(1)} style={{ flex: 1 }}>Atrás</button>
                            <button className="btn btn-primary" onClick={finish} style={{ flex: 2 }}>Empezar a usar Dashboard <ArrowRight size={14} /></button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
