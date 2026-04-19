import React, { createContext, useContext, useEffect, useReducer, useState } from 'react';
import { nanoid } from 'nanoid';

const STORAGE_KEY = 'dashboard_state_v1';

const DEFAULT_STATE = {
    business: {
        name: '',
        rubro: 'general',
        moneda: 'ARS',
        pais: 'Argentina',
        createdAt: null
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
    integraciones: {
        openaiKey: '', anthropicKey: '',
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
            return { ...DEFAULT_STATE, ...action.payload, meta: { ...DEFAULT_STATE.meta, ...action.payload.meta } };
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

    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) dispatch({ type: 'HYDRATE', payload: JSON.parse(raw) });
        } catch (err) { console.warn('Hydrate failed:', err); }
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
        catch (err) { console.warn('Persist failed:', err); }
    }, [state, hydrated]);

    const actions = {
        updateBusiness: (patch) => dispatch({ type: 'UPDATE_BUSINESS', payload: patch }),
        updateIntegraciones: (patch) => dispatch({ type: 'UPDATE_INTEGRACIONES', payload: patch }),
        setCurrentSucursal: (id) => dispatch({ type: 'SET_CURRENT_SUCURSAL', payload: id }),
        markOnboarded: () => dispatch({ type: 'UPDATE_META', payload: { onboarded: true } }),
        reset: () => dispatch({ type: 'RESET' }),
        add: (collection, item) => dispatch({ type: 'ADD_ITEM', payload: { collection, item } }),
        update: (collection, id, patch) => dispatch({ type: 'UPDATE_ITEM', payload: { collection, id, patch } }),
        remove: (collection, id) => dispatch({ type: 'REMOVE_ITEM', payload: { collection, id } }),
        bulkAdd: (collection, items) => dispatch({ type: 'BULK_ADD', payload: { collection, items } })
    };

    return (
        <DataContext.Provider value={{ state, actions, hydrated }}>
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
        labels: {
            item: 'Producto', items: 'Productos', itemPlural: 'productos',
            sale: 'Venta', sales: 'Ventas',
            stock: 'Stock', inventory: 'Inventario',
            client: 'Cliente', clients: 'Clientes',
            pos: 'Caja / POS', posDesc: 'Registrar ventas rápido',
            category: 'Categoría',
            orders: 'Pedidos online'
        },
        hideSections: ['mesas', 'reservas'],
        defaultCategorias: ['General', 'Destacados', 'Promociones']
    },
    kiosco: {
        labels: {
            item: 'Producto', items: 'Productos', itemPlural: 'productos',
            sale: 'Venta', sales: 'Ventas',
            stock: 'Stock', inventory: 'Depósito',
            client: 'Cliente', clients: 'Clientes',
            pos: 'Caja registradora', posDesc: 'Cobro rápido con código de barras',
            category: 'Rubro',
            orders: 'Pedidos WhatsApp / Delivery'
        },
        hideSections: ['mesas', 'reservas'],
        defaultCategorias: ['Golosinas', 'Cigarrillos', 'Bebidas', 'Galletitas', 'Lácteos', 'Fiambres', 'Panificados', 'Limpieza', 'Almacén', 'Revistas']
    },
    restaurante: {
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
        labels: {
            item: 'Accesorio', items: 'Accesorios', itemPlural: 'accesorios',
            sale: 'Venta', sales: 'Ventas',
            stock: 'Stock', inventory: 'Inventario',
            client: 'Cliente', clients: 'Clientes',
            pos: 'Caja / POS', posDesc: 'Vender con opción de talle/color',
            category: 'Categoría',
            orders: 'Pedidos Instagram / Tienda'
        },
        hideSections: ['mesas', 'reservas'],
        defaultCategorias: ['Aros', 'Collares', 'Pulseras', 'Anillos', 'Bolsos', 'Carteras', 'Cinturones', 'Bijouterie', 'Ropa', 'Calzado']
    },
    servicios: {
        labels: {
            item: 'Servicio', items: 'Servicios', itemPlural: 'servicios',
            sale: 'Reserva / Pago', sales: 'Reservas y pagos',
            stock: 'Disponibilidad', inventory: 'Disponibilidad',
            client: 'Cliente', clients: 'Clientes',
            pos: 'Cobro de servicio', posDesc: 'Facturar servicios prestados',
            category: 'Tipo de servicio',
            orders: 'Reservas online'
        },
        hideSections: ['mesas'],
        defaultCategorias: ['Consultoría', 'Clases', 'Sesiones', 'Asesoría', 'Mantenimiento']
    },
    otro: {
        labels: {
            item: 'Item', items: 'Items', itemPlural: 'items',
            sale: 'Venta', sales: 'Ventas',
            stock: 'Stock', inventory: 'Inventario',
            client: 'Cliente', clients: 'Clientes',
            pos: 'Caja / POS', posDesc: 'Registrar cobros',
            category: 'Categoría',
            orders: 'Pedidos'
        },
        hideSections: ['mesas', 'reservas'],
        defaultCategorias: ['General']
    }
};

export function getRubroConfig(rubro) {
    return RUBRO_CONFIG[rubro] || RUBRO_CONFIG.general;
}

export function getRubroLabels(rubro) {
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
    settings: {
        what: 'Datos del negocio, rubro, moneda, integraciones y backup.',
        how: 'Podés cambiar el RUBRO en cualquier momento — las secciones y labels se adaptan automáticamente. Exportá tu data como backup JSON.'
    }
};

export { DEFAULT_STATE };
