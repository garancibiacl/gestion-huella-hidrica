-- Create function to assign first user as admin, others as prevencionista
CREATE OR REPLACE FUNCTION public.assign_first_user_as_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Count existing users (excluding the new one)
  SELECT COUNT(*) INTO user_count FROM auth.users WHERE id != NEW.id;
  
  -- If this is the first user, make them admin
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    -- Otherwise, assign as prevencionista
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'prevencionista');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-assign role on user creation
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.assign_first_user_as_admin();