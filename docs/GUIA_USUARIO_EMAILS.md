# 📧 GUÍA RÁPIDA: NOTIFICACIONES POR EMAIL

## Para Usuarios de la Plataforma HSE - Buses JM

---

## 📬 ¿Qué emails recibiré?

La plataforma te enviará notificaciones automáticas cuando:

### 🚨 **Reportes de Peligro**

| Cuándo | Subject | Qué hacer |
|--------|---------|-----------|
| Te asignan un reporte | `[HSE] Nuevo reporte asignado · [Ubicación] · [Riesgo]` | Revisar y comenzar acciones correctivas |
| Reporte próximo a vencer (2 días) | `[HSE] ⚠️ Reporte próximo a vencer (2d) · ...` | Asegurarte de cerrar a tiempo |
| Reporte vencido | `[HSE] 🚨 Reporte VENCIDO (+Xd) · ...` | Actualizar estado urgentemente |
| Reporte cerrado (si eres verificador) | `[HSE] Reporte cerrado · Requiere verificación · ...` | Verificar evidencia y aprobar |

### 📋 **Tareas PAM (Plan de Acción Mensual)**

| Cuándo | Subject | Qué hacer |
|--------|---------|-----------|
| Te asignan una tarea | `[HSE] Nueva tarea asignada · [Ubicación] · [Tipo]` | Revisar tarea y planificar |
| Tarea próxima a vencer | `[HSE] ⚠️ Tarea próxima a vencer (Xd) · ...` | Completar antes de la fecha límite |
| Tarea vencida | `[HSE] 🚨 Tarea VENCIDA (+Xd) · ...` | Actualizar estado urgentemente |

---

## 📧 Cómo se ve un email

```
┌────────────────────────────────────────────┐
│ [BARRA ROJA/NARANJA/VERDE EN EL HEADER]    │
│ 🚨 REPORTE DE PELIGRO                      │
└────────────────────────────────────────────┘

Nuevo Reporte de Peligro Asignado
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Hola Manuel Parra,

Se te ha asignado un nuevo reporte de peligro
que requiere tu atención y acción inmediata.

┌────────────────────────────────────────────┐
│ REQUIERE ACCIÓN                            │
│                                            │
│ Escalera sin barandas en acceso a techo   │
│                                            │
│ 📋 Descripción:  [detalle del peligro]    │
│ ⚠️ Riesgo:       Caída a distinto nivel    │
│ 📍 Faena:        Taller Melipilla          │
│ 📅 Plazo:        15 de febrero, 2026       │
└────────────────────────────────────────────┘

      ┌──────────────────────────┐
      │  VER REPORTE EN LA APP   │ ← Click aquí
      └──────────────────────────┘

Si el botón no funciona, copia este enlace:
https://app.busesjm.cl/admin/pls/hazard-report/123

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JM HSE · Gestión de Seguridad y Medio Ambiente
Este es un correo automático. No respondas.
```

---

## ✅ Cómo actuar sobre una notificación

### **PASO 1: Lee el email**

- El subject te dice de qué se trata
- El cuerpo tiene un resumen de la información clave
- Identifica si es urgente (rojo) o advertencia (naranja)

### **PASO 2: Abre la app**

- Click en el botón grande de color (`VER REPORTE EN LA APP` o `VER TAREA EN LA APP`)
- Te llevará directamente al detalle del item en la plataforma
- Si el botón no funciona, copia y pega el link alternativo

### **PASO 3: Completa la acción**

- **Reportes asignados:** Revisar, planificar acciones, actualizar estado
- **Reportes próximos a vencer:** Asegurarte de cerrar con evidencia antes del plazo
- **Reportes vencidos:** Actualizar estado urgentemente y justificar retraso
- **Reportes cerrados (verificación):** Revisar evidencia fotográfica y aprobar o rechazar
- **Tareas asignadas:** Planificar ejecución dentro del plazo
- **Tareas vencidas:** Actualizar estado y coordinar con supervisor

---

## 🎨 Códigos de Color

Los emails usan colores para comunicar urgencia:

| Color | Significado | Acción requerida |
|-------|-------------|------------------|
| 🔴 **Rojo** | Urgente / Nuevo | Revisar y actuar de inmediato |
| 🟠 **Naranja** | Advertencia | Actuar pronto (plazo cercano) |
| 🟥 **Rojo oscuro** | Crítico / Vencido | Acción inmediata obligatoria |
| 🟢 **Verde** | Positivo / Cerrado | Revisar y aprobar |

---

## ❓ Preguntas Frecuentes

### **¿Puedo desactivar las notificaciones?**

No por ahora. Estos emails son críticos para la gestión de seguridad y medio ambiente. 

En el futuro implementaremos preferencias personalizadas donde podrás elegir:
- Modo resumen diario (un solo email al día con todas las notificaciones)
- Tipos específicos de notificaciones
- Horario preferido de envío

### **¿Por qué no recibo emails?**

Revisa estas opciones:

1. **Carpeta de SPAM/Correo no deseado:**
   - Busca emails de `noreply@busesjm.cl`
   - Márcalos como "No es spam" / "Confiable"
   - Agrega `noreply@busesjm.cl` a tus contactos

2. **Email incorrecto en tu perfil:**
   - Ingresa a la plataforma
   - Ve a tu perfil (avatar arriba a la derecha)
   - Verifica que tu email sea correcto
   - Si es incorrecto, contacta a tu administrador

3. **Bloqueado por firewall corporativo:**
   - Contacta a IT de Buses JM
   - Solicita agregar `@busesjm.cl` y `resend.com` a la lista blanca

### **El botón "Ver en la App" no funciona**

Usa el link alternativo:

1. Desplázate hacia abajo en el email
2. Busca la línea: "Si el botón no funciona, copia este enlace:"
3. Haz click derecho → "Copiar dirección del enlace"
4. Pégalo en tu navegador

Si persiste, asegúrate de estar logueado en `app.busesjm.cl`.

### **Recibí un email de algo que no es mi responsabilidad**

Contacta a tu supervisor o al administrador HSE. Puede ser:
- Error de asignación
- Cambio de responsabilidades no actualizado
- Reemplazo temporal

### **¿Los emails son seguros?**

Sí. Todos los emails:
- Vienen de un dominio verificado (`@busesjm.cl`)
- Incluyen información de auditoría (fecha, organización)
- Nunca te pedirán contraseñas ni datos sensibles
- Los links siempre apuntan a `app.busesjm.cl` (dominio oficial)

**⚠️ Si recibes un email sospechoso:**
- NO hagas click en links
- NO ingreses contraseñas
- Reenvía el email a IT para validación

---

## 📞 Contacto y Soporte

### **Problemas técnicos con la plataforma:**

- Email: soporte.hse@busesjm.cl *(ejemplo, ajustar)*
- Teléfono: [número de soporte] *(ajustar)*

### **Consultas sobre seguridad o reportes:**

- Contactar a tu supervisor directo
- Área de Prevención de Riesgos

### **Problemas con emails (no llegan, spam, etc.):**

- Área de IT / Sistemas

---

## 📱 Acceso Móvil

Los emails están diseñados para verse correctamente en:

✅ iPhone (Mail app)  
✅ Android (Gmail app)  
✅ Tablets  
✅ Computadores (Gmail Web, Outlook Web)

**Recomendación:** Agrega `app.busesjm.cl` a la pantalla de inicio de tu celular para acceso rápido.

---

## 🔔 Ejemplos de Notificaciones

### **Ejemplo 1: Reporte Urgente Asignado**

```
Subject: [HSE] Nuevo reporte asignado · Taller Central · Caída a distinto nivel

Contenido:
- Badge: REQUIERE ACCIÓN (rojo)
- Descripción: Escalera sin barandas
- Riesgo: Caída a distinto nivel
- Plazo: 2 días

Acción: Revisar de inmediato y planificar corrección
```

### **Ejemplo 2: Tarea Próxima a Vencer**

```
Subject: [HSE] ⚠️ Tarea próxima a vencer (1d) · Inspección de extintores

Contenido:
- Badge: PRÓXIMA A VENCER (naranja)
- Descripción: Inspección mensual de extintores
- Vence: Mañana a las 18:00

Acción: Completar hoy para evitar vencimiento
```

### **Ejemplo 3: Reporte Cerrado (Verificación)**

```
Subject: [HSE] Reporte cerrado · Requiere verificación · Escalera sin barandas

Contenido:
- Badge: PENDIENTE DE VERIFICACIÓN (verde)
- Descripción: Se instaló baranda metálica
- Cerrado por: Manuel Parra

Acción: Revisar evidencia fotográfica y aprobar cierre
```

---

## ✅ Checklist de Buenas Prácticas

Como usuario de la plataforma, asegúrate de:

- [ ] Revisar tus emails diariamente (al inicio y fin de turno)
- [ ] Actuar sobre notificaciones urgentes (rojas) el mismo día
- [ ] Completar tareas antes de la fecha límite
- [ ] Actualizar el estado en la plataforma (no solo leer el email)
- [ ] Subir evidencia fotográfica al cerrar reportes
- [ ] Contactar a tu supervisor si algo no está claro
- [ ] Verificar que tu email en la plataforma sea correcto
- [ ] Agregar `noreply@busesjm.cl` a tus contactos seguros

---

## 🎯 Beneficios del Sistema

Con este sistema de notificaciones:

✅ **Nunca te perderás una asignación importante**  
✅ **Recibirás recordatorios automáticos de plazos**  
✅ **Podrás actuar rápidamente desde tu celular**  
✅ **Toda la información clave en un solo email**  
✅ **Acceso directo a la app con un click**  
✅ **Trazabilidad completa de notificaciones**

---

**Recuerda:** Los emails son solo notificaciones. Todas las acciones se realizan en la plataforma web `app.busesjm.cl`.

---

**Versión:** 1.0  
**Fecha:** Enero 2026  
**Plataforma:** JM HSE - Gestión de Seguridad y Medio Ambiente
