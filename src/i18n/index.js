/**
 * Lightweight i18n for Dashboard
 * Supports: es (Spanish/Argentine), en (English), ko (Korean)
 *
 * Usage:
 *   import { useT, setLang, getLang } from './i18n';
 *   const t = useT();
 *   <span>{t('home.title')}</span>
 *   <span>{t('pos.cart_items', { n: 3 })}</span>  // interpolation
 *
 * Per-rubro labels (producto, venta, cliente) ALSO translate — see RUBRO_LABELS_I18N.
 */

import { useSyncExternalStore } from 'react';
import { es } from './es';
import { en } from './en';
import { ko } from './ko';

const DICTIONARIES = { es, en, ko };
const LANGUAGE_NAMES = {
    es: { native: 'Español', flag: '🇦🇷' },
    en: { native: 'English', flag: '🇺🇸' },
    ko: { native: '한국어', flag: '🇰🇷' }
};

const STORAGE_KEY = 'dashboard_language';
const DEFAULT_LANG = 'es';

// ── External store for lang state (so components re-render on change) ──
let currentLang = (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY)) || DEFAULT_LANG;
const listeners = new Set();

function emit() {
    listeners.forEach(l => l());
}

function subscribe(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
}

function getSnapshot() {
    return currentLang;
}

// ── Public API ──
export function getLang() {
    return currentLang;
}

export function setLang(lang) {
    if (!DICTIONARIES[lang]) {
        console.warn('Unknown language:', lang);
        return;
    }
    currentLang = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* */ }
    // update <html lang> for accessibility/screen readers
    try { document.documentElement.lang = lang; } catch { /* */ }
    emit();
}

export function availableLangs() {
    return Object.keys(DICTIONARIES).map(code => ({
        code,
        ...LANGUAGE_NAMES[code]
    }));
}

/**
 * Core translate function. Walks nested dot-path in current dict.
 * Falls back to Spanish if missing, then to the key itself.
 * Supports {variable} interpolation.
 */
export function t(key, vars = {}) {
    const dict = DICTIONARIES[currentLang] || DICTIONARIES[DEFAULT_LANG];
    const fallback = DICTIONARIES[DEFAULT_LANG];

    const walk = (obj, path) => {
        const parts = path.split('.');
        let val = obj;
        for (const p of parts) {
            if (val == null) return null;
            val = val[p];
        }
        return typeof val === 'string' ? val : null;
    };

    let raw = walk(dict, key) || walk(fallback, key) || key;

    // Interpolación {var}
    return raw.replace(/\{(\w+)\}/g, (_, name) =>
        vars[name] !== undefined ? String(vars[name]) : `{${name}}`
    );
}

/**
 * React hook that subscribes to lang changes.
 * Returns a `t` function; components using it re-render when lang changes.
 */
export function useT() {
    useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    return t;
}

/**
 * Useful for non-UI translation (e.g., build CELA bot system prompt in user's lang)
 */
export function langInstructions() {
    // Used in AI prompts to instruct response language
    if (currentLang === 'en') {
        return 'Respond in English. Use clear, direct business English.';
    }
    if (currentLang === 'ko') {
        return '한국어로 응답해 주세요. 비즈니스에 적합한 정중하고 명확한 한국어를 사용하세요.';
    }
    // default Spanish (Argentina)
    return 'Respondé en español argentino (usando "vos", "tenés", "querés"). Directo y práctico.';
}

/**
 * Translate rubro-specific labels (producto/venta/cliente etc) per language
 */
export function getRubroLabelsI18n(rubro) {
    const labels = DICTIONARIES[currentLang]?.rubros?.[rubro];
    if (labels) return labels;
    // Fallback to Spanish
    return DICTIONARIES[DEFAULT_LANG]?.rubros?.[rubro] || DICTIONARIES[DEFAULT_LANG]?.rubros?.general;
}
