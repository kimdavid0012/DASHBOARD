import React, { createContext, useContext, useEffect, useReducer, useState } from 'react';
import { nanoid } from 'nanoid';

const STORAGE_KEY = 'dashboard_state_v1';

// ───────────── Initial/Default State ─────────────
const DEFAULT_STATE = {
    // Business settings (multi-rubro)
    business: {
        name: '',
        rubro: 'general', // general | kiosco | restaurante | accesorios | servicios | otro
        moneda: 'ARS',
        pais: 'Argentina',
        createdAt: null
    },

    // Sucursales
    sucursales: [],

    // Usuarios del sistema (no hay login real — solo gestión de cuentas)
    usuarios: [],

    // Empleados (pueden o no ser usuarios)
    empleados: [],

    // Clientes
    clientes: [],

    // Proveedores
    proveedores: [],

    // Productos / Articulos (inventario central)
    productos: [],

    // Ventas (cada una con sucursalId + empleadoId)
    ventas: [],

    // Pedidos online
    pedidos: [],

    // Gastos (por sucursal)
    gastos: [],

    // Caja diaria (apertura/cierre por sucursal y fecha)
    cajaDiaria: [],

    // Transferencias entre sucursales
    transferencias: [],

    // Tareas (kanban)
    tareas: [],

    // Asistencia de empleados
    asistencia: [],

    // Movimientos bancarios
    movimientosBancarios: [],

    // Configuración de marketing/AI (tokens, keys — vacíos por defecto)
    integraciones: {
        openaiKey: '',
        anthropicKey: '',
        metaAccessToken: '',
        metaPixelId: '',
        googleAnalyticsId: '',
        instagramBusinessId: '',
        wooConsumerKey: '',
        wooConsumerSecret: '',
        wooStoreUrl: '',
        mercadoPagoToken: '',
        driveFolder: ''
    },

    // App meta
    meta: {
        currentSucursalId: null, // 'all' or a specific id
        onboarded: false
    }
};

// ───────────── Reducer ─────────────
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

        // Generic collection mutations
        case 'ADD_ITEM': {
            const { collection, item } = action.payload;
            const id = item.id || nanoid(10);
            const createdAt = item.createdAt || new Date().toISOString();
            return {
                ...state,
                [collection]: [...(state[collection] || []), { ...item, id, createdAt }]
            };
        }

        case 'UPDATE_ITEM': {
            const { collection, id, patch } = action.payload;
            return {
                ...state,
                [collection]: (state[collection] || []).map(x => x.id === id ? { ...x, ...patch, updatedAt: new Date().toISOString() } : x)
            };
        }

        case 'REMOVE_ITEM': {
            const { collection, id } = action.payload;
            return {
                ...state,
                [collection]: (state[collection] || []).filter(x => x.id !== id)
            };
        }

        case 'BULK_ADD': {
            const { collection, items } = action.payload;
            const enriched = items.map(item => ({
                ...item,
                id: item.id || nanoid(10),
                createdAt: item.createdAt || new Date().toISOString()
            }));
            return {
                ...state,
                [collection]: [...(state[collection] || []), ...enriched]
            };
        }

        case 'RESET':
            return DEFAULT_STATE;

        default:
            return state;
    }
}

// ───────────── Context ─────────────
const DataContext = createContext(null);

export function DataProvider({ children }) {
    const [state, dispatch] = useReducer(reducer, DEFAULT_STATE);
    const [hydrated, setHydrated] = useState(false);

    // Hydrate from localStorage on mount
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                dispatch({ type: 'HYDRATE', payload: parsed });
            }
        } catch (err) {
            console.warn('Failed to hydrate state:', err);
        }
        setHydrated(true);
    }, []);

    // Persist on every change
    useEffect(() => {
        if (!hydrated) return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (err) {
            console.warn('Failed to persist state:', err);
        }
    }, [state, hydrated]);

    // ───── Actions (stable references via useReducer) ─────
    const actions = {
        // Business
        updateBusiness: (patch) => dispatch({ type: 'UPDATE_BUSINESS', payload: patch }),
        updateIntegraciones: (patch) => dispatch({ type: 'UPDATE_INTEGRACIONES', payload: patch }),
        setCurrentSucursal: (id) => dispatch({ type: 'SET_CURRENT_SUCURSAL', payload: id }),
        markOnboarded: () => dispatch({ type: 'UPDATE_META', payload: { onboarded: true } }),
        reset: () => dispatch({ type: 'RESET' }),

        // Generic CRUD
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

// Helper: filter a collection by current sucursal (returns all if 'all')
export function filterBySucursal(items, currentSucursalId, field = 'sucursalId') {
    if (!currentSucursalId || currentSucursalId === 'all') return items;
    return (items || []).filter(x => x[field] === currentSucursalId);
}

// Helper: rubro-aware label
const RUBRO_LABELS = {
    general: { item: 'Producto', items: 'Productos', sale: 'Venta', stock: 'Stock' },
    kiosco: { item: 'Producto', items: 'Productos', sale: 'Venta', stock: 'Stock' },
    restaurante: { item: 'Plato/Bebida', items: 'Menú', sale: 'Pedido/Venta', stock: 'Ingredientes' },
    accesorios: { item: 'Accesorio', items: 'Accesorios', sale: 'Venta', stock: 'Stock' },
    servicios: { item: 'Servicio', items: 'Servicios', sale: 'Reserva/Pago', stock: 'Disponibilidad' },
    otro: { item: 'Item', items: 'Items', sale: 'Venta', stock: 'Stock' }
};

export function getRubroLabels(rubro) {
    return RUBRO_LABELS[rubro] || RUBRO_LABELS.general;
}

export { DEFAULT_STATE };
