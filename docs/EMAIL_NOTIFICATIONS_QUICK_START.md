# 📧 NOTIFICACIONES EMAIL - QUICK START

Sistema de notificaciones transaccionales para Reportes de Peligro y Tareas PAM usando Resend.

---

## ⚡ SETUP RÁPIDO (5 PASOS)

### 1️⃣ Ejecutar Migración SQL

```bash
# Opción A: Desde Supabase Studio
# 1. Ir a SQL Editor
# 2. Copiar contenido de supabase/migrations/20260116_create_notification_outbox.sql
# 3. Ejecutar

# Opción B: Desde CLI
cd supabase
psql $DATABASE_URL -f migrations/20260116_create_notification_outbox.sql
```

**Crea:**
- Tabla `notification_outbox` (cola de emails)
- Triggers en `hazard_notifications` y `pam_notifications`
- Tabla `notification_email_settings` (configuración por org)

### 2️⃣ Obtener API Key de Resend

1. Ir a https://resend.com/api-keys
2. Crear nueva API key
3. Copiar el valor `re_xxxxxxxxxxxxx`

### 3️⃣ Configurar Secrets en Supabase

```bash
npx supabase secrets set RESEND_API_KEY="re_xxxxxxxxxxxxx"
npx supabase secrets set RESEND_FROM="HSE Site <noreply@busesjm.cl>"
npx supabase secrets set APP_BASE_URL="https://app.busesjm.cl"
```

### 4️⃣ Desplegar Edge Function

```bash
npx supabase functions deploy notification-email-dispatcher
```

### 5️⃣ Verificar Funcionamiento

Crear un reporte de peligro desde la UI y verificar:

```sql
-- 1. Notificación creada
SELECT * FROM hazard_notifications ORDER BY created_at DESC LIMIT 1;

-- 2. Email en cola
SELECT * FROM notification_outbox WHERE status = 'pending' ORDER BY created_at DESC LIMIT 1;

-- 3. Después de 3 min, email enviado
SELECT * FROM notification_outbox WHERE status = 'sent' ORDER BY sent_at DESC LIMIT 1;
```

---

## 📊 MONITOREO

### Estado del outbox
```sql
SELECT status, COUNT(*) FROM notification_outbox GROUP BY status;
```

### Últimos emails enviados
```sql
SELECT 
  entity_type,
  notification_type,
  sent_at,
  message_id
FROM notification_outbox
WHERE status = 'sent'
ORDER BY sent_at DESC
LIMIT 10;
```

### Errores recientes
```sql
SELECT 
  entity_type,
  notification_type,
  attempts,
  last_error,
  created_at
FROM notification_outbox
WHERE status IN ('pending', 'failed')
  AND attempts > 0
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🧪 PRUEBAS

### Test Manual: Invocar Dispatcher

```bash
curl -X POST https://xxx.supabase.co/functions/v1/notification-email-dispatcher \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY"
```

### Test End-to-End

1. Crear reporte de peligro asignado a usuario con email
2. Esperar 3 minutos (o invocar manualmente)
3. Verificar email recibido
4. Clic en "Ver en la App" → debe abrir reporte

---

## 🔧 TROUBLESHOOTING

| Problema | Solución |
|----------|----------|
| Emails no se envían | Verificar secrets con `npx supabase secrets list` |
| Notificaciones no llegan a outbox | Verificar triggers con `SELECT * FROM pg_trigger WHERE tgname LIKE '%notification%';` |
| Email en spam | Configurar SPF/DKIM en Resend para dominio custom |
| Dispatcher no ejecuta | Verificar cron en `config.toml` + redeploy |

---

## 📚 DOCUMENTACIÓN COMPLETA

- [EMAIL_NOTIFICATIONS_SETUP.md](./EMAIL_NOTIFICATIONS_SETUP.md) - Documentación detallada
- [SUPABASE_SECRETS.md](./SUPABASE_SECRETS.md) - Configuración de secrets

---

## ✅ CHECKLIST

- [ ] Migración SQL ejecutada
- [ ] Triggers verificados
- [ ] API key de Resend obtenida
- [ ] Secrets configurados en Supabase
- [ ] Dominio verificado en Resend (opcional pero recomendado)
- [ ] Edge Function desplegada
- [ ] Cron configurado en `config.toml`
- [ ] Test: crear reporte → email recibido
- [ ] Test: email VENCIDO funciona
- [ ] Test: tarea PAM funciona
- [ ] Monitoreo configurado (logs + SQL queries)

---

**Tiempo estimado:** ~30 minutos

**Última actualización:** Enero 2026
