# Módulo de Reporte de Peligros (Hazard Reports)

## Descripción

Módulo completo de gestión de reportes de peligro para el sistema PLS (Planificación de la Seguridad). Permite a los usuarios reportar peligros y condiciones inseguras en terreno, realizar seguimiento, y cerrar reportes con verificación.

## Estructura del Módulo

```
src/modules/pam/hazards/
├── components/           # Componentes reutilizables
│   ├── HazardFilters.tsx
│   ├── HazardForm.tsx
│   ├── HazardHierarchySelect.tsx
│   ├── HazardStatusBadge.tsx
│   ├── HazardEvidenceSection.tsx
│   └── HazardTimeline.tsx
├── hooks/               # React Query hooks
│   ├── useHazardReports.ts
│   └── useHazardCatalogSync.ts
├── pages/              # Páginas principales
│   ├── HazardListPage.tsx
│   ├── HazardCreatePage.tsx
│   ├── HazardDetailPage.tsx
│   └── HazardClosePage.tsx
├── services/           # Lógica de negocio
│   ├── hazardApi.ts
│   └── hazardImporter.ts
├── types/             # TypeScript types
│   └── hazard.types.ts
└── README.md
```

## Características

### 1. Creación de Reportes
- Formulario completo con validación (react-hook-form + Zod)
- Jerarquía organizacional en cascada (Gerencia → Proceso → Actividad → Tarea)
- Selección de riesgo crítico y responsable de cierre
- Tipo de desviación: Acción o Condición
- Plazo de cierre con calendario
- Autocompletado de datos del reportante desde perfil de usuario

### 2. Bandeja / Listado
- Tabs: Todos / Abiertos / Cerrados
- Filtros avanzados:
  - Estado
  - Riesgo crítico
  - Responsable
  - Faena
  - Búsqueda por texto
  - "Asignados a mí"
- Tarjetas con información resumida y badges de estado
- Indicador visual de reportes vencidos

### 3. Detalle del Reporte
- Vista completa de toda la información
- Jerarquía organizacional expandida
- Datos del reportante
- Responsable y plazo
- Información de cierre (si aplica)
- Tabs:
  - **Evidencias**: Lista de archivos subidos (fotos, PDFs, docs)
  - **Timeline**: Historial de eventos (creación, evidencias, cierre)

### 4. Evidencias
- Subida de archivos (imágenes, PDFs, documentos)
- Tipos: Hallazgo, Cierre, Otro
- Descripción opcional
- Almacenamiento en Supabase Storage
- Validación de tamaño (máx. 10MB)

### 5. Cierre de Reportes
- Formulario de cierre con validación
- Responsable de verificación
- Tipo de control aplicado (jerarquía de controles)
- Descripción detallada de acciones correctivas
- Cambio de estado automático (OPEN → CLOSED)
- Registro en timeline

### 6. Sincronización de Catálogos
- Importación desde Google Sheets (CSV público)
- Parseo y validación de datos
- Upsert a Supabase (sin duplicados)
- Catálogos:
  - Jerarquía organizacional
  - Riesgos críticos
  - Responsables de cierre/verificación
  - Tipos de control

## Base de Datos (Supabase)

### Tablas Principales

1. **hazard_reports**: Reporte principal
2. **hazard_report_evidences**: Archivos adjuntos
3. **hazard_report_events**: Timeline/auditoría

### Catálogos

1. **hazard_catalog_hierarchy**: Jerarquía Gerencia → Proceso → Actividad → Tarea
2. **hazard_critical_risks**: Riesgos críticos
3. **hazard_responsibles**: Responsables de cierre/verificación
4. **hazard_control_types**: Tipos de control

### Migración

La migración SQL completa está en:
```
supabase/migrations/20260115_create_hazard_reports.sql
```

Incluye:
- Creación de tablas
- Índices optimizados
- RLS (Row Level Security) por organización
- Storage bucket `hazard-evidence`
- Triggers automáticos (eventos, timestamps)
- Funciones auxiliares

## Integración

### 1. Rutas (Ya configuradas en App.tsx)

```tsx
// Listado
<Route path="/admin/pls/hazard-report" element={<HazardListPage />} />

// Crear
<Route path="/admin/pls/hazard-report/new" element={<HazardCreatePage />} />

// Detalle
<Route path="/admin/pls/hazard-report/:id" element={<HazardDetailPage />} />

// Cierre
<Route path="/admin/pls/hazard-report/:id/close" element={<HazardClosePage />} />
```

### 2. Navegación (AppSidebar)

Ya está configurado en `src/components/layout/AppSidebar.tsx`:

```tsx
{ 
  icon: AlertTriangle, 
  label: "Reporte de Peligro", 
  path: "/admin/pls/hazard-report", 
  pamAdminOnly: true 
}
```

### 3. Permisos

- **Todos los usuarios de PLS**: Pueden ver reportes de su organización
- **Admin/Supervisión**: Pueden crear, editar y cerrar reportes
- **Responsables asignados**: Pueden ver reportes asignados a ellos

## Configuración de Google Sheets

### URLs de Sincronización

Configurar en `src/modules/pam/hazards/hooks/useHazardCatalogSync.ts`:

```typescript
const HIERARCHY_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/YOUR_SHEET_ID/pub?output=csv';
const RISKS_CSV_URL = '...';
const RESPONSIBLES_CSV_URL = '...';
```

### Formato de Google Sheets

#### 1. Hoja de Jerarquía
Columnas requeridas:
- `Gerencia` (requerido)
- `Proceso` (opcional)
- `Actividad` (opcional)
- `Tarea` (opcional)
- `Faena` (opcional)
- `Centro de Trabajo` (opcional)

#### 2. Hoja de Riesgos Críticos
Columnas requeridas:
- `Código` (requerido)
- `Nombre` (requerido)
- `Descripción` (opcional)
- `Severidad` (opcional: BAJA, MEDIA, ALTA, CRITICA)
- `Evidencia Obligatoria` (opcional: SI/NO)

#### 3. Hoja de Responsables
Columnas requeridas:
- `Nombre` (requerido)
- `RUT` (opcional)
- `Email` (requerido para unique constraint)
- `Empresa` (opcional)
- `Puede Cerrar` (opcional: SI/NO)
- `Puede Verificar` (opcional: SI/NO)

## Testing

### Flujo Completo End-to-End

#### Paso 1: Aplicar Migración

```bash
# Aplicar migración de Supabase
npx supabase migration up
```

#### Paso 2: Sincronizar Catálogos

1. Configurar URLs de Google Sheets en `useHazardCatalogSync.ts`
2. Desde la UI, ejecutar sincronización manual:
   ```typescript
   const { syncCatalogs } = useHazardCatalogSync();
   await syncCatalogs(true); // force sync
   ```

#### Paso 3: Crear Reporte

1. Navegar a `/admin/pls/hazard-report`
2. Click en "Nuevo Reporte"
3. Completar formulario:
   - Seleccionar jerarquía (cascada)
   - Ubicación
   - Riesgo crítico
   - Responsable de cierre
   - Plazo (fecha futura)
   - Tipo de desviación
   - Descripción detallada
   - Datos del reportante (autocompletados)
4. Click "Crear Reporte"
5. Verificar redirección a detalle

#### Paso 4: Agregar Evidencias

1. En detalle del reporte, tab "Evidencias"
2. Click "Agregar Evidencia"
3. Seleccionar tipo: Hallazgo
4. Subir archivo (imagen o PDF)
5. Descripción opcional
6. Click "Subir"
7. Verificar que aparece en la lista

#### Paso 5: Cerrar Reporte

1. En detalle, click "Cerrar Reporte"
2. Completar formulario de cierre:
   - Responsable de verificación
   - Tipo de control aplicado
   - Descripción detallada de acciones
3. Click "Cerrar Reporte"
4. Verificar:
   - Estado cambió a CERRADO (verde)
   - Fecha de cierre registrada
   - Evento en timeline

#### Paso 6: Validar Filtros

1. Volver a `/admin/pls/hazard-report`
2. Probar filtros:
   - Tab "Abiertos" / "Cerrados"
   - Filtro por riesgo crítico
   - Filtro por responsable
   - Búsqueda por texto
   - "Asignados a mí"

### Casos de Prueba

#### 1. Validación de Formulario

- [ ] Gerencia es requerida
- [ ] Riesgo crítico es requerido
- [ ] Responsable de cierre es requerido
- [ ] Plazo debe ser fecha futura
- [ ] Descripción mínimo 10 caracteres
- [ ] Email del reportante debe ser válido

#### 2. Jerarquía en Cascada

- [ ] Al seleccionar Gerencia, se habilita Proceso
- [ ] Al cambiar Gerencia, se resetea Proceso/Actividad/Tarea
- [ ] Opciones de Proceso dependen de Gerencia
- [ ] Opciones de Actividad dependen de Proceso

#### 3. Evidencias

- [ ] Solo admite archivos < 10MB
- [ ] Formatos permitidos: imágenes, PDF, DOC
- [ ] URL de archivo se genera correctamente
- [ ] Evidencias se muestran en detalle

#### 4. Timeline

- [ ] Evento CREATED al crear reporte
- [ ] Evento EVIDENCE_ADDED al subir archivo
- [ ] Evento CLOSED al cerrar reporte
- [ ] Eventos ordenados por fecha descendente

#### 5. RLS (Seguridad)

- [ ] Usuario solo ve reportes de su organización
- [ ] Usuario sin permisos no puede crear reportes
- [ ] Responsable asignado ve reportes asignados

#### 6. Estados y Badges

- [ ] Badge rojo para OPEN
- [ ] Badge verde para CLOSED
- [ ] Indicador "VENCIDO" si plazo pasó
- [ ] Contadores en tabs correctos

## Extensiones Futuras

### Funcionalidades Opcionales

1. **Notificaciones push** cuando se asigna/cierra un reporte
2. **Comentarios** en reportes (chat interno)
3. **Reapertura** de reportes cerrados
4. **Exportación** a Excel/PDF
5. **Dashboard ejecutivo** con métricas agregadas
6. **Firma digital** para cierre de reportes
7. **Workflow de aprobación** multi-nivel
8. **Geolocalización** automática al crear reporte
9. **OCR** para extraer datos de fotos
10. **Integración** con sistemas externos (ERP, HSE)

## Soporte

Para dudas o problemas:
- Revisar console del navegador (errores JS)
- Verificar logs de Supabase (errores SQL/RLS)
- Validar que las URLs de Google Sheets sean públicas (CSV)
- Comprobar permisos de usuario en tabla `user_roles`

## Licencia

Parte del sistema de Gestión de Seguridad PLS - Uso interno.
