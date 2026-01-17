#!/bin/bash

# ============================================================================
# DESPLIEGUE RÁPIDO - EMAIL TEMPLATES v3
# ============================================================================

echo "🚀 Desplegando Email Templates Profesionales..."
echo ""

# Navegar al proyecto
cd /Users/imac/Desktop/Git/gestion-huella-hidrica

# Verificar que los archivos existen
echo "✅ Verificando archivos..."
if [ ! -f "supabase/functions/notification-email-dispatcher/index.ts" ]; then
  echo "❌ Error: index.ts no encontrado"
  exit 1
fi

if [ ! -f "supabase/functions/notification-email-dispatcher/email-templates.ts" ]; then
  echo "❌ Error: email-templates.ts no encontrado"
  exit 1
fi

echo "✅ Archivos encontrados"
echo ""

# Login (si es necesario)
echo "🔐 Verificando login en Supabase..."
npx supabase projects list > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "⚠️  No estás logueado. Ejecutando login..."
  npx supabase login
fi

echo ""
echo "📦 Desplegando función..."
npx supabase functions deploy notification-email-dispatcher

echo ""
echo "✅ Despliegue completado!"
echo ""
echo "🧪 Probando health check..."
HEALTH_CHECK=$(curl -s https://swfktmhqmxqjaqtarreh.supabase.co/functions/v1/notification-email-dispatcher)
echo "$HEALTH_CHECK"

if echo "$HEALTH_CHECK" | grep -q '"version":"v3"'; then
  echo ""
  echo "✅ ¡Función v3 desplegada correctamente!"
  echo ""
  echo "📧 Próximo paso:"
  echo "1. Crea un nuevo reporte de peligro en la app"
  echo "2. Espera 3 minutos (cron automático)"
  echo "3. O ejecuta manualmente:"
  echo ""
  echo "curl -X POST https://swfktmhqmxqjaqtarreh.supabase.co/functions/v1/notification-email-dispatcher \\"
  echo "  -H \"Authorization: Bearer [TU_SERVICE_ROLE_KEY]\""
  echo ""
else
  echo ""
  echo "⚠️  La versión no se actualizó correctamente"
  echo "Verifica los logs: npx supabase functions logs notification-email-dispatcher"
fi
