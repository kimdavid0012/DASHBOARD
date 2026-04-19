import React, { useState, useRef } from 'react';
import {
    Upload, FileSpreadsheet, Brain, CheckCircle2, AlertCircle,
    Download, Trash2, Eye, Sparkles, X as XIcon
} from 'lucide-react';
import { useData, SECTION_HELP, getRubroLabels } from '../store/DataContext';
import { PageHeader, Card, Modal, Field, EmptyState, Badge, InfoBox, fmtMoney } from '../components/UI';
import { useT } from '../i18n';

// ═══════════════════════════════════════════════════════════════════
// DATA IMPORT — Excel/CSV con IA que entiende columnas
// ═══════════════════════════════════════════════════════════════════

const COLLECTION_OPTIONS = [
    { id: 'productos', label: 'Productos / Items', icon: '📦', fields: ['nombre', 'codigo', 'categoria', 'precioCosto', 'precioVenta', 'stock', 'stockMinimo', 'talles', 'colores'] },
    { id: 'clientes', label: 'Clientes', icon: '👥', fields: ['nombre', 'email', 'telefono', 'cuit', 'direccion', 'ciudad', 'notas'] },
    { id: 'proveedores', label: 'Proveedores', icon: '🚚', fields: ['nombre', 'contacto', 'email', 'telefono', 'cuit', 'direccion', 'notas'] },
    { id: 'empleados', label: 'Empleados', icon: '👔', fields: ['nombre', 'apellido', 'dni', 'puesto', 'sueldo', 'email', 'telefono'] },
    { id: 'gastos', label: 'Gastos', icon: '💸', fields: ['fecha', 'concepto', 'monto', 'categoria', 'metodo', 'notas'] },
    { id: 'ventas', label: 'Ventas (histórico)', icon: '💰', fields: ['fecha', 'total', 'metodo', 'cliente', 'items'] },
    { id: 'afipVeps', label: 'VEPs de AFIP', icon: '📋', fields: ['concepto', 'monto', 'vencimiento', 'periodo', 'numeroVep', 'estado'] }
];

export default function DataImportPage() {
    const t = useT();
    const { state, actions } = useData();
    const [file, setFile] = useState(null);
    const [rawRows, setRawRows] = useState(null);
    const [collection, setCollection] = useState('');
    const [mappingProgress, setMappingProgress] = useState(null); // { suggested, confidence }
    const [aiAnalysis, setAiAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [imported, setImported] = useState(null);
    const [error, setError] = useState('');
    const fileRef = useRef(null);
    const hasKey = !!(state.integraciones.anthropicKey || state.integraciones.openaiKey);
    const labels = getRubroLabels(state.business.rubro);

    const reset = () => {
        setFile(null); setRawRows(null); setCollection(''); setMappingProgress(null);
        setAiAnalysis(null); setImported(null); setError('');
        if (fileRef.current) fileRef.current.value = '';
    };

    const handleFileSelect = async (selectedFile) => {
        if (!selectedFile) return;
        setError('');
        setLoading(true);
        setFile(selectedFile);

        try {
            const fileName = selectedFile.name.toLowerCase();
            const isCSV = fileName.endsWith('.csv') || fileName.endsWith('.tsv') || selectedFile.type === 'text/csv';
            let rows = [];

            if (isCSV) {
                // CSV simple parser — más liviano y seguro
                const text = await selectedFile.text();
                const delimiter = fileName.endsWith('.tsv') ? '\t' : detectDelimiter(text);
                rows = parseCSV(text, delimiter);
            } else {
                // Excel via exceljs (dynamic import — solo carga al entrar acá)
                const ExcelJS = (await import('exceljs')).default;
                const buffer = await selectedFile.arrayBuffer();
                const workbook = new ExcelJS.Workbook();
                await workbook.xlsx.load(buffer);
                const worksheet = workbook.worksheets[0];
                if (!worksheet) {
                    setError('El archivo no tiene hojas');
                    setLoading(false);
                    return;
                }
                // Primera fila = headers
                const headersRow = worksheet.getRow(1);
                const headers = [];
                headersRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
                    headers[colNum - 1] = String(cell.value ?? `col${colNum}`).trim();
                });
                // Resto de filas
                for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
                    const row = worksheet.getRow(rowNum);
                    const obj = {};
                    let hasAny = false;
                    headers.forEach((h, i) => {
                        const cell = row.getCell(i + 1);
                        let v = cell.value;
                        // ExcelJS devuelve objetos complejos para fórmulas/fechas/hyperlinks
                        if (v && typeof v === 'object') {
                            if (v instanceof Date) v = v.toISOString().slice(0, 10);
                            else if (v.result !== undefined) v = v.result;
                            else if (v.text !== undefined) v = v.text;
                            else if (v.richText) v = v.richText.map(r => r.text).join('');
                            else v = String(v);
                        }
                        obj[h] = v ?? '';
                        if (v !== null && v !== undefined && v !== '') hasAny = true;
                    });
                    if (hasAny) rows.push(obj);
                }
            }

            if (rows.length === 0) {
                setError('El archivo está vacío o no tiene filas de datos');
                setLoading(false);
                return;
            }

            setRawRows(rows);
            // Intentar inferir collection por contenido
            const suggested = inferCollection(rows);
            if (suggested) setCollection(suggested);
        } catch (err) {
            setError('No pude leer el archivo: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const f = e.dataTransfer.files[0];
        handleFileSelect(f);
    };

    const analyzeWithAI = async () => {
        if (!rawRows || !collection) return;
        if (!hasKey) {
            // Fallback: mapeo heurístico sin IA
            const heuristic = heuristicMapping(rawRows, collection);
            setAiAnalysis({ source: 'heuristic', mapping: heuristic, samples: rawRows.slice(0, 3) });
            return;
        }

        setLoading(true);
        try {
            const sampleRows = rawRows.slice(0, 5);
            const columnNames = Object.keys(rawRows[0] || {});
            const targetFields = COLLECTION_OPTIONS.find(c => c.id === collection)?.fields || [];

            const prompt = `Sos un asistente que ayuda a importar datos a un sistema de gestión de negocios.

El usuario subió un archivo Excel/CSV con ${rawRows.length} filas. Las columnas del archivo son:
${columnNames.map(c => `- "${c}"`).join('\n')}

Aquí van las primeras 5 filas como muestra:
${JSON.stringify(sampleRows, null, 2)}

El usuario quiere importar esto como "${collection}" (${COLLECTION_OPTIONS.find(c => c.id === collection)?.label}).

Los campos destino son:
${targetFields.map(f => `- ${f}`).join('\n')}

Tu tarea: devolvé un JSON (solo JSON, sin explicaciones ni markdown) con este formato exacto:
{
  "mapping": {
    "nombreDestino": "columnaOrigen del Excel",
    ...
  },
  "issues": ["problema detectado 1", "..."],
  "suggestions": ["sugerencia 1", "..."],
  "transformations": {
    "campoDestino": "descripción breve de transformación (ej: 'quitar $ y convertir a número')"
  }
}

Reglas:
- Si una columna del Excel no mapea a ningún campo destino, no la incluyas.
- Si un campo destino no tiene columna clara, omitilo del mapping.
- Detectá problemas: valores vacíos masivos, tipos mezclados, fechas malas, duplicados obvios.
- Sugerí mejoras al usuario.
- Identificá transformaciones necesarias: limpiar $, convertir "1.234,56" a número, parsear fechas "DD/MM/YYYY", etc.`;

            let text = '';
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
                text = data.content?.[0]?.text || '';
            } else {
                const res = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${state.integraciones.openaiKey}`
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        max_tokens: 1500,
                        response_format: { type: 'json_object' },
                        messages: [{ role: 'user', content: prompt }]
                    })
                });
                const data = await res.json();
                if (data.error) throw new Error(data.error.message);
                text = data.choices?.[0]?.message?.content || '';
            }

            // Extract JSON (handles markdown code blocks)
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
            setAiAnalysis({ source: 'ai', ...parsed, samples: rawRows.slice(0, 3) });
        } catch (err) {
            // Fallback a heurística
            const heuristic = heuristicMapping(rawRows, collection);
            setAiAnalysis({
                source: 'heuristic-fallback',
                mapping: heuristic,
                samples: rawRows.slice(0, 3),
                issues: [`La IA falló: ${err.message}. Usé mapeo heurístico.`]
            });
        } finally {
            setLoading(false);
        }
    };

    const confirmImport = () => {
        if (!rawRows || !aiAnalysis?.mapping) return;

        const mapping = aiAnalysis.mapping;
        const mapped = rawRows.map(row => {
            const out = {};
            for (const [destField, sourceCol] of Object.entries(mapping)) {
                let value = row[sourceCol];
                if (value === undefined || value === '') continue;

                // Transformaciones automáticas
                if (typeof value === 'string') {
                    value = value.trim();
                    // Limpiar formato monetario $1.234,56 → 1234.56
                    if (['precioCosto', 'precioVenta', 'sueldo', 'monto', 'total'].includes(destField)) {
                        const cleaned = value.replace(/[$\s]/g, '').replace(/\./g, '').replace(',', '.');
                        const num = parseFloat(cleaned);
                        if (!isNaN(num)) value = num;
                    }
                    // Stock números enteros
                    if (['stock', 'stockMinimo', 'cantidad'].includes(destField)) {
                        const num = parseInt(value.replace(/[^\d-]/g, ''), 10);
                        if (!isNaN(num)) value = num;
                    }
                    // Fechas DD/MM/YYYY → YYYY-MM-DD
                    if (['fecha', 'vencimiento'].includes(destField)) {
                        const m = value.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
                        if (m) {
                            const [_, d, mo, y] = m;
                            const yyyy = y.length === 2 ? '20' + y : y;
                            value = `${yyyy}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
                        }
                    }
                }
                out[destField] = value;
            }
            return out;
        }).filter(x => Object.keys(x).length > 0);

        // Bulk add
        actions.bulkAdd(collection, mapped);
        setImported({ count: mapped.length, collection });
    };

    return (
        <div>
            <PageHeader
                icon={Upload}
                title={t('import.title')}
                subtitle={t('import.subtitle')}
                help={SECTION_HELP.dataimport}
            />

            {imported ? (
                <Card>
                    <div style={{ padding: 32, textAlign: 'center' }}>
                        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(74, 222, 128, 0.15)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, border: '2px solid var(--success)' }}>
                            <CheckCircle2 size={36} color="var(--success)" />
                        </div>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 500, margin: '0 0 8px' }}>¡Listo! Se importaron {imported.count} filas</h3>
                        <p className="text-sm text-muted mb-4">Ya están disponibles en la sección {COLLECTION_OPTIONS.find(c => c.id === imported.collection)?.label}</p>
                        <button className="btn btn-primary btn-lg" onClick={reset}><Upload size={16} /> Importar otro archivo</button>
                    </div>
                </Card>
            ) : !file ? (
                <Card>
                    <div
                        onDragOver={e => e.preventDefault()}
                        onDrop={handleDrop}
                        onClick={() => fileRef.current?.click()}
                        style={{
                            border: '2px dashed var(--border-strong)',
                            borderRadius: 16,
                            padding: 48,
                            textAlign: 'center',
                            cursor: 'pointer',
                            background: 'var(--bg-elevated)',
                            transition: 'all 0.2s'
                        }}
                    >
                        <FileSpreadsheet size={56} color="var(--accent)" style={{ marginBottom: 16 }} />
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, margin: '0 0 8px' }}>Arrastrá tu archivo o tocá acá</h3>
                        <p className="text-sm text-muted mb-3">Soporta .xlsx, .xls, .csv, .tsv · Hasta 10MB</p>
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".xlsx,.xls,.csv,.tsv"
                            onChange={e => handleFileSelect(e.target.files[0])}
                            style={{ display: 'none' }}
                        />
                        <button className="btn btn-primary"><Upload size={16} /> Elegir archivo</button>
                    </div>

                    <div style={{ marginTop: 24 }}>
                        <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, margin: '0 0 8px' }}>✨ Cómo funciona</h4>
                        <ol style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, paddingLeft: 20 }}>
                            <li>Subís tu archivo (puede venir de Tiendanube, Mercado Libre, WooCommerce, Excel casero, etc.)</li>
                            <li>Elegís qué son los datos: productos, clientes, ventas, etc.</li>
                            <li><strong>La IA analiza las columnas</strong> y sugiere automáticamente el mapeo a los campos del sistema</li>
                            <li>Revisás el mapeo, corregís si hace falta, y confirmás</li>
                            <li>Los datos se importan a la sección correspondiente</li>
                        </ol>
                    </div>

                    {!hasKey && (
                        <InfoBox variant="warning" style={{ marginTop: 16 }}>
                            Sin API key de Claude/OpenAI configurada. Igual podés importar, pero la IA no hará el mapeo automático — se usa un heurístico más básico. Andá a Configuración → Integraciones para cargar tu key.
                        </InfoBox>
                    )}
                </Card>
            ) : !aiAnalysis ? (
                <Card>
                    <div className="flex items-center gap-3 mb-4">
                        <FileSpreadsheet size={28} color="var(--accent)" />
                        <div style={{ flex: 1 }}>
                            <div className="font-semibold">{file.name}</div>
                            <div className="text-xs text-muted">{rawRows?.length || 0} filas · {Object.keys(rawRows?.[0] || {}).length} columnas</div>
                        </div>
                        <button className="btn btn-ghost btn-sm" onClick={reset}><XIcon size={14} /> Cambiar</button>
                    </div>

                    <Field label="¿Qué tipo de datos son?" required>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                            {COLLECTION_OPTIONS.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => setCollection(c.id)}
                                    style={{
                                        padding: 14,
                                        background: collection === c.id ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                                        border: `2px solid ${collection === c.id ? 'var(--accent)' : 'var(--border-color)'}`,
                                        borderRadius: 10,
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        color: 'inherit',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    <div style={{ fontSize: 22, marginBottom: 4 }}>{c.icon}</div>
                                    <div className="font-semibold text-sm">{c.label}</div>
                                </button>
                            ))}
                        </div>
                    </Field>

                    {rawRows && (
                        <div className="mt-4">
                            <div className="field-label mb-2">Primeras filas del archivo</div>
                            <div className="table-wrap" style={{ maxHeight: 260, overflow: 'auto' }}>
                                <table className="table">
                                    <thead><tr>{Object.keys(rawRows[0]).slice(0, 8).map(k => <th key={k}>{k}</th>)}</tr></thead>
                                    <tbody>
                                        {rawRows.slice(0, 5).map((r, i) => (
                                            <tr key={i}>
                                                {Object.keys(rawRows[0]).slice(0, 8).map(k => (
                                                    <td key={k} className="text-xs">{String(r[k] ?? '').slice(0, 40)}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2 mt-4 justify-end">
                        <button className="btn btn-ghost" onClick={reset}>Cancelar</button>
                        <button className="btn btn-primary btn-lg" disabled={!collection || loading} onClick={analyzeWithAI}>
                            {loading ? <>🧠 Analizando...</> : <><Sparkles size={16} /> Analizar con IA</>}
                        </button>
                    </div>
                </Card>
            ) : (
                <Card>
                    <div className="flex items-center gap-2 mb-3">
                        <Brain size={20} color="var(--accent)" />
                        <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500 }}>
                            Análisis {aiAnalysis.source === 'ai' ? 'con IA' : aiAnalysis.source === 'heuristic-fallback' ? 'heurístico (fallback)' : 'heurístico'}
                        </h3>
                        <Badge variant={aiAnalysis.source === 'ai' ? 'success' : 'warning'}>
                            {aiAnalysis.source === 'ai' ? '🤖 IA' : '⚙️ Auto'}
                        </Badge>
                    </div>

                    <div className="field-label mb-2">Mapeo propuesto · columna del archivo → campo del sistema</div>
                    <div style={{ background: 'var(--bg-elevated)', padding: 16, borderRadius: 10 }}>
                        {Object.entries(aiAnalysis.mapping || {}).length === 0 ? (
                            <div className="text-sm text-muted">No pude detectar ningún mapeo. Revisá el tipo de datos elegido.</div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center' }}>
                                {Object.entries(aiAnalysis.mapping).map(([dest, src]) => (
                                    <React.Fragment key={dest}>
                                        <div className="mono text-sm" style={{ padding: '6px 10px', background: 'var(--bg-app)', borderRadius: 6 }}>{src}</div>
                                        <div style={{ color: 'var(--accent)' }}>→</div>
                                        <div className="font-semibold text-sm" style={{ color: 'var(--accent)' }}>{dest}</div>
                                    </React.Fragment>
                                ))}
                            </div>
                        )}
                    </div>

                    {aiAnalysis.issues && aiAnalysis.issues.length > 0 && (
                        <InfoBox variant="warning" style={{ marginTop: 16 }}>
                            <strong>⚠️ Problemas detectados:</strong>
                            <ul style={{ margin: '4px 0 0 16px' }}>
                                {aiAnalysis.issues.map((iss, i) => <li key={i}>{iss}</li>)}
                            </ul>
                        </InfoBox>
                    )}

                    {aiAnalysis.suggestions && aiAnalysis.suggestions.length > 0 && (
                        <InfoBox variant="info" style={{ marginTop: 8 }}>
                            <strong>💡 Sugerencias:</strong>
                            <ul style={{ margin: '4px 0 0 16px' }}>
                                {aiAnalysis.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                        </InfoBox>
                    )}

                    <div className="flex gap-2 mt-4 justify-end">
                        <button className="btn btn-ghost" onClick={() => { setAiAnalysis(null); }}>← Volver</button>
                        <button className="btn btn-primary btn-lg" onClick={confirmImport}>
                            <CheckCircle2 size={16} /> Importar {rawRows.length} filas
                        </button>
                    </div>
                </Card>
            )}

            {error && (
                <InfoBox variant="warning" style={{ marginTop: 16 }}>{error}</InfoBox>
            )}
            {loading && !aiAnalysis && (
                <div className="text-center mt-3 text-sm text-muted">Procesando archivo...</div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// Heuristic column detection (fallback sin IA)
// ═══════════════════════════════════════════════════════════════════
const KEYWORD_MAP = {
    nombre: ['nombre', 'name', 'producto', 'descripcion', 'titulo', 'title', 'item'],
    codigo: ['codigo', 'code', 'sku', 'barcode', 'barra', 'ean', 'id'],
    categoria: ['categoria', 'category', 'rubro', 'tipo', 'familia', 'type'],
    precioVenta: ['precio', 'price', 'pv', 'venta', 'publico', 'pvp', 'sale'],
    precioCosto: ['costo', 'cost', 'compra', 'pc', 'wholesale'],
    stock: ['stock', 'cantidad', 'qty', 'quantity', 'existencia', 'inventory'],
    stockMinimo: ['minimo', 'min', 'minstock'],
    email: ['email', 'mail', 'correo'],
    telefono: ['telefono', 'phone', 'tel', 'celular', 'movil'],
    cuit: ['cuit', 'cuil', 'dni', 'documento', 'id'],
    direccion: ['direccion', 'address', 'domicilio'],
    ciudad: ['ciudad', 'city', 'localidad'],
    fecha: ['fecha', 'date', 'fechaemision'],
    monto: ['monto', 'amount', 'importe', 'valor', 'total'],
    apellido: ['apellido', 'lastname', 'surname'],
    puesto: ['puesto', 'position', 'rol', 'role', 'cargo'],
    sueldo: ['sueldo', 'salary', 'salario'],
    talles: ['talle', 'size', 'tamaño'],
    colores: ['color', 'colour'],
    total: ['total', 'monto', 'amount', 'importe'],
    concepto: ['concepto', 'description', 'detalle', 'motivo'],
    vencimiento: ['vencimiento', 'vto', 'expira', 'expiry', 'duedate']
};

function heuristicMapping(rows, collection) {
    const columns = Object.keys(rows[0] || {});
    const targetFields = COLLECTION_OPTIONS.find(c => c.id === collection)?.fields || [];
    const mapping = {};
    for (const field of targetFields) {
        const keywords = KEYWORD_MAP[field] || [field.toLowerCase()];
        const match = columns.find(col => keywords.some(kw => col.toLowerCase().includes(kw)));
        if (match) mapping[field] = match;
    }
    return mapping;
}

function inferCollection(rows) {
    const columns = Object.keys(rows[0] || {}).join(' ').toLowerCase();
    if (/precio|stock|codigo|producto|sku/.test(columns)) return 'productos';
    if (/email|telefono|cuit|direccion.*cliente/.test(columns)) return 'clientes';
    if (/vencimiento|vep|iibb|iva.*pago/.test(columns)) return 'afipVeps';
    if (/puesto|sueldo|empleado/.test(columns)) return 'empleados';
    if (/monto|concepto|gasto/.test(columns)) return 'gastos';
    return null;
}

// ═══════════════════════════════════════════════════════════════════
// CSV parsing (sin dependencias — soporta comillas, comas escapadas)
// ═══════════════════════════════════════════════════════════════════
function detectDelimiter(text) {
    const firstLine = text.split('\n')[0] || '';
    const counts = {
        ',': (firstLine.match(/,/g) || []).length,
        ';': (firstLine.match(/;/g) || []).length,
        '\t': (firstLine.match(/\t/g) || []).length,
        '|': (firstLine.match(/\|/g) || []).length
    };
    return Object.entries(counts).sort(([, a], [, b]) => b - a)[0][0];
}

function parseCSV(text, delimiter = ',') {
    // Quita BOM
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

    const rows = [];
    let cur = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const next = text[i + 1];

        if (inQuotes) {
            if (char === '"') {
                if (next === '"') { field += '"'; i++; } // escaped quote
                else { inQuotes = false; }
            } else {
                field += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === delimiter) {
                cur.push(field); field = '';
            } else if (char === '\n') {
                cur.push(field); field = '';
                rows.push(cur); cur = [];
            } else if (char === '\r') {
                // ignorar
            } else {
                field += char;
            }
        }
    }
    if (field !== '' || cur.length) {
        cur.push(field);
        rows.push(cur);
    }

    if (rows.length === 0) return [];

    const headers = rows[0].map((h, i) => String(h || `col${i + 1}`).trim());
    const data = [];
    for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        // Filas vacías
        if (row.every(v => v === '' || v == null)) continue;
        const obj = {};
        headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
        data.push(obj);
    }
    return data;
}
