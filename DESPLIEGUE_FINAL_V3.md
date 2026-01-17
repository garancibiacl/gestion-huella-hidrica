# 🚀 DESPLIEGUE FINAL - PLANTILLAS PROFESIONALES

## ✅ TODO LISTO - EJECUTA ESTOS COMANDOS

---

## PASO 1: DESPLEGAR LA FUNCIÓN (2 min)

Abre tu **Terminal** y ejecuta:

```bash
cd /Users/imac/Desktop/Git/gestion-huella-hidrica
npx supabase functions deploy notification-email-dispatcher
```

**Resultado esperado:**
```
✓ Deployed Function notification-email-dispatcher
```

---

## PASO 2: VERIFICAR VERSIÓN

```bash
curl https://swfktmhqmxqjaqtarreh.supabase.co/functions/v1/notification-email-dispatcher
```

**Debe retornar:**
```json
{"status":"ok","service":"notification-email-dispatcher","version":"v3"}
```

---

## PASO 3: LIMPIAR NOTIFICACIONES ANTIGUAS

Ejecuta este SQL en **Supabase SQL Editor**:

```sql
-- Marcar notificaciones antiguas como fallidas
UPDATE notification_outbox 
SET status = 'failed'
WHERE status = 'pending' 
  AND created_at < NOW() - INTERVAL '5 minutes';
```

---

## PASO 4: CREAR REPORTE DE PRUEBA

1. Ve a: https://app.busesjm.cl/admin/pls/hazard-report/new
2. Completa:
   - **Descripción:** `Prueba final de plantilla profesional v3 - Verificar diseño completo con todos los elementos visuales`
   - **Gerencia:** Selecciona cualquiera
   - **Riesgo Crítico:** Selecciona cualquiera
   - **Responsable de Cierre:** Tu email (`tu@busesjm.com`)
   - **Faena:** `Prueba Final`
   - **Plazo de Cierre:** Mañana
3. Click **"Crear Reporte"**

---

## PASO 5: ENVIAR EL EMAIL

**Opción A: Automático (esperar 3 min)**

El cron ejecutará el dispatcher automáticamente.

**Opción B: Manual (inmediato)**

```bash
# Reemplaza [SERVICE_ROLE_KEY] con tu key real
curl -X POST https://swfktmhqmxqjaqtarreh.supabase.co/functions/v1/notification-email-dispatcher \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json"
```

**¿Dónde está mi SERVICE_ROLE_KEY?**
https://supabase.com/dashboard/project/swfktmhqmxqjaqtarreh/settings/api

**Resultado esperado:**
```json
{
  "processed": 1,
  "sent": 1,
  "failed": 0,
  "errors": []
}
```

---

## ✅ RESULTADO ESPERADO EN TU INBOX

```
┌──────────────────────────────────────────────────┐
│ ████████████████████████████████████████████████ │ ← GRADIENTE ROJO
│ 🚨 REPORTE DE PELIGRO                            │ ← Badge blanco
└──────────────────────────────────────────────────┘

Nuevo Reporte de Peligro Asignado                    ← Título H2 bold
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Hola Gabriel Arancibia,                              ← Saludo personalizado

Se te ha asignado un nuevo reporte de peligro        ← Intro clara
que requiere tu atención y acción inmediata.

┌──────────────────────────────────────────────────┐
│ REQUIERE ACCIÓN                                  │ ← Badge rojo suave
│                                                  │
│ Prueba final de plantilla profesional v3 -      │ ← Descripción completa
│ Verificar diseño completo con todos los         │
│ elementos visuales                               │
│                                                  │
│ 📋 Descripción:  Prueba final de plantilla...   │ ← Tabla de datos
│ ⚠️ Riesgo Crítico: Caída a distinto nivel        │   escaneables
│ 📍 Faena:         Prueba Final                   │
│ 🏢 Proceso:       Mantenimiento / Taller /...   │
│ 📅 Plazo:         19 de enero, 2026 18:00       │
│ 🕐 Reportado:     18 de enero, 2026 15:30       │
└──────────────────────────────────────────────────┘

        ┌────────────────────────────┐
        │  VER REPORTE EN LA APP     │              ← Botón CTA grande
        └────────────────────────────┘                rojo con bordes

Si el botón no funciona, copia este enlace:          ← Link alternativo
https://app.busesjm.cl/admin/pls/hazard-report/abc-123

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JM HSE · Gestión de Seguridad y Medio Ambiente      ← Footer gris
Este es un correo automático. No respondas.
Organización: Buses JM
Enviado: 18 de enero, 2026 15:30 CLT
```

---

## 🔍 DEBUGGING (Si algo sale mal)

### Ver logs en tiempo real:

```bash
npx supabase functions logs notification-email-dispatcher --tail
```

Buscar:
- ✅ `🎨 Generating dynamic HTML for [id]` ← Está usando plantillas v3
- ✅ `✅ Email sent: [id] → tu@email.com` ← Envío exitoso
- ❌ `❌ Error fetching hazard_report` ← Error en consulta

### Ver estado en BD:

```sql
-- Último email procesado
SELECT 
  id,
  notification_type,
  status,
  attempts,
  last_error,
  created_at,
  sent_at
FROM notification_outbox 
ORDER BY created_at DESC 
LIMIT 1;
```

Si `status = 'failed'`, revisar `last_error`.

---

## 🎨 DIFERENCIAS CLAVE DEL NUEVO DISEÑO

| Elemento | Antes (Básico) | Después (Profesional) |
|----------|----------------|----------------------|
| **Header** | Texto simple "NOTIFICACIÓN" | Gradiente rojo + emoji + badge |
| **Título** | Sin formato especial | H2 bold, grande, destacado |
| **Saludo** | "Hola gu email," (bug) | "Hola [Nombre completo]," |
| **Descripción** | Texto plano sin formato | Card con borde izquierdo rojo |
| **Datos** | Solo plazo | Tabla completa: riesgo, faena, proceso, plazo, reportado |
| **Badge** | No existe | "REQUIERE ACCIÓN" con color semántico |
| **Botón CTA** | Link básico | Botón grande rojo con hover |
| **Fallback** | Solo texto del link | "Si el botón no funciona..." con link legible |
| **Footer** | Texto simple | Separador + info legal + auditoría |
| **Responsive** | No optimizado | Mobile-first, 600px, táctil |
| **Colores** | Gris básico | Sistema semántico (rojo, naranja, verde) |
| **Tipografía** | Por defecto | Arial/sans-serif, jerarquía clara |

---

## ✅ CHECKLIST POST-DESPLIEGUE

- [ ] Ejecutado: `npx supabase functions deploy notification-email-dispatcher`
- [ ] Verificado: `curl [url]` retorna `"version":"v3"`
- [ ] Limpiadas notificaciones antiguas (SQL UPDATE)
- [ ] Creado reporte de prueba con descripción larga
- [ ] Invocado dispatcher (manual o automático)
- [ ] Email recibido en inbox
- [ ] Diseño profesional visible:
  - [ ] Header rojo gradiente
  - [ ] Badge "REQUIERE ACCIÓN"
  - [ ] Descripción completa en card
  - [ ] Tabla de datos clave
  - [ ] Botón CTA grande y destacado
  - [ ] Footer con info legal
- [ ] Botón "VER REPORTE EN LA APP" funciona
- [ ] Link alternativo funciona
- [ ] Datos correctos (descripción, riesgo, faena, plazo)

---

## 📞 ¿TODO FUNCIONÓ?

Si el email se ve profesional como el ejemplo arriba:

✅ **¡IMPLEMENTACIÓN COMPLETA!**

Puedes:
1. Crear reportes reales
2. Los usuarios recibirán emails profesionales automáticamente
3. Monitorear con los comandos de debugging arriba

---

## 🚨 ¿ALGO NO FUNCIONA?

Envíame:
1. Salida de: `npx supabase functions logs notification-email-dispatcher --tail`
2. Resultado de: SQL `SELECT * FROM notification_outbox ORDER BY created_at DESC LIMIT 1;`
3. Captura del email recibido (si llegó)

---

**¡Ejecuta los pasos y cuéntame cómo va! 🚀**
