-- Función para limpiar datos de water_meter_readings de una organización específica
CREATE OR REPLACE FUNCTION clean_water_meter_readings_for_org(p_organization_id UUID)
RETURNS TABLE(deleted_count BIGINT) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_id no puede ser NULL';
  END IF;

  DELETE FROM water_meter_readings
  WHERE organization_id = p_organization_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION clean_water_meter_readings_for_org(UUID) TO authenticated;

COMMENT ON FUNCTION clean_water_meter_readings_for_org IS 
'Limpia todos los registros de water_meter_readings para una organización específica. 
Útil para forzar una resincronización limpia desde Google Sheets.';