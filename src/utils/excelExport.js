/**
 * Excel Export — genera reportes profesionales con estilo usando exceljs
 *
 * Ventajas vs CSV:
 *   - Headers con color, bold, filtros automáticos
 *   - Freeze de la primera fila
 *   - Formato numérico ARS
 *   - Anchos automáticos
 *   - Totales con fórmulas SUM()
 *   - Multi-sheet workbooks
 *
 * Uso:
 *   import { exportReportToExcel } from '../utils/excelExport';
 *   exportReportToExcel({
 *     filename: 'Ventas-2026-abril.xlsx',
 *     sheets: [
 *       { name: 'Ventas', columns: [...], rows: [...], totals: {...} }
 *     ]
 *   });
 */

import ExcelJS from 'exceljs';

const CELA_ACCENT = 'FF63F1CB';
const DARK_BG = 'FF0A0A0F';
const HEADER_TEXT = 'FF0A0A0F';

/**
 * Exporta un reporte multi-sheet a Excel y dispara descarga
 * @param {Object} config
 * @param {string} config.filename - Nombre del archivo con extensión .xlsx
 * @param {string} [config.title] - Título del workbook (metadata)
 * @param {Array} config.sheets - Array de sheets
 * @param {string} config.sheets[].name - Nombre de la hoja
 * @param {Array} config.sheets[].columns - [{ header, key, width?, numFmt? }]
 * @param {Array} config.sheets[].rows - Objects con keys matching columns
 * @param {Object} [config.sheets[].totals] - { key: 'sum' | 'count' | 'avg' | value }
 * @param {string} [config.sheets[].subtitle] - Subtítulo que va arriba de la tabla
 */
export async function exportReportToExcel({ filename, title, sheets }) {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Dashboard';
    wb.created = new Date();
    if (title) wb.title = title;

    for (const sheetDef of sheets) {
        const ws = wb.addWorksheet(sheetDef.name.slice(0, 31)); // Excel max 31 chars

        let rowOffset = 1;

        // Subtítulo opcional con merge de celdas
        if (sheetDef.subtitle) {
            ws.mergeCells(1, 1, 1, sheetDef.columns.length);
            const titleCell = ws.getCell(1, 1);
            titleCell.value = sheetDef.subtitle;
            titleCell.font = { bold: true, size: 14, color: { argb: CELA_ACCENT } };
            titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
            ws.getRow(1).height = 24;
            rowOffset = 2;
            ws.addRow([]); // spacer
            rowOffset = 3;
        }

        // Configurar columnas
        ws.columns = sheetDef.columns.map(col => ({
            header: col.header,
            key: col.key,
            width: col.width || 15
        }));

        // El header row automático que exceljs crea cuando hacemos ws.columns
        // queda en la fila rowOffset. Lo formateamos:
        const headerRow = ws.getRow(rowOffset);
        headerRow.values = sheetDef.columns.map(c => c.header);
        headerRow.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CELA_ACCENT } };
            cell.font = { bold: true, color: { argb: HEADER_TEXT }, size: 11 };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FF000000' } },
                bottom: { style: 'thin', color: { argb: 'FF000000' } }
            };
        });
        headerRow.height = 24;

        // Agregar las filas de data
        sheetDef.rows.forEach((rowData, idx) => {
            const row = ws.addRow(rowData);
            row.eachCell((cell, colNumber) => {
                const colDef = sheetDef.columns[colNumber - 1];
                if (colDef.numFmt) {
                    cell.numFmt = colDef.numFmt;
                }
                // Zebra stripes
                if (idx % 2 === 1) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
                }
                cell.border = {
                    bottom: { style: 'hair', color: { argb: 'FFDDDDDD' } }
                };
            });
        });

        // Fila de totales
        if (sheetDef.totals) {
            const totalsArray = sheetDef.columns.map(col => {
                const totalDef = sheetDef.totals[col.key];
                if (!totalDef) return '';
                if (totalDef === 'sum') {
                    return sheetDef.rows.reduce((s, r) => s + (Number(r[col.key]) || 0), 0);
                }
                if (totalDef === 'count') {
                    return sheetDef.rows.length;
                }
                if (totalDef === 'avg') {
                    return sheetDef.rows.length > 0
                        ? sheetDef.rows.reduce((s, r) => s + (Number(r[col.key]) || 0), 0) / sheetDef.rows.length
                        : 0;
                }
                return totalDef;
            });
            const totalRow = ws.addRow(totalsArray);
            totalRow.eachCell((cell, colNumber) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BG } };
                cell.font = { bold: true, color: { argb: CELA_ACCENT }, size: 11 };
                const colDef = sheetDef.columns[colNumber - 1];
                if (colDef?.numFmt) cell.numFmt = colDef.numFmt;
                cell.border = {
                    top: { style: 'medium', color: { argb: 'FF000000' } }
                };
                if (colNumber === 1 && !cell.value) cell.value = 'TOTAL';
            });
            totalRow.height = 20;
        }

        // Freeze header row
        ws.views = [{ state: 'frozen', ySplit: rowOffset }];

        // Auto filter
        if (sheetDef.rows.length > 0) {
            ws.autoFilter = {
                from: { row: rowOffset, column: 1 },
                to: { row: rowOffset + sheetDef.rows.length, column: sheetDef.columns.length }
            };
        }
    }

    // Generar archivo y disparar descarga
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Atajos para formatos comunes
 */
export const fmt = {
    ars: '"$"#,##0.00',
    usd: '"US$"#,##0.00',
    percent: '0.00%',
    integer: '#,##0',
    date: 'dd/mm/yyyy',
    datetime: 'dd/mm/yyyy hh:mm'
};

/**
 * Helper para exportar INFORMES
 */
export async function exportInformes(state, range, descripcion) {
    const moneda = state.business?.moneda === 'USD' ? fmt.usd : fmt.ars;
    const filename = `Informes-${new Date().toISOString().slice(0, 10)}.xlsx`;

    const sheets = [];

    // Sheet Ventas
    if (state.ventas?.length > 0) {
        sheets.push({
            name: 'Ventas',
            subtitle: `Reporte de ventas · ${descripcion || 'Todo el período'}`,
            columns: [
                { header: 'Fecha', key: 'fecha', width: 14 },
                { header: 'Método', key: 'metodo', width: 15 },
                { header: 'Items', key: 'cantItems', width: 8, numFmt: fmt.integer },
                { header: 'Subtotal', key: 'subtotal', width: 15, numFmt: moneda },
                { header: 'Descuento', key: 'descuento', width: 12, numFmt: moneda },
                { header: 'Total', key: 'total', width: 15, numFmt: moneda }
            ],
            rows: state.ventas.map(v => ({
                fecha: v.fecha ? new Date(v.fecha).toLocaleDateString('es-AR') : '',
                metodo: v.metodo || 'efectivo',
                cantItems: (v.items || []).reduce((s, i) => s + Number(i.cantidad || 0), 0),
                subtotal: Number(v.subtotal || v.total || 0),
                descuento: Number(v.descuento || 0),
                total: Number(v.total || 0)
            })),
            totals: { total: 'sum', descuento: 'sum', cantItems: 'sum' }
        });
    }

    // Sheet Gastos
    if (state.gastos?.length > 0) {
        sheets.push({
            name: 'Gastos',
            subtitle: `Gastos del período · ${descripcion || 'Todo'}`,
            columns: [
                { header: 'Fecha', key: 'fecha', width: 14 },
                { header: 'Concepto', key: 'concepto', width: 30 },
                { header: 'Categoría', key: 'categoria', width: 18 },
                { header: 'Monto', key: 'monto', width: 15, numFmt: moneda }
            ],
            rows: state.gastos.map(g => ({
                fecha: g.fecha ? new Date(g.fecha).toLocaleDateString('es-AR') : '',
                concepto: g.concepto || '',
                categoria: g.categoria || 'Otros',
                monto: Number(g.monto || 0)
            })),
            totals: { monto: 'sum' }
        });
    }

    // Sheet Productos con stock
    if (state.productos?.length > 0) {
        sheets.push({
            name: 'Stock',
            subtitle: 'Catálogo de productos con stock actual',
            columns: [
                { header: 'Código', key: 'codigo', width: 12 },
                { header: 'Nombre', key: 'nombre', width: 30 },
                { header: 'Categoría', key: 'categoria', width: 15 },
                { header: 'Stock', key: 'stock', width: 10, numFmt: fmt.integer },
                { header: 'Stock Mín.', key: 'stockMinimo', width: 11, numFmt: fmt.integer },
                { header: 'P. Costo', key: 'precioCosto', width: 14, numFmt: moneda },
                { header: 'P. Venta', key: 'precioVenta', width: 14, numFmt: moneda },
                { header: 'Margen %', key: 'margen', width: 10, numFmt: '0.0%' },
                { header: 'Valor inventario', key: 'valorInv', width: 18, numFmt: moneda }
            ],
            rows: state.productos.map(p => {
                const costo = Number(p.precioCosto || 0);
                const venta = Number(p.precioVenta || 0);
                const stock = Number(p.stock || 0);
                return {
                    codigo: p.codigo || '',
                    nombre: p.nombre || '',
                    categoria: p.categoria || '',
                    stock,
                    stockMinimo: Number(p.stockMinimo || 5),
                    precioCosto: costo,
                    precioVenta: venta,
                    margen: venta > 0 ? (venta - costo) / venta : 0,
                    valorInv: stock * venta
                };
            }),
            totals: { stock: 'sum', valorInv: 'sum' }
        });
    }

    // Sheet AFIP
    if (state.afipFacturas?.length > 0) {
        sheets.push({
            name: 'Facturas AFIP',
            subtitle: 'Comprobantes electrónicos emitidos',
            columns: [
                { header: 'Fecha', key: 'fecha', width: 14 },
                { header: 'Tipo', key: 'tipo', width: 8 },
                { header: 'Nº', key: 'numero', width: 12 },
                { header: 'Cliente', key: 'cliente', width: 25 },
                { header: 'CUIT/DNI', key: 'doc', width: 14 },
                { header: 'Neto', key: 'neto', width: 14, numFmt: moneda },
                { header: 'IVA', key: 'iva', width: 12, numFmt: moneda },
                { header: 'Total', key: 'total', width: 14, numFmt: moneda },
                { header: 'CAE', key: 'cae', width: 18 }
            ],
            rows: state.afipFacturas.map(f => ({
                fecha: f.fecha ? new Date(f.fecha).toLocaleDateString('es-AR') : '',
                tipo: f.tipo || '',
                numero: `${f.puntoVenta || '0001'}-${String(f.numero || 1).padStart(8, '0')}`,
                cliente: f.cliente || 'Consumidor final',
                doc: f.nroDoc || '',
                neto: Number(f.neto || f.total - (f.iva || 0) || 0),
                iva: Number(f.iva || 0),
                total: Number(f.total || 0),
                cae: f.cae || ''
            })),
            totals: { neto: 'sum', iva: 'sum', total: 'sum' }
        });
    }

    if (sheets.length === 0) {
        alert('No hay datos para exportar.');
        return;
    }

    await exportReportToExcel({ filename, title: 'Informes Dashboard', sheets });
}
