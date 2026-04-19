/**
 * Ticket Printer — ESC/POS protocol
 *
 * Soporta 3 métodos de impresión (en orden de preferencia):
 *   1. Web Bluetooth API (Chrome/Edge Android + desktop) — impresoras BT 58mm/80mm
 *   2. Web Serial API (Chrome desktop) — impresoras USB/Serial
 *   3. Fallback: window.print() a PDF/impresora del sistema (cualquier browser)
 *
 * Impresoras testeadas/compatibles:
 *   - Xprinter XP-58 / XP-T58 (BT y USB)
 *   - Epson TM-T20 / TM-m30
 *   - 3nStar RPT008
 *   - Bematech MP-4200
 *   - Genéricas chinas 58mm que sigan ESC/POS
 *
 * Uso:
 *   const printer = await TicketPrinter.connect(); // pide permisos al usuario
 *   await printer.printTicket({ business, items, total, ... });
 */

// ═══════════════════════════════════════════════════════════════════
// ESC/POS COMMAND BYTES
// ═══════════════════════════════════════════════════════════════════
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

const CMD = {
    INIT: [ESC, 0x40],              // ESC @ - reset printer
    BOLD_ON: [ESC, 0x45, 0x01],
    BOLD_OFF: [ESC, 0x45, 0x00],
    UNDERLINE_ON: [ESC, 0x2d, 0x01],
    UNDERLINE_OFF: [ESC, 0x2d, 0x00],
    ALIGN_LEFT: [ESC, 0x61, 0x00],
    ALIGN_CENTER: [ESC, 0x61, 0x01],
    ALIGN_RIGHT: [ESC, 0x61, 0x02],
    SIZE_NORMAL: [GS, 0x21, 0x00],
    SIZE_DOUBLE_HEIGHT: [GS, 0x21, 0x01],
    SIZE_DOUBLE_WIDTH: [GS, 0x21, 0x10],
    SIZE_DOUBLE: [GS, 0x21, 0x11],
    CUT: [GS, 0x56, 0x00],          // full cut
    PARTIAL_CUT: [GS, 0x56, 0x01],
    FEED_LINES: (n) => [ESC, 0x64, n],
    SET_CODEPAGE_LATIN: [ESC, 0x74, 0x10]  // CP858 for Spanish chars
};

// Web Bluetooth service UUIDs common in ESC/POS printers
const BT_PRINTER_SERVICES = [
    '000018f0-0000-1000-8000-00805f9b34fb',   // Xprinter, generic
    '0000ff00-0000-1000-8000-00805f9b34fb',   // alt generic
    '49535343-fe7d-4ae5-8fa9-9fafd205e455',   // MLK BlePrinter
    '0000fee7-0000-1000-8000-00805f9b34fb'    // Bematech
];
const BT_WRITE_CHAR_UUIDS = [
    '00002af1-0000-1000-8000-00805f9b34fb',
    '0000ff02-0000-1000-8000-00805f9b34fb',
    '49535343-8841-43f4-a8d4-ecbe34729bb3'
];

// ═══════════════════════════════════════════════════════════════════
// FEATURE DETECTION
// ═══════════════════════════════════════════════════════════════════
export function getPrintingCapabilities() {
    const ua = navigator.userAgent;
    const isFirefox = /Firefox/i.test(ua);
    const isSafari = /Safari/i.test(ua) && !/Chrome|Edg/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);

    return {
        bluetooth: 'bluetooth' in navigator && !isFirefox && !isSafari,
        serial: 'serial' in navigator,
        print: true, // window.print siempre funciona
        platform: isIOS ? 'ios' : isFirefox ? 'firefox' : isSafari ? 'safari' : 'chromium'
    };
}

// ═══════════════════════════════════════════════════════════════════
// BYTE HELPERS
// ═══════════════════════════════════════════════════════════════════

/**
 * Convierte string UTF-8 a bytes ISO-8859-1/CP858 (Latin1 con eñe, tildes)
 * ESC/POS usa codepage, no UTF-8
 */
function stringToBytes(str) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code < 0x80) {
            bytes.push(code);
        } else if (code < 0x100) {
            // Latin1 direct
            bytes.push(code);
        } else {
            // Caracteres especiales comunes mapeados a CP858
            const map = {
                0x20AC: 0xD5, // €
                0x2018: 0x27, 0x2019: 0x27,  // smart quotes → '
                0x201C: 0x22, 0x201D: 0x22,  // " → "
                0x2013: 0x2D, 0x2014: 0x2D   // dashes → -
            };
            bytes.push(map[code] || 0x3F); // ? for unknown
        }
    }
    return bytes;
}

/**
 * Builder pattern para armar el stream de bytes del ticket
 */
class TicketBuilder {
    constructor() {
        this.bytes = [];
        this.push(CMD.INIT);
        this.push(CMD.SET_CODEPAGE_LATIN);
    }

    push(arrOrByte) {
        if (Array.isArray(arrOrByte)) {
            this.bytes.push(...arrOrByte);
        } else {
            this.bytes.push(arrOrByte);
        }
        return this;
    }

    text(str) {
        this.push(stringToBytes(String(str)));
        return this;
    }

    line(str = '') {
        this.text(str);
        this.push(LF);
        return this;
    }

    bold(on = true) { return this.push(on ? CMD.BOLD_ON : CMD.BOLD_OFF); }
    center() { return this.push(CMD.ALIGN_CENTER); }
    left() { return this.push(CMD.ALIGN_LEFT); }
    right() { return this.push(CMD.ALIGN_RIGHT); }
    doubleSize() { return this.push(CMD.SIZE_DOUBLE); }
    doubleHeight() { return this.push(CMD.SIZE_DOUBLE_HEIGHT); }
    normalSize() { return this.push(CMD.SIZE_NORMAL); }
    feed(n = 1) { return this.push(CMD.FEED_LINES(n)); }
    cut() { return this.push(CMD.CUT); }

    /**
     * Línea horizontal de '-' del ancho del ticket
     */
    hr(width = 32) {
        return this.line('-'.repeat(width));
    }

    /**
     * Línea en 2 columnas: izq y der alineado
     * Ej: twoCol('Coca 500ml', '$1500', 32)
     */
    twoCol(left, right, width = 32) {
        const rightStr = String(right);
        const leftMax = width - rightStr.length - 1;
        let leftStr = String(left);
        if (leftStr.length > leftMax) {
            leftStr = leftStr.slice(0, leftMax - 1) + '.';
        }
        const pad = ' '.repeat(width - leftStr.length - rightStr.length);
        return this.line(leftStr + pad + rightStr);
    }

    build() {
        return new Uint8Array(this.bytes);
    }
}

// ═══════════════════════════════════════════════════════════════════
// TICKET LAYOUT
// ═══════════════════════════════════════════════════════════════════

/**
 * Arma bytes ESC/POS para un ticket de venta estándar
 * @param {object} data - { business, sucursal, empleado, items, total, subtotal, descuento, metodoPago, cliente, fecha, numero }
 * @param {object} opts - { widthChars: 32 para 58mm, 48 para 80mm }
 */
export function buildSalesTicket(data, opts = {}) {
    const width = opts.widthChars || 32;
    const t = new TicketBuilder();

    // Header — business name
    t.center().bold(true).doubleHeight();
    t.line(data.business?.name || 'Mi Negocio');
    t.normalSize().bold(false);

    // Sucursal & fiscal
    if (data.sucursal?.nombre) t.line(data.sucursal.nombre);
    if (data.business?.cuit) t.line(`CUIT: ${data.business.cuit}`);
    if (data.business?.condicionIva) t.line(data.business.condicionIva);
    if (data.sucursal?.direccion) t.line(data.sucursal.direccion);

    t.hr(width);

    // Ticket metadata
    t.left();
    const fecha = new Date(data.fecha || Date.now());
    const fechaStr = fecha.toLocaleDateString('es-AR');
    const horaStr = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    t.line(`Fecha: ${fechaStr}  ${horaStr}`);
    if (data.numero) t.line(`Ticket #${data.numero}`);
    if (data.empleado?.nombre) t.line(`Vende: ${data.empleado.nombre}`);
    if (data.cliente?.nombre && data.cliente.nombre !== 'Consumidor Final') {
        t.line(`Cliente: ${data.cliente.nombre}`);
    }

    t.hr(width);

    // Items
    t.bold(true);
    t.twoCol('DETALLE', 'PRECIO', width);
    t.bold(false);

    for (const item of (data.items || [])) {
        const qty = item.cantidad || item.qty || 1;
        const price = item.precio || item.price || 0;
        const name = item.nombre || item.name || '(sin nombre)';
        const lineTotal = qty * price;

        if (qty === 1) {
            t.twoCol(name, fmtMoney(lineTotal), width);
        } else {
            t.line(name);
            t.twoCol(`  ${qty} x ${fmtMoney(price)}`, fmtMoney(lineTotal), width);
        }

        // Variant info if present
        if (item.variantLabel) {
            t.line(`  ${item.variantLabel}`);
        }
    }

    t.hr(width);

    // Totals
    if (data.subtotal && data.subtotal !== data.total) {
        t.twoCol('Subtotal', fmtMoney(data.subtotal), width);
    }
    if (data.descuento && data.descuento > 0) {
        t.twoCol('Descuento', '-' + fmtMoney(data.descuento), width);
    }

    t.bold(true).doubleHeight();
    t.twoCol('TOTAL', fmtMoney(data.total || 0), Math.floor(width * 0.75));
    t.normalSize().bold(false);

    if (data.metodoPago) {
        t.line(`Pago: ${data.metodoPago}`);
    }

    t.feed(1);
    t.hr(width);

    // Footer
    t.center();
    t.line('¡Gracias por su compra!');
    if (data.business?.web) t.line(data.business.web);

    t.feed(3);
    t.cut();

    return t.build();
}

function fmtMoney(n) {
    const num = Number(n) || 0;
    return '$' + num.toLocaleString('es-AR', { maximumFractionDigits: 2 });
}

// ═══════════════════════════════════════════════════════════════════
// BLUETOOTH PRINTER
// ═══════════════════════════════════════════════════════════════════

class BluetoothPrinter {
    constructor(device, characteristic) {
        this.device = device;
        this.characteristic = characteristic;
        this.type = 'bluetooth';
    }

    async write(bytes) {
        // Write in chunks of 512 bytes max (BLE MTU limit)
        const chunkSize = 180;
        for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.slice(i, i + chunkSize);
            await this.characteristic.writeValueWithoutResponse(chunk);
            // Pequeño delay entre chunks para que buffer no se sobrecargue
            await new Promise(r => setTimeout(r, 20));
        }
    }

    async printTicket(data, opts) {
        const bytes = buildSalesTicket(data, opts);
        await this.write(bytes);
    }

    async testPrint() {
        const bytes = buildSalesTicket({
            business: { name: 'PRUEBA DE IMPRESION' },
            items: [
                { nombre: 'Producto de prueba', cantidad: 1, precio: 1000 }
            ],
            total: 1000,
            fecha: new Date()
        });
        await this.write(bytes);
    }

    async disconnect() {
        try {
            if (this.device.gatt.connected) {
                await this.device.gatt.disconnect();
            }
        } catch { /* */ }
    }
}

async function connectBluetooth() {
    if (!('bluetooth' in navigator)) {
        throw new Error('Tu navegador no soporta Web Bluetooth. Usá Chrome o Edge (Android o desktop).');
    }

    // Pedir al usuario que elija impresora
    const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true, // permite ver TODAS las impresoras, no filtradas
        optionalServices: BT_PRINTER_SERVICES
    });

    if (!device) throw new Error('No se seleccionó ninguna impresora');

    const server = await device.gatt.connect();

    // Encontrar el servicio que tenga una characteristic writable
    let writeChar = null;
    for (const svcUuid of BT_PRINTER_SERVICES) {
        try {
            const svc = await server.getPrimaryService(svcUuid);
            const chars = await svc.getCharacteristics();
            for (const ch of chars) {
                if (ch.properties.write || ch.properties.writeWithoutResponse) {
                    writeChar = ch;
                    break;
                }
            }
            if (writeChar) break;
        } catch { /* service not found, try next */ }
    }

    if (!writeChar) {
        // Último recurso: tratar de enumerar todos los servicios
        const services = await server.getPrimaryServices();
        for (const svc of services) {
            const chars = await svc.getCharacteristics();
            for (const ch of chars) {
                if (ch.properties.write || ch.properties.writeWithoutResponse) {
                    writeChar = ch;
                    break;
                }
            }
            if (writeChar) break;
        }
    }

    if (!writeChar) {
        throw new Error('No encontré una característica de escritura. ¿Es una impresora ESC/POS?');
    }

    return new BluetoothPrinter(device, writeChar);
}

// ═══════════════════════════════════════════════════════════════════
// SERIAL PRINTER (USB)
// ═══════════════════════════════════════════════════════════════════

class SerialPrinter {
    constructor(port) {
        this.port = port;
        this.type = 'serial';
    }

    async write(bytes) {
        const writer = this.port.writable.getWriter();
        try {
            await writer.write(bytes);
        } finally {
            writer.releaseLock();
        }
    }

    async printTicket(data, opts) {
        const bytes = buildSalesTicket(data, opts);
        await this.write(bytes);
    }

    async testPrint() {
        const bytes = buildSalesTicket({
            business: { name: 'PRUEBA USB' },
            items: [{ nombre: 'Test', cantidad: 1, precio: 1000 }],
            total: 1000,
            fecha: new Date()
        });
        await this.write(bytes);
    }

    async disconnect() {
        try { await this.port.close(); } catch { /* */ }
    }
}

async function connectSerial() {
    if (!('serial' in navigator)) {
        throw new Error('Tu navegador no soporta Web Serial. Usá Chrome o Edge en desktop.');
    }

    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600 });
    return new SerialPrinter(port);
}

// ═══════════════════════════════════════════════════════════════════
// HTML/PDF FALLBACK — para Safari/Firefox/iOS donde BT/Serial no andan
// ═══════════════════════════════════════════════════════════════════

class HtmlPrinter {
    constructor() {
        this.type = 'html';
    }

    async printTicket(data) {
        const html = buildTicketHTML(data);
        const win = window.open('', 'print', 'width=320,height=600');
        if (!win) {
            throw new Error('Tu navegador bloqueó la ventana de impresión. Permitila y probá de nuevo.');
        }
        win.document.write(html);
        win.document.close();
        // Pequeño delay para que el HTML cargue
        setTimeout(() => {
            win.focus();
            win.print();
            setTimeout(() => win.close(), 500);
        }, 250);
    }

    async testPrint() {
        return this.printTicket({
            business: { name: 'PRUEBA' },
            items: [{ nombre: 'Test item', cantidad: 1, precio: 1000 }],
            total: 1000,
            fecha: new Date()
        });
    }

    async disconnect() { /* noop */ }
}

function buildTicketHTML(data) {
    const fecha = new Date(data.fecha || Date.now());
    const itemsHtml = (data.items || []).map(item => {
        const qty = item.cantidad || item.qty || 1;
        const price = item.precio || item.price || 0;
        const name = item.nombre || item.name || '';
        const lineTotal = qty * price;
        return qty === 1
            ? `<tr><td>${escapeHtml(name)}</td><td style="text-align:right;">${fmtMoney(lineTotal)}</td></tr>`
            : `<tr><td>${escapeHtml(name)}<br><small>${qty} x ${fmtMoney(price)}</small></td><td style="text-align:right;">${fmtMoney(lineTotal)}</td></tr>`;
    }).join('');

    return `<!DOCTYPE html><html><head><title>Ticket</title>
<style>
  @page { size: 58mm auto; margin: 2mm; }
  body { font-family: 'Courier New', monospace; font-size: 11px; width: 54mm; margin: 0; padding: 4px; color: #000; }
  h1 { text-align: center; font-size: 14px; margin: 0 0 4px; }
  .sub { text-align: center; font-size: 10px; margin-bottom: 6px; }
  hr { border: none; border-top: 1px dashed #000; margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 1px 0; vertical-align: top; }
  .total { font-size: 14px; font-weight: bold; text-align: right; margin-top: 4px; }
  .footer { text-align: center; font-size: 10px; margin-top: 6px; }
  @media print { body { padding: 0; } }
</style></head><body>
<h1>${escapeHtml(data.business?.name || 'Mi Negocio')}</h1>
<div class="sub">
  ${data.sucursal?.nombre ? escapeHtml(data.sucursal.nombre) + '<br>' : ''}
  ${data.business?.cuit ? 'CUIT: ' + escapeHtml(data.business.cuit) + '<br>' : ''}
  ${data.business?.condicionIva ? escapeHtml(data.business.condicionIva) : ''}
</div>
<hr>
<div>
  Fecha: ${fecha.toLocaleDateString('es-AR')} ${fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}<br>
  ${data.numero ? 'Ticket #' + escapeHtml(String(data.numero)) + '<br>' : ''}
  ${data.empleado?.nombre ? 'Vende: ' + escapeHtml(data.empleado.nombre) + '<br>' : ''}
  ${data.cliente?.nombre && data.cliente.nombre !== 'Consumidor Final' ? 'Cliente: ' + escapeHtml(data.cliente.nombre) : ''}
</div>
<hr>
<table>${itemsHtml}</table>
<hr>
${data.descuento ? `<div style="text-align:right;">Descuento: -${fmtMoney(data.descuento)}</div>` : ''}
<div class="total">TOTAL: ${fmtMoney(data.total || 0)}</div>
${data.metodoPago ? `<div style="text-align:right;">Pago: ${escapeHtml(data.metodoPago)}</div>` : ''}
<div class="footer">¡Gracias por su compra!</div>
</body></html>`;
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

let cachedPrinter = null;

export const TicketPrinter = {
    /**
     * Conecta con impresora. Tipo preferido: 'bluetooth' | 'serial' | 'html' | 'auto'
     */
    async connect(type = 'auto') {
        const caps = getPrintingCapabilities();
        let actualType = type;

        if (type === 'auto') {
            actualType = caps.bluetooth ? 'bluetooth' : caps.serial ? 'serial' : 'html';
        }

        let printer;
        if (actualType === 'bluetooth') {
            printer = await connectBluetooth();
        } else if (actualType === 'serial') {
            printer = await connectSerial();
        } else {
            printer = new HtmlPrinter();
        }

        cachedPrinter = printer;
        return printer;
    },

    getPrinter() {
        return cachedPrinter;
    },

    async disconnect() {
        if (cachedPrinter) {
            await cachedPrinter.disconnect();
            cachedPrinter = null;
        }
    },

    getCapabilities: getPrintingCapabilities,

    buildSalesTicket,

    /**
     * Atajo: si hay printer cacheado lo usa, sino abre HTML fallback directo
     */
    async quickPrint(data, opts) {
        if (cachedPrinter) {
            try {
                await cachedPrinter.printTicket(data, opts);
                return { type: cachedPrinter.type };
            } catch (err) {
                console.warn('Cached printer failed, falling back to HTML:', err);
            }
        }
        const html = new HtmlPrinter();
        await html.printTicket(data);
        return { type: 'html', fallback: true };
    }
};

export default TicketPrinter;
