-- Tabla para eventos de tracking
CREATE TABLE IF NOT EXISTS public.app_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL, -- 'page_view', 'visit_end', 'click', etc.
  user_id uuid,
  session_id text NOT NULL,
  page_path text,
  referrer text,
  user_agent text,
  device_type text, -- 'desktop', 'mobile', 'tablet'
  country text,
  duration_ms integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_app_events_type ON public.app_events(event_type);
CREATE INDEX IF NOT EXISTS idx_app_events_created_at ON public.app_events(created_at);
CREATE INDEX IF NOT EXISTS idx_app_events_session ON public.app_events(session_id);
CREATE INDEX IF NOT EXISTS idx_app_events_page_path ON public.app_events(page_path);

-- Habilitar RLS
ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

-- Política: cualquier usuario autenticado puede insertar eventos
CREATE POLICY "Authenticated users can insert events"
  ON public.app_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política: solo admins pueden ver todos los eventos
CREATE POLICY "Admins can view all events"
  ON public.app_events FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Función: Obtener resumen de analytics
CREATE OR REPLACE FUNCTION public.get_analytics_overview(days integer DEFAULT 7)
RETURNS TABLE (
  unique_visitors bigint,
  unique_visitors_prev bigint,
  page_views bigint,
  page_views_prev bigint,
  views_per_visit numeric,
  views_per_visit_prev numeric,
  avg_duration_ms numeric,
  avg_duration_ms_prev numeric,
  bounce_rate numeric,
  bounce_rate_prev numeric,
  daily_stats jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  start_date timestamptz;
  prev_start_date timestamptz;
  prev_end_date timestamptz;
BEGIN
  start_date := now() - (days || ' days')::interval;
  prev_end_date := start_date;
  prev_start_date := prev_end_date - (days || ' days')::interval;

  RETURN QUERY
  WITH current_period AS (
    SELECT 
      COUNT(DISTINCT session_id) as visitors,
      COUNT(*) FILTER (WHERE event_type = 'page_view') as views,
      AVG(duration_ms) FILTER (WHERE event_type = 'visit_end') as avg_dur
    FROM app_events
    WHERE created_at >= start_date
  ),
  prev_period AS (
    SELECT 
      COUNT(DISTINCT session_id) as visitors,
      COUNT(*) FILTER (WHERE event_type = 'page_view') as views,
      AVG(duration_ms) FILTER (WHERE event_type = 'visit_end') as avg_dur
    FROM app_events
    WHERE created_at >= prev_start_date AND created_at < prev_end_date
  ),
  bounce_current AS (
    SELECT 
      COUNT(*) FILTER (WHERE view_count = 1)::numeric / NULLIF(COUNT(*), 0)::numeric * 100 as rate
    FROM (
      SELECT session_id, COUNT(*) FILTER (WHERE event_type = 'page_view') as view_count
      FROM app_events
      WHERE created_at >= start_date
      GROUP BY session_id
    ) s
  ),
  bounce_prev AS (
    SELECT 
      COUNT(*) FILTER (WHERE view_count = 1)::numeric / NULLIF(COUNT(*), 0)::numeric * 100 as rate
    FROM (
      SELECT session_id, COUNT(*) FILTER (WHERE event_type = 'page_view') as view_count
      FROM app_events
      WHERE created_at >= prev_start_date AND created_at < prev_end_date
      GROUP BY session_id
    ) s
  ),
  daily AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'date', d.day::date,
        'visitas', COALESCE(e.views, 0),
        'usuarios', COALESCE(e.visitors, 0)
      ) ORDER BY d.day
    ) as stats
    FROM generate_series(start_date::date, now()::date, '1 day'::interval) d(day)
    LEFT JOIN (
      SELECT 
        created_at::date as day,
        COUNT(*) FILTER (WHERE event_type = 'page_view') as views,
        COUNT(DISTINCT session_id) as visitors
      FROM app_events
      WHERE created_at >= start_date
      GROUP BY created_at::date
    ) e ON e.day = d.day::date
  )
  SELECT 
    cp.visitors,
    pp.visitors,
    cp.views,
    pp.views,
    CASE WHEN cp.visitors > 0 THEN ROUND(cp.views::numeric / cp.visitors, 2) ELSE 0 END,
    CASE WHEN pp.visitors > 0 THEN ROUND(pp.views::numeric / pp.visitors, 2) ELSE 0 END,
    COALESCE(ROUND(cp.avg_dur, 0), 0),
    COALESCE(ROUND(pp.avg_dur, 0), 0),
    COALESCE(ROUND(bc.rate, 1), 0),
    COALESCE(ROUND(bp.rate, 1), 0),
    COALESCE(daily.stats, '[]'::jsonb)
  FROM current_period cp, prev_period pp, bounce_current bc, bounce_prev bp, daily;
END;
$$;

-- Función: Top páginas visitadas
CREATE OR REPLACE FUNCTION public.get_top_pages(days integer DEFAULT 7, limit_count integer DEFAULT 10)
RETURNS TABLE (
  page_path text,
  page_name text,
  views bigint,
  percentage numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_views bigint;
BEGIN
  SELECT COUNT(*) INTO total_views 
  FROM app_events 
  WHERE event_type = 'page_view' 
    AND created_at >= now() - (days || ' days')::interval;

  RETURN QUERY
  SELECT 
    e.page_path,
    CASE 
      WHEN e.page_path = '/' THEN 'Inicio'
      WHEN e.page_path = '/dashboard' THEN 'Dashboard'
      WHEN e.page_path = '/auth' THEN 'Autenticación'
      WHEN e.page_path = '/importar' THEN 'Importar Datos'
      WHEN e.page_path = '/periodos' THEN 'Períodos'
      WHEN e.page_path = '/admin' THEN 'Admin'
      WHEN e.page_path = '/admin/usuarios' THEN 'Admin Usuarios'
      WHEN e.page_path = '/admin/analytics' THEN 'Analytics'
      WHEN e.page_path = '/medidas' THEN 'Medidas'
      WHEN e.page_path = '/configuracion' THEN 'Configuración'
      ELSE e.page_path
    END as page_name,
    COUNT(*) as views,
    ROUND(COUNT(*)::numeric / NULLIF(total_views, 0) * 100, 1) as percentage
  FROM app_events e
  WHERE e.event_type = 'page_view'
    AND e.created_at >= now() - (days || ' days')::interval
  GROUP BY e.page_path
  ORDER BY views DESC
  LIMIT limit_count;
END;
$$;

-- Función: Estadísticas de dispositivos
CREATE OR REPLACE FUNCTION public.get_device_stats(days integer DEFAULT 7)
RETURNS TABLE (
  device_type text,
  visits bigint,
  percentage numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_sessions bigint;
BEGIN
  SELECT COUNT(DISTINCT session_id) INTO total_sessions 
  FROM app_events 
  WHERE created_at >= now() - (days || ' days')::interval;

  RETURN QUERY
  SELECT 
    COALESCE(e.device_type, 'desktop') as device_type,
    COUNT(DISTINCT e.session_id) as visits,
    ROUND(COUNT(DISTINCT e.session_id)::numeric / NULLIF(total_sessions, 0) * 100, 1) as percentage
  FROM app_events e
  WHERE e.created_at >= now() - (days || ' days')::interval
  GROUP BY e.device_type
  ORDER BY visits DESC;
END;
$$;

-- Función: Estadísticas por país
CREATE OR REPLACE FUNCTION public.get_country_stats(days integer DEFAULT 7)
RETURNS TABLE (
  country text,
  visits bigint,
  percentage numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_sessions bigint;
BEGIN
  SELECT COUNT(DISTINCT session_id) INTO total_sessions 
  FROM app_events 
  WHERE created_at >= now() - (days || ' days')::interval;

  RETURN QUERY
  SELECT 
    COALESCE(e.country, 'Desconocido') as country,
    COUNT(DISTINCT e.session_id) as visits,
    ROUND(COUNT(DISTINCT e.session_id)::numeric / NULLIF(total_sessions, 0) * 100, 1) as percentage
  FROM app_events e
  WHERE e.created_at >= now() - (days || ' days')::interval
  GROUP BY e.country
  ORDER BY visits DESC
  LIMIT 10;
END;
$$;