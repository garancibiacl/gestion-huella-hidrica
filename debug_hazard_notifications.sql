-- Script de debug para notificaciones de hazards

-- 1. Verificar que la tabla existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'hazard_notifications'
) as "tabla_existe";

-- 2. Verificar que el trigger existe
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_create_hazard_report_notification';

-- 3. Ver el último reporte creado
SELECT 
  id,
  description,
  closing_responsible_id,
  status,
  created_at
FROM hazard_reports
ORDER BY created_at DESC
LIMIT 1;

-- 4. Ver si hay notificaciones creadas
SELECT 
  id,
  user_id,
  hazard_report_id,
  type,
  title,
  message,
  is_read,
  created_at
FROM hazard_notifications
ORDER BY created_at DESC
LIMIT 5;

-- 5. Si no hay notificaciones, verificar manualmente crear una de prueba
-- (Reemplaza los valores con los reales de tu reporte)
/*
INSERT INTO hazard_notifications (
  organization_id,
  user_id,
  hazard_report_id,
  type,
  title,
  message
) VALUES (
  '00000000-0000-0000-0000-000000000001', -- tu organization_id
  'USER_ID_AQUI',                          -- user_id del responsable
  'HAZARD_REPORT_ID_AQUI',                 -- id del reporte que creaste
  'report_assigned',
  'Test: Nuevo Reporte de Peligro asignado',
  'Notificación de prueba manual'
);
*/
