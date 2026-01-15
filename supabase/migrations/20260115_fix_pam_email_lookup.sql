-- Función SECURITY DEFINER para buscar perfil por email en la organización
-- Necesaria para que resolveAssigneeByEmail pueda encontrar usuarios sin ser bloqueado por RLS
CREATE OR REPLACE FUNCTION public.find_profile_by_email_in_org(
  p_email TEXT,
  p_organization_id UUID
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  organization_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.full_name,
    p.email,
    p.organization_id
  FROM public.profiles p
  WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(p_email))
    AND p.organization_id = p_organization_id
  LIMIT 1;
END;
$$;

-- Función para buscar perfil por email en cualquier organización (para mejor UX de error)
CREATE OR REPLACE FUNCTION public.find_profile_by_email_any_org(
  p_email TEXT
)
RETURNS TABLE (
  user_id UUID,
  organization_id UUID,
  email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.organization_id,
    p.email
  FROM public.profiles p
  WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(p_email))
  LIMIT 1;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.find_profile_by_email_in_org(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_profile_by_email_any_org(TEXT) TO authenticated;
