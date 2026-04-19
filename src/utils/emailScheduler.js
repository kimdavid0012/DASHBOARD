/**
 * Email Scheduler — envía emails programados
 *
 * ADVERTENCIA CONCEPTUAL:
 * Sin backend 24/7, el scheduling SOLO funciona cuando el dashboard está abierto.
 * Si el dueño cierra el dashboard, los emails no se envían hasta que lo abra.
 *
 * Estrategias para producción real:
 *  1. Cloud Function scheduled (Firebase) que corre cada hora y chequea emails
 *     programados → envía con Resend. ESTA ES LA BUENA PERO REQUIERE DEPLOY.
 *  2. PWA con Periodic Background Sync (experimental Chrome Android)
 *  3. Este fallback: check cada 5 min cuando hay dashboard abierto
 *
 * De momento implementamos #3 como base. La #1 se puede agregar luego
 * referenciando los mismos documentos Firestore.
 */

import { sendEmailsViaResend } from './emailCampaigns';

export function startEmailScheduler(state, actions) {
    let timerId = null;

    const checkAndSend = async () => {
        try {
            const scheduled = state.emailScheduled || [];
            if (scheduled.length === 0) return;

            const now = Date.now();
            const due = scheduled.filter(s =>
                s.status === 'pending' &&
                new Date(s.sendAt).getTime() <= now
            );

            if (due.length === 0) return;

            const apiKey = state.integraciones?.resendApiKey;
            const fromEmail = state.integraciones?.resendFromEmail;

            if (!apiKey || !fromEmail) {
                console.warn('[scheduler] Resend no configurado, marcando emails como fallidos');
                due.forEach(s => actions.update('emailScheduled', s.id, {
                    status: 'failed',
                    error: 'Resend API Key o from email no configurados',
                    attemptedAt: new Date().toISOString()
                }));
                return;
            }

            for (const sch of due) {
                try {
                    // Marcar como 'sending' para evitar doble-envío
                    actions.update('emailScheduled', sch.id, { status: 'sending' });

                    const result = await sendEmailsViaResend({
                        apiKey,
                        fromEmail,
                        fromName: state.integraciones?.resendFromName,
                        recipients: sch.recipients || [],
                        subject: sch.subject,
                        html: sch.body_html,
                        text: sch.body_text
                    });

                    actions.update('emailScheduled', sch.id, {
                        status: 'sent',
                        sentAt: new Date().toISOString(),
                        sentCount: result.sent,
                        failedCount: result.failed,
                        errors: result.errors?.slice(0, 5)
                    });

                    console.log(`[scheduler] Email "${sch.subject}" enviado a ${result.sent}/${sch.recipients?.length} destinatarios`);
                } catch (err) {
                    actions.update('emailScheduled', sch.id, {
                        status: 'failed',
                        error: err.message,
                        attemptedAt: new Date().toISOString()
                    });
                }
            }
        } catch (err) {
            console.warn('[scheduler] Error:', err);
        }
    };

    // Check inmediato al iniciar
    checkAndSend();
    // Y cada 5 minutos
    timerId = setInterval(checkAndSend, 5 * 60 * 1000);

    return () => { if (timerId) clearInterval(timerId); };
}
