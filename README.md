# Dashboard

Sistema de gestión multi-rubro + multi-sucursal para kioscos, restaurantes, casas de accesorios y cualquier otro tipo de negocio.

## Features

- ✅ **Sin login** — acceso directo, ideal para probar y demostrar
- ✅ **Multi-rubro** — kiosco, restaurante, accesorios, servicios, general
- ✅ **Multi-sucursal** — selector global de sucursal que filtra toda la app
- ✅ **Multi-cuenta** — gestión de usuarios con cargo, rol y sucursal asignada
- ✅ **Onboarding** guiado en 2 pasos (primer uso)
- ✅ **Empty states guiados** en TODAS las secciones (explica qué vería con datos)
- ✅ **Charts nativos SVG** (sin dependencias pesadas)
- ✅ **Backup / Restore** en JSON

## Secciones

### Principal
- **Inicio** — KPIs del día/mes + charts por sucursal
- **Informes** — Tabs: General / Por Sucursal / Por Empleado / Financiero. Filtros 7d/30d/90d/año/todo

### Negocio
- **Sucursales** — CRUD completo
- **Cuentas** — Usuarios del sistema con rol + sucursal asignada
- **Empleados** — Asignados por sucursal, con sueldo y comisión
- **Asistencia** — Registro diario por empleado
- **Tareas** — Kanban pendiente/en progreso/completado

### Operaciones
- **Productos** — Catálogo con stock mínimo y alertas
- **Ventas** — POS completo con carrito, método de pago, descuento, descuenta stock
- **Pedidos online** — Web/WhatsApp/Instagram/PedidosYa/Rappi
- **Caja diaria** — Cierre Z por sucursal y fecha
- **Transferencias** — Entre sucursales

### Finanzas
- **Gastos** — Categorizados y por sucursal
- **Banco** — Movimientos bancarios
- **Proveedores** — CRUD + deudas + charts

### Clientes & Marketing (UI lista, requiere API keys)
- **Clientes** — CRM básico con histórico de compras
- **Marketing** — Meta Ads, WhatsApp, Email
- **Agentes AI** — 8 agentes (Analyst, Content, Trends, Strategist, Copywriter, CX, Finance, Inventory)
- **Instagram** — Planner de contenido
- **TikTok** — Analytics
- **Google Analytics** — GA4
- **Tienda online** — WooCommerce / Shopify

### Sistema
- **Configuración** — Business + integraciones + backup

## Stack

- React 18 + Vite 6
- lucide-react (iconos)
- nanoid (IDs)
- localStorage (persistencia)
- Charts SVG nativos (sin recharts / d3 / chart.js)

## Setup

```bash
npm install
npm run dev
```

Para deploy a Netlify: auto-deploy desde `main`.

## Datos

Todo se guarda en `localStorage` bajo la key `dashboard_state_v1`. Para Firebase sync, configurar `.env`:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

(Firebase no viene integrado aún — es para futuras versiones.)
