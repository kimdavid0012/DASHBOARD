/**
 * WebAuthn helper — fichaje biométrico con huella / Face ID / Windows Hello
 *
 * Flujo:
 *  1. Empleado se registra (ENROLL): el dashboard genera un credential
 *     asociado al empleado. Se guarda credentialId en el empleado.
 *  2. Para fichar (AUTH): empleado usa huella/face-id → devuelve credentialId
 *     → buscamos a qué empleado pertenece → marcamos asistencia automática.
 *
 * Funciona en:
 *   - Android (huella / face unlock)
 *   - iPhone (Face ID / Touch ID en Safari iOS 14+)
 *   - Windows (Windows Hello)
 *   - Mac (Touch ID)
 *
 * Nota: El desafío aquí es que WebAuthn está pensado para autenticar una
 * cuenta específica. Acá lo usamos para IDENTIFICAR al empleado entre varios.
 * Usamos `allowCredentials` vacío + UI pidiendo pick (mejor cuando hay pocos).
 */

// Generador simple de challenge (para attendance kiosk basta con random local)
function randomChallenge() {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    return arr;
}

function bufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let str = '';
    for (let i = 0; i < bytes.byteLength; i++) str += String.fromCharCode(bytes[i]);
    return btoa(str);
}

function base64ToBuffer(base64) {
    const str = atob(base64);
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
    return bytes.buffer;
}

export function isWebAuthnSupported() {
    return typeof window !== 'undefined' &&
           window.PublicKeyCredential !== undefined &&
           typeof navigator.credentials?.create === 'function';
}

export async function isPlatformAuthenticatorAvailable() {
    if (!isWebAuthnSupported()) return false;
    try {
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
        return false;
    }
}

/**
 * Registra un empleado con huella. Devuelve credentialId que hay que guardar
 * en el registro del empleado.
 */
export async function enrollEmployee({ empleadoId, nombre, businessName }) {
    if (!isWebAuthnSupported()) throw new Error('WebAuthn no soportado en este navegador');

    const userIdBytes = new TextEncoder().encode(empleadoId);

    const publicKey = {
        challenge: randomChallenge(),
        rp: {
            name: businessName || 'Dashboard',
            // id opcional — usar default (current origin)
        },
        user: {
            id: userIdBytes,
            name: empleadoId,
            displayName: nombre
        },
        pubKeyCredParams: [
            { type: 'public-key', alg: -7 },   // ES256
            { type: 'public-key', alg: -257 }  // RS256
        ],
        authenticatorSelection: {
            authenticatorAttachment: 'platform', // obligar huella/face del device
            userVerification: 'required',
            residentKey: 'preferred'
        },
        timeout: 60000,
        attestation: 'none'
    };

    const credential = await navigator.credentials.create({ publicKey });
    if (!credential) throw new Error('No se generó credencial');

    return {
        credentialId: bufferToBase64(credential.rawId),
        type: credential.type,
        publicKey: credential.response?.publicKey ? bufferToBase64(credential.response.publicKey) : null,
        registeredAt: new Date().toISOString()
    };
}

/**
 * Pide fichaje biométrico y devuelve el credentialId que respondió
 * El caller busca a qué empleado corresponde en state.empleados[].webauthnCredentialId
 */
export async function authenticateForAttendance({ allowedCredentialIds = [] }) {
    if (!isWebAuthnSupported()) throw new Error('WebAuthn no soportado');

    const publicKey = {
        challenge: randomChallenge(),
        timeout: 60000,
        userVerification: 'required',
        allowCredentials: allowedCredentialIds.map(id => ({
            type: 'public-key',
            id: base64ToBuffer(id)
        }))
    };

    const assertion = await navigator.credentials.get({ publicKey });
    if (!assertion) throw new Error('No se recibió assertion');

    return bufferToBase64(assertion.rawId);
}

export const webauthnUtils = { bufferToBase64, base64ToBuffer };
