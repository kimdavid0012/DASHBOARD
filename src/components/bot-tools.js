/**
 * Bot Tools — definiciones de acciones reales que Claude puede ejecutar
 *
 * Flujo:
 *   1. Claude recibe lista de tools + el mensaje del usuario
 *   2. Claude devuelve `tool_use` con el tool a ejecutar y sus parámetros
 *   3. executeTool() llama a actions.add / update / etc en el DataContext
 *   4. El resultado se manda de vuelta a Claude como `tool_result`
 *   5. Claude genera respuesta natural confirmando al usuario
 *
 * Esto permite que el bot diga "agregué Aros argolla a $5000" y lo haga de verdad.
 */

export const BOT_TOOLS = [
    // ═══════════════ PRODUCTOS ═══════════════
    {
        name: 'crear_producto',
        description: 'Crea un nuevo producto/item/plato/servicio en el catálogo del negocio. Usalo cuando el usuario te diga que quiere cargar/agregar/crear un producto nuevo. Si el usuario no te dio precio o categoría, usá valores razonables por defecto.',
        input_schema: {
            type: 'object',
            properties: {
                nombre: { type: 'string', description: 'Nombre del producto. REQUERIDO.' },
                precioVenta: { type: 'number', description: 'Precio al que se vende al cliente. Si no se menciona, usá 0.' },
                precioCosto: { type: 'number', description: 'Precio de costo. Si no se menciona, usá 0.' },
                stock: { type: 'number', description: 'Stock inicial. Default 0.' },
                stockMinimo: { type: 'number', description: 'Stock mínimo antes de avisar reposición. Default 5.' },
                categoria: { type: 'string', description: 'Categoría. Default "General".' },
                codigo: { type: 'string', description: 'Código de barras o SKU. Opcional.' },
                descripcion: { type: 'string', description: 'Descripción adicional.' },
                unidad: { type: 'string', description: 'Unidad de medida. Ej: unidad, kg, litro. Default "unidad".' }
            },
            required: ['nombre']
        }
    },
    {
        name: 'actualizar_stock',
        description: 'Actualiza el stock de un producto existente. Usalo para sumar/restar unidades o setear nuevo valor absoluto.',
        input_schema: {
            type: 'object',
            properties: {
                productoBusqueda: { type: 'string', description: 'Nombre o parte del nombre del producto para encontrarlo.' },
                nuevoStock: { type: 'number', description: 'Valor absoluto nuevo del stock. Si el usuario dijo "sumá 10", primero usá buscar_producto y luego calculá el total.' }
            },
            required: ['productoBusqueda', 'nuevoStock']
        }
    },
    {
        name: 'buscar_producto',
        description: 'Busca un producto por nombre para ver sus datos (precio, stock, categoría). Usalo antes de modificar algo.',
        input_schema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Nombre o parte del nombre.' }
            },
            required: ['query']
        }
    },

    // ═══════════════ CLIENTES ═══════════════
    {
        name: 'crear_cliente',
        description: 'Registra un nuevo cliente en la base.',
        input_schema: {
            type: 'object',
            properties: {
                nombre: { type: 'string', description: 'Nombre completo. REQUERIDO.' },
                telefono: { type: 'string', description: 'Teléfono/WhatsApp.' },
                email: { type: 'string', description: 'Email.' },
                dni: { type: 'string', description: 'DNI/CUIT.' },
                direccion: { type: 'string', description: 'Dirección.' },
                notas: { type: 'string', description: 'Notas libres.' }
            },
            required: ['nombre']
        }
    },

    // ═══════════════ GASTOS ═══════════════
    {
        name: 'registrar_gasto',
        description: 'Registra un gasto del negocio (alquiler, sueldos, insumos, servicios, etc).',
        input_schema: {
            type: 'object',
            properties: {
                concepto: { type: 'string', description: 'Qué es el gasto. REQUERIDO.' },
                monto: { type: 'number', description: 'Monto en la moneda del negocio. REQUERIDO.' },
                categoria: { type: 'string', description: 'Ej: Alquiler, Servicios, Sueldos, Insumos, Marketing, Otros.' },
                fecha: { type: 'string', description: 'Fecha en formato YYYY-MM-DD. Default hoy.' },
                notas: { type: 'string', description: 'Detalles adicionales.' }
            },
            required: ['concepto', 'monto']
        }
    },

    // ═══════════════ EMPLEADOS ═══════════════
    {
        name: 'crear_empleado',
        description: 'Registra un nuevo empleado.',
        input_schema: {
            type: 'object',
            properties: {
                nombre: { type: 'string' },
                apellido: { type: 'string' },
                rol: { type: 'string', description: 'Ej: Vendedor, Cocinero, Encargado, Mozo...' },
                telefono: { type: 'string' },
                email: { type: 'string' },
                sueldo: { type: 'number', description: 'Sueldo bruto mensual.' },
                comisionPct: { type: 'number', description: 'Porcentaje de comisión sobre ventas. 0 si no tiene.' }
            },
            required: ['nombre']
        }
    },

    // ═══════════════ SUCURSALES ═══════════════
    {
        name: 'crear_sucursal',
        description: 'Crea una nueva sucursal/local/oficina del negocio.',
        input_schema: {
            type: 'object',
            properties: {
                nombre: { type: 'string' },
                direccion: { type: 'string' },
                ciudad: { type: 'string' },
                tipo: { type: 'string', enum: ['local', 'deposito', 'oficina', 'online'], description: 'Tipo de sucursal.' }
            },
            required: ['nombre']
        }
    },

    // ═══════════════ QUERIES / REPORTES ═══════════════
    {
        name: 'consultar_ventas',
        description: 'Obtiene ventas de un período para reportes. Usalo cuando te pregunten "cuánto vendí", "ventas de...", etc.',
        input_schema: {
            type: 'object',
            properties: {
                periodo: { type: 'string', enum: ['hoy', 'ayer', 'semana', 'mes', 'año', 'todo'], description: 'Período a consultar.' }
            },
            required: ['periodo']
        }
    },
    {
        name: 'consultar_stock_bajo',
        description: 'Lista productos con stock crítico (bajo mínimo o en cero).',
        input_schema: { type: 'object', properties: {} }
    },
    {
        name: 'consultar_pedidos_pendientes',
        description: 'Lista pedidos online sin entregar/procesar.',
        input_schema: { type: 'object', properties: {} }
    },

    // ═══════════════ TAREAS ═══════════════
    {
        name: 'crear_tarea',
        description: 'Agrega una tarea pendiente a la lista.',
        input_schema: {
            type: 'object',
            properties: {
                titulo: { type: 'string' },
                descripcion: { type: 'string' },
                fechaLimite: { type: 'string', description: 'YYYY-MM-DD' },
                prioridad: { type: 'string', enum: ['alta', 'media', 'baja'] }
            },
            required: ['titulo']
        }
    }
];

/**
 * Ejecuta una tool call de Claude contra el DataContext
 * @param {string} toolName
 * @param {object} input - parámetros parseados
 * @param {object} state
 * @param {object} actions - { add, update, remove, updateBusiness, ... }
 * @returns {string} resultado como texto (se manda de vuelta a Claude como tool_result)
 */
export async function executeTool(toolName, input, state, actions) {
    try {
        switch (toolName) {
            case 'crear_producto': {
                const producto = {
                    nombre: input.nombre,
                    precioVenta: Number(input.precioVenta || 0),
                    precioCosto: Number(input.precioCosto || 0),
                    stock: Number(input.stock || 0),
                    stockMinimo: Number(input.stockMinimo || 5),
                    categoria: input.categoria || 'General',
                    codigo: input.codigo || '',
                    descripcion: input.descripcion || '',
                    unidad: input.unidad || 'unidad',
                    activo: true,
                    sucursalId: state.meta?.currentSucursalId !== 'all'
                        ? state.meta?.currentSucursalId
                        : (state.sucursales?.[0]?.id || '')
                };
                actions.add('productos', producto);
                return `✅ Producto creado: "${producto.nombre}" — precio $${producto.precioVenta}, stock ${producto.stock} ${producto.unidad}, categoría "${producto.categoria}".`;
            }

            case 'buscar_producto': {
                const q = (input.query || '').toLowerCase();
                const matches = (state.productos || []).filter(p =>
                    (p.nombre || '').toLowerCase().includes(q) ||
                    (p.codigo || '').toLowerCase().includes(q)
                ).slice(0, 5);
                if (matches.length === 0) return `❌ No encontré productos que coincidan con "${input.query}".`;
                return matches.map(p =>
                    `• ${p.nombre} — precio $${p.precioVenta || 0}, stock ${p.stock || 0}, categoría "${p.categoria || 'N/A'}"`
                ).join('\n');
            }

            case 'actualizar_stock': {
                const q = (input.productoBusqueda || '').toLowerCase();
                const producto = (state.productos || []).find(p =>
                    (p.nombre || '').toLowerCase().includes(q)
                );
                if (!producto) return `❌ No encontré un producto con "${input.productoBusqueda}".`;
                const stockAnterior = Number(producto.stock || 0);
                const stockNuevo = Number(input.nuevoStock);
                actions.update('productos', producto.id, { stock: stockNuevo });
                return `✅ Stock de "${producto.nombre}" actualizado: ${stockAnterior} → ${stockNuevo}`;
            }

            case 'crear_cliente': {
                const cliente = {
                    nombre: input.nombre,
                    telefono: input.telefono || '',
                    email: input.email || '',
                    dni: input.dni || '',
                    direccion: input.direccion || '',
                    notas: input.notas || ''
                };
                actions.add('clientes', cliente);
                return `✅ Cliente registrado: ${cliente.nombre}${cliente.telefono ? ' (📱 ' + cliente.telefono + ')' : ''}.`;
            }

            case 'registrar_gasto': {
                const gasto = {
                    concepto: input.concepto,
                    monto: Number(input.monto),
                    categoria: input.categoria || 'Otros',
                    fecha: input.fecha || new Date().toISOString().slice(0, 10),
                    notas: input.notas || '',
                    sucursalId: state.meta?.currentSucursalId !== 'all'
                        ? state.meta?.currentSucursalId
                        : (state.sucursales?.[0]?.id || '')
                };
                actions.add('gastos', gasto);
                return `✅ Gasto registrado: "${gasto.concepto}" — $${gasto.monto} (${gasto.categoria}).`;
            }

            case 'crear_empleado': {
                const empleado = {
                    nombre: input.nombre,
                    apellido: input.apellido || '',
                    rol: input.rol || '',
                    telefono: input.telefono || '',
                    email: input.email || '',
                    sueldo: Number(input.sueldo || 0),
                    comisionPct: Number(input.comisionPct || 0),
                    activo: true
                };
                actions.add('empleados', empleado);
                return `✅ Empleado registrado: ${empleado.nombre} ${empleado.apellido}${empleado.rol ? ' (' + empleado.rol + ')' : ''}.`;
            }

            case 'crear_sucursal': {
                const sucursal = {
                    nombre: input.nombre,
                    direccion: input.direccion || '',
                    ciudad: input.ciudad || '',
                    tipo: input.tipo || 'local'
                };
                actions.add('sucursales', sucursal);
                return `✅ Sucursal creada: ${sucursal.nombre}.`;
            }

            case 'consultar_ventas': {
                const periodo = input.periodo || 'mes';
                const now = new Date();
                let cutoff = new Date();
                switch (periodo) {
                    case 'hoy': cutoff.setHours(0, 0, 0, 0); break;
                    case 'ayer': cutoff.setDate(cutoff.getDate() - 1); cutoff.setHours(0, 0, 0, 0); break;
                    case 'semana': cutoff.setDate(cutoff.getDate() - 7); break;
                    case 'mes': cutoff.setDate(cutoff.getDate() - 30); break;
                    case 'año': cutoff.setDate(cutoff.getDate() - 365); break;
                    case 'todo': cutoff = new Date(0); break;
                }
                const ventas = (state.ventas || []).filter(v =>
                    new Date(v.fecha || 0).getTime() >= cutoff.getTime()
                );
                if (periodo === 'ayer') {
                    const endAyer = new Date();
                    endAyer.setDate(endAyer.getDate() - 1);
                    endAyer.setHours(23, 59, 59, 999);
                    const filtered = ventas.filter(v => new Date(v.fecha || 0).getTime() <= endAyer.getTime());
                    const total = filtered.reduce((s, v) => s + Number(v.total || 0), 0);
                    return `Ventas de ayer: ${filtered.length} operaciones · total $${total.toLocaleString('es-AR')}.`;
                }
                const total = ventas.reduce((s, v) => s + Number(v.total || 0), 0);
                const promedio = ventas.length > 0 ? total / ventas.length : 0;
                return `Ventas (${periodo}): ${ventas.length} operaciones · total $${total.toLocaleString('es-AR')} · ticket promedio $${promedio.toFixed(0)}.`;
            }

            case 'consultar_stock_bajo': {
                const productos = (state.productos || []).filter(p => {
                    const stock = Number(p.stock || 0);
                    const min = Number(p.stockMinimo || 5);
                    return stock <= min;
                }).slice(0, 20);
                if (productos.length === 0) return 'Sin productos con stock crítico ✅';
                return `⚠️ ${productos.length} producto(s) con stock crítico:\n` +
                    productos.map(p => `• ${p.nombre}: ${p.stock || 0} ud ${p.stock === 0 ? '(SIN STOCK)' : '(bajo mínimo ' + p.stockMinimo + ')'}`).join('\n');
            }

            case 'consultar_pedidos_pendientes': {
                const pendientes = (state.pedidos || []).filter(p =>
                    p.estado !== 'entregado' && p.estado !== 'cancelado'
                );
                if (pendientes.length === 0) return 'Sin pedidos pendientes ✅';
                return `📦 ${pendientes.length} pedido(s) pendientes:\n` +
                    pendientes.slice(0, 10).map(p => `• #${p.numero || p.id?.slice(-6)} — ${p.clienteNombre || 'Cliente'} — ${p.estado}`).join('\n');
            }

            case 'crear_tarea': {
                const tarea = {
                    titulo: input.titulo,
                    descripcion: input.descripcion || '',
                    fechaLimite: input.fechaLimite || '',
                    prioridad: input.prioridad || 'media',
                    completada: false
                };
                actions.add('tareas', tarea);
                return `✅ Tarea creada: "${tarea.titulo}" (prioridad ${tarea.prioridad}).`;
            }

            default:
                return `❌ Tool desconocida: ${toolName}`;
        }
    } catch (err) {
        return `❌ Error ejecutando ${toolName}: ${err.message}`;
    }
}
