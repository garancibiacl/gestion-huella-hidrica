# 📧 SISTEMA DE NOTIFICACIONES POR EMAIL

Sistema completo de notificaciones transaccionales usando **Resend** para el módulo HSE (Reportes de Peligro y Tareas PAM).

## 🏗️ ARQUITECTURA

### Patrón OUTBOX + DISPATCHER

```
[hazard_notifications] ──┐
                         ├──> [TRIGGER] ──> [notification_outbox] ──> [Edge Function] ──> [Resend API] ──> 📧
[pam_notifications] ─────┘                     (cola)              (dispatcher cron)
```

**Ventajas:**
- ✅ No envía emails directamente desde triggers (más robusto)
- ✅ Reintentos automáticos con backoff
- ✅ Idempotencia garantizada
- ✅ Auditoría completa
- ✅ Fácil de monitorear y depurar

---

## 📦 COMPONENTES

### 1. Base de Datos

#### `notification_outbox` (tabla principal)
Cola de salida para notificaciones pendientes de envío.

**Columnas clave:**
- `source_table` + `source_id`: referencia a la notificación origen
- `entity_type` + `entity_id`: referencia a hazard_report o pam_task
- `status`: pending / processing / sent / failed
- `attempts`: contador de reintentos (máx 5)
- `payload`: snapshot JSON con datos para email

**Idempotencia:**
- Constraint único: `(source_table, source_id, channel)`
- Una notificación solo genera un email

#### `notification_email_settings` (opcional)
Configuración por organización para habilitar/deshabilitar tipos de notificaciones.

### 2. Triggers SQL

**`trigger_enqueue_hazard_notification_email`**
- Se ejecuta `AFTER INSERT` en `hazard_notifications`
- Verifica settings de la organización
- Obtiene datos del reporte con JOIN
- Inserta en `notification_outbox` con payload completo

**`trigger_enqueue_pam_notification_email`**
- Se ejecuta `AFTER INSERT` en `pam_notifications`
- Similar al anterior, pero para tareas PAM
- Payload incluye datos de `pam_tasks`

### 3. Edge Function: `notification-email-dispatcher`

**Archivo:** `supabase/functions/notification-email-dispatcher/index.ts`

**Ejecución:**
- Llamada por cron cada **2-5 minutos**
- Procesa hasta **50 registros** por batch
- Usa `FOR UPDATE SKIP LOCKED` para concurrencia segura (simulado con selección + update)

**Flujo:**
1. Seleccionar registros `pending`
2. Marcar como `processing`
3. Resolver email del destinatario (profiles → auth.users)
4. Generar subject y HTML
5. Enviar con Resend API
6. Marcar como `sent` (o `failed` si excede intentos)

**Secrets requeridos:**
```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM=HSE Site <noreply@yourdomain.com>
APP_BASE_URL=https://app.busesjm.cl
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
```

### 4. Templates HTML

**Archivo:** `supabase/functions/notification-email-dispatcher/email-templates.ts`

**Características:**
- Compatible con Gmail, Outlook, Apple Mail
- Tablas + inline styles (no CSS externo)
- Responsive (max-width 600px)
- Rojo corporativo (#B3382A) como acento
- CTA botón + link de respaldo
- Footer con auditoría (ID, org, timestamp)

**Tipos soportados:**
- Hazard: `report_assigned`, `report_due_soon`, `report_overdue`, `report_closed`
- PAM: `task_assigned`, `task_due_soon`, `task_overdue`

---

## 🚀 INSTALACIÓN

### 1. Ejecutar migración SQL

```bash
cd supabase
psql $DATABASE_URL -f migrations/20260116_create_notification_outbox.sql
```

O desde Supabase Studio:
1. Ir a **SQL Editor**
2. Pegar contenido de `20260116_create_notification_outbox.sql`
3. Ejecutar

### 2. Configurar Secrets en Supabase

Ir a **Project Settings** → **Edge Functions** → **Secrets**:

```bash
# Resend (obtener de https://resend.com/api-keys)
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM="HSE Site <noreply@tudominio.com>"

# App
APP_BASE_URL=https://app.busesjm.cl

# Supabase (ya existen, solo verificar)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
```

### 3. Desplegar Edge Function

```bash
npx supabase functions deploy notification-email-dispatcher
```

### 4. Configurar Cron Job

Editar `supabase/config.toml`:

```toml
[functions.notification-email-dispatcher]
verify_jwt = false

[functions.notification-email-dispatcher.cron]
schedule = "*/3 * * * *"  # Cada 3 minutos
```

Aplicar cambios:
```bash
npx supabase db push
```

---

## 🧪 PRUEBAS END-TO-END

### Test 1: Hazard Report Assigned

1. Crear nuevo reporte de peligro desde la UI
2. Asignar a un usuario con email válido
3. Verificar en Supabase:
   ```sql
   -- Debe existir notificación
   SELECT * FROM hazard_notifications WHERE hazard_report_id = 'xxx';
   
   -- Debe existir en outbox
   SELECT * FROM notification_outbox WHERE entity_id = 'xxx';
   ```
4. Esperar hasta 5 minutos (o invocar manualmente)
5. Verificar email recibido
6. Clic en "Ver en la App" → debe abrir el reporte

### Test 2: Hazard Report Overdue

1. Ejecutar Edge Function de due reminders:
   ```bash
   curl -X POST https://xxx.supabase.co/functions/v1/hazard-due-reminders \
     -H "Authorization: Bearer $ANON_KEY"
   ```
2. Verificar notificaciones creadas
3. Verificar outbox
4. Esperar dispatcher
5. Verificar email "Reporte VENCIDO"

### Test 3: PAM Task Assigned

1. Subir planilla semanal PLS con tareas
2. Verificar `pam_notifications` creadas
3. Verificar `notification_outbox`
4. Esperar dispatcher
5. Verificar emails recibidos
6. Clic en "Ver en la App" → debe abrir `/pls/my-activities?task=xxx`

### Test 4: Error Handling

1. Modificar secret `RESEND_API_KEY` con valor inválido
2. Crear notificación
3. Verificar en outbox:
   ```sql
   SELECT id, status, attempts, last_error 
   FROM notification_outbox 
   WHERE status IN ('pending', 'failed')
   ORDER BY created_at DESC;
   ```
4. Debe marcar como `failed` después de 5 intentos

### Test 5: Idempotencia

1. Crear hazard_notification
2. Verificar solo 1 registro en outbox
3. Intentar insertar duplicado manualmente (debe fallar por constraint)
4. Confirmar solo 1 email enviado

### Test 6: RLS

1. Intentar leer `notification_outbox` desde cliente:
   ```js
   const { data } = await supabase.from('notification_outbox').select('*');
   // Debe retornar [] (RLS bloquea)
   ```

---

## 📊 MONITOREO

### Consultas SQL útiles

#### Estado general del outbox
```sql
SELECT 
  status,
  COUNT(*) as count,
  MAX(created_at) as last_created
FROM notification_outbox
GROUP BY status
ORDER BY status;
```

#### Notificaciones fallidas recientes
```sql
SELECT 
  id,
  entity_type,
  notification_type,
  attempts,
  last_error,
  created_at
FROM notification_outbox
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 20;
```

#### Notificaciones pendientes por mucho tiempo
```sql
SELECT 
  id,
  entity_type,
  notification_type,
  attempts,
  created_at,
  AGE(NOW(), created_at) as age
FROM notification_outbox
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '30 minutes'
ORDER BY created_at ASC;
```

#### Tasa de éxito (últimas 24h)
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

Ver logs en Supabase Dashboard:
1. Ir a **Edge Functions**
2. Click en `notification-email-dispatcher`
3. Tab **Logs**

Buscar:
- `✓ Email sent` (éxitos)
- `✗ Failed to send` (errores)
- `Batch complete: X sent, Y failed`

---

## 🔧 TROUBLESHOOTING

### Emails no se envían

1. **Verificar outbox:**
   ```sql
   SELECT * FROM notification_outbox WHERE status = 'pending' ORDER BY created_at DESC LIMIT 5;
   ```
   - Si está vacío: el trigger no se ejecutó
   - Si hay registros: el dispatcher no está funcionando

2. **Verificar secrets:**
   ```bash
   npx supabase secrets list
   ```
   - Confirmar `RESEND_API_KEY`, `RESEND_FROM`, `APP_BASE_URL`

3. **Verificar cron:**
   - Ir a **Database** → **Cron Jobs**
   - Debe aparecer `notification-email-dispatcher`

4. **Invocar manualmente:**
   ```bash
   curl -X POST https://xxx.supabase.co/functions/v1/notification-email-dispatcher \
     -H "Authorization: Bearer $SERVICE_ROLE_KEY"
   ```

### Emails llegan a spam

1. **Configurar SPF/DKIM en Resend:**
   - Ir a https://resend.com/domains
   - Agregar dominio personalizado
   - Configurar DNS records

2. **Verificar `RESEND_FROM`:**
   - Usar dominio verificado: `HSE Site <noreply@tudominio.com>`
   - No usar `@gmail.com` o similares

### Reintentos excesivos

Si hay muchos `failed` con `attempts >= 5`:
```sql
UPDATE notification_outbox
SET status = 'pending', attempts = 0, last_error = NULL
WHERE status = 'failed' AND last_error LIKE '%temporary%';
```

### Limpiar outbox antiguo

```sql
SELECT cleanup_old_notification_outbox();
```

---

## 🎨 DISEÑO DE EMAILS

### Especificaciones técnicas

- **Ancho máximo:** 600px
- **Fuentes:** System fonts (sin fuentes externas)
- **Colores:**
  - Rojo corporativo: `#B3382A`
  - Texto principal: `#111827`
  - Texto secundario: `#6b7280`
  - Fondo: `#f4f5f7`
- **Botón CTA:** 48px alto, 240px ancho mínimo
- **Accesibilidad:** Contraste WCAG AA+

### Subjects por tipo

| Tipo | Subject Template | Ejemplo |
|------|-----------------|---------|
| `report_assigned` | `[HSE] Nuevo reporte asignado · {faena} · {riesgo}` | `[HSE] Nuevo reporte asignado · Los Andes Taller · Liderazgo deficiente` |
| `report_due_soon` | `[HSE] Reporte por vencer · {fecha} · {faena}` | `[HSE] Reporte por vencer · 20-01 · Los Andes Taller` |
| `report_overdue` | `[HSE] Reporte VENCIDO · {faena} · {riesgo}` | `[HSE] Reporte VENCIDO · Los Andes Taller · Liderazgo deficiente` |
| `report_closed` | `[HSE] Reporte cerrado · Verificación pendiente · {faena}` | `[HSE] Reporte cerrado · Verificación pendiente · Los Andes Taller` |
| `task_assigned` | `[HSE] Nueva tarea asignada · {fecha} · {ubicación}` | `[HSE] Nueva tarea asignada · 20-01 · Sede Central` |
| `task_due_soon` | `[HSE] Tarea por vencer · {fecha} · {ubicación}` | `[HSE] Tarea por vencer · 20-01 · Sede Central` |
| `task_overdue` | `[HSE] Tarea VENCIDA · {ubicación}` | `[HSE] Tarea VENCIDA · Sede Central` |

---

## 🔮 ROADMAP (TODO)

### UI de Administración (futuro)

Crear página `/admin/notifications/settings`:
- Toggle global de emails por organización
- Checkboxes por tipo (hazard/pam)
- Preview de templates
- Logs de emails enviados

### Modo Digest (futuro)

Agrupar notificaciones y enviar resumen diario/semanal:
```sql
ALTER TABLE notification_email_settings 
ADD COLUMN digest_mode TEXT CHECK (digest_mode IN ('realtime', 'digest_daily', 'digest_weekly'));
```

### Webhooks de Resend (futuro)

Escuchar eventos de Resend (delivered, bounced, opened):
- Crear tabla `notification_email_events`
- Edge Function para webhook endpoint
- Actualizar `notification_outbox` con estado final

---

## 📝 EJEMPLO DE EMAIL GENERADO

### Hazard Report Overdue

**Subject:** `[HSE] Reporte VENCIDO · Los Andes Taller · Liderazgo deficiente`

**HTML Preview:**
```
┌────────────────────────────────────────────────┐
│ [Barra roja corporativa]                       │
├────────────────────────────────────────────────┤
│ Buses JM · Gestión de Seguridad (HSE)        │
│ Notificación automática                        │
├────────────────────────────────────────────────┤
│                                                 │
│ Reporte VENCIDO                                │
│ Este reporte ha superado su plazo de cierre.  │
│ Se requiere acción inmediata.                 │
│                                                 │
│ [REQUIERE ACCIÓN]                             │
│                                                 │
│ ┌─────────────────────────────────────────┐  │
│ │ 📋 REPORTE DE PELIGRO                   │  │
│ │                                           │  │
│ │ Se detecta desorden de neumáticos en el  │  │
│ │ taller; no hay definido un lugar para...  │  │
│ │                                           │  │
│ │ Jerarquía:                                │  │
│ │ Gerencia de Seguridad → Control en       │  │
│ │ Terreno → Inspección en terreno          │  │
│ │                                           │  │
│ │ Riesgo Crítico:     Liderazgo deficiente │  │
│ │ Responsable:        Leonidas Collao      │  │
│ │ Plazo de Cierre:    15 de enero · 23:59 │  │
│ │ Faena:              Los andes taller     │  │
│ └─────────────────────────────────────────┘  │
│                                                 │
│          [VER EN LA APP]                       │
│                                                 │
│ Si el botón no funciona, copia este enlace:   │
│ https://app.busesjm.cl/admin/pls/...          │
│                                                 │
├────────────────────────────────────────────────┤
│ Este correo fue enviado automáticamente por   │
│ el sistema HSE de Buses JM.                    │
│ No respondas a este mensaje.                   │
│                                                 │
│ Abrir Plataforma                               │
│                                                 │
│ Auditoría: ID 0702341b · Buses JM ·           │
│ 16 de enero de 2026 · 15:30                   │
└────────────────────────────────────────────────┘
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [ ] Ejecutar migración `20260116_create_notification_outbox.sql`
- [ ] Verificar triggers creados (`\df` en psql)
- [ ] Configurar secrets en Supabase
- [ ] Obtener API key de Resend
- [ ] Verificar dominio en Resend (SPF/DKIM)
- [ ] Desplegar Edge Function
- [ ] Configurar cron job en `config.toml`
- [ ] Test 1: Hazard assigned → email recibido
- [ ] Test 2: Hazard overdue → email recibido
- [ ] Test 3: PAM task → email recibido
- [ ] Test 4: Error handling → intentos + failed
- [ ] Test 5: Idempotencia → solo 1 email por notificación
- [ ] Test 6: RLS → outbox no accesible desde cliente
- [ ] Monitorear logs por 24h
- [ ] Configurar alerta si `failed > 10%`
- [ ] Documentar en README principal
- [ ] (Opcional) Crear UI de settings

---

## 📞 SOPORTE

Para problemas o dudas:
1. Revisar logs de Edge Function
2. Consultar outbox con queries SQL de monitoreo
3. Verificar secrets y configuración Resend
4. Revisar esta documentación completa

**Última actualización:** Enero 2026
