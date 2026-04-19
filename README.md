# Dashboard SaaS

Sistema de gestión todo-en-uno con IA para kioscos, restaurantes, retail y servicios.

Multi-rubro, multi-sucursal, offline-first, con facturación AFIP, importación de Excel con IA, y agentes AI 24/7.

**Demo:** https://graceful-gingersnap-7c7cf8.netlify.app

## 🚀 Modo de trabajo

La app tiene **2 modos**:

### 🔒 Modo Offline (default, free)
- 100% local — nada sale de tu dispositivo
- IndexedDB + localStorage + pendrive/carpeta externa
- CELA bot + 8 agentes AI (con tu API key)
- Sin costos por usuario
- **No requiere login**

### ☁️ Modo Cloud (premium)
- Login con Google (1 click)
- Data en TU Google Drive (carpeta `/Dashboard-Data/`)
- Sync automático cada 5 min entre dispositivos
- Agentes AI corriendo 24/7 en la nube
- 30 snapshots versionados
- **Costo para el operador: <$0.01 USD por user activo/mes**

## ⚙️ Setup

### Automatizado

```bash
cd dashboard
./setup.sh
```

El script instala firebase-tools, login, crea proyecto, deploya reglas Firestore, y genera `.env.local` con tus credenciales.

### Manual

Ver `SETUP_MANUAL.md` para los pasos completos de Firebase Console + Netlify.

## 🏗️ Arquitectura

- **Frontend**: Vite + React + custom CSS design system
- **Storage primario**: IndexedDB (via idb-keyval)
- **Cloud storage**: Google Drive del usuario (scope `drive.file`)
- **Auth**: Firebase Auth (Google provider)
- **Metadata**: Firestore (solo user metadata, no data del negocio)
- **Scheduled jobs**: Cloud Functions v2 + Cloud Scheduler
- **AI**: Claude Sonnet 4.5 + GPT-4o-mini fallback

**Nota clave:** Firestore SOLO guarda metadata. La data real del negocio vive en el Drive del usuario → costos casi nulos para escalar.

## 💰 Costos

Por usuario activo al mes:
- Firestore writes: ~$0.00003
- Cloud Functions: ~$0.00024
- **Total: <$0.01 USD/mes**

1000 usuarios activos = ~$10 USD/mes total.

## 🔒 Seguridad

- Scope Drive: `drive.file` (app-owned folder, sin Google Review)
- Firestore rules: cada user solo ve su propio doc
- Secrets (API keys) en Firebase Secrets, nunca en código
- OAuth tokens en sessionStorage, expiran en 1h

## 🛣️ Roadmap

- [x] v1-v3: Base multi-rubro + POS + CELA bot + agentes
- [x] v3.1: AFIP + Excel import + backup engine + PWA
- [x] v4.0: Firebase Auth + Drive sync
- [x] v4.1: Cloud Functions agentes 24/7
- [ ] v4.2: Conflict resolution UI + offline queue
- [ ] v5: Ticket printing 58mm + KDS + variantes stock
- [ ] v6: AFIP WSFE real (CAE validado)
