# 📧 INTEGRACIÓN COMPLETA: NOTIFICACIONES POR EMAIL CON RESEND

## 📦 ARCHIVOS CREADOS

### ✅ SQL (Base de Datos)
```
supabase/migrations/20260116_create_notification_outbox.sql
```
- Tabla `notification_outbox` (cola de emails con idempotencia)
- Tabla `notification_email_settings` (configuración por organización)
- Funciones PL/pgSQL: `enqueue_hazard_notification_email()`, `enqueue_pam_notification_email()`
- Triggers automáticos en `hazard_notifications` y `pam_notifications`
- Función de limpieza: `cleanup_old_notification_outbox()`
- RLS policies (bloqueo total a usuarios normales)

### ✅ Edge Function (Dispatcher)
```
supabase/functions/notification-email-dispatcher/
├── index.ts              (dispatcher principal con lógica de procesamiento)
├── email-templates.ts    (templates HTML + subjects dinámicos)
└── deno.json            (configuración Deno)
```

**Características:**
- Procesa hasta 50 notificaciones por batch
- Reintentos automáticos (máx 5 intentos)
- Resolución inteligente de emails (profiles → auth.users)
- Envío con Resend API
- Manejo de errores robusto
- Concurrency-safe

### ✅ Documentación
```
docs/
├── EMAIL_NOTIFICATIONS_SETUP.md       (documentación completa 📚)
├── EMAIL_NOTIFICATIONS_QUICK_START.md (guía rápida ⚡)
└── SUPABASE_SECRETS.md                (configuración de secrets 🔐)
```

### ✅ Configuración
```
supabase/config.toml  (cron job configurado, cada 3 min)
```

---

## 🏗️ ARQUITECTURA IMPLEMENTADA

### Patrón OUTBOX + DISPATCHER

```
┌─────────────────────┐
│ hazard_notifications│──┐
└─────────────────────┘  │
                         │  TRIGGER (INSERT)
┌─────────────────────┐  │
│  pam_notifications  │──┤
└─────────────────────┘  │
                         ▼
              ┌──────────────────────┐
              │  notification_outbox │ (COLA)
              ├──────────────────────┤
              │ status: pending      │
              │ attempts: 0          │
              │ payload: {JSON}      │
              └──────────────────────┘
                         │
                         │ CRON (cada 3 min)
                         ▼
              ┌──────────────────────┐
              │  Edge Function       │
              │  Dispatcher          │
              ├──────────────────────┤
              │ 1. SELECT pending    │
              │ 2. Resolver email    │
              │ 3. Generar HTML      │
              │ 4. Enviar Resend     │
              │ 5. UPDATE sent/failed│
              └──────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   Resend API         │
              └──────────────────────┘
                         │
                         ▼
                    📧 EMAIL
```

---

## 🎨 DISEÑO DE EMAILS

### Especificaciones UX/UI

**Estructura:**
```
┌────────────────────────────────────┐
│ [Barra roja corporativa #B3382A]  │
├────────────────────────────────────┤
│ HEADER                             │
│ Buses JM · Gestión de Seguridad   │
│ Notificación automática            │
├────────────────────────────────────┤
│ BODY                               │
│ ├─ Título (H1)                     │
│ ├─ Subtítulo descriptivo           │
│ ├─ Badge [REQUIERE ACCIÓN]         │
│ ├─ Card resumen:                   │
│ │  ├─ Descripción (truncada 160)   │
│ │  ├─ Riesgo Crítico / Tipo       │
│ │  ├─ Responsable                  │
│ │  ├─ Plazo / Fecha                │
│ │  └─ Ubicación / Faena            │
│ ├─ Botón CTA (rojo corporativo)   │
│ └─ Link de respaldo (visible)     │
├────────────────────────────────────┤
│ FOOTER                             │
│ ├─ Texto legal                     │
│ ├─ Link "Abrir Plataforma"        │
│ └─ Auditoría (ID, org, timestamp) │
└────────────────────────────────────┘
```

**Características técnicas:**
- Max width: 600px
- System fonts (no external)
- Tabla-based layout (Outlook compatible)
- Inline CSS
- VML fallback para botones
- WCAG AA contraste
- Mobile-responsive

### Subjects Dinámicos

| Tipo | Subject | Ejemplo |
|------|---------|---------|
| `report_assigned` | `[HSE] Nuevo reporte asignado · {faena} · {riesgo}` | [HSE] Nuevo reporte asignado · Los Andes · Liderazgo |
| `report_due_soon` | `[HSE] Reporte por vencer · {fecha} · {faena}` | [HSE] Reporte por vencer · 20-01 · Los Andes |
| `report_overdue` | `[HSE] Reporte VENCIDO · {faena} · {riesgo}` | [HSE] Reporte VENCIDO · Los Andes · Liderazgo |
| `report_closed` | `[HSE] Reporte cerrado · Verificación pendiente` | [HSE] Reporte cerrado · Verificación pendiente |
| `task_assigned` | `[HSE] Nueva tarea asignada · {fecha} · {ubicación}` | [HSE] Nueva tarea asignada · 20-01 · Sede Central |
| `task_due_soon` | `[HSE] Tarea por vencer · {fecha} · {ubicación}` | [HSE] Tarea por vencer · 20-01 · Sede Central |
| `task_overdue` | `[HSE] Tarea VENCIDA · {ubicación}` | [HSE] Tarea VENCIDA · Sede Central |

### Links en Emails

**Hazard Reports:**
```
${APP_BASE_URL}/admin/pls/hazard-report/${hazard_report_id}
```

**PAM Tasks:**
```
${APP_BASE_URL}/pls/my-activities?task=${pam_task_id}
```

---

## 🚀 PASOS DE INSTALACIÓN

### 1. Ejecutar Migración SQL (5 min)

```bash
# Opción A: Supabase Studio
# 1. Abrir SQL Editor
# 2. Copiar contenido de migrations/20260116_create_notification_outbox.sql
# 3. Ejecutar

# Opción B: CLI
psql $DATABASE_URL -f supabase/migrations/20260116_create_notification_outbox.sql
```

**Verifica:**
```sql
-- Tablas creadas
\dt notification_*

-- Triggers creados
SELECT tgname FROM pg_trigger WHERE tgname LIKE '%notification%';

-- Funciones creadas
\df enqueue_*
```

### 2. Configurar Resend (10 min)

1. Crear cuenta en https://resend.com
2. Obtener API key: https://resend.com/api-keys
3. (Recomendado) Verificar dominio custom:
   - Ir a https://resend.com/domains
   - Agregar dominio: `busesjm.cl`
   - Configurar DNS records (SPF, DKIM, DMARC)
   - Esperar verificación

### 3. Configurar Secrets en Supabase (5 min)

```bash
# Configurar secrets
npx supabase secrets set RESEND_API_KEY="re_xxxxxxxxxxxxx"
npx supabase secrets set RESEND_FROM="HSE Site <noreply@busesjm.cl>"
npx supabase secrets set APP_BASE_URL="https://app.busesjm.cl"

# Verificar
npx supabase secrets list
```

**Resultado esperado:**
```
RESEND_API_KEY (digest: xxx)
RESEND_FROM (digest: xxx)
APP_BASE_URL (digest: xxx)
SUPABASE_URL (pre-configurado)
SUPABASE_SERVICE_ROLE_KEY (pre-configurado)
```

### 4. Desplegar Edge Function (5 min)

```bash
# Deploy
npx supabase functions deploy notification-email-dispatcher

# Verificar
npx supabase functions list
```

### 5. Configurar Cron Job (ya incluido)

El `config.toml` ya incluye:
```toml
[functions.notification-email-dispatcher]
verify_jwt = false

[functions.notification-email-dispatcher.cron]
schedule = "*/3 * * * *"  # Cada 3 minutos
```

**Push config:**
```bash
npx supabase db push
```

---

## 🧪 TESTING (CHECKLIST COMPLETO)

### ✅ Test 1: Hazard Report Assigned

1. **Acción:** Crear nuevo reporte de peligro desde `/admin/pls/hazard-report/new`
2. **Verificar SQL:**
   ```sql
   -- Notificación creada
   SELECT * FROM hazard_notifications 
   WHERE hazard_report_id = 'xxx' 
   ORDER BY created_at DESC LIMIT 1;
   
   -- Outbox creado
   SELECT * FROM notification_outbox 
   WHERE entity_id = 'xxx' AND status = 'pending';
   ```
3. **Esperar:** 3 minutos (o invocar manualmente)
4. **Verificar:** Email recibido con subject `[HSE] Nuevo reporte asignado...`
5. **Click:** "Ver en la App" → debe abrir `/admin/pls/hazard-report/{id}`

### ✅ Test 2: Hazard Report Overdue

1. **Acción:** Ejecutar edge function de due reminders:
   ```bash
   curl -X POST https://xxx.supabase.co/functions/v1/hazard-due-reminders \
     -H "Authorization: Bearer $ANON_KEY"
   ```
2. **Verificar SQL:**
   ```sql
   SELECT type, COUNT(*) FROM hazard_notifications 
   WHERE type IN ('report_due_soon', 'report_overdue')
   GROUP BY type;
   ```
3. **Verificar:** Email con subject `[HSE] Reporte VENCIDO...`
4. **Verificar:** Badge "REQUIERE ACCIÓN" en rojo

### ✅ Test 3: PAM Task Assigned

1. **Acción:** Subir planilla PLS con tareas nuevas
2. **Verificar SQL:**
   ```sql
   SELECT * FROM pam_notifications 
   WHERE type = 'task_assigned' 
   ORDER BY created_at DESC LIMIT 5;
   ```
3. **Verificar:** Email recibido
4. **Click:** "Ver en la App" → debe abrir `/pls/my-activities?task={id}`

### ✅ Test 4: Error Handling & Retries

1. **Acción:** Modificar secret con API key inválida:
   ```bash
   npx supabase secrets set RESEND_API_KEY="re_invalid"
   npx supabase functions deploy notification-email-dispatcher
   ```
2. **Crear notificación** (cualquier reporte/tarea)
3. **Verificar intentos:**
   ```sql
   SELECT id, status, attempts, last_error 
   FROM notification_outbox 
   WHERE status IN ('pending', 'failed')
   ORDER BY created_at DESC;
   ```
4. **Resultado esperado:**
   - `attempts` incrementa cada 3 min
   - Después de 5 intentos → `status = 'failed'`
5. **Restaurar API key válida** y verificar que notificaciones pendientes se procesan

### ✅ Test 5: Idempotencia

1. **Crear reporte** de peligro
2. **Verificar outbox:**
   ```sql
   SELECT COUNT(*) FROM notification_outbox 
   WHERE entity_id = 'xxx' AND source_table = 'hazard_notifications';
   ```
3. **Resultado esperado:** `COUNT = 1` (solo un email por notificación)
4. **Intentar insertar duplicado** manualmente:
   ```sql
   INSERT INTO notification_outbox (...) 
   VALUES (...mismo source_id...);
   -- ERROR: duplicate key violates unique constraint
   ```

### ✅ Test 6: RLS (Security)

1. **Desde frontend** (con usuario autenticado):
   ```js
   const { data, error } = await supabase
     .from('notification_outbox')
     .select('*');
   
   console.log(data); // []
   console.log(error); // null (pero sin resultados)
   ```
2. **Resultado esperado:** RLS bloquea acceso, retorna `[]`

### ✅ Test 7: Email Rendering

1. **Verificar en diferentes clientes:**
   - Gmail (web + mobile)
   - Outlook (Windows + Web)
   - Apple Mail (macOS + iOS)
2. **Checklist visual:**
   - [ ] Header rojo visible
   - [ ] Logo/texto alineado
   - [ ] Card de resumen legible
   - [ ] Botón CTA clickeable
   - [ ] Link de respaldo visible
   - [ ] Footer con auditoría
   - [ ] Sin elementos rotos
   - [ ] Responsive en mobile

---

## 📊 MONITOREO EN PRODUCCIÓN

### Dashboard SQL (crear vista)

```sql
CREATE OR REPLACE VIEW notification_outbox_dashboard AS
SELECT 
  DATE(created_at) as date,
  status,
  entity_type,
  notification_type,
  COUNT(*) as count,
  AVG(attempts) as avg_attempts,
  MAX(sent_at) - MAX(created_at) as avg_latency
FROM notification_outbox
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), status, entity_type, notification_type
ORDER BY date DESC, status;
```

### Queries útiles

**Estado general:**
```sql
SELECT status, COUNT(*) FROM notification_outbox GROUP BY status;
```

**Últimos enviados:**
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

**Errores recientes:**
```sql
SELECT 
  id,
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

**Tasa de éxito (últimas 24h):**
```sql
SELECT 
  status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percentage
FROM notification_outbox
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;
```

### Logs de Edge Function

```bash
# Ver logs en tiempo real
npx supabase functions logs notification-email-dispatcher --tail

# Ver logs de las últimas 2 horas
npx supabase functions logs notification-email-dispatcher --since 2h

# Filtrar por errores
npx supabase functions logs notification-email-dispatcher | grep -i error
```

---

## 🔧 TROUBLESHOOTING

### 1. Emails no se envían

**Síntoma:** Outbox con status `pending` que no cambia

**Diagnóstico:**
```sql
SELECT * FROM notification_outbox WHERE status = 'pending' ORDER BY created_at;
```

**Soluciones:**
1. **Verificar secrets:**
   ```bash
   npx supabase secrets list
   ```
2. **Verificar cron:**
   ```sql
   SELECT * FROM cron.job WHERE jobname LIKE '%notification%';
   ```
3. **Invocar manualmente:**
   ```bash
   curl -X POST https://xxx.supabase.co/functions/v1/notification-email-dispatcher \
     -H "Authorization: Bearer $SERVICE_ROLE_KEY"
   ```
4. **Ver logs:**
   ```bash
   npx supabase functions logs notification-email-dispatcher --since 1h
   ```

### 2. Notificaciones no llegan a outbox

**Síntoma:** `hazard_notifications` / `pam_notifications` se crean pero outbox vacío

**Diagnóstico:**
```sql
-- Verificar triggers
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname LIKE '%notification%';
```

**Solución:** Re-ejecutar migración o crear triggers manualmente

### 3. Emails llegan a spam

**Síntoma:** Emails llegan a carpeta spam/junk

**Soluciones:**
1. **Verificar dominio en Resend:**
   - Ir a https://resend.com/domains
   - Verificar que SPF/DKIM están configurados (checks verdes)
2. **Usar dominio verificado en `RESEND_FROM`:**
   ```bash
   # ✅ Correcto
   RESEND_FROM="HSE Site <noreply@busesjm.cl>"
   
   # ❌ Incorrecto
   RESEND_FROM="noreply@gmail.com"
   ```
3. **Evitar palabras spam en subject:**
   - No usar "URGENTE", "!!!!", "GRATIS"
   - Usar subjects descriptivos y profesionales

### 4. Reintentos excesivos

**Síntoma:** Muchos registros con `status='failed'` y `attempts >= 5`

**Diagnóstico:**
```sql
SELECT last_error, COUNT(*) FROM notification_outbox 
WHERE status = 'failed' 
GROUP BY last_error 
ORDER BY COUNT(*) DESC;
```

**Soluciones según error:**
- `Invalid API key` → Verificar `RESEND_API_KEY`
- `Email not found` → Verificar que usuarios tienen email en profiles
- `Rate limit exceeded` → Contactar soporte Resend para aumentar límite

**Resetear intentos (si error fue temporal):**
```sql
UPDATE notification_outbox
SET status = 'pending', attempts = 0, last_error = NULL
WHERE status = 'failed' AND last_error LIKE '%temporary%';
```

### 5. Dispatcher lento

**Síntoma:** Outbox crece más rápido de lo que se procesa

**Diagnóstico:**
```sql
SELECT 
  COUNT(*) as pending_count,
  AGE(NOW(), MIN(created_at)) as oldest_pending
FROM notification_outbox
WHERE status = 'pending';
```

**Soluciones:**
1. **Aumentar frecuencia de cron:**
   ```toml
   schedule = "*/2 * * * *"  # Cada 2 minutos en vez de 3
   ```
2. **Aumentar batch size** en `index.ts`:
   ```typescript
   const BATCH_SIZE = 100; // Aumentar de 50 a 100
   ```
3. **Verificar performance de Resend:**
   - Ver dashboard de Resend para delays

---

## 🔮 ROADMAP (FUTURO)

### Fase 2: UI de Administración

**Página:** `/admin/notifications/settings`

**Funcionalidades:**
- [ ] Toggle global de emails por organización
- [ ] Checkboxes para habilitar/deshabilitar tipos específicos
- [ ] Preview de templates
- [ ] Logs de emails enviados (últimos 30 días)
- [ ] Reenvío manual de notificaciones fallidas

### Fase 3: Modo Digest

Agrupar notificaciones y enviar resumen diario/semanal:
- [ ] Configuración de digest_mode (realtime / daily / weekly)
- [ ] Nueva Edge Function `notification-digest-sender`
- [ ] Template de email digest (múltiples items)
- [ ] Opción "Ver todas" con link a dashboard

### Fase 4: Webhooks de Resend

Escuchar eventos de Resend (delivered, bounced, opened):
- [ ] Tabla `notification_email_events`
- [ ] Edge Function webhook endpoint `/resend-webhook`
- [ ] Actualizar `notification_outbox` con estado final
- [ ] Dashboard de métricas (open rate, bounce rate)

### Fase 5: Notificaciones Push (Web/Mobile)

- [ ] Integración con Firebase Cloud Messaging
- [ ] Service Worker para notificaciones web
- [ ] Push notifications en mobile app

---

## 📈 MÉTRICAS DE ÉXITO

### KPIs a monitorear

1. **Tasa de envío exitoso:** `> 95%`
   ```sql
   SELECT 
     ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'sent') / COUNT(*), 2) as success_rate
   FROM notification_outbox
   WHERE created_at > NOW() - INTERVAL '24 hours';
   ```

2. **Latencia promedio:** `< 5 min`
   ```sql
   SELECT 
     AVG(EXTRACT(EPOCH FROM (sent_at - created_at))/60) as avg_latency_minutes
   FROM notification_outbox
   WHERE status = 'sent' AND created_at > NOW() - INTERVAL '24 hours';
   ```

3. **Tasa de reintentos:** `< 10%`
   ```sql
   SELECT 
     ROUND(100.0 * COUNT(*) FILTER (WHERE attempts > 1) / COUNT(*), 2) as retry_rate
   FROM notification_outbox
   WHERE created_at > NOW() - INTERVAL '24 hours';
   ```

---

## 🎯 RESUMEN FINAL

### ✅ Lo que se implementó

1. **Base de Datos:**
   - ✅ Tabla `notification_outbox` con idempotencia
   - ✅ Triggers automáticos para hazard + PAM
   - ✅ RLS policies (security)
   - ✅ Función de limpieza

2. **Edge Function:**
   - ✅ Dispatcher con reintentos automáticos
   - ✅ Resolución inteligente de emails
   - ✅ Templates HTML responsive
   - ✅ Subjects dinámicos según tipo
   - ✅ Cron job cada 3 minutos

3. **UX/UI:**
   - ✅ Emails profesionales con rojo corporativo
   - ✅ Compatible Gmail/Outlook/Apple Mail
   - ✅ Botón CTA + link de respaldo
   - ✅ Footer con auditoría

4. **Documentación:**
   - ✅ Setup completo
   - ✅ Quick start
   - ✅ Configuración secrets
   - ✅ Testing checklist
   - ✅ Troubleshooting
   - ✅ Monitoreo

### 🚀 Próximos pasos

1. **Ejecutar migración SQL** (5 min)
2. **Configurar Resend** (10 min)
3. **Configurar secrets** (5 min)
4. **Desplegar Edge Function** (5 min)
5. **Testing end-to-end** (15 min)
6. **Monitorear 24h** (ongoing)

**Tiempo total de implementación:** ~40 minutos

---

## 📞 SOPORTE

**Documentación:**
- [EMAIL_NOTIFICATIONS_SETUP.md](./docs/EMAIL_NOTIFICATIONS_SETUP.md) - Documentación completa
- [EMAIL_NOTIFICATIONS_QUICK_START.md](./docs/EMAIL_NOTIFICATIONS_QUICK_START.md) - Guía rápida
- [SUPABASE_SECRETS.md](./docs/SUPABASE_SECRETS.md) - Configuración de secrets

**Recursos externos:**
- Resend Docs: https://resend.com/docs
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Supabase Cron: https://supabase.com/docs/guides/functions/cron

---

**Última actualización:** Enero 16, 2026  
**Versión:** 1.0.0  
**Estado:** ✅ LISTO PARA IMPLEMENTACIÓN
