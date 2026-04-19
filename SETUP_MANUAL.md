# Setup Manual — Dashboard SaaS

Guía paso a paso para activar el modo Cloud. Si preferís el script automático, usá `./setup.sh`.

## 1️⃣ Crear proyecto Firebase

1. Ir a https://console.firebase.google.com/
2. Click **"Agregar proyecto"**
3. Nombre: `dashboard-saas` (o el que quieras)
4. **Desactivá Google Analytics** — no lo necesitamos
5. Esperar 30 seg

## 2️⃣ Registrar Web App

1. En la pantalla principal, click en el ícono **`</>`** (Web)
2. Nickname: `dashboard-web`
3. **NO** marques "Firebase Hosting"
4. Click "Registrar app"
5. **Copiá el `firebaseConfig`** que aparece. Te va a servir en el paso 6.

## 3️⃣ Activar Google Sign-in

1. Menu izquierdo → **Authentication** → "Comenzar"
2. Tab **"Sign-in method"** → Click **"Google"**
3. Activar toggle
4. Email de soporte: (elegí uno tuyo)
5. Guardar

6. Tab **"Settings"** → **"Authorized domains"**
7. Agregar:
   - `graceful-gingersnap-7c7cf8.netlify.app`
   - Tu dominio custom si tenés uno

## 4️⃣ Activar Firestore

1. Menu izquierdo → **Firestore Database** → "Crear base de datos"
2. **Modo producción** (NO test mode)
3. Región: `southamerica-east1` (São Paulo, más cerca de Argentina)
4. Crear

## 5️⃣ Deploy reglas Firestore

Desde tu terminal local (no en el navegador):

```bash
npm install -g firebase-tools
firebase login
cd dashboard
firebase use --add
# Elegí tu proyecto de la lista, alias: "default"
firebase deploy --only firestore:rules
```

Si todo sale bien, ves `✔ cloud.firestore: released rules ...`

## 6️⃣ Setear env vars en Netlify

Ir a: https://app.netlify.com/sites/graceful-gingersnap-7c7cf8/settings/env

Agregar **4 variables** (copiadas del paso 2):

| Key | Value |
|---|---|
| `VITE_FIREBASE_API_KEY` | `AIza...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `dashboard-saas.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `dashboard-saas` |
| `VITE_FIREBASE_APP_ID` | `1:...:web:...` |

Scope: **"All scopes"** (o production + deploy-preview).

## 7️⃣ Re-deploy Netlify

Netlify → Deploys → **"Trigger deploy"** → "Deploy site"

Con las env vars nuevas, el modo cloud queda activo.

## 8️⃣ Verificar

1. Abrí https://graceful-gingersnap-7c7cf8.netlify.app
2. Ir a **Cuenta** en el sidebar
3. Debería aparecer el botón **"Activar Cloud con Google"** (sin el warning amarillo de "no disponible")
4. Click → Google Sign-in → elegir cuenta → se crea `/Dashboard-Data/` en tu Drive

## 9️⃣ (Opcional) Activar agentes 24/7

Para que los agentes corran solos cada día/semana/mes en la nube, hay que deployar Cloud Functions:

```bash
cd functions
npm install

# Setear API keys (guardadas como Firebase Secrets)
firebase functions:secrets:set ANTHROPIC_API_KEY
# Te pide que pegues la key y enter
firebase functions:secrets:set OPENAI_API_KEY

# Deploy
firebase deploy --only functions
```

Esto activa:
- `scheduledAgentRunner` — corre cada 15 min, dispara agentes programados
- `runAgentNow` — callable para ejecución manual

**Costo estimado**: ~$0.01 USD/mes por usuario activo.

## 🚨 Troubleshooting

**"Cloud no disponible" no desaparece aunque puse las env vars**
- Re-triggeá el deploy en Netlify. Las env vars solo aplican a builds nuevos.

**Popup de Google Sign-in se cierra sola**
- Chequeá Authorized Domains en Firebase Console (paso 3.6). Tiene que estar tu dominio de Netlify.

**Error "This app isn't verified" al firmar con Google**
- Normal si tu proyecto Firebase está en modo "testing".
- Para desarrollo: agregate a vos mismo como "Test user" en la OAuth consent screen.
- Para producción pública: podés publicar la app sin Google Review porque usamos scope `drive.file` (el cual no requiere verificación).

**"Firebase no está configurado" al abrir AccountPage**
- Alguna env var falta. Verificá que las 4 estén seteadas en Netlify y re-deployaste.

**Agentes 24/7 no corren**
- Chequeá logs: `firebase functions:log`
- Tenés que haber deployado Functions (paso 9)
- El usuario tiene que haber seteado schedule != 'manual' en AgentsPage
