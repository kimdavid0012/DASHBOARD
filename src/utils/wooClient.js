/**
 * WooCommerce API Client — CORS-safe
 *
 * PROBLEMA: WooCommerce REST API no manda CORS headers. El browser bloquea
 * fetch() directo desde un dominio distinto.
 *
 * ESTRATEGIA (cascada):
 *  1. Si Firebase está activo → usar Cloud Function `wooFetch` (proxy seguro)
 *  2. Si no → intentar fetch directo (funciona si el admin habilitó CORS
 *     en WordPress con plugin "WP CORS" o .htaccess)
 *  3. Si falla → usar corsproxy.io (público, rate-limited)
 *
 * Retorna siempre {data, error} con mensajes claros si no se pudo traer.
 */

import { isFirebaseConfigured, callFunction, getCurrentUser } from './firebase';

const CORS_PROXY = 'https://corsproxy.io/?';
const WOO_ENDPOINTS_ALLOWED = [
    'orders', 'products', 'products/categories', 'customers',
    'reports/sales', 'reports/top_sellers', 'reports/orders/totals'
];

/**
 * Llama a un endpoint de WooCommerce con la mejor estrategia disponible
 */
export async function wooApiFetch({ storeUrl, consumerKey, consumerSecret, endpoint, params = {} }) {
    if (!storeUrl) return { data: null, error: 'Falta la URL de la tienda' };
    if (!consumerKey || !consumerSecret) return { data: null, error: 'Faltan Consumer Key / Secret de WooCommerce' };
    if (!endpoint) return { data: null, error: 'Falta el endpoint' };

    const cleanUrl = storeUrl.replace(/\/$/, '').replace(/^(?!https?:\/\/)/, 'https://');

    // Estrategia 1: Cloud Function (si Firebase está activo Y user logueado)
    if (isFirebaseConfigured()) {
        try {
            const result = await tryCloudFunction({ storeUrl: cleanUrl, consumerKey, consumerSecret, endpoint, params });
            if (result) return { data: result.data, error: null, via: 'cloud' };
        } catch (err) {
            // Sin user logueado o function no deployada → pasar al fallback
            if (!/unauthenticated|not-found/i.test(err.message)) {
                console.warn('[woo] cloud function fallida, intento directo:', err.message);
            }
        }
    }

    // Estrategia 2: Fetch directo (funciona si el admin habilitó CORS en WordPress)
    try {
        const result = await tryDirect({ storeUrl: cleanUrl, consumerKey, consumerSecret, endpoint, params });
        return { data: result, error: null, via: 'direct' };
    } catch (err) {
        // CORS error típicamente viene como TypeError: Failed to fetch
        console.warn('[woo] fetch directo falló:', err.message);
    }

    // Estrategia 3: Proxy público CORS
    try {
        const result = await tryCorsProxy({ storeUrl: cleanUrl, consumerKey, consumerSecret, endpoint, params });
        return { data: result, error: null, via: 'proxy' };
    } catch (err) {
        return {
            data: null,
            error: `No se pudo conectar. Opciones:\n1. Activá modo Cloud (login con Google) para usar proxy seguro.\n2. O instalá el plugin "WP CORS" en tu WordPress.\n\nDetalle técnico: ${err.message}`,
            via: 'none'
        };
    }
}

async function tryCloudFunction({ storeUrl, consumerKey, consumerSecret, endpoint, params }) {
    // Solo si hay usuario logueado (la function requiere auth)
    const user = await getCurrentUser();
    if (!user) throw new Error('unauthenticated');
    const res = await callFunction('wooFetch', { storeUrl, consumerKey, consumerSecret, endpoint, params });
    return res;
}

async function tryDirect({ storeUrl, consumerKey, consumerSecret, endpoint, params }) {
    const qs = new URLSearchParams(params);
    const url = `${storeUrl}/wp-json/wc/v3/${endpoint}${qs.toString() ? '?' + qs : ''}`;
    const auth = btoa(`${consumerKey}:${consumerSecret}`);
    const res = await fetch(url, {
        headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
}

async function tryCorsProxy({ storeUrl, consumerKey, consumerSecret, endpoint, params }) {
    const qs = new URLSearchParams(params);
    // WooCommerce permite pasar credenciales por URL params también (además de Basic auth)
    qs.append('consumer_key', consumerKey);
    qs.append('consumer_secret', consumerSecret);
    const targetUrl = `${storeUrl}/wp-json/wc/v3/${endpoint}?${qs.toString()}`;
    const proxyUrl = `${CORS_PROXY}${encodeURIComponent(targetUrl)}`;
    const res = await fetch(proxyUrl, {
        headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`Proxy HTTP ${res.status}`);
    return await res.json();
}

/**
 * Atajo: Fetch paralelo de orders + products + reports
 */
export async function wooFetchAll({ storeUrl, consumerKey, consumerSecret }) {
    const common = { storeUrl, consumerKey, consumerSecret };
    const [orders, products, reports] = await Promise.all([
        wooApiFetch({ ...common, endpoint: 'orders', params: { per_page: 50, orderby: 'date', order: 'desc' } }),
        wooApiFetch({ ...common, endpoint: 'products', params: { per_page: 100, orderby: 'popularity' } }),
        wooApiFetch({ ...common, endpoint: 'reports/sales', params: { period: 'month' } })
    ]);
    return {
        orders: orders.data || [],
        products: products.data || [],
        reports: reports.data || null,
        errors: [orders, products, reports].filter(r => r.error).map(r => r.error),
        via: orders.via
    };
}
