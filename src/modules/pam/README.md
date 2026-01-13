# Módulo PLS - Gestión de Seguridad

Sistema de gestión de tareas de seguridad y salud ocupacional (Plan de Acción de Mejora).

## Características

✅ **Multi-rol**: Worker, Prevencionista, Admin  
✅ **Dashboard ejecutivo** con KPIs en tiempo real  
✅ **Importación masiva** desde Google Sheets  
✅ **Notificaciones** in-app y email  
✅ **Evidencias** con upload a Storage  
✅ **Comentarios** tipo chat por tarea  
✅ **Métricas agregadas** por contrato, área, ubicación, rol  
✅ **Exportación** a Excel y PDF  
✅ **Multi-tenant** con branding por organización  

## Instalación

### 1. Aplicar migraciones de base de datos

```bash
cd supabase
supabase db push
```

O aplicar manualmente:
```bash
psql -h <host> -U <user> -d <database> -f migrations/20240113_enhance_pam_schema.sql
```

### 2. Desplegar Edge Function

```bash
supabase functions deploy import-pam-week
```

### 3. Configurar variables de entorno

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Uso

### Para Workers

1. Login → HUB → Gestión de Seguridad
2. Ver tareas asignadas en `/pam/my-activities`
3. Acusar recibo: PENDING → IN_PROGRESS
4. Subir evidencia y marcar como DONE

### Para Prevencionistas

1. Acceso a dashboard ejecutivo: `/pam/dashboard`
2. Ver cumplimiento por contrato, área, ubicación
3. Planificar y asignar tareas
4. Revisar evidencias

### Para Admins

1. Carga masiva: `/admin/pam/upload`
2. Pegar URL de Google Sheet público
3. Seleccionar semana
4. Importar → notificaciones automáticas
5. Ver tablero de control: `/admin/pam/board`

## Formato Google Sheet

```csv
fecha,descripcion,responsable_email,responsable_nombre,ubicacion,contrato,area,rol,tipo_riesgo
2024-01-15,Inspección de EPP,juan@empresa.cl,Juan Pérez,Taller Los Andes,Codelco VP,Operaciones,Supervisor,Ergonómico
2024-01-16,Revisión extintores,maria@empresa.cl,María González,Casa matriz,Codelco Andina,Seguridad,Prevencionista,Incendio
```

**Campos obligatorios**: fecha, descripcion, responsable_email  
**Campos opcionales**: responsable_nombre, ubicacion, contrato, area, rol, tipo_riesgo

## API

### Hooks

#### `usePamTasks`
```typescript
const { tasks, isLoading, updateTaskStatus, uploadEvidence } = usePamTasks({
  weekYear: 2024,
  weekNumber: 3
});
```

#### `usePamDashboardMetrics`
```typescript
const { metrics, isLoading, error } = usePamDashboardMetrics({
  organizationId: 'uuid',
  weekYear: 2024,
  weekNumber: 3
});
```

#### `useUserProfile`
```typescript
const { profile, loading } = useUserProfile();
// profile.role: 'admin' | 'prevencionista' | 'worker'
```

### Servicios

#### `importPamWeekFromGoogleSheets`
```typescript
import { importPamWeekFromGoogleSheets } from '@/modules/pam/services/pamGoogleSheetsImporter';

const result = await importPamWeekFromGoogleSheets({
  sheetUrl: 'https://docs.google.com/spreadsheets/d/...',
  organizationId: 'uuid',
  weekYear: 2024,
  weekNumber: 3
});
```

## Estructura de Archivos

```
src/modules/pam/
├── components/
│   ├── worker/
│   │   └── PamEvidenceUploadDialog.tsx
│   └── notifications/
│       └── PamNotificationBell.tsx
├── hooks/
│   ├── usePamTasks.ts
│   ├── usePamDashboardMetrics.ts
│   ├── usePamWeekSelector.ts
│   └── usePamSync.ts
├── pages/
│   ├── PamWorkerTasksPage.tsx
│   ├── PamDashboardPage.tsx
│   ├── PamAdminWeekUploadPage.tsx
│   └── PamAdminBoardPage.tsx
├── services/
│   ├── pamApi.ts
│   ├── pamImporter.ts
│   └── pamGoogleSheetsImporter.ts
├── types/
│   ├── pam.types.ts
│   └── notification.types.ts
└── README.md
```

## Base de Datos

### Tablas

- `pam_weeks_plan`: Planificación semanal
- `pam_tasks`: Tareas individuales
- `pam_task_evidences`: Evidencias subidas
- `pam_task_comments`: Comentarios tipo chat
- `pam_notifications`: Notificaciones in-app
- `pam_metrics_cache`: Cache de métricas

### Funciones RPC

- `calculate_pam_metrics(org_id, week_year, week_number)`
- `get_pam_dashboard_metrics(org_id, week_year, week_number)`
- `is_pam_admin()`, `is_pam_worker()`
- `mark_pam_notification_read(notification_id)`
- `mark_all_pam_notifications_read()`

## Permisos (RLS)

- **Workers**: Solo ven sus tareas (`assignee_user_id = auth.uid()`)
- **Preventers/Admins**: Ven todas las tareas de su organización
- **Notificaciones**: Solo del usuario actual
- **Evidencias**: Solo de tareas accesibles

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e
```

## Troubleshooting

### Error: "No se pudo acceder al Google Sheet"
- Verificar que el sheet sea público (Anyone with the link can view)
- Usar URL completa: `https://docs.google.com/spreadsheets/d/...`

### Error: "No autorizado"
- Verificar que el usuario tenga rol admin o prevencionista
- Revisar RLS policies en Supabase

### Tareas no aparecen
- Verificar que `organization_id` coincida
- Revisar filtros de semana
- Comprobar RLS policies

## Roadmap

- [x] Importación desde Google Sheets
- [x] Dashboard ejecutivo
- [x] Sistema de notificaciones
- [ ] Notificaciones push (PWA)
- [ ] Exportación Excel/PDF
- [ ] App móvil
- [ ] Firma digital de evidencias
- [ ] Geolocalización

## Soporte

Para reportar bugs o solicitar features, crear issue en el repositorio.

## Licencia

Propiedad de JM - Todos los derechos reservados
