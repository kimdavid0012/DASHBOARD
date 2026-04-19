import React, { useState } from 'react';
import { X as XIcon, Inbox, HelpCircle, Info } from 'lucide-react';

export function Card({ title, subtitle, actions, children, style }) {
    return (
        <div className="card" style={style}>
            {(title || actions) && (
                <div className="card-header">
                    <div>
                        {title && <h3 className="card-title">{title}</h3>}
                        {subtitle && <p className="card-subtitle">{subtitle}</p>}
                    </div>
                    {actions && <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>{actions}</div>}
                </div>
            )}
            {children}
        </div>
    );
}

// Page header with title, subtitle, and contextual help
export function PageHeader({ icon: Icon, title, subtitle, help, actions }) {
    const [showHelp, setShowHelp] = useState(false);
    return (
        <div className="page-header">
            <div className="page-header-left">
                {Icon && (
                    <div className="page-header-icon">
                        <Icon size={20} />
                    </div>
                )}
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="page-header-title">{title}</h1>
                        {help && (
                            <button
                                className="help-btn"
                                onClick={() => setShowHelp(!showHelp)}
                                title="¿Qué hace esta sección?"
                            >
                                <HelpCircle size={16} />
                            </button>
                        )}
                    </div>
                    {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
                </div>
            </div>
            {actions && <div className="page-header-actions">{actions}</div>}

            {showHelp && help && (
                <div className="help-panel">
                    <div className="help-panel-close" onClick={() => setShowHelp(false)}>
                        <XIcon size={14} />
                    </div>
                    <div className="help-panel-section">
                        <div className="help-panel-label">📌 ¿Qué es esto?</div>
                        <div className="help-panel-text">{help.what}</div>
                    </div>
                    {help.how && (
                        <div className="help-panel-section">
                            <div className="help-panel-label">💡 ¿Cómo se usa?</div>
                            <div className="help-panel-text">{help.how}</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export function Modal({ open, onClose, title, children, size = 'md' }) {
    if (!open) return null;
    const maxWidth = { sm: 420, md: 640, lg: 900, xl: 1100 }[size];
    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal" style={{ maxWidth }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">{title}</h2>
                    <button className="btn btn-icon btn-ghost" onClick={onClose}><XIcon size={18} /></button>
                </div>
                {children}
            </div>
        </div>
    );
}

export function Field({ label, children, required, hint }) {
    return (
        <label className="field">
            <span className="field-label">{label}{required && <span style={{ color: 'var(--danger)' }}> *</span>}</span>
            {children}
            {hint && <span className="field-hint">{hint}</span>}
        </label>
    );
}

export function KpiCard({ icon, label, value, delta, color = '#63f1cb', hint }) {
    return (
        <div className="kpi-card" title={hint || ''}>
            <div className="kpi-icon" style={{ background: `${color}20`, color }}>{icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div className="kpi-label">{label}</div>
                <div className="kpi-value">{value}</div>
                {delta && <div className={`kpi-delta ${delta.direction}`}>{delta.text}</div>}
            </div>
        </div>
    );
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, tips, example }) {
    return (
        <div className="empty-state">
            <div className="empty-state-icon"><Icon size={26} /></div>
            <div className="empty-state-title">{title}</div>
            {description && <div className="empty-state-desc">{description}</div>}
            {action && <div className="mt-3">{action}</div>}
            {tips && (
                <div className="empty-state-tips">
                    <strong>📊 ¿Qué vas a ver acá cuando tengas datos?</strong>
                    <ul>{tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
                </div>
            )}
            {example && (
                <div className="empty-state-example">
                    <strong>🎯 Ejemplo típico:</strong>
                    <div className="mt-2">{example}</div>
                </div>
            )}
        </div>
    );
}

export function Badge({ children, variant = 'default' }) {
    const cls = variant === 'default' ? 'badge' : `badge badge-${variant}`;
    return <span className={cls}>{children}</span>;
}

// Inline info box (sits inline with content, not collapsible)
export function InfoBox({ icon: Icon = Info, children, variant = 'info', style: extraStyle }) {
    const colors = {
        info: { bg: 'rgba(14,165,233,0.08)', border: 'rgba(14,165,233,0.25)', color: '#60a5fa' },
        warning: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', color: '#f59e0b' },
        success: { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)', color: '#22c55e' }
    }[variant];
    return (
        <div style={{
            background: colors.bg, border: `1px solid ${colors.border}`,
            borderRadius: 10, padding: 12, display: 'flex', gap: 10,
            alignItems: 'flex-start', fontSize: 13, lineHeight: 1.5,
            ...extraStyle
        }}>
            <Icon size={16} color={colors.color} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>{children}</div>
        </div>
    );
}

// ───────────── Native SVG charts ─────────────
export function PieChart({ data, size = 180 }) {
    const total = data.reduce((s, d) => s + d.value, 0);
    if (total === 0) {
        return (
            <div style={{
                width: size, height: size, borderRadius: '50%',
                background: 'var(--bg-elevated)',
                border: '1px dashed var(--border-strong)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)', fontSize: 12, margin: '0 auto'
            }}>Sin datos</div>
        );
    }
    const radius = size / 2;
    let cumulative = 0;
    const paths = data.map((d, i) => {
        const frac = d.value / total;
        const startAngle = cumulative * 2 * Math.PI;
        const endAngle = (cumulative + frac) * 2 * Math.PI;
        cumulative += frac;
        const x1 = radius + radius * Math.sin(startAngle);
        const y1 = radius - radius * Math.cos(startAngle);
        const x2 = radius + radius * Math.sin(endAngle);
        const y2 = radius - radius * Math.cos(endAngle);
        const largeArc = frac > 0.5 ? 1 : 0;
        const pathData = frac >= 0.999
            ? `M ${radius},0 A ${radius},${radius} 0 1 1 ${radius - 0.01},0 Z`
            : `M ${radius},${radius} L ${x1},${y1} A ${radius},${radius} 0 ${largeArc} 1 ${x2},${y2} Z`;
        return <path key={i} d={pathData} fill={d.color} stroke="var(--bg-card)" strokeWidth="2" />;
    });
    return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>{paths}</svg>;
}

export function BarChart({ data, maxValue }) {
    if (!data.length) {
        return <div className="text-muted text-xs" style={{ textAlign: 'center', padding: 20 }}>Sin datos</div>;
    }
    const max = maxValue || Math.max(...data.map(d => d.value), 1);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.map((d, i) => (
                <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{d.label}</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{d.display || d.value}</span>
                    </div>
                    <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                            width: `${Math.max(0, (d.value / max) * 100)}%`,
                            height: '100%',
                            background: d.color || 'var(--accent)',
                            borderRadius: 4,
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function LineChart({ series, height = 180, labels = [] }) {
    if (!series || !series.length || !series[0].data.length) {
        return <div className="text-muted text-xs" style={{ textAlign: 'center', padding: 20 }}>Sin datos</div>;
    }
    const width = 600;
    const padding = 30;
    const allValues = series.flatMap(s => s.data);
    const maxY = Math.max(...allValues, 1);
    const minY = 0;
    const n = series[0].data.length;

    const toX = (i) => padding + (i * (width - 2 * padding) / Math.max(n - 1, 1));
    const toY = (v) => height - padding - ((v - minY) / Math.max(maxY - minY, 1)) * (height - 2 * padding);

    return (
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
            {[0, 0.5, 1].map((frac, i) => (
                <line key={i}
                    x1={padding} x2={width - padding}
                    y1={height - padding - frac * (height - 2 * padding)}
                    y2={height - padding - frac * (height - 2 * padding)}
                    stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3"
                />
            ))}
            {series.map((s, si) => {
                const points = s.data.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
                return (
                    <g key={si}>
                        <polyline points={points} fill="none" stroke={s.color || 'var(--accent)'} strokeWidth="2" />
                        {s.data.map((v, i) => (
                            <circle key={i} cx={toX(i)} cy={toY(v)} r="3" fill={s.color || 'var(--accent)'} />
                        ))}
                    </g>
                );
            })}
            {labels.map((l, i) => (
                <text key={i} x={toX(i)} y={height - 8} textAnchor="middle" fontSize="10" fill="var(--text-muted)">{l}</text>
            ))}
        </svg>
    );
}

export const fmtMoney = (n, currency = 'ARS') => {
    const num = Number(n || 0);
    const symbol = currency === 'ARS' ? '$' : currency === 'USD' ? 'US$' : '';
    return `${symbol}${num.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

export const fmtDate = (iso) => {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return iso; }
};

export const CHART_COLORS = ['#63f1cb', '#60a5fa', '#fbbf24', '#fb7185', '#c084fc', '#4ade80', '#f472b6', '#94a3b8', '#f4c15a', '#a3e635'];
