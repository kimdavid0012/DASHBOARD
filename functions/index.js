/**
 * Dashboard SaaS - Cloud Functions
 *
 * Runs AI agents on a schedule (hourly/daily/weekly) for users who opted in.
 *
 * Architecture:
 *   1. User configures schedule in AgentsPage → saved to Firestore agent_schedules/{uid}
 *   2. scheduledAgentRunner runs every 15min, checks which users have due agents
 *   3. For each due agent: reads user's data from their Google Drive, calls Claude/OpenAI,
 *      saves output to Firestore agent_outputs/{uid}/{agentId}/{timestamp}
 *   4. User sees results in UI next time they open the app
 *
 * Cost: ~120 invocations/day per active user = ~$0.00024/month per user
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { google } from 'googleapis';

initializeApp();
const db = getFirestore();

// Secrets (se setean con: firebase functions:secrets:set ANTHROPIC_API_KEY)
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

// ═══════════════════════════════════════════════════════════════════
// AGENT DEFINITIONS (espejo del frontend — evita divergencia)
// ═══════════════════════════════════════════════════════════════════
const AGENT_PROMPTS = {
    analista: (state) => `Sos un analista experto en datos de negocios ${state.business.rubro || 'general'}.
Analizá los datos de ${state.business.name || 'el negocio'} y dame en máximo 6 bullets:
1. 📈 Tendencia de ventas últimos 7 días vs semana anterior
2. 🎯 Top 3 productos que más crecieron
3. ⚠️ Alertas (caídas, stock crítico, anomalías)
4. 💡 1 acción concreta para esta semana
Respondé en español argentino, directo.`,

    stockbot: (state) => `Sos experto en inventarios. Analizá el stock de ${state.business.name || 'el negocio'}.
Dame: 🚨 URGENTE (reponer hoy), ⚠️ PRONTO (semana), 📈 predicción de quiebre, 💸 capital inmovilizado (stock lento).
Sé específico con nombres y números. En español argentino.`,

    clientebot: (state) => `Sos experto en CRM. Analizá clientes de ${state.business.name || 'el negocio'}.
Dame: 💎 Top 10 clientes, 😴 dormidos (>30 días sin comprar), 🆕 nuevos este mes, 💡 acción para cada grupo.
Accionable, español argentino.`,

    precios: (state) => `Sos auditor de pricing. Analizá los productos de ${state.business.name || 'el negocio'}.
Dame: 🚨 margen bajo (<20% kiosco, <50% resto), 💎 mejor valorados, 📉 margen negativo si hay.
Considerá inflación ARG. Sugerencias conservadoras.`,

    estratega: (state) => `Sos consultor senior pymes argentinas rubro ${state.business.rubro || 'general'}.
3 recomendaciones estratégicas priorizadas: Prioridad 1 (esta semana), 2 (2-4 semanas), 3 (trimestre).
Cada una con QUÉ/POR QUÉ/CÓMO medirlo. Considerá inflación, dólar, consumo.`,

    content: (state) => `Sos copywriter redes sociales negocio argentino ${state.business.rubro || 'general'}.
Generá: 📸 Post IG hoy, 📱 texto Stories corto, 🎵 idea TikTok, 💬 mensaje WhatsApp masivo.
Tono argentino, hashtags locales.`,

    trendscout: (state) => `Sos investigador de tendencias ${state.business.rubro || 'general'} en Argentina.
Reporte: 🔥 top 3 tendencias actuales, 📈 top 2 emergentes (3-6 meses), 🎯 acción concreta para el catálogo.
Específico, no genérico.`,

    ceo: (state) => `Sos CEO virtual de ${state.business.name || 'el negocio'}.
Briefing ejecutivo 8 bullets máximo:
🎯 Estado, 💰 número clave, 🚨 fuego (si hay), 📈 oportunidad, ⚡ 3 acciones hoy, 🧠 decisión pendiente.
Conciso, como memo a board.`
};

// ═══════════════════════════════════════════════════════════════════
// Helper: descargar data del user desde su Google Drive
// ═══════════════════════════════════════════════════════════════════
async function downloadUserState(uid, refreshToken) {
    if (!refreshToken) throw new Error('Usuario no tiene refresh token guardado');

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    // Obtener access token fresco
    const { token } = await oauth2Client.getAccessToken();
    if (!token) throw new Error('No pude refrescar access token');

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Buscar dashboard-latest.json en Dashboard-Data folder
    const folderSearch = await drive.files.list({
        q: `name='Dashboard-Data' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id)',
        pageSize: 1
    });
    const folderId = folderSearch.data.files?.[0]?.id;
    if (!folderId) throw new Error('Carpeta Dashboard-Data no encontrada');

    const fileSearch = await drive.files.list({
        q: `name='dashboard-latest.json' and '${folderId}' in parents and trashed=false`,
        fields: 'files(id)',
        pageSize: 1
    });
    const fileId = fileSearch.data.files?.[0]?.id;
    if (!fileId) throw new Error('dashboard-latest.json no existe aún');

    const fileContent = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'text' });
    const parsed = typeof fileContent.data === 'string' ? JSON.parse(fileContent.data) : fileContent.data;
    return parsed.state || parsed;
}

// ═══════════════════════════════════════════════════════════════════
// Helper: llamar a la IA (Claude o OpenAI)
// ═══════════════════════════════════════════════════════════════════
async function runAI(prompt, preferredProvider = 'anthropic') {
    if (preferredProvider === 'anthropic' && ANTHROPIC_API_KEY.value()) {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY.value(),
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-5',
                max_tokens: 1500,
                messages: [{ role: 'user', content: prompt }]
            })
        });
        const data = await res.json();
        if (data.error) throw new Error(`Anthropic: ${data.error.message}`);
        return data.content?.[0]?.text || '';
    }

    // OpenAI fallback
    if (!OPENAI_API_KEY.value()) throw new Error('No API key disponible');
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${OPENAI_API_KEY.value()}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            max_tokens: 1500,
            messages: [{ role: 'user', content: prompt }]
        })
    });
    const data = await res.json();
    if (data.error) throw new Error(`OpenAI: ${data.error.message}`);
    return data.choices?.[0]?.message?.content || '';
}

// ═══════════════════════════════════════════════════════════════════
// SCHEDULED: corre cada 15 min, dispara agentes que toca ejecutar
// ═══════════════════════════════════════════════════════════════════
export const scheduledAgentRunner = onSchedule(
    {
        schedule: 'every 15 minutes',
        timeZone: 'America/Argentina/Buenos_Aires',
        secrets: [ANTHROPIC_API_KEY, OPENAI_API_KEY],
        memory: '512MiB',
        timeoutSeconds: 300
    },
    async () => {
        const now = new Date();
        const hour = now.getHours();
        const dayOfWeek = now.getDay(); // 0=domingo, 1=lunes...
        const dayOfMonth = now.getDate();

        // Buscar users con schedules activos
        const schedulesSnap = await db.collection('agent_schedules').get();
        const toRun = [];

        schedulesSnap.forEach(doc => {
            const uid = doc.id;
            const schedules = doc.data().schedules || {};

            for (const [agentId, scheduleId] of Object.entries(schedules)) {
                let shouldRun = false;

                if (scheduleId === 'daily-morning' && hour === 9 && now.getMinutes() < 15) shouldRun = true;
                else if (scheduleId === 'daily-evening' && hour === 20 && now.getMinutes() < 15) shouldRun = true;
                else if (scheduleId === 'weekly' && dayOfWeek === 1 && hour === 9 && now.getMinutes() < 15) shouldRun = true;
                else if (scheduleId === 'monthly' && dayOfMonth === 1 && hour === 9 && now.getMinutes() < 15) shouldRun = true;

                if (shouldRun) toRun.push({ uid, agentId });
            }
        });

        console.log(`Scheduled run: ${toRun.length} agent executions`);

        // Ejecutar cada uno (en paralelo pero limitado)
        const results = await Promise.allSettled(
            toRun.map(({ uid, agentId }) => runAgentForUser(uid, agentId))
        );

        const ok = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        console.log(`Done: ${ok} OK, ${failed} failed`);
    }
);

// ═══════════════════════════════════════════════════════════════════
// CALLABLE: user dispara manualmente un agente desde el UI
// ═══════════════════════════════════════════════════════════════════
export const runAgentNow = onCall(
    { secrets: [ANTHROPIC_API_KEY, OPENAI_API_KEY] },
    async (request) => {
        if (!request.auth) throw new HttpsError('unauthenticated', 'Login requerido');

        const { agentId } = request.data;
        if (!agentId || !AGENT_PROMPTS[agentId]) {
            throw new HttpsError('invalid-argument', `Agent ${agentId} no existe`);
        }

        try {
            const result = await runAgentForUser(request.auth.uid, agentId);
            return { success: true, output: result.output, timestamp: result.timestamp };
        } catch (err) {
            throw new HttpsError('internal', err.message);
        }
    }
);

// ═══════════════════════════════════════════════════════════════════
// Core: ejecuta UN agente para UN user, guarda output en Firestore
// ═══════════════════════════════════════════════════════════════════
async function runAgentForUser(uid, agentId) {
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) throw new Error(`User ${uid} no existe`);
    const user = userDoc.data();

    // Necesitamos refresh token para leer Drive
    if (!user.driveRefreshToken) {
        // Fallback: usar snapshot que el cliente haya subido a users/{uid}/lastSnapshot
        if (!user.lastSnapshot) throw new Error('No hay data disponible para este user');
        return await executeAgent(uid, agentId, user.lastSnapshot);
    }

    const state = await downloadUserState(uid, user.driveRefreshToken);
    return await executeAgent(uid, agentId, state);
}

async function executeAgent(uid, agentId, state) {
    const prompt = AGENT_PROMPTS[agentId](state);
    const output = await runAI(prompt);
    const timestamp = new Date().toISOString();

    await db.collection('agent_outputs')
        .doc(uid)
        .collection(agentId)
        .doc(timestamp)
        .set({
            agentId,
            output,
            timestamp,
            createdAt: FieldValue.serverTimestamp()
        });

    // Limpieza: mantener solo últimos 30 outputs por agente
    const older = await db.collection('agent_outputs').doc(uid).collection(agentId)
        .orderBy('timestamp', 'desc').offset(30).get();
    const batch = db.batch();
    older.forEach(d => batch.delete(d.ref));
    if (!older.empty) await batch.commit();

    return { uid, agentId, output, timestamp };
}

// ═══════════════════════════════════════════════════════════════════
// AFIP - Facturación Electrónica (WSAA + WSFE)
// ═══════════════════════════════════════════════════════════════════

import { solicitarCAE, getUltimoComprobante, pingAFIP } from './afip.js';

// Secrets AFIP
const AFIP_CUIT = defineSecret('AFIP_CUIT');
const AFIP_CERT_P12_BASE64 = defineSecret('AFIP_CERT_P12_BASE64');
const AFIP_CERT_PASSPHRASE = defineSecret('AFIP_CERT_PASSPHRASE');

/**
 * Ping AFIP — verifica que cert + credenciales funcionen
 * Callable: afipPing()
 */
export const afipPing = onCall(
    { secrets: [AFIP_CUIT, AFIP_CERT_P12_BASE64, AFIP_CERT_PASSPHRASE], memory: '512MiB' },
    async (req) => {
        if (!req.auth) throw new HttpsError('unauthenticated', 'Login requerido');
        const res = await pingAFIP();
        return res;
    }
);

/**
 * Pedir CAE para una factura
 * Callable: afipRequestCAE({ puntoVenta, tipoComprobante, ... })
 *
 * tipoComprobante: 1=Fact A, 6=Fact B, 11=Fact C, 19=Fact E
 * docTipoDestino: 80=CUIT, 86=CUIL, 96=DNI, 99=Consumidor Final
 */
export const afipRequestCAE = onCall(
    { secrets: [AFIP_CUIT, AFIP_CERT_P12_BASE64, AFIP_CERT_PASSPHRASE], memory: '512MiB', timeoutSeconds: 60 },
    async (req) => {
        if (!req.auth) throw new HttpsError('unauthenticated', 'Login requerido');

        const { puntoVenta, tipoComprobante, importeTotal, importeNeto, importeIVA,
                importeExento = 0, importeTrib = 0, concepto = 1,
                cuitDestino = 0, docTipoDestino = 99, fechaCbte } = req.data || {};

        if (!puntoVenta || !tipoComprobante) {
            throw new HttpsError('invalid-argument', 'puntoVenta y tipoComprobante son requeridos');
        }
        if (importeTotal === undefined) {
            throw new HttpsError('invalid-argument', 'importeTotal es requerido');
        }

        try {
            const result = await solicitarCAE({
                puntoVenta, tipoComprobante,
                importeTotal, importeNeto, importeIVA,
                importeExento, importeTrib, concepto,
                cuitDestino, docTipoDestino, fechaCbte
            });

            // Guardar en Firestore para audit
            await db.collection('afip_cae_log').add({
                uid: req.auth.uid,
                env: process.env.AFIP_ENV || 'homo',
                request: req.data,
                response: result,
                createdAt: FieldValue.serverTimestamp()
            });

            return result;
        } catch (err) {
            // Guardar error también para debug
            await db.collection('afip_cae_errors').add({
                uid: req.auth.uid,
                request: req.data,
                error: err.message,
                createdAt: FieldValue.serverTimestamp()
            });
            throw new HttpsError('internal', err.message);
        }
    }
);

/**
 * Consultar último comprobante autorizado
 * Callable: afipUltimoComprobante({ puntoVenta, tipoComprobante })
 */
export const afipUltimoComprobante = onCall(
    { secrets: [AFIP_CUIT, AFIP_CERT_P12_BASE64, AFIP_CERT_PASSPHRASE], memory: '512MiB' },
    async (req) => {
        if (!req.auth) throw new HttpsError('unauthenticated', 'Login requerido');
        const { puntoVenta, tipoComprobante } = req.data || {};
        if (!puntoVenta || !tipoComprobante) {
            throw new HttpsError('invalid-argument', 'puntoVenta y tipoComprobante son requeridos');
        }
        try {
            const num = await getUltimoComprobante(puntoVenta, tipoComprobante);
            return { numero: num };
        } catch (err) {
            throw new HttpsError('internal', err.message);
        }
    }
);
