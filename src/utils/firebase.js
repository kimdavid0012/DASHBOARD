/**
 * Firebase integration - LAZY LOADED
 *
 * Only loads and initializes when user explicitly enables Cloud mode.
 * Free users stay 100% local — no Firebase cost for them.
 *
 * Config comes from env vars (Netlify):
 *   VITE_FIREBASE_API_KEY
 *   VITE_FIREBASE_AUTH_DOMAIN
 *   VITE_FIREBASE_PROJECT_ID
 *   VITE_FIREBASE_APP_ID
 */

let app = null;
let auth = null;
let firestore = null;
let initialized = false;

// Config hardcoded (only API key is public — it's OK to expose in frontend)
// Real auth happens via OAuth flow, not via this key.
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

export function isFirebaseConfigured() {
    return !!(firebaseConfig.apiKey && firebaseConfig.projectId);
}

export async function initFirebase() {
    if (initialized) return { app, auth, firestore };
    if (!isFirebaseConfigured()) {
        throw new Error('Firebase no está configurado. Falta env var VITE_FIREBASE_API_KEY.');
    }

    // Dynamic imports — solo bajan si el usuario entra al modo cloud
    const [
        { initializeApp },
        { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged },
        { getFirestore, doc, setDoc, getDoc, serverTimestamp }
    ] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
        import('firebase/firestore')
    ]);

    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    firestore = getFirestore(app);
    initialized = true;

    // Exportamos helpers ya con las funciones cargadas
    return {
        app, auth, firestore,
        GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
        doc, setDoc, getDoc, serverTimestamp
    };
}

// ═══════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════

/**
 * Sign in with Google + solicita scope de Drive.file
 * Retorna: { user, accessToken } donde accessToken sirve para Drive API
 */
export async function signInWithGoogle() {
    const fb = await initFirebase();
    const provider = new fb.GoogleAuthProvider();
    // Scope para crear/editar solo archivos que la app crea (drive.file)
    // Cambiar a 'https://www.googleapis.com/auth/drive' si querés scope completo
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    provider.setCustomParameters({ prompt: 'select_account' });

    const result = await fb.signInWithPopup(fb.auth, provider);
    const credential = fb.GoogleAuthProvider.credentialFromResult(result);

    const user = result.user;
    const accessToken = credential?.accessToken;

    // Guardar access token en sessionStorage (caduca al cerrar pestaña)
    // Para refresh real necesitás backend OAuth. Por ahora el user tiene que re-loguear.
    if (accessToken) {
        sessionStorage.setItem('gdrive_access_token', accessToken);
        sessionStorage.setItem('gdrive_token_issued_at', Date.now().toString());
    }

    // Crear/actualizar doc en Firestore (solo metadata, no data del negocio)
    await createOrUpdateUserDoc(user);

    return { user, accessToken };
}

export async function signOutUser() {
    const fb = await initFirebase();
    await fb.signOut(fb.auth);
    sessionStorage.removeItem('gdrive_access_token');
    sessionStorage.removeItem('gdrive_token_issued_at');
    sessionStorage.removeItem('gdrive_folder_id');
}

export async function getCurrentUser() {
    if (!initialized) return null;
    return auth?.currentUser || null;
}

export async function onAuthChange(callback) {
    const fb = await initFirebase();
    return fb.onAuthStateChanged(fb.auth, callback);
}

export function getAccessToken() {
    const token = sessionStorage.getItem('gdrive_access_token');
    const issuedAt = parseInt(sessionStorage.getItem('gdrive_token_issued_at') || '0', 10);
    // Google access tokens duran 1 hora. Marcamos como expirado a los 55 min.
    if (!token || Date.now() - issuedAt > 55 * 60 * 1000) return null;
    return token;
}

// ═══════════════════════════════════════════════════════════════════
// FIRESTORE — solo metadata del usuario (NO guardamos data del negocio)
// ═══════════════════════════════════════════════════════════════════

/**
 * Crea/actualiza doc del usuario en Firestore:
 *   users/{uid} = { uid, email, displayName, photoURL, plan, driveFolder, createdAt, lastSeenAt }
 * NO guardamos ventas/productos/clientes acá — eso va a Drive.
 */
async function createOrUpdateUserDoc(user) {
    const fb = await initFirebase();
    const userRef = fb.doc(fb.firestore, 'users', user.uid);
    const snap = await fb.getDoc(userRef);

    if (snap.exists()) {
        // Actualizar solo lastSeen
        await fb.setDoc(userRef, {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            lastSeenAt: fb.serverTimestamp()
        }, { merge: true });
    } else {
        // Nuevo usuario
        await fb.setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            plan: 'free',
            driveFolder: null, // se setea cuando se crea el folder
            createdAt: fb.serverTimestamp(),
            lastSeenAt: fb.serverTimestamp()
        });
    }
    return userRef;
}

export async function getUserDoc(uid) {
    const fb = await initFirebase();
    const snap = await fb.getDoc(fb.doc(fb.firestore, 'users', uid));
    return snap.exists() ? snap.data() : null;
}

export async function updateUserDoc(uid, patch) {
    const fb = await initFirebase();
    await fb.setDoc(fb.doc(fb.firestore, 'users', uid), patch, { merge: true });
}

/**
 * Call a Firebase Cloud Function (callable, not HTTP)
 * @param {string} name - Function name (e.g. 'afipRequestCAE')
 * @param {object} data - Request payload
 * @returns {Promise<object>} The function's return value
 */
export async function callFunction(name, data = {}) {
    await initFirebase();
    const { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-functions.js');
    const functions = getFunctions(app, 'us-central1');
    const fn = httpsCallable(functions, name);
    const result = await fn(data);
    return result.data;
}
