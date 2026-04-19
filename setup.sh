#!/bin/bash
# Dashboard SaaS - Setup automatizado
#
# Hace todo lo posible desde CLI. Lo único que NO se puede automatizar:
#   - Crear el proyecto Firebase inicial (requiere navegador)
#   - Configurar Authentication providers (requiere navegador)
#   - Setear env vars en Netlify (requiere su dashboard)
#
# Este script hace:
#   1. Instala firebase-tools si no está
#   2. Login interactivo (si no tenés sesión)
#   3. Asocia el proyecto local con tu proyecto Firebase
#   4. Deploy de reglas Firestore
#   5. Genera el archivo .env.local con tus credenciales
#   6. Te muestra las env vars exactas para pegar en Netlify

set -e
cd "$(dirname "$0")"

echo "════════════════════════════════════════════════════════════"
echo "  Dashboard SaaS — Setup automatizado"
echo "════════════════════════════════════════════════════════════"
echo

# ─── 1) Firebase CLI ────────────────────────────────────────────
if ! command -v firebase &> /dev/null; then
    echo "📦 Instalando firebase-tools..."
    npm install -g firebase-tools
fi

# ─── 2) Login ───────────────────────────────────────────────────
if ! firebase projects:list &> /dev/null; then
    echo "🔐 Necesitás hacer login con tu Google:"
    firebase login
fi

# ─── 3) Listar proyectos y elegir ───────────────────────────────
echo
echo "📋 Tus proyectos Firebase disponibles:"
firebase projects:list
echo
read -p "📌 Pegá el PROJECT_ID que querés usar (o 'crear' para crear uno nuevo): " PROJECT_ID

if [ "$PROJECT_ID" = "crear" ]; then
    read -p "Nombre del nuevo proyecto (ej: dashboard-saas): " NEW_NAME
    firebase projects:create "$NEW_NAME" --display-name "Dashboard SaaS"
    PROJECT_ID="$NEW_NAME"
fi

# ─── 4) Asociar local con remoto ────────────────────────────────
echo "🔗 Asociando este directorio con proyecto $PROJECT_ID..."
firebase use --add "$PROJECT_ID" --alias default

# ─── 5) Deploy reglas Firestore ─────────────────────────────────
echo "🛡️  Deploying reglas Firestore..."
firebase deploy --only firestore:rules --project "$PROJECT_ID"

# ─── 6) Obtener config del Web App ──────────────────────────────
echo
echo "📥 Obteniendo credenciales de la Web App..."

# Chequear si ya hay una web app registrada
WEB_APPS=$(firebase apps:list web --project "$PROJECT_ID" 2>/dev/null || echo "")

if [ -z "$WEB_APPS" ] || ! echo "$WEB_APPS" | grep -q "WEB"; then
    echo "➕ Creando Web App en el proyecto..."
    firebase apps:create WEB "dashboard-web" --project "$PROJECT_ID"
fi

# Obtener el SDK config
APP_ID=$(firebase apps:list web --project "$PROJECT_ID" 2>/dev/null | grep -oP '1:\d+:web:[a-f0-9]+' | head -1)

if [ -z "$APP_ID" ]; then
    echo "⚠️  No pude detectar automáticamente el App ID."
    read -p "Pegalo manualmente (Firebase Console → Settings → Your apps): " APP_ID
fi

CONFIG=$(firebase apps:sdkconfig web "$APP_ID" --project "$PROJECT_ID" 2>/dev/null)

# Parsear el output
API_KEY=$(echo "$CONFIG" | grep -oP '"apiKey"\s*:\s*"\K[^"]+' | head -1)
AUTH_DOMAIN=$(echo "$CONFIG" | grep -oP '"authDomain"\s*:\s*"\K[^"]+' | head -1)

# ─── 7) Escribir .env.local ─────────────────────────────────────
cat > .env.local <<EOF
# Dashboard SaaS — Firebase config
# Generado por setup.sh el $(date)
# NO commitear este archivo.

VITE_FIREBASE_API_KEY=$API_KEY
VITE_FIREBASE_AUTH_DOMAIN=$AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID=$PROJECT_ID
VITE_FIREBASE_APP_ID=$APP_ID
EOF

echo
echo "════════════════════════════════════════════════════════════"
echo "  ✅ Setup local completado"
echo "════════════════════════════════════════════════════════════"
echo
echo "📄 Generé .env.local con tus credenciales."
echo
echo "🌐 Ahora pegá estas variables en Netlify:"
echo "   https://app.netlify.com/sites/graceful-gingersnap-7c7cf8/settings/env"
echo
echo "   VITE_FIREBASE_API_KEY=$API_KEY"
echo "   VITE_FIREBASE_AUTH_DOMAIN=$AUTH_DOMAIN"
echo "   VITE_FIREBASE_PROJECT_ID=$PROJECT_ID"
echo "   VITE_FIREBASE_APP_ID=$APP_ID"
echo
echo "⚠️  MANUAL (lo único que falta):"
echo "   1. https://console.firebase.google.com/project/$PROJECT_ID/authentication/providers"
echo "      → Activá Google Sign-in"
echo "   2. https://console.firebase.google.com/project/$PROJECT_ID/authentication/settings"
echo "      → Authorized domains → agregar 'graceful-gingersnap-7c7cf8.netlify.app'"
echo "   3. En Netlify, re-trigger deploy después de pegar las env vars"
echo
