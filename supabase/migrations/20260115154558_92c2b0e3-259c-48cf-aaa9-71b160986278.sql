-- Función SECURITY DEFINER para obtener todos los perfiles de una organización
-- Necesaria para que el import de PLS pueda mapear emails sin ser bloqueado por RLS

CREATE OR REPLACE FUNCTION public.get_profiles_for_organization(
  p_organization_id UUID
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.email,
    p.full_name
  FROM public.profiles p
  WHERE p.organization_id = p_organization_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_profiles_for_organization(UUID) TO authenticated;