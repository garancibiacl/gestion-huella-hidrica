# 📚 ÍNDICE DE DOCUMENTACIÓN - SISTEMA DE NOTIFICACIONES POR EMAIL

## 📋 Tabla de Contenidos

---

## 🎯 DOCUMENTOS PRINCIPALES

### **Para Desarrolladores:**

1. **[EMAIL_NOTIFICATIONS_IMPLEMENTATION_COMPLETE.md](../EMAIL_NOTIFICATIONS_IMPLEMENTATION_COMPLETE.md)**
   - 📖 Guía completa de implementación
   - 🧪 Instrucciones de testing paso a paso
   - 🔧 Configuración técnica detallada
   - 🔍 Troubleshooting y monitoreo
   - ⏱️ Tiempo de lectura: 20 minutos

2. **[RESUMEN_EMAILS_V3.md](../RESUMEN_EMAILS_V3.md)**
   - 📄 Resumen ejecutivo del sistema
   - 🏗️ Arquitectura visual
   - 🎨 Paleta de colores y diseño
   - ✅ Checklist de entrega
   - ⏱️ Tiempo de lectura: 5 minutos

3. **[docs/EMAIL_TEMPLATES_EXAMPLES.md](EMAIL_TEMPLATES_EXAMPLES.md)**
   - 📧 Ejemplos visuales de cada tipo de email
   - 🎨 Especificaciones técnicas (CSS, tipografía, espaciado)
   - ♿ Guía de accesibilidad (WCAG AA)
   - 🧪 Testing en múltiples clientes de correo
   - ⏱️ Tiempo de lectura: 15 minutos

---

### **Para Usuarios Finales:**

4. **[docs/GUIA_USUARIO_EMAILS.md](GUIA_USUARIO_EMAILS.md)**
   - 📬 Qué emails recibirás
   - ✅ Cómo actuar sobre notificaciones
   - ❓ Preguntas frecuentes
   - 📱 Acceso móvil
   - ⏱️ Tiempo de lectura: 10 minutos

---

## 🔧 ARCHIVOS TÉCNICOS

### **Código Fuente:**

5. **[supabase/functions/notification-email-dispatcher/index.ts](../supabase/functions/notification-email-dispatcher/index.ts)**
   - Edge Function principal (dispatcher v3)
   - Procesamiento de cola de notificaciones
   - Integración con Resend API
   - Retry y error handling

6. **[supabase/functions/notification-email-dispatcher/email-templates.ts](../supabase/functions/notification-email-dispatcher/email-templates.ts)**
   - Plantillas HTML para 8 tipos de notificaciones
   - Generación dinámica de subjects
   - Sistema de color semántico
   - Funciones de formateo y escapado

7. **[supabase/functions/notification-email-dispatcher/deno.json](../supabase/functions/notification-email-dispatcher/deno.json)**
   - Configuración de Deno
   - Dependencias
   - Tasks

---

### **Base de Datos:**

8. **[supabase/migrations/20260116_create_notification_outbox.sql](../supabase/migrations/20260116_create_notification_outbox.sql)**
   - Tablas: `notification_outbox`, `notification_email_settings`
   - Triggers automáticos para encolar emails
   - Funciones SQL: `enqueue_hazard_notification_email()`, `enqueue_pam_notification_email()`
   - RLS policies

---

### **Herramientas:**

9. **[scripts/test-emails.sh](../scripts/test-emails.sh)**
   - Script de testing interactivo
   - Health check, secrets, dispatcher manual
   - Consultas SQL de estado
   - Logs de la función

---

## 🚀 GUÍAS DE INICIO RÁPIDO

### **Setup Inicial (5 min):**

```bash
# 1. Configurar secrets
npx supabase secrets set RESEND_API_KEY="re_xxxxx"
npx supabase secrets set RESEND_FROM="JM HSE <noreply@busesjm.cl>"
npx supabase secrets set APP_BASE_URL="https://app.busesjm.cl"

# 2. Desplegar función
npx supabase functions deploy notification-email-dispatcher

# 3. Verificar
curl https://[proyecto].supabase.co/functions/v1/notification-email-dispatcher
# Debe retornar: {"status":"ok","version":"v3"}
```

---

### **Testing Rápido (5 min):**

```bash
# Opción 1: Script interactivo
./scripts/test-emails.sh

# Opción 2: Manual
# 1. Crear reporte en /admin/pls/hazard-report/new
# 2. Invocar dispatcher:
curl -X POST https://[proyecto].supabase.co/functions/v1/notification-email-dispatcher \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]"
# 3. Verificar email en inbox
```

---

### **Monitoreo en Producción (2 min):**

```sql
-- Estado general (últimas 24h)
SELECT status, COUNT(*) FROM notification_outbox
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Últimos emails enviados
SELECT notification_type, recipient_email, sent_at
FROM notification_outbox
WHERE status = 'sent'
ORDER BY sent_at DESC LIMIT 10;

-- Errores
SELECT notification_type, last_error
FROM notification_outbox
WHERE status = 'failed'
ORDER BY created_at DESC;
```

---

## 📊 DIAGRAMA DE ARQUITECTURA

```
┌────────────────────────────────────────────────────────────┐
│ 1. EVENTO (Nuevo reporte / tarea)                         │
│    • hazard_reports.INSERT                                 │
│    • pam_tasks.INSERT                                      │
└─────────────┬──────────────────────────────────────────────┘
              │
              ▼
┌────────────────────────────────────────────────────────────┐
│ 2. TRIGGER SQL                                             │
│    • create_hazard_report_notification()                   │
│    • create_pam_task_notification()                        │
│    • INSERT INTO hazard_notifications / pam_notifications │
└─────────────┬──────────────────────────────────────────────┘
              │
              ▼
┌────────────────────────────────────────────────────────────┐
│ 3. TRIGGER SQL (Enqueue Email)                            │
│    • enqueue_hazard_notification_email()                   │
│    • enqueue_pam_notification_email()                      │
│    • INSERT INTO notification_outbox (status: pending)     │
└─────────────┬──────────────────────────────────────────────┘
              │
              ▼
┌────────────────────────────────────────────────────────────┐
│ 4. CRON JOB (cada 3 min)                                  │
│    • Invoca notification-email-dispatcher                  │
└─────────────┬──────────────────────────────────────────────┘
              │
              ▼
┌────────────────────────────────────────────────────────────┐
│ 5. DISPATCHER (Edge Function)                             │
│    • SELECT * FROM notification_outbox WHERE pending       │
│    • Genera HTML usando email-templates.ts                │
│    • POST a Resend API                                     │
│    • UPDATE notification_outbox (status: sent/failed)      │
└─────────────┬──────────────────────────────────────────────┘
              │
              ▼
┌────────────────────────────────────────────────────────────┐
│ 6. RESEND API                                             │
│    • Entrega email al inbox del usuario                    │
│    • Retorna message_id                                    │
└────────────────────────────────────────────────────────────┘
```

---

## 🎨 TIPOS DE NOTIFICACIONES

| ID | Tipo | Color | Subject Ejemplo |
|----|------|-------|-----------------|
| 1 | `report_assigned` | 🔴 Rojo | `[HSE] Nuevo reporte asignado · Taller · Caída` |
| 2 | `report_due_soon` | 🟠 Naranja | `[HSE] ⚠️ Reporte próximo a vencer (2d) · ...` |
| 3 | `report_overdue` | 🟥 Rojo oscuro | `[HSE] 🚨 Reporte VENCIDO (+3d) · ...` |
| 4 | `report_closed` | 🟢 Verde | `[HSE] Reporte cerrado · Requiere verificación` |
| 5 | `report_verified` | 🟢 Verde | `[HSE] ✅ Reporte verificado y archivado` |
| 6 | `task_assigned` | 🔴 Rojo | `[HSE] Nueva tarea asignada · Taller · PAM` |
| 7 | `task_due_soon` | 🟠 Naranja | `[HSE] ⚠️ Tarea próxima a vencer (1d) · ...` |
| 8 | `task_overdue` | 🟥 Rojo oscuro | `[HSE] 🚨 Tarea VENCIDA (+2d) · ...` |

---

## 🔍 TROUBLESHOOTING RÁPIDO

| Problema | Documento | Sección |
|----------|-----------|---------|
| Email no llega | `EMAIL_NOTIFICATIONS_IMPLEMENTATION_COMPLETE.md` | Problema 1 |
| Error "Invalid API Key" | `EMAIL_NOTIFICATIONS_IMPLEMENTATION_COMPLETE.md` | Problema 2 |
| Email sin destinatario | `EMAIL_NOTIFICATIONS_IMPLEMENTATION_COMPLETE.md` | Problema 3 |
| Diseño roto en Outlook | `EMAIL_NOTIFICATIONS_IMPLEMENTATION_COMPLETE.md` | Problema 4 |
| Usuario no recibe emails | `GUIA_USUARIO_EMAILS.md` | Preguntas Frecuentes |

---

## 📞 CONTACTO Y SOPORTE

### **Documentación Técnica:**
- Ver: `EMAIL_NOTIFICATIONS_IMPLEMENTATION_COMPLETE.md`

### **Ejemplos Visuales:**
- Ver: `docs/EMAIL_TEMPLATES_EXAMPLES.md`

### **Guía de Usuario:**
- Ver: `docs/GUIA_USUARIO_EMAILS.md`

### **Testing:**
- Ver: Sección "TESTING" en `EMAIL_NOTIFICATIONS_IMPLEMENTATION_COMPLETE.md`
- Ejecutar: `./scripts/test-emails.sh`

---

## ✅ CHECKLIST DE VALIDACIÓN

Antes de aprobar el sistema en producción:

- [ ] Leído: `RESUMEN_EMAILS_V3.md`
- [ ] Configurados secrets (RESEND_API_KEY, RESEND_FROM, APP_BASE_URL)
- [ ] Desplegada función: `notification-email-dispatcher`
- [ ] Health check OK: `curl [función_url]`
- [ ] Probado: Crear reporte y verificar email recibido
- [ ] Validado: Email se ve bien en Gmail, Outlook, Apple Mail
- [ ] Probado: Link "Ver en la App" funciona
- [ ] Verificado: Logs sin errores críticos
- [ ] Probado: Script `./scripts/test-emails.sh`
- [ ] Monitoreado: Primeras 24h en producción

---

## 📈 MÉTRICAS Y KPIs

### **Objetivos de Rendimiento:**

| Métrica | Objetivo | Query SQL |
|---------|----------|-----------|
| Tasa de entrega | > 95% | `SELECT COUNT(*) FILTER (WHERE status='sent') * 100.0 / COUNT(*) FROM notification_outbox WHERE created_at > NOW() - INTERVAL '24h'` |
| Tasa de fallo | < 5% | `SELECT COUNT(*) FILTER (WHERE status='failed') * 100.0 / COUNT(*) FROM notification_outbox WHERE created_at > NOW() - INTERVAL '24h'` |
| Tiempo de envío | < 5 min | `SELECT AVG(EXTRACT(EPOCH FROM (sent_at - created_at))/60) FROM notification_outbox WHERE status='sent' AND created_at > NOW() - INTERVAL '24h'` |
| Reintentos promedio | < 1.2 | `SELECT AVG(attempts) FROM notification_outbox WHERE status='sent' AND created_at > NOW() - INTERVAL '24h'` |

---

## 🎯 ROADMAP FUTURO

### **Fase 2 (Opcional):**

- [ ] Notificaciones `due_soon` y `overdue` automáticas (cron diario)
- [ ] Digest mode (resumen diario en lugar de emails individuales)
- [ ] Panel de preferencias de usuario
- [ ] Personalización por organización (logo, colores)
- [ ] Estadísticas de apertura/click (integración con Resend Analytics)

### **Fase 3 (Futuro):**

- [ ] Notificaciones push (web push notifications)
- [ ] Integración con WhatsApp Business API
- [ ] Notificaciones SMS para críticos
- [ ] Dashboard de analíticas de notificaciones

---

## 📚 RECURSOS EXTERNOS

### **Email Design:**
- [Really Good Emails](https://reallygoodemails.com) - Inspiración
- [Email Design Best Practices](https://www.campaignmonitor.com/dev-resources/guides/design/)
- [Can I Email](https://www.caniemail.com) - Compatibilidad CSS

### **Resend (Proveedor de Email):**
- [Resend Documentation](https://resend.com/docs)
- [Resend Dashboard](https://resend.com/dashboard)

### **Supabase (Backend):**
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Database Functions](https://supabase.com/docs/guides/database/functions)

### **Accesibilidad:**
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

---

## 🎓 GLOSARIO

| Término | Definición |
|---------|------------|
| **OUTBOX Pattern** | Patrón de arquitectura donde eventos se encolan en una tabla antes de procesarse, garantizando entrega eventual |
| **DISPATCHER** | Proceso que lee la cola (outbox) y envía los emails usando una API externa (Resend) |
| **Edge Function** | Función serverless que corre en el edge de Supabase (Deno runtime) |
| **Resend** | Servicio de API para envío de emails transaccionales |
| **RLS (Row Level Security)** | Políticas de seguridad a nivel de fila en Postgres |
| **SECURITY DEFINER** | Función SQL que se ejecuta con permisos del propietario, no del usuario |
| **Cron Job** | Tarea programada que se ejecuta automáticamente a intervalos regulares |
| **Retry Logic** | Lógica para reintentar operaciones fallidas automáticamente |
| **WCAG** | Web Content Accessibility Guidelines (estándares de accesibilidad) |

---

**Versión:** 3.0  
**Última actualización:** 17 de enero, 2026  
**Mantenedor:** Equipo de Desarrollo HSE - Buses JM

---

## 🚀 INICIO RÁPIDO (30 SEGUNDOS)

### **Quiero empezar ya, ¿por dónde?**

1. **Si eres desarrollador:**  
   👉 Lee: `RESUMEN_EMAILS_V3.md` (5 min)  
   👉 Sigue: Sección "Setup Inicial" arriba  
   👉 Prueba: `./scripts/test-emails.sh`

2. **Si eres usuario final:**  
   👉 Lee: `docs/GUIA_USUARIO_EMAILS.md` (10 min)

3. **Si necesitas ayuda:**  
   👉 Busca tu problema en: Sección "Troubleshooting Rápido" arriba  
   👉 Consulta: `EMAIL_NOTIFICATIONS_IMPLEMENTATION_COMPLETE.md`

---

**¡Listo! El sistema está completo y documentado. 🎉**
