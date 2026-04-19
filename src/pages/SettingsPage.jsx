import React, { useState } from 'react';
import { Settings as SettingsIcon, Building, Key, Save, Trash2, AlertTriangle, Download, Upload } from 'lucide-react';
import { useData } from '../store/DataContext';
import { Card, Field, Badge } from '../components/UI';

const RUBROS = [
    { value: 'general', label: 'General / Multi-rubro' },
    { value: 'kiosco', label: 'Kiosco / Almacén' },
    { value: 'restaurante', label: 'Restaurante / Bar' },
    { value: 'accesorios', label: 'Casa de accesorios' },
    { value: 'servicios', label: 'Servicios' },
    { value: 'otro', label: 'Otro' }
];

const MONEDAS = ['ARS', 'USD', 'EUR', 'BRL', 'UYU', 'CLP', 'PEN', 'MXN', 'COP'];

export default function SettingsPage() {
    const { state, actions } = useData();
    const [business, setBusiness] = useState(state.business);
    const [integraciones, setIntegraciones] = useState(state.integraciones);
    const [saved, setSaved] = useState(false);

    const saveAll = () => {
        actions.updateBusiness(business);
        actions.updateIntegraciones(integraciones);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
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

    const importData = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (confirm('¿Reemplazar todos los datos actuales con el backup?')) {
                    localStorage.setItem('dashboard_state_v1', JSON.stringify(data));
                    window.location.reload();
                }
            } catch (err) {
                alert('Archivo inválido');
            }
        };
        reader.readAsText(file);
    };

    const resetAll = () => {
        if (!confirm('⚠️ Esto va a BORRAR TODA LA DATA (sucursales, ventas, clientes, etc.). ¿Estás seguro?')) return;
        if (!confirm('Confirmá una vez más. Esta acción NO se puede deshacer.')) return;
        actions.reset();
        localStorage.removeItem('dashboard_state_v1');
        window.location.reload();
    };

    return (
        <div className="flex-col gap-4">
            <Card title="Datos del negocio" subtitle="Configuración general del Dashboard">
                <div className="form-grid">
                    <Field label="Nombre del negocio" required><input className="input" value={business.name} onChange={e => setBusiness({ ...business, name: e.target.value })} /></Field>
                    <Field label="Rubro"><select className="select" value={business.rubro} onChange={e => setBusiness({ ...business, rubro: e.target.value })}>{RUBROS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select></Field>
                    <Field label="Moneda"><select className="select" value={business.moneda} onChange={e => setBusiness({ ...business, moneda: e.target.value })}>{MONEDAS.map(m => <option key={m}>{m}</option>)}</select></Field>
                    <Field label="País"><input className="input" value={business.pais} onChange={e => setBusiness({ ...business, pais: e.target.value })} /></Field>
                </div>
            </Card>

            <Card title="Integraciones" subtitle="Conectá tus servicios externos para activar features avanzadas">
                <div className="text-xs text-muted mb-3" style={{ padding: 12, background: 'rgba(245,158,11,0.08)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.2)' }}>
                    🔒 Las claves se guardan <strong>solo en tu navegador</strong> (localStorage). Nunca se envían a nuestros servidores.
                </div>
                <div className="form-grid">
                    <Field label="OpenAI API Key" hint="Para activar agentes AI"><input className="input" type="password" placeholder="sk-..." value={integraciones.openaiKey} onChange={e => setIntegraciones({ ...integraciones, openaiKey: e.target.value })} /></Field>
                    <Field label="Anthropic API Key" hint="Alternativa a OpenAI"><input className="input" type="password" placeholder="sk-ant-..." value={integraciones.anthropicKey} onChange={e => setIntegraciones({ ...integraciones, anthropicKey: e.target.value })} /></Field>
                    <Field label="Meta Access Token" hint="Facebook + Instagram Ads"><input className="input" type="password" value={integraciones.metaAccessToken} onChange={e => setIntegraciones({ ...integraciones, metaAccessToken: e.target.value })} /></Field>
                    <Field label="Meta Pixel ID"><input className="input" value={integraciones.metaPixelId} onChange={e => setIntegraciones({ ...integraciones, metaPixelId: e.target.value })} /></Field>
                    <Field label="Instagram Business ID"><input className="input" value={integraciones.instagramBusinessId} onChange={e => setIntegraciones({ ...integraciones, instagramBusinessId: e.target.value })} /></Field>
                    <Field label="Google Analytics 4 ID" hint="G-XXXXXXXXXX"><input className="input" placeholder="G-..." value={integraciones.googleAnalyticsId} onChange={e => setIntegraciones({ ...integraciones, googleAnalyticsId: e.target.value })} /></Field>
                    <Field label="WooCommerce Store URL"><input className="input" placeholder="https://mitienda.com" value={integraciones.wooStoreUrl} onChange={e => setIntegraciones({ ...integraciones, wooStoreUrl: e.target.value })} /></Field>
                    <Field label="Woo Consumer Key"><input className="input" type="password" value={integraciones.wooConsumerKey} onChange={e => setIntegraciones({ ...integraciones, wooConsumerKey: e.target.value })} /></Field>
                    <Field label="Woo Consumer Secret"><input className="input" type="password" value={integraciones.wooConsumerSecret} onChange={e => setIntegraciones({ ...integraciones, wooConsumerSecret: e.target.value })} /></Field>
                    <Field label="Mercado Pago Access Token"><input className="input" type="password" value={integraciones.mercadoPagoToken} onChange={e => setIntegraciones({ ...integraciones, mercadoPagoToken: e.target.value })} /></Field>
                    <Field label="Google Drive Folder URL" hint="Para compartir fotos y docs"><input className="input" value={integraciones.driveFolder} onChange={e => setIntegraciones({ ...integraciones, driveFolder: e.target.value })} /></Field>
                </div>
            </Card>

            <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                {saved && <Badge variant="success">✓ Guardado</Badge>}
                <button className="btn btn-primary" onClick={saveAll}><Save size={14} /> Guardar cambios</button>
            </div>

            <Card title="Backup y datos" subtitle="Exportá o importá toda tu información">
                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                    <button className="btn btn-ghost" onClick={exportData}><Download size={14} /> Exportar backup (.json)</button>
                    <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
                        <Upload size={14} /> Importar backup
                        <input type="file" accept=".json" style={{ display: 'none' }} onChange={importData} />
                    </label>
                </div>
            </Card>

            <Card title="Zona de peligro" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
                <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--danger)' }}>
                    <AlertTriangle size={16} /><strong>Borrar todos los datos</strong>
                </div>
                <div className="text-sm text-muted mb-3">Esto elimina todas las sucursales, ventas, clientes, productos, empleados y configuraciones. Imposible de recuperar.</div>
                <button className="btn btn-danger" onClick={resetAll}><Trash2 size={14} /> Borrar todo</button>
            </Card>
        </div>
    );
}
