/**
 * Email Campaigns — marketing automation simple
 *
 * Generador de emails con IA a partir de:
 *  - Ocasión (welcome, abandoned cart, birthday, reactivation, promo, newsletter)
 *  - Datos del negocio (nombre, rubro)
 *  - Segmento (clientes_nuevos, clientes_frecuentes, inactivos, todos)
 *
 * No envía emails — los genera para copiar/pegar en tu proveedor favorito
 * (Mailchimp, Brevo, Resend, Zoho, Google Workspace directamente).
 *
 * Si el usuario tiene RESEND_API_KEY configurado, puede mandar desde acá.
 */

export const EMAIL_OCASIONES = [
    {
        id: 'welcome',
        label: '👋 Bienvenida',
        description: 'Email al registrar nuevo cliente',
        icon: '👋'
    },
    {
        id: 'abandoned_cart',
        label: '🛒 Carrito abandonado',
        description: 'Cliente no completó la compra',
        icon: '🛒'
    },
    {
        id: 'birthday',
        label: '🎂 Cumpleaños',
        description: 'Regalo / descuento de cumpleaños',
        icon: '🎂'
    },
    {
        id: 'reactivation',
        label: '🔁 Reactivación',
        description: 'Cliente inactivo >60 días',
        icon: '🔁'
    },
    {
        id: 'promo',
        label: '🎯 Promoción',
        description: 'Descuento o producto destacado',
        icon: '🎯'
    },
    {
        id: 'newsletter',
        label: '📰 Newsletter',
        description: 'Update mensual con novedades',
        icon: '📰'
    },
    {
        id: 'post_sale',
        label: '✨ Post-venta',
        description: 'Agradecer y pedir review',
        icon: '✨'
    },
    {
        id: 'vip',
        label: '⭐ VIP',
        description: 'Cliente top → acceso exclusivo',
        icon: '⭐'
    }
];

export const EMAIL_SEGMENTOS = [
    { id: 'all', label: 'Todos los clientes' },
    { id: 'new', label: 'Nuevos (últimos 30 días)' },
    { id: 'frequent', label: 'Frecuentes (3+ compras)' },
    { id: 'inactive', label: 'Inactivos (>60 días sin comprar)' },
    { id: 'vip', label: 'VIP (ticket promedio alto)' },
    { id: 'birthday_month', label: 'Cumpleaños este mes' }
];

/**
 * Segmenta los clientes según el criterio
 */
export function segmentCustomers(clientes, ventas, segmento) {
    if (segmento === 'all') return clientes;

    const now = Date.now();
    const dia = 86400000;

    if (segmento === 'new') {
        const cutoff = now - 30 * dia;
        return clientes.filter(c => new Date(c.createdAt || c.fecha || 0).getTime() >= cutoff);
    }

    if (segmento === 'frequent' || segmento === 'inactive' || segmento === 'vip') {
        // Count ventas por cliente
        const compras = {};
        ventas.forEach(v => {
            if (!v.clienteId) return;
            if (!compras[v.clienteId]) compras[v.clienteId] = { count: 0, total: 0, last: 0 };
            compras[v.clienteId].count++;
            compras[v.clienteId].total += Number(v.total || 0);
            const vd = new Date(v.fecha || 0).getTime();
            if (vd > compras[v.clienteId].last) compras[v.clienteId].last = vd;
        });

        if (segmento === 'frequent') {
            return clientes.filter(c => (compras[c.id]?.count || 0) >= 3);
        }
        if (segmento === 'inactive') {
            return clientes.filter(c => {
                const last = compras[c.id]?.last;
                return last && (now - last) > 60 * dia;
            });
        }
        if (segmento === 'vip') {
            const vals = Object.values(compras).map(c => c.total);
            const avg = vals.reduce((s, v) => s + v, 0) / (vals.length || 1);
            return clientes.filter(c => (compras[c.id]?.total || 0) > avg * 1.5);
        }
    }

    if (segmento === 'birthday_month') {
        const mes = new Date().getMonth() + 1;
        return clientes.filter(c => {
            if (!c.cumple) return false;
            const m = parseInt(String(c.cumple).slice(5, 7) || String(c.cumple).split('-')[1], 10);
            return m === mes;
        });
    }

    return clientes;
}

/**
 * Genera email con IA (Anthropic)
 */
export async function generateEmail({ apiKey, ocasion, business, segmento, cliente, context = {} }) {
    if (!apiKey) throw new Error('Falta Anthropic API key');

    const ocasionDef = EMAIL_OCASIONES.find(o => o.id === ocasion);
    const segmentoDef = EMAIL_SEGMENTOS.find(s => s.id === segmento);

    const prompt = `Sos un experto en email marketing para comercios argentinos. Generá un email breve y efectivo con los siguientes datos:

NEGOCIO:
- Nombre: ${business.name || 'el negocio'}
- Rubro: ${business.rubro || 'comercio'}
${business.description ? `- Descripción: ${business.description}` : ''}

TIPO DE EMAIL: ${ocasionDef?.label} — ${ocasionDef?.description}
SEGMENTO: ${segmentoDef?.label}

${cliente ? `DATOS DEL CLIENTE ESPECÍFICO:\n- Nombre: ${cliente.nombre}\n${cliente.email ? '- Email: ' + cliente.email : ''}` : ''}

${context.productoDestacado ? `PRODUCTO A DESTACAR: ${context.productoDestacado.nombre} — $${context.productoDestacado.precioVenta}` : ''}
${context.descuento ? `DESCUENTO A OFRECER: ${context.descuento}` : ''}
${context.cupon ? `CÓDIGO DE CUPÓN: ${context.cupon}` : ''}

REQUISITOS:
1. Subject line llamativo pero sin clickbait (max 60 chars)
2. Saludo personalizado (usa {nombre} como placeholder si no hay nombre específico)
3. Cuerpo breve (máximo 120 palabras), tono argentino directo y cercano
4. CTA claro (botón o link de acción)
5. Firma del negocio
6. Usar emojis con criterio (1-3 en total)
7. No usar lenguaje corporativo acartonado

Respondé SOLO con JSON válido, sin markdown, así:
{
  "subject": "...",
  "preheader": "texto de preview 100 chars max",
  "body_html": "HTML simple con <p>, <strong>, <a>, <br>",
  "body_text": "Versión texto plano"
}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-5',
            max_tokens: 1024,
            messages: [{ role: 'user', content: prompt }]
        })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    const text = data.content?.[0]?.text || '';
    // Extract JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Respuesta sin JSON válido');
    try {
        return JSON.parse(jsonMatch[0]);
    } catch (e) {
        throw new Error('JSON malformado: ' + e.message);
    }
}

/**
 * Personaliza un email template reemplazando {nombre} con el cliente
 */
export function personalizeEmail(email, cliente) {
    const nombre = cliente?.nombre?.split(' ')[0] || 'Hola';
    return {
        ...email,
        subject: email.subject.replace(/\{nombre\}/g, nombre),
        preheader: (email.preheader || '').replace(/\{nombre\}/g, nombre),
        body_html: email.body_html.replace(/\{nombre\}/g, nombre),
        body_text: email.body_text.replace(/\{nombre\}/g, nombre)
    };
}
