import React, { createContext, useContext, useEffect, useReducer, useState, useRef } from 'react';
import { nanoid } from 'nanoid';
import {
    saveState, loadState, pushHistorySnapshot,
    persistStorage
} from '../utils/storage';

const STORAGE_KEY = 'dashboard_state_v1';

const DEFAULT_STATE = {
    business: {
        name: '',
        rubro: 'general',
        moneda: 'ARS',
        pais: 'Argentina',
        createdAt: null,
        // Datos fiscales AFIP
        cuit: '',
        razonSocial: '',
        condicionIva: '',  // 'RI' | 'MONOTRIBUTO' | 'EXENTO' | 'CF'
        ingresosBrutos: '',
        puntoVenta: '0001',
        domicilioFiscal: ''
    },
    sucursales: [],
    usuarios: [],
    empleados: [],
    clientes: [],
    proveedores: [],
    productos: [],
    ventas: [],
    pedidos: [],
    gastos: [],
    cajaDiaria: [],
    transferencias: [],
    tareas: [],
    asistencia: [],
    movimientosBancarios: [],
    mesas: [],
    reservas: [],
    afipFacturas: [],      // Facturas emitidas (tipo A, B, C)
    afipVeps: [],          // VEPs pendientes y pagados
    afipVencimientos: [],  // Fechas importantes (IVA, IIBB, Ganancias)
    integraciones: {
        openaiKey: '', anthropicKey: '',
        elevenLabsKey: '',
        metaAccessToken: '', metaPixelId: '',
        googleAnalyticsId: '', instagramBusinessId: '',
        wooConsumerKey: '', wooConsumerSecret: '', wooStoreUrl: '',
        mercadoPagoToken: '', driveFolder: ''
    },
    meta: {
        currentSucursalId: null,
        onboarded: false
    }
};

function reducer(state, action) {
    switch (action.type) {
        case 'HYDRATE':
            return {
                ...DEFAULT_STATE,
                ...action.payload,
                business: { ...DEFAULT_STATE.business, ...(action.payload.business || {}) },
                integraciones: { ...DEFAULT_STATE.integraciones, ...(action.payload.integraciones || {}) },
                meta: { ...DEFAULT_STATE.meta, ...(action.payload.meta || {}) }
            };
        case 'UPDATE_BUSINESS':
            return { ...state, business: { ...state.business, ...action.payload } };
        case 'UPDATE_META':
            return { ...state, meta: { ...state.meta, ...action.payload } };
        case 'UPDATE_INTEGRACIONES':
            return { ...state, integraciones: { ...state.integraciones, ...action.payload } };
        case 'SET_CURRENT_SUCURSAL':
            return { ...state, meta: { ...state.meta, currentSucursalId: action.payload } };
        case 'ADD_ITEM': {
            const { collection, item } = action.payload;
            const id = item.id || nanoid(10);
            const createdAt = item.createdAt || new Date().toISOString();
            return { ...state, [collection]: [...(state[collection] || []), { ...item, id, createdAt }] };
        }
        case 'UPDATE_ITEM': {
            const { collection, id, patch } = action.payload;
            return { ...state, [collection]: (state[collection] || []).map(x => x.id === id ? { ...x, ...patch, updatedAt: new Date().toISOString() } : x) };
        }
        case 'REMOVE_ITEM': {
            const { collection, id } = action.payload;
            return { ...state, [collection]: (state[collection] || []).filter(x => x.id !== id) };
        }
        case 'BULK_ADD': {
            const { collection, items } = action.payload;
            const enriched = items.map(item => ({
                ...item, id: item.id || nanoid(10), createdAt: item.createdAt || new Date().toISOString()
            }));
            return { ...state, [collection]: [...(state[collection] || []), ...enriched] };
        }
        case 'RESET':
            return DEFAULT_STATE;
        default:
            return state;
    }
}

const DataContext = createContext(null);

export function DataProvider({ children }) {
    const [state, dispatch] = useReducer(reducer, DEFAULT_STATE);
    const [hydrated, setHydrated] = useState(false);
    const [saveStatus, setSaveStatus] = useState({ saving: false, lastSaved: null, lastError: null, source: null });
    const saveTimerRef = useRef(null);
    const snapshotTimerRef = useRef(null);

    // 1) HYDRATE al iniciar — intenta IndexedDB, cae a localStorage, última chance history
    useEffect(() => {
        (async () => {
            try {
                const { state: loaded, source, savedAt } = await loadState();
                if (loaded) {
                    dispatch({ type: 'HYDRATE', payload: loaded });
                    setSaveStatus({ saving: false, lastSaved: savedAt, lastError: null, source });
                    if (source === 'history-recovery') {
                        console.warn('⚠️ Data recuperada de snapshot histórico — el storage primario falló');
                    }
                }
            } catch (err) {
                console.error('Hydrate completely failed:', err);
                setSaveStatus({ saving: false, lastSaved: null, lastError: err.message, source: null });
            }
            setHydrated(true);
            // Pedir storage persistente al navegador (no borrarlo si quedás sin espacio)
            persistStorage().then(ok => {
                if (ok) console.log('✓ Storage marcado como persistente');
            });
        })();
    }, []);

    // 2) PERSIST — debounced, escribe a IndexedDB + localStorage
    useEffect(() => {
        if (!hydrated) return;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        setSaveStatus(s => ({ ...s, saving: true }));
        saveTimerRef.current = setTimeout(async () => {
            try {
                const result = await saveState(state);
                setSaveStatus({
                    saving: false,
                    lastSaved: result.savedAt,
                    lastError: (!result.idbOk && !result.lsOk) ? 'Ambos sistemas de guardado fallaron' : null,
                    source: result.idbOk ? 'indexeddb' : 'localstorage'
                });
            } catch (err) {
                setSaveStatus(s => ({ ...s, saving: false, lastError: err.message }));
            }
        }, 500);
        return () => clearTimeout(saveTimerRef.current);
    }, [state, hydrated]);

    // 3) SNAPSHOT HISTORY — cada 10 min guarda punto de restauración
    useEffect(() => {
        if (!hydrated) return;
        snapshotTimerRef.current = setInterval(() => {
            pushHistorySnapshot(state).catch(err => console.warn('Snapshot error:', err));
        }, 10 * 60 * 1000);
        return () => clearInterval(snapshotTimerRef.current);
    }, [hydrated, state]);

    // 4) Beforeunload: escritura SINCRÓNICA a localStorage (IndexedDB no puede ser sync)
    useEffect(() => {
        const handler = () => {
            try {
                const payload = { state, savedAt: new Date().toISOString(), version: 1 };
                localStorage.setItem('dashboard_state_v1', JSON.stringify(payload));
            } catch { /* ignore quota errors at unload */ }
        };
        window.addEventListener('beforeunload', handler);
        window.addEventListener('pagehide', handler); // iOS Safari
        return () => {
            window.removeEventListener('beforeunload', handler);
            window.removeEventListener('pagehide', handler);
        };
    }, [state]);

    const actions = {
        updateBusiness: (patch) => dispatch({ type: 'UPDATE_BUSINESS', payload: patch }),
        updateIntegraciones: (patch) => dispatch({ type: 'UPDATE_INTEGRACIONES', payload: patch }),
        setCurrentSucursal: (id) => dispatch({ type: 'SET_CURRENT_SUCURSAL', payload: id }),
        markOnboarded: () => dispatch({ type: 'UPDATE_META', payload: { onboarded: true } }),
        resetOnboarding: () => dispatch({ type: 'UPDATE_META', payload: { onboarded: false } }),
        reset: () => dispatch({ type: 'RESET' }),
        add: (collection, item) => dispatch({ type: 'ADD_ITEM', payload: { collection, item } }),
        update: (collection, id, patch) => dispatch({ type: 'UPDATE_ITEM', payload: { collection, id, patch } }),
        remove: (collection, id) => dispatch({ type: 'REMOVE_ITEM', payload: { collection, id } }),
        bulkAdd: (collection, items) => dispatch({ type: 'BULK_ADD', payload: { collection, items } }),
        hydrate: (newState) => dispatch({ type: 'HYDRATE', payload: newState }),
        forceSave: async () => {
            try {
                setSaveStatus(s => ({ ...s, saving: true }));
                const result = await saveState(state);
                await pushHistorySnapshot(state);
                setSaveStatus({
                    saving: false,
                    lastSaved: result.savedAt,
                    lastError: null,
                    source: result.idbOk ? 'indexeddb' : 'localstorage'
                });
                return result;
            } catch (err) {
                setSaveStatus(s => ({ ...s, saving: false, lastError: err.message }));
                throw err;
            }
        }
    };

    return (
        <DataContext.Provider value={{ state, actions, hydrated, saveStatus }}>
            {children}
        </DataContext.Provider>
    );
}

export function useData() {
    const ctx = useContext(DataContext);
    if (!ctx) throw new Error('useData must be used within DataProvider');
    return ctx;
}

export function filterBySucursal(items, currentSucursalId, field = 'sucursalId') {
    if (!currentSucursalId || currentSucursalId === 'all') return items;
    return (items || []).filter(x => x[field] === currentSucursalId);
}

// ═══════════════════════════════════════════════════════════════════
// RUBRO-SPECIFIC CONFIGURATION
// ═══════════════════════════════════════════════════════════════════
const RUBRO_CONFIG = {
    general: {
        productEmoji: '📦',
        labels: {
            item: 'Producto', items: 'Productos', itemPlural: 'productos',
            sale: 'Venta', sales: 'Ventas',
            stock: 'Stock', inventory: 'Inventario',
            client: 'Cliente', clients: 'Clientes',
            pos: 'Caja / POS', posDesc: 'Registrar ventas rápido',
            category: 'Categoría',
            orders: 'Pedidos online'
        },
        hideSections: ['mesas', 'reservas', 'kds'],
        defaultCategorias: ['General', 'Destacados', 'Promociones']
    },
    kiosco: {
        productEmoji: '🍬',
        labels: {
            item: 'Producto', items: 'Productos', itemPlural: 'productos',
            sale: 'Venta', sales: 'Ventas',
            stock: 'Stock', inventory: 'Depósito',
            client: 'Cliente', clients: 'Clientes',
            pos: 'Caja registradora', posDesc: 'Cobro rápido con código de barras',
            category: 'Rubro',
            orders: 'Pedidos WhatsApp / Delivery'
        },
        hideSections: ['mesas', 'reservas', 'kds'],
        defaultCategorias: ['Golosinas', 'Cigarrillos', 'Bebidas', 'Galletitas', 'Lácteos', 'Fiambres', 'Panificados', 'Limpieza', 'Almacén', 'Revistas']
    },
    restaurante: {
        productEmoji: '🍽️',
        labels: {
            item: 'Plato / Bebida', items: 'Menú', itemPlural: 'items del menú',
            sale: 'Comanda', sales: 'Comandas',
            stock: 'Ingredientes', inventory: 'Insumos de cocina',
            client: 'Comensal', clients: 'Comensales',
            pos: 'Comanda / Cobro', posDesc: 'Cargar pedidos por mesa',
            category: 'Categoría del menú',
            orders: 'Delivery (PedidosYa / Rappi)'
        },
        hideSections: [],
        defaultCategorias: ['Entradas', 'Principales', 'Pastas', 'Carnes', 'Pescados', 'Ensaladas', 'Postres', 'Bebidas', 'Vinos', 'Cafetería']
    },
    accesorios: {
        productEmoji: '✨',
        labels: {
            item: 'Accesorio', items: 'Accesorios', itemPlural: 'accesorios',
            sale: 'Venta', sales: 'Ventas',
            stock: 'Stock', inventory: 'Inventario',
            client: 'Cliente', clients: 'Clientes',
            pos: 'Caja / POS', posDesc: 'Vender con opción de talle/color',
            category: 'Categoría',
            orders: 'Pedidos Instagram / Tienda'
        },
        hideSections: ['mesas', 'reservas', 'kds'],
        defaultCategorias: ['Aros', 'Collares', 'Pulseras', 'Anillos', 'Bolsos', 'Carteras', 'Cinturones', 'Bijouterie', 'Ropa', 'Calzado']
    },
    servicios: {
        productEmoji: '💼',
        labels: {
            item: 'Servicio', items: 'Servicios', itemPlural: 'servicios',
            sale: 'Reserva / Pago', sales: 'Reservas y pagos',
            stock: 'Disponibilidad', inventory: 'Disponibilidad',
            client: 'Cliente', clients: 'Clientes',
            pos: 'Cobro de servicio', posDesc: 'Facturar servicios prestados',
            category: 'Tipo de servicio',
            orders: 'Reservas online'
        },
        hideSections: ['mesas', 'kds'],
        defaultCategorias: ['Consultoría', 'Clases', 'Sesiones', 'Asesoría', 'Mantenimiento']
    },
    otro: {
        productEmoji: '📦',
        labels: {
            item: 'Item', items: 'Items', itemPlural: 'items',
            sale: 'Venta', sales: 'Ventas',
            stock: 'Stock', inventory: 'Inventario',
            client: 'Cliente', clients: 'Clientes',
            pos: 'Caja / POS', posDesc: 'Registrar cobros',
            category: 'Categoría',
            orders: 'Pedidos'
        },
        hideSections: ['mesas', 'reservas', 'kds'],
        defaultCategorias: ['General']
    }
};

export function getRubroConfig(rubro) {
    return RUBRO_CONFIG[rubro] || RUBRO_CONFIG.general;
}

// Reads current language's labels from i18n dictionaries (lazy, avoids circular)
let _i18nLabels = null;
function loadI18nLabels() {
    if (_i18nLabels) return _i18nLabels;
    try {
        _i18nLabels = require('../i18n').getRubroLabelsI18n;
    } catch {
        _i18nLabels = null;
    }
    return _i18nLabels;
}

export function getRubroLabels(rubro) {
    // Try i18n first (only works if i18n module is ready)
    if (typeof window !== 'undefined') {
        try {
            // Dynamic access to i18n without static import (avoids React/module cycles)
            const mod = window.__i18nRubroLabels;
            if (typeof mod === 'function') {
                const labels = mod(rubro);
                if (labels) return labels;
            }
        } catch { /* fall through */ }
    }
    // Fallback: hardcoded Spanish labels from RUBRO_CONFIG
    return getRubroConfig(rubro).labels;
}

export function shouldShowSection(rubro, sectionId) {
    const config = getRubroConfig(rubro);
    if (config.hideSections?.includes(sectionId)) return false;
    return true;
}

// ═══════════════════════════════════════════════════════════════════
// CONTEXTUAL HELP TEXT PER SECTION
// ═══════════════════════════════════════════════════════════════════
export const SECTION_HELP = {
    home: {
        what: 'Vista general de tu negocio con los números clave del día.',
        how: 'Los KPIs se actualizan automáticamente cuando cargás datos. Usá el selector de sucursal arriba para filtrar.'
    },
    informes: {
        what: 'Reportes detallados por sucursal, empleado y finanzas.',
        how: 'Elegí un período (7/30/90 días, año, todo). Los 4 tabs muestran la misma data desde distintos ángulos: General, Por Sucursal (comparativa), Por Empleado (ranking), Financiero (rentabilidad).'
    },
    sucursales: {
        what: 'Cada local físico, depósito u online. Es la base de todo el sistema.',
        how: 'Empezá con tu primera sucursal. Todo lo que cargues después (ventas, empleados, stock) se asocia a una sucursal. El selector global en la barra superior filtra la app entera.'
    },
    usuarios: {
        what: 'Personas que acceden al Dashboard (no son empleados operativos).',
        how: 'Cada cuenta tiene un ROL que define qué puede ver: Admin (todo), Gerente (su sucursal completa), Vendedor (POS + sus ventas), Contador (solo reportes). Asigná una sucursal para restringir el alcance.'
    },
    empleados: {
        what: 'Tu equipo operativo. Cada uno asignado a una sucursal.',
        how: 'Cargá nombre, DNI, cargo y sueldo base. Si pagás por comisión, poné el %. Después, cada venta puede asignarse a un empleado y en Informes vas a ver el ranking por facturación y comisiones a pagar.'
    },
    asistencia: {
        what: 'Marca diaria de presentes, ausentes, tardanzas o licencias.',
        how: 'Registrá día por día quién vino. Tipos: presente, ausente, tardanza, licencia, feriado. En Informes → Por Empleado vas a ver el % de asistencia.'
    },
    tareas: {
        what: 'Tablero Kanban de tareas del equipo.',
        how: 'Creá tareas con título, prioridad, sucursal y asignado a. Movélas entre Pendiente → En progreso → Completado.'
    },
    productos: {
        what: 'Todo lo que vendés, con precio, stock y categoría.',
        how: 'Ingresá código (o dejá vacío), nombre, categoría, precios y stock. Poné un "stock mínimo" para que te avise cuando hay que reponer. El stock se descuenta solo al vender.'
    },
    pos: {
        what: 'Caja registradora. Cobrá rápido desde acá.',
        how: 'Tocá un producto para agregarlo al ticket. Ajustá cantidades. Elegí método de pago. Confirmá. El stock se descuenta automáticamente.'
    },
    ventas: {
        what: 'Historial completo de todas las ventas registradas.',
        how: 'Filtrá por sucursal con el selector arriba. Cada venta muestra fecha, empleado, cliente, items, método y total.'
    },
    pedidos: {
        what: 'Pedidos que llegan por canales digitales.',
        how: 'Cargá cada pedido con canal (Web/WA/IG/Delivery), cliente, total y estado. Actualizá el estado: pendiente → preparando → enviado → entregado.'
    },
    caja: {
        what: 'Cierre Z: apertura y cierre de caja por sucursal y día.',
        how: 'Monto de apertura (lo que dejaste al abrir). Al cerrar, poné lo que realmente hay en efectivo. El sistema calcula el esperado (apertura + ventas - gastos) y te muestra la diferencia. Si hay diferencia grande, revisá.'
    },
    transferencias: {
        what: 'Mercadería que se mueve de una sucursal a otra.',
        how: 'Desde qué sucursal, hacia cuál, qué producto y cuántos. Útil para trazabilidad.'
    },
    gastos: {
        what: 'Todo lo que sale de caja: alquiler, sueldos, proveedores, servicios.',
        how: 'Concepto, monto, categoría, sucursal y método. En Informes → Financiero vas a ver gastos vs ventas y tu margen real.'
    },
    banking: {
        what: 'Movimientos bancarios (complementario a ventas y gastos).',
        how: 'Útil para trackear transferencias entrantes, pagos a proveedores, depósitos de efectivo.'
    },
    proveedores: {
        what: 'Tus proveedores de mercadería, servicios o insumos.',
        how: 'Cargá datos de contacto, CUIT, y la DEUDA actual (lo que les debés). Gráficos de deuda por categoría y top deudores.'
    },
    clientes: {
        what: 'CRM básico. Quién te compra y cuánto.',
        how: 'Cargá clientes. Al hacer una venta, asignala a un cliente para acumular el histórico. En Informes vas a ver los que más compran.'
    },
    marketing: {
        what: 'Meta Ads, WhatsApp Business y Email Marketing.',
        how: 'Configurá tokens en Configuración → Integraciones. Una vez conectado, vas a ver reportes automáticos.'
    },
    agents: {
        what: 'Agentes AI que analizan tu data y dan insights.',
        how: 'Configurá API key de OpenAI o Anthropic en Configuración. Cada agente trabaja sobre tu data específica.'
    },
    instagram: {
        what: 'Analytics + planner de contenido.',
        how: 'Conectá Instagram Business ID para ver seguidores, alcance y engagement.'
    },
    tiktok: {
        what: 'Analytics de videos y sugerencias de contenido.',
        how: 'Conectá la API de TikTok para ver views, likes y shares de tus videos.'
    },
    analytics: {
        what: 'Tráfico de tu sitio web (Google Analytics 4).',
        how: 'Pegá tu GA4 Measurement ID (G-XXXXXXXXXX) en Configuración.'
    },
    web: {
        what: 'Integración con WooCommerce o Shopify.',
        how: 'Cargá la URL de tu tienda y las API keys en Configuración. Catálogo y pedidos se sincronizan.'
    },
    mesas: {
        what: 'Gestión de mesas del local (solo restaurantes).',
        how: 'Asigná número y capacidad. Al hacer comandas, elegí la mesa.'
    },
    reservas: {
        what: 'Reservas de mesas o turnos.',
        how: 'Cliente, fecha, hora, personas y mesa. Estados: confirmada, pendiente, cancelada.'
    },
    afip: {
        what: 'Facturación electrónica, VEPs, vencimientos fiscales y padrón AFIP.',
        how: 'Cargá tus datos fiscales (CUIT, condición IVA, punto de venta) en Configuración. Desde acá podés generar facturas A/B/C en PDF, trackear VEPs y ver próximos vencimientos.'
    },
    dataimport: {
        what: 'Subí Excels o CSVs y la IA los entiende y los importa automáticamente.',
        how: 'Arrastrá tu archivo, elegí qué tipo de datos son (productos, clientes, ventas, etc.) y la IA detecta las columnas y los agrega. Soporta formatos de Tiendanube, Mercado Libre, WooCommerce, y Excels caseros.'
    },
    backup: {
        what: 'Sistema de respaldos multi-capa para que tu data no se pierda nunca.',
        how: 'Guardado automático cada 30 seg en IndexedDB + localStorage. Snapshots cada 10 min (últimos 10). Descarga manual a JSON. Carpeta elegible (pendrive, Dropbox sync, etc.). Google Drive cuando conectes fase A.'
    },
    settings: {
        what: 'Datos del negocio, rubro, moneda, integraciones y backup.',
        how: 'Podés cambiar el RUBRO en cualquier momento — las secciones y labels se adaptan automáticamente. Exportá tu data como backup JSON.'
    }
};

export { DEFAULT_STATE };
