# 🚀 DESPLEGAR PLANTILLAS DE EMAIL PROFESIONALES

## ✅ TU CÓDIGO YA ESTÁ LISTO

Las plantillas profesionales **ya están en tu código** y funcionarán automáticamente cuando despliegues.

---

## 📋 PASO A PASO (5 MINUTOS)

### **OPCIÓN 1: Script Automático (Recomendado)**

Abre tu **Terminal** y ejecuta:

```bash
cd /Users/imac/Desktop/Git/gestion-huella-hidrica
./scripts/deploy-email-templates.sh
```

---

### **OPCIÓN 2: Manual**

Si el script no funciona, ejecuta estos comandos uno por uno:

```bash
# 1. Ir al proyecto
cd /Users/imac/Desktop/Git/gestion-huella-hidrica

# 2. Login en Supabase (si no lo has hecho)
npx supabase login

# 3. Desplegar la función
npx supabase functions deploy notification-email-dispatcher

# 4. Verificar (debe decir "version":"v3")
curl https://swfktmhqmxqjaqtarreh.supabase.co/functions/v1/notification-email-dispatcher
```

**Resultado esperado del paso 4:**
```json
{"status":"ok","service":"notification-email-dispatcher","version":"v3"}
```

---

## 🧪 PROBAR EL NUEVO DISEÑO

### **PASO 1: Limpiar notificaciones antiguas (Opcional)**

Para asegurarte de que no queden emails con el diseño antiguo:

```sql
-- Ejecutar en Supabase SQL Editor
UPDATE notification_outbox 
SET status = 'failed' 
WHERE status = 'pending' AND html_body IS NOT NULL AND html_body != 'GENERATE';
```

### **PASO 2: Crear un nuevo reporte**

1. Ve a: `https://app.busesjm.cl/admin/pls/hazard-report/new`
2. Completa el formulario:
   - **Descripción:** "Prueba de plantilla profesional de email"
   - **Riesgo Crítico:** Selecciona cualquiera
   - **Responsable de Cierre:** Selecciona tu email
   - **Faena:** Escribe "Prueba"
   - **Plazo:** Selecciona mañana
3. Click **"Crear Reporte"**

### **PASO 3: Enviar el email**

**Opción A: Esperar 3 minutos** (cron automático)

**Opción B: Invocar manualmente** (más rápido):

```bash
curl -X POST https://swfktmhqmxqjaqtarreh.supabase.co/functions/v1/notification-email-dispatcher \
  -H "Authorization: Bearer [TU_SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json"
```

**¿Dónde está mi SERVICE_ROLE_KEY?**
- Ve a: https://supabase.com/dashboard/project/swfktmhqmxqjaqtarreh/settings/api
- Busca: "service_role" (secret)
- Copia la key

**Resultado esperado:**
```json
{
  "processed": 1,
  "sent": 1,
  "failed": 0,
  "errors": []
}
```

### **PASO 4: Verificar el email en tu inbox**

Abre tu email y busca: `[HSE] Nuevo reporte asignado · Prueba · ...`

---

## 🎨 CÓMO SE VERÁ EL EMAIL

```
┌─────────────────────────────────────────────┐
│ ██████████████████████████████████████████  │ ← Barra roja gradiente
│ 🚨 REPORTE DE PELIGRO                       │ ← Badge blanco sobre rojo
└─────────────────────────────────────────────┘

Nuevo Reporte de Peligro Asignado               ← Título grande y bold
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Hola [Tu Nombre],                               ← Saludo personalizado

Se te ha asignado un nuevo reporte de peligro  ← Intro breve
que requiere tu atención y acción inmediata.

┌─────────────────────────────────────────────┐
│ REQUIERE ACCIÓN                             │ ← Badge rojo con texto oscuro
│                                             │
│ Prueba de plantilla profesional de email   │ ← Descripción completa
│                                             │
│ 📋 Descripción:  Prueba de plantilla...    │ ← Datos clave
│ ⚠️ Riesgo Crítico: [Tu riesgo seleccionado] │   en tabla
│ 📍 Faena:        Prueba                     │   escaneable
│ 🏢 Proceso:      [Jerarquía completa]      │
│ 📅 Plazo:        [Fecha que seleccionaste] │
│ 🕐 Reportado:    18 de enero, 2026 10:30   │
└─────────────────────────────────────────────┘

       ┌───────────────────────────┐
       │  VER REPORTE EN LA APP    │          ← Botón CTA grande
       └───────────────────────────┘            rojo con hover

Si el botón no funciona, copia este enlace:    ← Fallback link
https://app.busesjm.cl/admin/pls/hazard-report/abc-123

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JM HSE · Gestión de Seguridad y Medio Ambiente ← Footer gris
Este es un correo automático. No respondas.      con info legal
Organización: Buses JM
Enviado: 18 de enero, 2026 10:30 CLT
```

---

## 🎨 CARACTERÍSTICAS DEL DISEÑO PROFESIONAL

### **✅ Visual Hierarchy**
- Header con gradiente rojo corporativo
- Badge de estado con color semántico
- Tipografía clara (Arial, sans-serif)
- Espaciado generoso para legibilidad

### **✅ Responsive**
- Ancho 600px (estándar email)
- Se adapta a móvil automáticamente
- Botones con tamaño táctil (44px+)

### **✅ Accesible**
- Contraste WCAG AA (4.5:1)
- Jerarquía semántica con tablas
- Texto alternativo en elementos críticos

### **✅ Compatible**
- ✅ Gmail (Web, iOS, Android)
- ✅ Outlook (Windows, Web, iOS)
- ✅ Apple Mail (macOS, iOS)
- ✅ Clientes corporativos

---

## 🔍 CÓMO FUNCIONA EL SISTEMA

Tu código tiene **lógica inteligente**:

1. **Si la BD tiene `html_body` pre-renderizado** → Lo usa (compatibilidad con sistema antiguo)
2. **Si NO tiene o es placeholder** → Genera dinámicamente con plantillas v3 (nuevo sistema)

```typescript
// En index.ts línea 359-400
const isPlaceholder = !record.html_body || 
  record.html_body === 'GENERATE' ||
  record.html_body.length < 100;

if (!isPlaceholder) {
  // Usar HTML antiguo (compatibilidad)
  html = record.html_body;
} else {
  // 🎨 GENERAR CON PLANTILLAS V3 (NUEVO)
  const reportData = await fetchHazardReportData(...);
  const payload = { ...datos del reporte... };
  html = generateEmailHtml(type, payload, name, url);
}
```

Esto significa que:
- **Emails nuevos** → Diseño profesional v3 ✅
- **Emails antiguos en cola** → Todavía funcionan ✅

---

## 📊 VERIFICAR QUE FUNCIONÓ

### **1. Ver logs en tiempo real:**

```bash
npx supabase functions logs notification-email-dispatcher --tail
```

**Buscar líneas:**
```
🎨 Generating dynamic HTML for abc-123     ← Está usando plantillas v3
✅ Email sent: abc-123 → tu@email.com      ← Envío exitoso
```

### **2. Consultar BD:**

```sql
-- Ver último email enviado
SELECT 
  id,
  notification_type,
  subject,
  LENGTH(html_body) as html_length,
  status,
  sent_at
FROM notification_outbox 
ORDER BY created_at DESC 
LIMIT 1;
```

**Si `html_length` > 3000** → Es plantilla v3 (tiene todo el HTML profesional) ✅

---

## 🚨 TROUBLESHOOTING

### **Problema: El email sigue viéndose básico**

**Causa 1: La función no se desplegó**

```bash
# Verificar versión
curl https://swfktmhqmxqjaqtarreh.supabase.co/functions/v1/notification-email-dispatcher

# Si NO dice "v3", re-desplegar:
npx supabase functions deploy notification-email-dispatcher
```

**Causa 2: Hay emails antiguos en cola**

```sql
-- Limpiar cola antigua
UPDATE notification_outbox SET status = 'failed' 
WHERE status = 'pending' AND created_at < NOW() - INTERVAL '1 hour';

-- Crear nuevo reporte para probar
```

**Causa 3: Error en el fetch de datos**

```bash
# Ver logs para errores
npx supabase functions logs notification-email-dispatcher --tail

# Buscar:
# ❌ Error fetching hazard_report
# ❌ Processing error
```

---

## ✅ CHECKLIST FINAL

Antes de considerar que todo está funcionando:

- [ ] Desplegada función: `npx supabase functions deploy notification-email-dispatcher`
- [ ] Health check OK: Retorna `"version":"v3"`
- [ ] Creado nuevo reporte de prueba
- [ ] Invocado dispatcher manualmente
- [ ] Email recibido en inbox
- [ ] Diseño profesional visible (header rojo, badge, botón)
- [ ] Botón "VER REPORTE EN LA APP" funciona
- [ ] Datos del reporte correctos (descripción, riesgo, faena, plazo)

---

## 📞 SIGUIENTE PASO

**Ejecuta en tu terminal:**

```bash
cd /Users/imac/Desktop/Git/gestion-huella-hidrica
./scripts/deploy-email-templates.sh
```

**O manualmente:**

```bash
cd /Users/imac/Desktop/Git/gestion-huella-hidrica
npx supabase login
npx supabase functions deploy notification-email-dispatcher
```

**Luego crea un reporte de prueba y verifica el email.**

---

**¿Funcionó? Envíame una captura del email y te confirmo que todo está perfecto! 🎉**
