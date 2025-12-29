
-- Drop existing FK to auth.users
ALTER TABLE public.measurement_criteria 
DROP CONSTRAINT measurement_criteria_user_id_fkey;

-- Add new FK to profiles(user_id) with CASCADE
ALTER TABLE public.measurement_criteria 
ADD CONSTRAINT measurement_criteria_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
