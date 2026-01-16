-- Función para limpiar datos de water_meter_readings de una organización específica
-- Esto permite forzar una resincronización limpia desde Google Sheets

CREATE OR REPLACE FUNCTION clean_water_meter_readings_for_org(p_organization_id UUID)
RETURNS TABLE(deleted_count BIGINT) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  -- Verificar que el organization_id es válido
  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_id no puede ser NULL';
  END IF;

  -- Eliminar todos los registros de water_meter_readings para la organización
  DELETE FROM water_meter_readings
  WHERE organization_id = p_organization_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Retornar el número de registros eliminados
  RETURN QUERY SELECT v_count;
END;
$$;

-- Dar permiso a usuarios autenticados para ejecutar la función
GRANT EXECUTE ON FUNCTION clean_water_meter_readings_for_org(UUID) TO authenticated;

-- Comentario para documentación
COMMENT ON FUNCTION clean_water_meter_readings_for_org IS 
'Limpia todos los registros de water_meter_readings para una organización específica. 
Útil para forzar una resincronización limpia desde Google Sheets.';
