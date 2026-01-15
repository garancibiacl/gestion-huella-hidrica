# Módulo de Gestión de Seguridad (PAM) - Arquitectura

## Visión General

Sistema de gestión de tareas de seguridad y salud ocupacional integrado en plataforma multi-módulo, con UX moderna estilo JM y funcionalidad nivel Codelco.

## Estructura de Navegación

```
/hub (post-login)
  ├── Gestión Ambiental → /dashboard/agua
  └── Gestión de Seguridad (PAM)
      ├── Mis Actividades → /pam/my-activities (worker)
      ├── Dashboard Ejecutivo → /pam/dashboard (admin/preventer)
      └── Admin
          ├── Carga Semanal → /admin/pam/upload
          └── Tablero Control → /admin/pam/board
```

## Roles y Permisos

### Worker
- Ver solo sus tareas asignadas
- Cambiar estado: PENDING → IN_PROGRESS → DONE
- Subir evidencias
- Comentar en sus tareas

### Supervisión (Preventer)
- Ver todas las tareas de su organización
- Asignar y planificar tareas
- Acceso a dashboard ejecutivo
- Gestionar cumplimiento

### Admin
- Acceso total
- Carga masiva desde Google Sheets
- Reportabilidad completa
- Gestión de usuarios y configuración

## Schema de Base de Datos

### Tablas Principales

#### `pam_weeks_plan`
- Planificación semanal por organización
- Unique constraint: (organization_id, week_year, week_number)

#### `pam_tasks`
- Tareas individuales asignadas
- Campos clave:
  - `assignee_user_id`, `assignee_name`, `assignee_role`
  - `contract`, `area`, `location`
  - `status`: PENDING | IN_PROGRESS | DONE | OVERDUE
  - `date`, `description`, `risk_type`
  - `week_year`, `week_number`

#### `pam_task_evidences`
- Archivos de evidencia por tarea
- Storage en Supabase Storage

#### `pam_task_comments`
- Sistema de comentarios tipo chat
- Asociado a tareas

#### `pam_notifications`
- Notificaciones in-app
- Tipos: task_assigned, status_changed, overdue_alert

#### `pam_metrics_cache`
- Cache de métricas agregadas
- Actualización automática vía triggers
- Dimensiones: contract, area, location, role

### Funciones RPC

#### `calculate_pam_metrics(org_id, week_year, week_number)`
- Calcula y guarda métricas agregadas
- Ejecutada automáticamente por triggers

#### `get_pam_dashboard_metrics(org_id, week_year, week_number)`
- Retorna métricas para dashboard ejecutivo
- Incluye breakdown por contrato, área, ubicación, rol

#### `is_pam_admin()`, `is_pam_worker()`
- Helpers para RLS

### Row Level Security (RLS)

- Workers: solo ven sus tareas (`assignee_user_id = auth.uid()`)
- Preventers/Admins: ven todas las tareas de su organización
- Notificaciones: solo del usuario actual
- Métricas: solo de la organización del usuario

## Flujo de Importación desde Google Sheets

### Edge Function: `import-pam-week`

1. **Validación**: Auth + permisos
2. **Fetch CSV**: Convierte Google Sheet público a CSV
3. **Parsing**: Lee headers y filas
4. **Mapeo de usuarios**: Asocia emails con `profiles.user_id`
5. **Upsert plan semanal**: Crea o actualiza `pam_weeks_plan`
6. **Limpieza**: Elimina tareas anteriores de la misma semana
7. **Inserción masiva**: Crea todas las tareas en batch
8. **Notificaciones**: Envía notificación a cada asignado
9. **Métricas**: Recalcula métricas de la semana

### Formato del Google Sheet

```csv
fecha,descripcion,responsable_email,responsable_nombre,ubicacion,contrato,area,rol,tipo_riesgo
2024-01-15,Inspección de EPP,juan@empresa.cl,Juan Pérez,Taller Los Andes,Codelco VP,Operaciones,Supervisor,Ergonómico
```

## Componentes Frontend

### Hooks Principales

- `useUserProfile`: Obtiene perfil y rol del usuario
- `usePamTasks`: Gestiona tareas con filtros
- `usePamDashboardMetrics`: Obtiene métricas del dashboard
- `usePamWeekSelector`: Navegación por semanas

### Páginas

- **Hub.tsx**: Selector de módulos post-login
- **PamWorkerTasksPage**: Vista de tareas para workers
- **PamDashboardPage**: Dashboard ejecutivo con KPIs
- **PamAdminWeekUploadPage**: Carga desde Google Sheets
- **PamAdminBoardPage**: Tablero de control admin

### Componentes UI

- **MetricCard**: KPI con progreso visual
- **BreakdownItem**: Item de desglose con compliance
- **PamEvidenceUploadDialog**: Upload de evidencias
- **PamTaskComments**: Chat por tarea

## Sistema de Notificaciones

### Tipos de Notificaciones

1. **task_assigned**: Nueva tarea asignada
2. **status_changed**: Cambio de estado
3. **overdue_alert**: Tarea vencida
4. **evidence_uploaded**: Evidencia subida

### Canales

- **In-app**: Badge en navbar + lista
- **Email**: Notificación por correo (configurable)
- **Push**: Notificaciones push (futuro)

## Métricas y KPIs

### Dashboard Ejecutivo

- **Total de Tareas**: Todas las tareas de la semana
- **Completadas**: Status = DONE
- **En Curso**: Status = IN_PROGRESS
- **Pendientes**: Status = PENDING
- **Vencidas**: Status = OVERDUE
- **% Cumplimiento**: (Completadas / Total) × 100

### Desgloses

- Por Contrato (ej: Codelco VP, Codelco Andina)
- Por Área (ej: Operaciones, Mantenimiento)
- Por Ubicación (ej: Taller Los Andes, Patio 5 Calama)
- Por Rol (ej: Supervisor, Operador)

## Exportación de Reportes

### Excel
- Librería: `xlsx` o `exceljs`
- Incluye: resumen ejecutivo + detalle de tareas
- Filtros aplicados en el dashboard

### PDF
- Librería: `jsPDF` + `html2canvas`
- Formato: Logo + KPIs + tablas + gráficos
- Branding por organización

## Multi-Tenancy y Branding

### Organizaciones

Cada organización tiene:
- `id`, `name`
- Logo (Storage)
- Colores primarios/secundarios
- Módulos activos

### Branding Dinámico

- Logo en navbar
- Colores en tema CSS
- Nombre en título de página
- Personalización por empresa cliente

## Seguridad

### Autenticación
- Supabase Auth (email/password + Google OAuth)
- Session management con refresh tokens

### Autorización
- RLS en todas las tablas
- Funciones SECURITY DEFINER
- Validación de roles en frontend y backend

### Datos Sensibles
- Evidencias en Storage con RLS
- Logs de auditoría (futuro)
- Encriptación en tránsito (HTTPS)

## Performance

### Optimizaciones

- **Métricas cacheadas**: Tabla `pam_metrics_cache`
- **Índices DB**: Por status, week, contract, area, location
- **Lazy loading**: Componentes y rutas
- **Paginación**: Listas largas de tareas

### Monitoreo

- Logs en Edge Functions
- Métricas de uso en `app_events`
- Alertas de errores (futuro: Sentry)

## Roadmap Futuro

### Fase 2
- [ ] Notificaciones push (PWA)
- [ ] App móvil (React Native)
- [ ] Firma digital de evidencias
- [ ] Geolocalización de tareas

### Fase 3
- [ ] IA para detección de patrones de riesgo
- [ ] Integración con sistemas HSE externos
- [ ] Reportes predictivos
- [ ] Gamificación de cumplimiento

## Convenciones de Código

- **Componentes**: PascalCase, un componente por archivo
- **Hooks**: camelCase, prefijo `use`
- **Tipos**: PascalCase, sufijo `Type` o `Interface`
- **Funciones**: camelCase, verbos descriptivos
- **Constantes**: UPPER_SNAKE_CASE

## Testing

### Unit Tests
- Hooks con `@testing-library/react-hooks`
- Funciones puras con Jest

### Integration Tests
- Flujos completos con Playwright
- Casos: asignación, cambio de estado, upload

### E2E Tests
- Escenarios de usuario real
- Multi-rol (worker, preventer, admin)

---

**Versión**: 1.0  
**Última actualización**: Enero 2024  
**Autor**: Equipo de Desarrollo JM
