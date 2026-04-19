/**
 * AFIP — Web Services client
 *
 * Implementa:
 *   - WSAA (Web Service de Autenticación y Autorización)
 *       · Firma CMS local con certificado .p12
 *       · Obtiene Token + Sign (TA) con validez 12hs
 *       · Cachea el TA en Firestore para reutilizarlo
 *   - WSFEv1 (Facturación Electrónica)
 *       · FECompUltimoAutorizado → obtiene último comprobante
 *       · FECAESolicitar → solicita CAE para una nueva factura
 *       · FEParamGetTiposCbte → valida tipos disponibles
 *
 * Ambiente:
 *   - Testing (homologación): wswhomo.afip.gov.ar
 *   - Producción: wsaa.afip.gov.ar / servicios1.afip.gov.ar
 *
 * Secrets necesarios (Firebase):
 *   - AFIP_CUIT: CUIT del contribuyente (11 dígitos, sin guiones)
 *   - AFIP_CERT_P12_BASE64: certificado .p12 codificado en base64
 *   - AFIP_CERT_PASSPHRASE: contraseña del .p12 (si tiene)
 *   - AFIP_ENV: 'homo' | 'prod' (default 'homo' para seguridad)
 *
 * Cómo generar el .p12:
 *   1. Entrar a AFIP con clave fiscal → "Administrador de Relaciones"
 *   2. Generar certificado con CN = algún alias (ej: "dashboard-app")
 *   3. Descargar .crt + tu .key local
 *   4. Combinar en .p12:
 *        openssl pkcs12 -export -out afip.p12 -inkey private.key -in certificate.crt
 *   5. base64 afip.p12 | tr -d '\n' > afip.p12.b64
 *   6. firebase functions:secrets:set AFIP_CERT_P12_BASE64 < afip.p12.b64
 *
 * Luego vincular el alias al servicio WSFE en "Administrador de Relaciones".
 */

import forge from 'node-forge';
import soap from 'soap';
import xml2js from 'xml2js';
import admin from 'firebase-admin';

// ═══════════════════════════════════════════════════════════════════
// ENDPOINTS
// ═══════════════════════════════════════════════════════════════════
const ENDPOINTS = {
    homo: {
        wsaa: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms?wsdl',
        wsfe: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL'
    },
    prod: {
        wsaa: 'https://wsaa.afip.gov.ar/ws/services/LoginCms?wsdl',
        wsfe: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL'
    }
};

function getEnv() {
    return (process.env.AFIP_ENV || 'homo').toLowerCase();
}

// ═══════════════════════════════════════════════════════════════════
// WSAA — autenticación con certificado .p12
// ═══════════════════════════════════════════════════════════════════

/**
 * Carga el .p12 desde env var y extrae la clave privada + certificado
 */
function loadCertificate() {
    const b64 = process.env.AFIP_CERT_P12_BASE64;
    if (!b64) throw new Error('AFIP_CERT_P12_BASE64 no está configurado en secrets');

    const passphrase = process.env.AFIP_CERT_PASSPHRASE || '';
    const p12Der = forge.util.decode64(b64);
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, passphrase);

    // Extraer clave privada
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0];
    if (!keyBag) throw new Error('No se pudo extraer la clave privada del .p12');
    const privateKey = keyBag.key;

    // Extraer certificado
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = certBags[forge.pki.oids.certBag][0];
    if (!certBag) throw new Error('No se pudo extraer el certificado del .p12');
    const certificate = certBag.cert;

    return { privateKey, certificate };
}

/**
 * Genera el XML TRA (Ticket de Requerimiento de Acceso)
 * Válido por 12 horas desde generationTime.
 */
function buildTRA(service) {
    const now = new Date();
    const generationTime = new Date(now.getTime() - 60000).toISOString(); // -1min de margen
    const expirationTime = new Date(now.getTime() + 11 * 60 * 60 * 1000).toISOString(); // +11hs
    const uniqueId = Math.floor(now.getTime() / 1000);

    return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
    <header>
        <uniqueId>${uniqueId}</uniqueId>
        <generationTime>${generationTime}</generationTime>
        <expirationTime>${expirationTime}</expirationTime>
    </header>
    <service>${service}</service>
</loginTicketRequest>`;
}

/**
 * Firma el TRA con CMS (PKCS#7) usando la clave privada
 */
function signTRA(traXml, { privateKey, certificate }) {
    const p7 = forge.pkcs7.createSignedData();
    p7.content = forge.util.createBuffer(traXml, 'utf8');
    p7.addCertificate(certificate);
    p7.addSigner({
        key: privateKey,
        certificate: certificate,
        digestAlgorithm: forge.pki.oids.sha256,
        authenticatedAttributes: [
            { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
            { type: forge.pki.oids.messageDigest },
            { type: forge.pki.oids.signingTime, value: new Date() }
        ]
    });
    p7.sign({ detached: false });
    const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
    return forge.util.encode64(der);
}

/**
 * Llama al WSAA con el CMS firmado y obtiene el Token Acceso (TA)
 */
async function callWSAA(cms) {
    const env = getEnv();
    const wsaaUrl = ENDPOINTS[env].wsaa;
    const client = await soap.createClientAsync(wsaaUrl);
    const [result] = await client.loginCmsAsync({ in0: cms });
    const rawXml = result.loginCmsReturn;

    const parsed = await xml2js.parseStringPromise(rawXml, { explicitArray: false });
    const credentials = parsed.loginTicketResponse?.credentials;
    if (!credentials) throw new Error('WSAA no devolvió credenciales válidas');

    return {
        token: credentials.token,
        sign: credentials.sign,
        expiration: parsed.loginTicketResponse.header.expirationTime
    };
}

/**
 * Obtiene TA (Token Acceso) para un servicio. Cachea en Firestore.
 */
export async function getTA(service = 'wsfe') {
    const db = admin.firestore();
    const cuit = process.env.AFIP_CUIT;
    if (!cuit) throw new Error('AFIP_CUIT no está configurado');

    const env = getEnv();
    const cacheDoc = db.collection('afip_tokens').doc(`${env}_${service}_${cuit}`);
    const cached = await cacheDoc.get();

    if (cached.exists) {
        const data = cached.data();
        const expirationMs = new Date(data.expiration).getTime();
        // Renovamos si faltan menos de 30 min para expirar
        if (expirationMs - Date.now() > 30 * 60 * 1000) {
            return { token: data.token, sign: data.sign, cuit };
        }
    }

    // Generar nuevo TA
    const certs = loadCertificate();
    const tra = buildTRA(service);
    const cms = signTRA(tra, certs);
    const ta = await callWSAA(cms);

    await cacheDoc.set({
        token: ta.token,
        sign: ta.sign,
        expiration: ta.expiration,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { token: ta.token, sign: ta.sign, cuit };
}

// ═══════════════════════════════════════════════════════════════════
// WSFE — Facturación Electrónica
// ═══════════════════════════════════════════════════════════════════

async function getWSFEClient() {
    const env = getEnv();
    return soap.createClientAsync(ENDPOINTS[env].wsfe);
}

function makeAuth(ta) {
    return {
        Auth: {
            Token: ta.token,
            Sign: ta.sign,
            Cuit: ta.cuit
        }
    };
}

/**
 * Último número de comprobante autorizado para (puntoVenta, tipoComprobante)
 * Tipos: 1=Fact A, 6=Fact B, 11=Fact C, 19=Fact E
 */
export async function getUltimoComprobante(puntoVenta, tipoComprobante) {
    const ta = await getTA('wsfe');
    const client = await getWSFEClient();
    const [res] = await client.FECompUltimoAutorizadoAsync({
        ...makeAuth(ta),
        PtoVta: Number(puntoVenta),
        CbteTipo: Number(tipoComprobante)
    });
    const out = res.FECompUltimoAutorizadoResult;
    if (out.Errors?.Err?.length) {
        const err = Array.isArray(out.Errors.Err) ? out.Errors.Err[0] : out.Errors.Err;
        throw new Error(`AFIP ${err.Code}: ${err.Msg}`);
    }
    return Number(out.CbteNro || 0);
}

/**
 * Solicita CAE (Código de Autorización Electrónica) para un comprobante.
 *
 * @param {object} fact - Datos de la factura
 *   { puntoVenta, tipoComprobante, cuitDestino, docTipoDestino,
 *     importeTotal, importeNeto, importeIVA, importeExento,
 *     importeTrib, concepto, fechaCbte, items: [...] }
 */
export async function solicitarCAE(fact) {
    const ta = await getTA('wsfe');
    const client = await getWSFEClient();

    const ultimoNum = await getUltimoComprobante(fact.puntoVenta, fact.tipoComprobante);
    const nuevoNum = ultimoNum + 1;

    // Fecha en formato YYYYMMDD
    const hoy = new Date();
    const fechaCbte = fact.fechaCbte || (
        hoy.getFullYear().toString() +
        String(hoy.getMonth() + 1).padStart(2, '0') +
        String(hoy.getDate()).padStart(2, '0')
    );

    // Armar request
    const req = {
        ...makeAuth(ta),
        FeCAEReq: {
            FeCabReq: {
                CantReg: 1,
                PtoVta: Number(fact.puntoVenta),
                CbteTipo: Number(fact.tipoComprobante)
            },
            FeDetReq: {
                FECAEDetRequest: [{
                    Concepto: Number(fact.concepto || 1), // 1=productos, 2=servicios, 3=ambos
                    DocTipo: Number(fact.docTipoDestino || 80), // 80=CUIT, 86=CUIL, 96=DNI, 99=CF
                    DocNro: Number(fact.cuitDestino || 0),
                    CbteDesde: nuevoNum,
                    CbteHasta: nuevoNum,
                    CbteFch: fechaCbte,
                    ImpTotal: Number(fact.importeTotal || 0),
                    ImpTotConc: 0,
                    ImpNeto: Number(fact.importeNeto || 0),
                    ImpOpEx: Number(fact.importeExento || 0),
                    ImpTrib: Number(fact.importeTrib || 0),
                    ImpIVA: Number(fact.importeIVA || 0),
                    MonId: 'PES',
                    MonCotiz: 1,
                    // IVA solo si es tipo A/B/E (no C)
                    ...(fact.tipoComprobante !== 11 && fact.importeIVA > 0 && {
                        Iva: {
                            AlicIva: [{
                                Id: 5, // 21%
                                BaseImp: Number(fact.importeNeto || 0),
                                Importe: Number(fact.importeIVA || 0)
                            }]
                        }
                    })
                }]
            }
        }
    };

    const [res] = await client.FECAESolicitarAsync(req);
    const out = res.FECAESolicitarResult;

    // Manejar errores generales
    if (out.Errors?.Err) {
        const err = Array.isArray(out.Errors.Err) ? out.Errors.Err[0] : out.Errors.Err;
        throw new Error(`AFIP ${err.Code}: ${err.Msg}`);
    }

    const detalle = out.FeDetResp?.FECAEDetResponse;
    const det = Array.isArray(detalle) ? detalle[0] : detalle;

    if (!det) throw new Error('AFIP no devolvió detalle de respuesta');

    if (det.Resultado !== 'A') {
        const obs = det.Observaciones?.Obs;
        const obsList = Array.isArray(obs) ? obs : (obs ? [obs] : []);
        const msg = obsList.map(o => `${o.Code}: ${o.Msg}`).join(' | ') || 'Rechazado';
        throw new Error(`AFIP rechazó el comprobante: ${msg}`);
    }

    return {
        cae: det.CAE,
        caeVencimiento: det.CAEFchVto,
        numeroComprobante: nuevoNum,
        resultado: det.Resultado
    };
}

/**
 * Ping AFIP: verifica que el cert y token funcionen
 */
export async function pingAFIP() {
    try {
        const ta = await getTA('wsfe');
        const client = await getWSFEClient();
        const [res] = await client.FEDummyAsync({});
        return {
            ok: true,
            env: getEnv(),
            cuit: ta.cuit,
            appServer: res.FEDummyResult?.AppServer,
            dbServer: res.FEDummyResult?.DbServer,
            authServer: res.FEDummyResult?.AuthServer
        };
    } catch (err) {
        return { ok: false, error: err.message };
    }
}
