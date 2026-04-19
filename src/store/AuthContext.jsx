import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

const AuthContext = createContext(null);

// Config hardcoded check (sin importar el módulo)
function isFirebaseConfigured() {
    return !!(import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID);
}

/**
 * Modos de la app:
 *   'offline'  - sin login, todo local (default)
 *   'cloud'    - logueado con Google, sync con Drive
 *   'loading'  - inicializando
 */

export function AuthProvider({ children, onStateSync }) {
    const [mode, setMode] = useState('loading');
    const [user, setUser] = useState(null);
    const [syncStatus, setSyncStatus] = useState({
        lastSyncAt: null,
        syncing: false,
        error: null,
        pendingChanges: false,
        driveFolder: null
    });
    const unsubscribeRef = useRef(null);

    // Detect initial mode
    useEffect(() => {
        const savedMode = localStorage.getItem('dashboard_auth_mode') || 'offline';
        if (savedMode === 'cloud' && isFirebaseConfigured()) {
            tryRestoreCloudMode();
        } else {
            setMode('offline');
        }
    }, []);

    const tryRestoreCloudMode = async () => {
        try {
            const { onAuthChange } = await import('../utils/firebase');
            const unsub = await onAuthChange((fbUser) => {
                if (fbUser) {
                    setUser(fbUser);
                    setMode('cloud');
                } else {
                    setMode('offline');
                    setUser(null);
                }
            });
            unsubscribeRef.current = unsub;
        } catch (err) {
            console.warn('Firebase auth restore failed:', err);
            setMode('offline');
        }
    };

    // Sign in flow
    const signIn = useCallback(async () => {
        if (!isFirebaseConfigured()) {
            throw new Error('Modo cloud no disponible: falta configuración de Firebase en el servidor.');
        }
        try {
            const { signInWithGoogle } = await import('../utils/firebase');
            const { user: fbUser } = await signInWithGoogle();
            setUser(fbUser);
            setMode('cloud');
            localStorage.setItem('dashboard_auth_mode', 'cloud');
            return fbUser;
        } catch (err) {
            if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
                return null;
            }
            throw err;
        }
    }, []);

    const signOut = useCallback(async () => {
        try {
            const { signOutUser } = await import('../utils/firebase');
            await signOutUser();
        } catch (err) {
            console.warn('Sign out error:', err);
        }
        setUser(null);
        setMode('offline');
        localStorage.setItem('dashboard_auth_mode', 'offline');
    }, []);

    const switchToOffline = useCallback(() => {
        setMode('offline');
        localStorage.setItem('dashboard_auth_mode', 'offline');
    }, []);

    // Cleanup
    useEffect(() => {
        return () => {
            if (unsubscribeRef.current) unsubscribeRef.current();
        };
    }, []);

    const value = {
        mode,
        user,
        isCloud: mode === 'cloud',
        isOffline: mode === 'offline',
        isLoading: mode === 'loading',
        firebaseAvailable: isFirebaseConfigured(),
        syncStatus,
        setSyncStatus,
        signIn,
        signOut,
        switchToOffline
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
