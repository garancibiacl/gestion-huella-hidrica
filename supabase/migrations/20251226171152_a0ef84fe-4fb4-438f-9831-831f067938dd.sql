-- Create enum for sustainability action status
CREATE TYPE public.action_status AS ENUM ('propuesta', 'evaluacion', 'implementada');

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'prevencionista',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table for role management
CREATE TYPE public.app_role AS ENUM ('admin', 'prevencionista');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create water_readings table
CREATE TABLE public.water_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  consumo_m3 NUMERIC NOT NULL,
  costo NUMERIC,
  observaciones TEXT,
  evidencia_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create measurement_criteria table
CREATE TABLE public.measurement_criteria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  umbral_alerta_pct NUMERIC NOT NULL DEFAULT 15,
  frecuencia TEXT NOT NULL DEFAULT 'mensual',
  objetivo_mensual NUMERIC DEFAULT 1000,
  reduccion_anual_pct NUMERIC DEFAULT 10,
  email_notificaciones TEXT,
  notificaciones_email BOOLEAN DEFAULT false,
  informes_mensuales BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sustainability_actions table
CREATE TABLE public.sustainability_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  estado action_status NOT NULL DEFAULT 'propuesta',
  indicador_asociado TEXT,
  impacto_estimado TEXT,
  categoria TEXT,
  fecha_implementacion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurement_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sustainability_actions ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for water_readings
CREATE POLICY "Users can view their own water readings" ON public.water_readings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own water readings" ON public.water_readings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own water readings" ON public.water_readings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own water readings" ON public.water_readings
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for measurement_criteria
CREATE POLICY "Users can view their own criteria" ON public.measurement_criteria
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own criteria" ON public.measurement_criteria
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own criteria" ON public.measurement_criteria
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for sustainability_actions
CREATE POLICY "Users can view their own actions" ON public.sustainability_actions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own actions" ON public.sustainability_actions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own actions" ON public.sustainability_actions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own actions" ON public.sustainability_actions
  FOR DELETE USING (auth.uid() = user_id);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  
  INSERT INTO public.measurement_criteria (user_id)
  VALUES (new.id);
  
  RETURN new;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_water_readings_updated_at
  BEFORE UPDATE ON public.water_readings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_measurement_criteria_updated_at
  BEFORE UPDATE ON public.measurement_criteria
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sustainability_actions_updated_at
  BEFORE UPDATE ON public.sustainability_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();