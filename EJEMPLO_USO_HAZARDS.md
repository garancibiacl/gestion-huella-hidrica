# 💡 Ejemplo de Uso: Módulo Reporte de Peligros

## Escenario Real: Trabajador identifica peligro en terreno

### 📋 Contexto

**Trabajador**: Juan Pérez (Supervisor de Mantención)  
**Ubicación**: Faena Norte, Planta A  
**Situación**: Identifica escalera sin barandas en altura > 2m  
**Fecha**: 2026-01-15  

---

## 🎬 Flujo Paso a Paso

### 1. Acceder al Módulo

```
Usuario navega a:
→ Menú lateral: "PLS" → "Reporte de Peligro"
→ URL: /admin/pls/hazard-report
```

**Pantalla mostrada**: `HazardListPage`
- Tabs: Todos / Abiertos / Cerrados
- Botón destacado: "Nuevo Reporte" (verde, con ícono +)

---

### 2. Crear Nuevo Reporte

**Click en**: "Nuevo Reporte"  
**Navega a**: `/admin/pls/hazard-report/new`  
**Componente**: `HazardCreatePage` → `HazardForm`

#### 2.1. Completar Jerarquía Organizacional

```typescript
// Selects en cascada (HazardHierarchySelect)

Gerencia: "Operaciones" 
  ↓ (se habilita Proceso)
Proceso: "Mantención"
  ↓ (se habilita Actividad)
Actividad: "Inspección de Equipos"
  ↓ (se habilita Tarea)
Tarea: "Revisión Semanal"
```

**Datos autocompletados desde catálogo** (sincronizado previamente desde Google Sheets).

#### 2.2. Completar Ubicación

```typescript
Faena: "Faena Norte"
Centro de Trabajo: "Planta A - Sector Producción"
```

#### 2.3. Seleccionar Riesgo y Responsable

```typescript
Riesgo Crítico: "RC-001 - Trabajo en Altura" (badge rojo: ALTA)
Responsable de Cierre: "María González - Prevencionista de Riesgos"
Plazo de Cierre: "2026-01-22" (7 días desde hoy)
```

#### 2.4. Describir el Peligro

```typescript
Tipo de Desviación: [x] Condición (insegura)

Descripción del Peligro:
"Escalera metálica de acceso a plataforma elevada (aprox. 3m de altura) 
no cuenta con barandas de protección. Acceso diario de trabajadores para 
mantención de equipos. Riesgo de caída a distinto nivel."

Causa Raíz (opcional):
"Escalera fue instalada de forma temporal hace 6 meses y nunca se 
reemplazó por acceso definitivo según estándar."
```

#### 2.5. Datos del Reportante

```typescript
// Autocompletados desde perfil de usuario (profile + auth)
Nombre: "Juan Pérez Soto" ✓ (readonly, desde sesión)
RUT: "12.345.678-9"
Email: "juan.perez@empresa.cl" ✓ (readonly)
Empresa: "Contratista Mantención Ltda."
```

#### 2.6. Enviar Reporte

**Click**: "Crear Reporte" (botón azul, con spinner si está cargando)

**Backend procesa**:
```typescript
// useCreateHazardReport.mutateAsync()
→ createHazardReport(organizationId, payload)
→ INSERT INTO hazard_reports (...)
→ TRIGGER: create_hazard_report_event() 
   → INSERT INTO hazard_report_events (event_type: 'CREATED')
```

**Resultado**: Redirección automática a `/admin/pls/hazard-report/{nuevo-id}`

---

### 3. Ver Detalle del Reporte

**Pantalla**: `HazardDetailPage`

**Encabezado**:
```
┌─────────────────────────────────────────────────────┐
│ Reporte de Peligro #a1b2c3d4                        │
│ Operaciones                                          │
│                                                      │
│ [ABIERTO] [RC-001 - Trabajo en Altura] [Condición] │
│                                     Creado: 15/01/26│
└─────────────────────────────────────────────────────┘
```

**Descripción del Peligro**:
> Escalera metálica de acceso a plataforma elevada...

**Jerarquía Organizacional**:
- Gerencia: Operaciones
- Proceso: Mantención
- Actividad: Inspección de Equipos
- Tarea: Revisión Semanal

**Reportante**:
- Juan Pérez Soto
- RUT: 12.345.678-9
- Email: juan.perez@empresa.cl
- Empresa: Contratista Mantención Ltda.

**Responsable y Plazo**:
- Responsable de cierre: María González
- Plazo: 22/01/2026

**Botones**:
- [Cerrar Reporte] (solo si status = OPEN)
- [Volver]

---

### 4. Agregar Evidencias (Fotos)

**Tab activo**: "Evidencias (0)"

**Click**: "Agregar Evidencia" → Dialog se abre

**Completar**:
```typescript
Tipo de Evidencia: "Hallazgo" (select)
Archivo: [Seleccionar archivo] → escalera_sin_barandas.jpg (2.3 MB)
Descripción: "Foto frontal de escalera sin protección lateral"
```

**Click**: "Subir" (con spinner)

**Backend procesa**:
```typescript
// useAddHazardEvidence.mutateAsync()
→ Upload a Supabase Storage: 
   bucket: "hazard-evidence"
   path: "{orgId}/hazards/{reportId}/FINDING/1737000000.jpg"
→ INSERT INTO hazard_report_evidences (...)
→ INSERT INTO hazard_report_events (event_type: 'EVIDENCE_ADDED')
```

**Resultado**: Evidencia aparece en la lista con ícono de imagen

**Repetir** para agregar más fotos:
- escalera_contexto.jpg
- plataforma_superior.jpg

---

### 5. Cerrar el Reporte (Una semana después)

**Contexto**: María González (Prevencionista) ya implementó solución:
- Instaló baranda metálica certificada
- Colocó señalización de uso obligatorio de arnés
- Capacitó a trabajadores

**Click en detalle**: "Cerrar Reporte"  
**Navega a**: `/admin/pls/hazard-report/{id}/close`  
**Pantalla**: `HazardClosePage`

#### 5.1. Resumen del Reporte (solo lectura)
```
[ABIERTO] [RC-001 - Trabajo en Altura]
Descripción: Escalera metálica de acceso...
Gerencia: Operaciones | Responsable: María González
```

#### 5.2. Formulario de Cierre

```typescript
Responsable de Verificación: "Pedro Silva - Jefe de Seguridad" (select)
  ↓
Tipo de Control Aplicado: "Controles de Ingeniería" (select)
  // Opciones: Eliminación, Sustitución, Ingeniería, 
  //          Administrativos, EPP
  ↓
Descripción del Cierre:
"Se instaló baranda metálica certificada (altura 1.1m) con 3 travesaños 
horizontales según NCh 349. Pasamanos color amarillo, esquinas con 
protección. Sistema fijado con pernos de anclaje químico. Además se 
instaló señalética 'Uso Obligatorio de Arnés'. Capacitación realizada 
a 8 trabajadores el día 20/01/26. Inspección final aprobada por Jefe 
de Seguridad."
```

#### 5.3. Agregar Evidencia de Cierre (antes de cerrar)

**Volver a detalle** (botón "Volver")  
**Tab "Evidencias"** → "Agregar Evidencia"

```typescript
Tipo: "Cierre"
Archivo: baranda_instalada.jpg (1.8 MB)
Descripción: "Baranda metálica instalada con señalización"
```

**Subir** → Volver a página de cierre

#### 5.4. Confirmar Cierre

**Click**: "Cerrar Reporte" (con ícono de check)

**Backend procesa**:
```typescript
// useCloseHazardReport.mutateAsync()
→ UPDATE hazard_reports SET 
    status = 'CLOSED',
    closed_at = NOW(),
    closed_by_user_id = '{maria_id}',
    verification_responsible_id = '{pedro_id}',
    control_type_id = '{ingenieria_id}',
    closing_description = '...'
→ TRIGGER: create_hazard_close_event()
   → INSERT INTO hazard_report_events (event_type: 'CLOSED')
```

**Resultado**: Redirección a detalle, ahora con:
- Badge verde: [CERRADO]
- Sección "Información de Cierre" visible
- Timeline con evento "Reporte cerrado" por María González

---

### 6. Ver Timeline Completo

**Tab**: "Timeline (4)"

**Eventos mostrados** (más reciente primero):

```
┌────────────────────────────────────────────────────┐
│ ✓ Reporte cerrado                    22/01/26 10:30│
│   por María González                                │
│   • Tipo de control: Controles de Ingeniería       │
│   • Verificado por: Pedro Silva                     │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│ 📎 Evidencia agregada                 21/01/26 16:45│
│   por María González                                │
│   • Archivo: baranda_instalada.jpg                  │
│   • Tipo: CIERRE                                    │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│ 📎 Evidencia agregada                 15/01/26 11:20│
│   por Juan Pérez                                    │
│   • Archivo: escalera_sin_barandas.jpg              │
│   • Tipo: FINDING                                   │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│ 📄 Reporte creado                     15/01/26 11:00│
│   por Juan Pérez                                    │
│   • Gerencia: Operaciones                           │
│   • Riesgo crítico: Trabajo en Altura               │
│   • Plazo: 22/01/2026                               │
└────────────────────────────────────────────────────┘
```

---

### 7. Volver a Bandeja Principal

**Click**: "Volver" → `/admin/pls/hazard-report`

**Pantalla**: `HazardListPage`

**Tab**: "Cerrados (1)"

**Tarjeta del reporte**:
```
┌────────────────────────────────────────────────────┐
│ [CERRADO] [RC-001 - Trabajo en Altura] [Condición]│
│                                                     │
│ Escalera metálica de acceso a plataforma elevada...│
│ Operaciones → Mantención • Condición               │
│                                                     │
│ 👤 Juan Pérez  |  📅 Plazo: 22/01/26  |  Resp.: María│
│                                         15/01/26    │
└────────────────────────────────────────────────────┘
```

---

## 📊 Estadísticas Visibles

**Cards en la parte superior**:

```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  TOTAL   │  │ ABIERTOS │  │ CERRADOS │  │ VENCIDOS │
│    12    │  │    5 🔴  │  │    7 🟢  │  │    2 ⚠️  │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
```

---

## 🔍 Buscar y Filtrar

### Ejemplo 1: Buscar reportes de "altura"

**Input de búsqueda**: "altura" → Enter

**Resultado**: Muestra solo reportes que contengan "altura" en:
- Descripción
- Nombre del reportante
- Riesgo crítico

### Ejemplo 2: Filtrar por Riesgo Crítico

**Select "Riesgo crítico"**: "Trabajo en Altura"

**Resultado**: Solo reportes con ese riesgo específico

### Ejemplo 3: Ver "Asignados a mí"

**Click botón**: "Asignados a mí" (cambia a azul con ✓)

**Resultado**: Solo reportes donde soy el responsable de cierre

---

## 📱 Uso en Móvil

### Creación Rápida (Mobile-First)

1. **Abrir navegador móvil** → `/admin/pls/hazard-report`
2. **Scroll hasta botón flotante** (FAB) con ícono +
3. **Tap** → Abre formulario optimizado para móvil
4. **Tomar foto directamente** desde cámara
5. **Completar campos** con teclado móvil (inputs grandes)
6. **Enviar** → Confirmación con toast

### Recomendaciones UX Móvil:
- Inputs con min-height 48px (táctil)
- Botones grandes y espaciados
- Calendario nativo del dispositivo
- Autocompletado agresivo
- Guardar borrador en localStorage

---

## 🎯 Casos de Uso Adicionales

### Caso 2: Reportar Acción Insegura

```typescript
Tipo de Desviación: [x] Acción (insegura)
Descripción: "Operador no utilizó protección auditiva en zona de 
              ruido >85dB durante más de 2 horas"
Riesgo Crítico: "RC-005 - Exposición a Ruido"
```

### Caso 3: Reportar Derrame de Químicos

```typescript
Gerencia: "Medio Ambiente"
Proceso: "Gestión de Residuos"
Riesgo Crítico: "RC-012 - Derrame de Sustancias Peligrosas"
Tipo: Condición
Descripción: "Tambor de solvente con fuga, sin kit anti-derrame cercano"
```

### Caso 4: Seguimiento de Reporte Vencido

**Bandeja muestra**:
```
[ABIERTO] [VENCIDO] [RC-003 - Espacios Confinados]
Plazo: 10/01/26 (hace 5 días)
```

**Acción**: Responsable debe cerrar urgente o justificar extensión

---

## 💡 Tips de Uso

### Para Trabajadores
- ✅ Reportar apenas identifiques el peligro
- ✅ Subir fotos claras y de contexto
- ✅ Describir detalladamente (quién, qué, dónde, cuándo)
- ✅ Indicar si hay personas en riesgo inmediato

### Para Responsables de Cierre
- ✅ Revisar reportes asignados diariamente
- ✅ Actualizar avances en comentarios (futuro)
- ✅ Subir evidencias de controles implementados
- ✅ Cerrar solo cuando el peligro esté realmente controlado

### Para Prevencionistas
- ✅ Monitorear reportes vencidos semanalmente
- ✅ Validar que cierres tengan evidencias suficientes
- ✅ Analizar tendencias (riesgos más frecuentes)
- ✅ Capacitar en base a patrones identificados

---

## 🚀 Automatizaciones Futuras

### Notificaciones Automáticas

```typescript
// Cuando se crea reporte asignado a ti
📧 Email: "Nuevo reporte asignado: RC-001 en Faena Norte"
🔔 Push: "Tienes 7 días para cerrar este reporte"

// 24 horas antes del plazo
⚠️ Email: "Reporte RC-001 vence mañana"

// Cuando se cierra reporte que creaste
✅ Email: "Tu reporte RC-001 ha sido cerrado"
```

### Dashboard Ejecutivo

```typescript
// Métricas semanales automáticas
→ Total reportes: 45
→ Cerrados a tiempo: 38 (84%)
→ Tiempo promedio de cierre: 4.2 días
→ Top 3 riesgos: Altura, Energías, Espacios
→ Gerencia con más reportes: Operaciones
```

---

## ✅ Checklist de Uso

- [ ] He configurado los catálogos en Google Sheets
- [ ] He sincronizado los catálogos al menos una vez
- [ ] He creado un reporte de prueba
- [ ] He subido evidencias de prueba
- [ ] He cerrado un reporte de prueba
- [ ] He probado los filtros
- [ ] He validado que solo veo reportes de mi organización
- [ ] He capacitado a usuarios finales
- [ ] He establecido responsables de cierre
- [ ] He definido plazos estándar por tipo de riesgo

---

**Módulo listo para uso en producción** 🎉

Para más detalles técnicos, ver:
- `HAZARD_REPORT_INTEGRATION.md` - Guía de integración
- `src/modules/pam/hazards/README.md` - Documentación técnica
- `RESUMEN_INTEGRACION_HAZARDS.md` - Resumen ejecutivo
