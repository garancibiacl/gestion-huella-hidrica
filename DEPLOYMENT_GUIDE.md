# Guía de Despliegue - Módulo PAM

## 🚀 Lovable Cloud (Automático)

Si estás usando **Lovable Cloud**, todo está automatizado:

✅ **Migraciones** → Se aplican automáticamente al guardar  
✅ **Tipos TypeScript** → Se regeneran automáticamente  
✅ **Dependencias** → Ya están instaladas (xlsx, jspdf, jspdf-autotable)  
✅ **Edge Functions** → Se despliegan automáticamente  

**Solo necesitas:** Configurar roles de usuario (ver Paso 8)

---

## Despliegue Manual (Si no usas Lovable Cloud)

### Prerrequisitos

- Proyecto Supabase activo
- Supabase CLI instalado: `npm install -g supabase`
- Node.js 18+ y npm/pnpm
- Acceso a la base de datos

## Paso 1: Aplicar Migraciones de Base de Datos

### Opción A: Usando Supabase CLI (Recomendado)

```bash
# Navegar al directorio del proyecto
cd /Users/imac/Desktop/Git/gestion-huella-hidrica

# Iniciar sesión en Supabase
supabase login

# Vincular proyecto
supabase link --project-ref <your-project-ref>

# Aplicar migración
supabase db push
```

### Opción B: Aplicación Manual

1. Acceder a Supabase Dashboard → SQL Editor
2. Copiar contenido de `supabase/migrations/20240113_enhance_pam_schema.sql`
3. Ejecutar en el SQL Editor
4. Verificar que no haya errores

## Paso 2: Regenerar Tipos TypeScript

```bash
# Generar tipos desde el schema de Supabase
supabase gen types typescript --project-id <your-project-id> > src/integrations/supabase/types.ts
```

O manualmente desde Dashboard:
1. Settings → API → Generate Types
2. Copiar y reemplazar en `src/integrations/supabase/types.ts`

## Paso 3: Desplegar Edge Function

```bash
# Desplegar función de importación
supabase functions deploy import-pam-week

# Verificar despliegue
supabase functions list
```

## Paso 4: Instalar Dependencias

```bash
# Instalar dependencias para exportación
npm install xlsx jspdf jspdf-autotable

# O con pnpm
pnpm add xlsx jspdf jspdf-autotable
```

## Paso 5: Configurar Variables de Entorno

Verificar que `.env` contenga:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Paso 6: Compilar y Ejecutar

```bash
# Desarrollo
npm run dev

# Producción
npm run build
npm run preview
```

## Paso 7: Verificar Funcionalidad

### 7.1 Login y HUB
1. Acceder a `/auth`
2. Login con usuario existente
3. Verificar redirección a `/hub`
4. Confirmar que aparecen módulos: Gestión Ambiental y Gestión de Seguridad

### 7.2 Módulo PAM - Worker
1. Acceder a "Gestión de Seguridad"
2. Verificar vista `/pam/my-activities`
3. Confirmar que solo aparecen tareas asignadas al usuario

### 7.3 Módulo PAM - Admin
1. Login con usuario admin
2. Acceder a `/pam/dashboard`
3. Verificar KPIs y métricas
4. Probar filtros por semana
5. Acceder a `/admin/pam/upload`
6. Probar importación desde Google Sheet

### 7.4 Importación Google Sheets
1. Crear Google Sheet público con formato:
   ```
   fecha,descripcion,responsable_email,responsable_nombre,ubicacion,contrato,area,rol
   2024-01-15,Tarea de prueba,test@empresa.cl,Test User,Oficina,Contrato A,Operaciones,Supervisor
   ```
2. Compartir como "Anyone with the link can view"
3. Copiar URL completa
4. En `/admin/pam/upload`, pegar URL y seleccionar semana
5. Click "Importar"
6. Verificar que aparecen tareas en `/pam/my-activities`

### 7.5 Notificaciones
1. Verificar badge de notificaciones en navbar
2. Click en campana
3. Confirmar que aparecen notificaciones de tareas asignadas
4. Click en notificación → debe navegar a la tarea

### 7.6 Exportación
1. En `/pam/dashboard`
2. Click "Excel" → debe descargar archivo .xlsx
3. Click "PDF" → debe descargar archivo .pdf
4. Verificar contenido de archivos

## Paso 8: Configurar Roles de Usuario

### Crear roles de prueba

⚠️ **Importante:** Los roles se almacenan en `user_roles`, NO en `profiles`.

```sql
-- En Supabase SQL Editor

-- Usuario Worker
INSERT INTO user_roles (user_id, role) 
SELECT user_id, 'worker' FROM profiles WHERE email = 'worker@empresa.cl'
ON CONFLICT (user_id, role) DO NOTHING;

-- Usuario Prevencionista
INSERT INTO user_roles (user_id, role) 
SELECT user_id, 'prevencionista' FROM profiles WHERE email = 'preventer@empresa.cl'
ON CONFLICT (user_id, role) DO NOTHING;

-- Usuario Admin
INSERT INTO user_roles (user_id, role) 
SELECT user_id, 'admin' FROM profiles WHERE email = 'admin@empresa.cl'
ON CONFLICT (user_id, role) DO NOTHING;
```

## Troubleshooting

### Error: "Cannot find module usePamDashboardMetrics"

**Solución:** Regenerar tipos TypeScript (Paso 2)

### Error: "get_pam_dashboard_metrics is not a function"

**Causa:** Migración no aplicada correctamente

**Solución:**
1. Verificar que la migración se ejecutó sin errores
2. Comprobar que la función existe:
   ```sql
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_name LIKE '%pam%';
   ```

### Error: "No se pudo acceder al Google Sheet"

**Solución:**
1. Verificar que el sheet es público
2. URL debe ser completa: `https://docs.google.com/spreadsheets/d/...`
3. No usar `/edit#gid=0`, usar solo hasta el ID del documento

### Tareas no aparecen para workers

**Causa:** RLS policies o email no coincide

**Solución:**
1. Verificar que `profiles.email` coincide con `responsable_email` del sheet
2. Comprobar RLS policies:
   ```sql
   SELECT * FROM pam_tasks WHERE assignee_user_id = auth.uid();
   ```

### Dashboard muestra métricas en 0

**Causa:** Cache de métricas no calculado

**Solución:**
```sql
SELECT calculate_pam_metrics(
  '<organization_id>'::uuid,
  2024,
  3
);
```

## Monitoreo Post-Despliegue

### Logs de Edge Function

```bash
supabase functions logs import-pam-week
```

### Verificar métricas

```sql
SELECT * FROM pam_metrics_cache 
WHERE organization_id = '<org-id>' 
ORDER BY calculated_at DESC 
LIMIT 10;
```

### Verificar notificaciones

```sql
SELECT * FROM pam_notifications 
WHERE user_id = auth.uid() 
ORDER BY created_at DESC 
LIMIT 20;
```

## Rollback (si es necesario)

```sql
-- Eliminar tablas PAM
DROP TABLE IF EXISTS pam_metrics_cache CASCADE;
DROP TABLE IF EXISTS pam_task_comments CASCADE;
DROP TABLE IF EXISTS pam_task_evidences CASCADE;
DROP TABLE IF EXISTS pam_notifications CASCADE;
DROP TABLE IF EXISTS pam_tasks CASCADE;
DROP TABLE IF EXISTS pam_weeks_plan CASCADE;

-- Eliminar funciones
DROP FUNCTION IF EXISTS calculate_pam_metrics;
DROP FUNCTION IF EXISTS get_pam_dashboard_metrics;
DROP FUNCTION IF EXISTS trigger_recalculate_pam_metrics;
```

## Checklist Final

- [ ] Migraciones aplicadas sin errores
- [ ] Tipos TypeScript regenerados
- [ ] Edge Function desplegada
- [ ] Dependencias instaladas
- [ ] Variables de entorno configuradas
- [ ] HUB funciona correctamente
- [ ] Roles de usuario configurados
- [ ] Importación Google Sheets funciona
- [ ] Dashboard muestra métricas
- [ ] Notificaciones aparecen
- [ ] Exportación Excel/PDF funciona
- [ ] RLS policies verificadas

## Soporte

Para problemas o dudas:
1. Revisar logs de Supabase
2. Verificar console del navegador (F12)
3. Comprobar Network tab para errores de API
4. Revisar documentación en `docs/PAM_ARCHITECTURE.md`

---

**Última actualización:** Enero 2024  
**Versión:** 1.0
