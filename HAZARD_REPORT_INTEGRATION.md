# 🚨 Guía de Integración: Módulo Reporte de Peligros

## 📋 Resumen Ejecutivo

Se ha implementado el **Módulo de Reporte de Peligros** completo dentro del sistema PLS. Este módulo permite reportar, dar seguimiento y cerrar peligros identificados en terreno, con evidencias, timeline de eventos y sincronización de catálogos desde Google Sheets.

## ✅ Lista de Archivos Creados/Modificados

### Nuevos Archivos

#### Base de Datos
- `supabase/migrations/20260115_create_hazard_reports.sql` - Migración completa (tablas, RLS, triggers)

#### Tipos TypeScript
- `src/modules/pam/hazards/types/hazard.types.ts` - Todas las interfaces y tipos

#### Servicios
- `src/modules/pam/hazards/services/hazardApi.ts` - API calls a Supabase
- `src/modules/pam/hazards/services/hazardImporter.ts` - Importación desde Google Sheets

#### Hooks
- `src/modules/pam/hazards/hooks/useHazardReports.ts` - React Query hooks
- `src/modules/pam/hazards/hooks/useHazardCatalogSync.ts` - Sincronización de catálogos

#### Componentes
- `src/modules/pam/hazards/components/HazardForm.tsx` - Formulario de creación
- `src/modules/pam/hazards/components/HazardFilters.tsx` - Filtros de búsqueda
- `src/modules/pam/hazards/components/HazardHierarchySelect.tsx` - Selects en cascada
- `src/modules/pam/hazards/components/HazardStatusBadge.tsx` - Badge de estado
- `src/modules/pam/hazards/components/HazardEvidenceSection.tsx` - Subida de archivos
- `src/modules/pam/hazards/components/HazardTimeline.tsx` - Timeline de eventos

#### Páginas
- `src/modules/pam/hazards/pages/HazardListPage.tsx` - Bandeja principal
- `src/modules/pam/hazards/pages/HazardCreatePage.tsx` - Crear reporte
- `src/modules/pam/hazards/pages/HazardDetailPage.tsx` - Ver detalle
- `src/modules/pam/hazards/pages/HazardClosePage.tsx` - Cerrar reporte

#### Documentación
- `src/modules/pam/hazards/README.md` - Documentación técnica completa

### Archivos Modificados

- `src/App.tsx` - Agregadas rutas para el módulo hazards

## 🚀 Pasos de Activación

### 1. Aplicar Migración de Supabase

```bash
# Opción A: Desde Supabase Dashboard
# 1. Ir a SQL Editor
# 2. Copiar el contenido de supabase/migrations/20260115_create_hazard_reports.sql
# 3. Ejecutar

# Opción B: Usando Supabase CLI
supabase db push
```

**Verificar que se crearon:**
- 7 tablas nuevas (`hazard_reports`, `hazard_report_evidences`, etc.)
- Bucket de storage `hazard-evidence`
- Políticas RLS activas
- Triggers funcionando

### 2. Configurar Google Sheets (Catálogos)

#### A. Crear o identificar Google Sheets con:

**Hoja 1: Jerarquía Organizacional**
| Gerencia | Proceso | Actividad | Tarea | Faena | Centro de Trabajo |
|----------|---------|-----------|-------|-------|-------------------|
| Operaciones | Producción | Mantención | Inspección Diaria | Faena Norte | Planta A |
| RRHH | Capacitación | Inducción | Inducción PLS | Sede Central | Sala 201 |

**Hoja 2: Riesgos Críticos**
| Código | Nombre | Descripción | Severidad | Evidencia Obligatoria |
|--------|--------|-------------|-----------|----------------------|
| RC-001 | Trabajo en Altura | Trabajos > 1.8m sin protección | ALTA | SI |
| RC-002 | Espacios Confinados | Ingreso sin permiso | CRITICA | SI |

**Hoja 3: Responsables**
| Nombre | RUT | Email | Empresa | Puede Cerrar | Puede Verificar |
|--------|-----|-------|---------|--------------|-----------------|
| Juan Pérez | 12345678-9 | juan.perez@empresa.cl | Contratista A | SI | SI |
| María González | 98765432-1 | maria.gonzalez@empresa.cl | Empresa Principal | NO | SI |

#### B. Publicar como CSV

1. En cada hoja: `Archivo → Compartir → Publicar en la web`
2. Seleccionar: `Hoja específica` + `Valores separados por comas (.csv)`
3. Copiar URL pública
4. Pegar en `src/modules/pam/hazards/hooks/useHazardCatalogSync.ts`:

```typescript
const HIERARCHY_CSV_URL = 'TU_URL_AQUI';
const RISKS_CSV_URL = 'TU_URL_AQUI';
const RESPONSIBLES_CSV_URL = 'TU_URL_AQUI';
```

### 3. Instalar Dependencias (si es necesario)

```bash
npm install date-fns@^3.0.0
# Resto de dependencias ya deberían estar instaladas
```

### 4. Compilar y Verificar

```bash
npm run build
# Verificar que no hay errores de TypeScript
```

### 5. Probar en Desarrollo

```bash
npm run dev
```

Navegar a: `http://localhost:5173/admin/pls/hazard-report`

## 🧪 Plan de Testing

### Test 1: Sincronización de Catálogos

```typescript
// En consola del navegador (DevTools)
const { syncCatalogs } = useHazardCatalogSync();
await syncCatalogs(true);

// Verificar en Supabase que las tablas tienen datos:
// - hazard_catalog_hierarchy
// - hazard_critical_risks
// - hazard_responsibles
```

### Test 2: Crear Reporte Completo

1. **Acceder**: `/admin/pls/hazard-report` → "Nuevo Reporte"
2. **Completar**:
   - Gerencia: Operaciones
   - Proceso: Producción
   - Riesgo Crítico: RC-001
   - Responsable: Juan Pérez
   - Plazo: Fecha futura (ej: mañana)
   - Tipo: Condición
   - Descripción: "Escalera sin barandas en sector norte..."
3. **Enviar** → Verificar redirección a detalle

### Test 3: Agregar Evidencias

1. En detalle del reporte, tab "Evidencias"
2. "Agregar Evidencia" → Tipo: Hallazgo
3. Subir foto o PDF (< 10MB)
4. Verificar que aparece en la lista

### Test 4: Cerrar Reporte

1. Detalle → "Cerrar Reporte"
2. Completar:
   - Responsable de verificación: María González
   - Tipo de control: Eliminación / Sustitución / etc.
   - Descripción: "Se instaló baranda metálica certificada..."
3. Enviar → Verificar estado cambió a CERRADO

### Test 5: Filtros y Búsqueda

1. Volver a bandeja principal
2. Probar:
   - Tab "Abiertos" / "Cerrados"
   - Filtro por riesgo
   - Filtro por responsable
   - Búsqueda por texto
   - "Asignados a mí"

### Test 6: Responsive

- Probar en móvil (360px)
- Probar en tablet (768px)
- Probar en desktop (1920px)

## 🔐 Seguridad (RLS)

El módulo implementa **Row Level Security** automático:

- ✅ Usuarios solo ven reportes de su `organization_id`
- ✅ Catálogos aislados por organización
- ✅ Storage con políticas por usuario autenticado
- ✅ No se puede acceder a reportes de otras organizaciones

**Verificar**:
```sql
-- En SQL Editor de Supabase
SELECT id, description, organization_id 
FROM hazard_reports 
LIMIT 10;

-- Debería solo mostrar reportes de tu org
```

## 📊 Monitoreo y Métricas

### Queries Útiles

```sql
-- Total de reportes por estado
SELECT status, COUNT(*) 
FROM hazard_reports 
WHERE organization_id = 'YOUR_ORG_ID'
GROUP BY status;

-- Reportes vencidos
SELECT id, description, due_date 
FROM hazard_reports 
WHERE status = 'OPEN' 
  AND due_date < CURRENT_DATE
  AND organization_id = 'YOUR_ORG_ID';

-- Top 5 riesgos más reportados
SELECT critical_risk_name, COUNT(*) as total
FROM hazard_reports
WHERE organization_id = 'YOUR_ORG_ID'
GROUP BY critical_risk_name
ORDER BY total DESC
LIMIT 5;
```

### Dashboard (Futuro)

El hook `useHazardReportStats()` ya está preparado para mostrar:
- Total reportes
- Abiertos / Cerrados
- Vencidos
- Por gerencia
- Por riesgo crítico

Puedes crear un componente `HazardDashboard.tsx` que consuma este hook.

## 🐛 Troubleshooting

### Problema: "No se cargan los catálogos"

**Solución**:
1. Verificar que las URLs de Google Sheets sean públicas
2. Probar abrir las URLs en navegador (debe descargar CSV)
3. Verificar consola: errores de CORS o fetch
4. Forzar sync: `syncCatalogs(true)`

### Problema: "Error al subir evidencia"

**Solución**:
1. Verificar que el bucket `hazard-evidence` existe en Storage
2. Verificar políticas de storage (INSERT/SELECT habilitadas)
3. Revisar tamaño del archivo (< 10MB)
4. Verificar formato permitido (image/*, .pdf, .doc, .docx)

### Problema: "No puedo cerrar el reporte"

**Solución**:
1. Verificar que el usuario tiene permisos (admin o responsable)
2. Verificar que el reporte está en estado OPEN
3. Verificar que existen responsables con `can_verify = true`
4. Verificar que existen tipos de control en la tabla

### Problema: "RLS bloquea acceso"

**Solución**:
1. Verificar que el usuario tiene `organization_id` en tabla `profiles`
2. Verificar que el reporte tiene el mismo `organization_id`
3. Comprobar políticas RLS activas:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'hazard_reports';
   ```

## 📱 UX Recomendada

### Flujo Mobile-First

1. **Creación rápida**:
   - Foto primero (cámara)
   - Descripción por voz (speech-to-text)
   - Autocompletar ubicación (GPS)
   - Guardar borrador offline

2. **Notificaciones push**:
   - Reporte asignado
   - Plazo próximo a vencer (24h antes)
   - Reporte cerrado

3. **Acciones rápidas**:
   - Botón flotante "+" para crear
   - Swipe para archivar/cerrar
   - Pull-to-refresh

### Mejoras Futuras

Ver sección "Extensiones Futuras" en `src/modules/pam/hazards/README.md`.

## 🎯 KPIs Sugeridos

- **Tiempo promedio de cierre** (días)
- **% Reportes cerrados a tiempo**
- **Top 3 riesgos más reportados**
- **Gerencias con más reportes**
- **Tasa de reportes por trabajador**

## ✅ Checklist de Activación

- [ ] Migración de Supabase aplicada
- [ ] Google Sheets configurados y URLs actualizadas
- [ ] Sincronización de catálogos ejecutada
- [ ] Crear reporte de prueba exitoso
- [ ] Subir evidencia exitosa
- [ ] Cerrar reporte exitoso
- [ ] Filtros funcionando
- [ ] Timeline mostrando eventos
- [ ] RLS validado (no se ven reportes de otras orgs)
- [ ] Responsive en móvil verificado
- [ ] Documentación revisada con el equipo

## 📞 Soporte

Para dudas o problemas, revisar:
1. `src/modules/pam/hazards/README.md` (documentación técnica)
2. Console del navegador (errores JS)
3. Logs de Supabase (SQL/RLS)
4. Esta guía de integración

---

**Fecha de Integración**: 2026-01-15  
**Versión**: 1.0.0  
**Autor**: Tech Lead Full-Stack  
**Stack**: React + TypeScript + Supabase + shadcn/ui
