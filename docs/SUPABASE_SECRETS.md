# 🔐 SUPABASE SECRETS CONFIGURATION

Este documento lista todos los secretos (secrets) necesarios para las Edge Functions de Supabase.

## 📋 SECRETS REQUERIDOS

### 1. Email Notifications (Resend)

Requeridos para `notification-email-dispatcher`:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM="HSE Site <noreply@busesjm.cl>"
APP_BASE_URL=https://app.busesjm.cl
```

**Dónde obtenerlos:**
- `RESEND_API_KEY`: https://resend.com/api-keys
- `RESEND_FROM`: Debe ser un dominio verificado en Resend (configurar SPF/DKIM)
- `APP_BASE_URL`: URL de producción de la app (sin trailing slash)

### 2. Supabase (pre-configurados)

Estos ya existen por defecto:

```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
SUPABASE_ANON_KEY=xxx
```

## 🚀 CONFIGURAR EN SUPABASE DASHBOARD

### Método 1: Dashboard Web

1. Ir a **Project Settings** → **Edge Functions**
2. Tab **Environment Variables**
3. Click **Add secret**
4. Agregar cada variable una por una

### Método 2: CLI

```bash
# Configurar un secret
npx supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx

# Configurar múltiples secrets desde archivo
echo "RESEND_API_KEY=re_xxx" > .env.secrets
echo "RESEND_FROM=HSE Site <noreply@busesjm.cl>" >> .env.secrets
echo "APP_BASE_URL=https://app.busesjm.cl" >> .env.secrets
npx supabase secrets set --env-file .env.secrets

# Listar secrets configurados
npx supabase secrets list
```

## 🧪 VERIFICAR CONFIGURACIÓN

### Test local (antes de deploy)

Crear archivo `.env.local` en `supabase/functions/`:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM="HSE Site <noreply@test.com>"
APP_BASE_URL=http://localhost:5173
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
```

Ejecutar Edge Function localmente:

```bash
npx supabase functions serve notification-email-dispatcher --env-file supabase/functions/.env.local
```

### Test en producción

```bash
curl -X POST https://xxx.supabase.co/functions/v1/notification-email-dispatcher \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY"
```

Verificar logs:
```bash
npx supabase functions logs notification-email-dispatcher
```

## ⚠️ SEGURIDAD

- ❌ **NUNCA** commitear secrets en el repositorio
- ✅ Usar diferentes API keys para dev/staging/prod
- ✅ Rotar secrets periódicamente
- ✅ Limitar permisos de service role key
- ✅ Verificar dominio en Resend para evitar spoofing

## 📦 SECRETS POR EDGE FUNCTION

| Edge Function | Secrets Requeridos |
|--------------|-------------------|
| `notification-email-dispatcher` | `RESEND_API_KEY`, `RESEND_FROM`, `APP_BASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `hazard-due-reminders` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `import-pam-week` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |

## 🔄 ACTUALIZAR SECRETS

```bash
# Actualizar un secret
npx supabase secrets set RESEND_API_KEY=re_nuevo_valor

# Eliminar un secret
npx supabase secrets unset RESEND_API_KEY
```

Después de actualizar secrets, **redeployar las Edge Functions**:

```bash
npx supabase functions deploy notification-email-dispatcher
```

---

**Última actualización:** Enero 2026
