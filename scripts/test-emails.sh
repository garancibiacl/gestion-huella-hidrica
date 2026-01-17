#!/bin/bash

# ============================================================================
# SCRIPT DE TESTING - NOTIFICACIONES POR EMAIL
# ============================================================================
# 
# Este script te ayuda a probar el sistema de notificaciones de forma rápida
#
# Uso:
#   chmod +x test-emails.sh
#   ./test-emails.sh
#
# ============================================================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración (AJUSTA ESTOS VALORES)
PROJECT_REF="swfktmhqmxqjaqtarreh"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." # ⚠️ CAMBIAR POR TU KEY
SUPABASE_DB_URL="postgresql://postgres.swfktmhqmxqjaqtarreh:cHF29AQQX0G5UNXg@aws-0-us-west-1.pooler.supabase.com:6543/postgres"

FUNCTION_URL="https://${PROJECT_REF}.supabase.co/functions/v1/notification-email-dispatcher"

# ============================================================================
# FUNCIONES AUXILIARES
# ============================================================================

print_header() {
  echo ""
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║ $1${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

# ============================================================================
# TEST 1: HEALTH CHECK
# ============================================================================

test_health_check() {
  print_header "TEST 1: Health Check de la Función"
  
  print_info "Consultando: GET ${FUNCTION_URL}"
  
  RESPONSE=$(curl -s "${FUNCTION_URL}")
  
  if echo "$RESPONSE" | grep -q '"status":"ok"'; then
    print_success "Función activa y respondiendo"
    echo "$RESPONSE" | jq '.'
  else
    print_error "Función no responde correctamente"
    echo "$RESPONSE"
    exit 1
  fi
}

# ============================================================================
# TEST 2: VERIFICAR SECRETS
# ============================================================================

test_secrets() {
  print_header "TEST 2: Verificar Secrets Configurados"
  
  print_info "Ejecutando: npx supabase secrets list"
  
  SECRETS=$(npx supabase secrets list 2>&1)
  
  if echo "$SECRETS" | grep -q "RESEND_API_KEY"; then
    print_success "RESEND_API_KEY configurado"
  else
    print_error "RESEND_API_KEY no encontrado"
  fi
  
  if echo "$SECRETS" | grep -q "RESEND_FROM"; then
    print_success "RESEND_FROM configurado"
  else
    print_warning "RESEND_FROM no encontrado (usará default)"
  fi
  
  if echo "$SECRETS" | grep -q "APP_BASE_URL"; then
    print_success "APP_BASE_URL configurado"
  else
    print_warning "APP_BASE_URL no encontrado (usará default)"
  fi
}

# ============================================================================
# TEST 3: VERIFICAR REGISTROS PENDING
# ============================================================================

test_pending_records() {
  print_header "TEST 3: Verificar Registros Pendientes en Outbox"
  
  print_info "Consultando notification_outbox..."
  
  QUERY="SELECT COUNT(*) as pending FROM notification_outbox WHERE status = 'pending';"
  
  PENDING_COUNT=$(psql "$SUPABASE_DB_URL" -t -c "$QUERY" 2>/dev/null | xargs)
  
  if [ $? -eq 0 ]; then
    if [ "$PENDING_COUNT" -gt 0 ]; then
      print_info "Hay $PENDING_COUNT notificaciones pendientes"
    else
      print_warning "No hay notificaciones pendientes para procesar"
      print_info "Puedes crear un reporte de peligro para generar una"
    fi
  else
    print_error "No se pudo consultar la BD (verifica SUPABASE_DB_URL)"
  fi
}

# ============================================================================
# TEST 4: INVOCAR DISPATCHER MANUALMENTE
# ============================================================================

test_dispatcher() {
  print_header "TEST 4: Invocar Dispatcher Manualmente"
  
  print_info "POST ${FUNCTION_URL}"
  print_warning "Usando SERVICE_ROLE_KEY (solo testing)"
  
  RESPONSE=$(curl -s -X POST "${FUNCTION_URL}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json")
  
  echo "$RESPONSE" | jq '.'
  
  SENT=$(echo "$RESPONSE" | jq -r '.sent // 0')
  FAILED=$(echo "$RESPONSE" | jq -r '.failed // 0')
  
  if [ "$SENT" -gt 0 ]; then
    print_success "Se enviaron $SENT emails correctamente"
  fi
  
  if [ "$FAILED" -gt 0 ]; then
    print_error "Fallaron $FAILED emails"
    echo "$RESPONSE" | jq -r '.errors[]'
  fi
  
  if [ "$SENT" -eq 0 ] && [ "$FAILED" -eq 0 ]; then
    print_info "No había emails pendientes para procesar"
  fi
}

# ============================================================================
# TEST 5: VERIFICAR ESTADO FINAL
# ============================================================================

test_final_state() {
  print_header "TEST 5: Verificar Estado Final en BD"
  
  print_info "Consultando últimos 5 registros de outbox..."
  
  QUERY="
    SELECT 
      id,
      notification_type,
      status,
      recipient_email,
      attempts,
      COALESCE(last_error, 'N/A') as last_error
    FROM notification_outbox 
    ORDER BY created_at DESC 
    LIMIT 5;
  "
  
  psql "$SUPABASE_DB_URL" -c "$QUERY" 2>/dev/null || print_error "No se pudo consultar BD"
}

# ============================================================================
# TEST 6: VER LOGS DE LA FUNCIÓN
# ============================================================================

test_logs() {
  print_header "TEST 6: Ver Logs Recientes de la Función"
  
  print_info "Ejecutando: npx supabase functions logs notification-email-dispatcher --limit 20"
  
  npx supabase functions logs notification-email-dispatcher --limit 20
}

# ============================================================================
# MENÚ PRINCIPAL
# ============================================================================

show_menu() {
  echo ""
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║          TESTING - NOTIFICACIONES POR EMAIL                    ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo "1) Test completo (todos los tests)"
  echo "2) Health check"
  echo "3) Verificar secrets"
  echo "4) Ver registros pending"
  echo "5) Invocar dispatcher manualmente"
  echo "6) Ver estado en BD"
  echo "7) Ver logs de la función"
  echo "8) Salir"
  echo ""
  echo -n "Selecciona una opción: "
}

run_all_tests() {
  test_health_check
  sleep 1
  test_secrets
  sleep 1
  test_pending_records
  sleep 1
  test_dispatcher
  sleep 1
  test_final_state
  sleep 1
  test_logs
}

# ============================================================================
# EJECUCIÓN
# ============================================================================

# Verificar que jq está instalado
if ! command -v jq &> /dev/null; then
  print_error "jq no está instalado. Instálalo con: brew install jq (macOS) o apt install jq (Linux)"
  exit 1
fi

# Verificar que psql está instalado
if ! command -v psql &> /dev/null; then
  print_warning "psql no está instalado. Tests de BD no funcionarán."
fi

# Si se pasa argumento, ejecutar test específico
if [ $# -gt 0 ]; then
  case "$1" in
    "all") run_all_tests ;;
    "health") test_health_check ;;
    "secrets") test_secrets ;;
    "pending") test_pending_records ;;
    "dispatch") test_dispatcher ;;
    "state") test_final_state ;;
    "logs") test_logs ;;
    *) echo "Uso: $0 [all|health|secrets|pending|dispatch|state|logs]" ;;
  esac
  exit 0
fi

# Menú interactivo
while true; do
  show_menu
  read -r option
  
  case $option in
    1) run_all_tests ;;
    2) test_health_check ;;
    3) test_secrets ;;
    4) test_pending_records ;;
    5) test_dispatcher ;;
    6) test_final_state ;;
    7) test_logs ;;
    8) 
      print_info "¡Hasta luego!"
      exit 0
      ;;
    *)
      print_error "Opción inválida"
      ;;
  esac
  
  echo ""
  echo -n "Presiona ENTER para continuar..."
  read -r
done
