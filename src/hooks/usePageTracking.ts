import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// Generar un session ID único por sesión del navegador
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('app_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('app_session_id', sessionId);
  }
  return sessionId;
};

// Detectar tipo de dispositivo
const getDeviceType = (): string => {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
};

export function usePageTracking() {
  const location = useLocation();
  const startTimeRef = useRef<number>(Date.now());
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    const sessionId = getSessionId();
    const deviceType = getDeviceType();

    const trackPageView = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        // Evitar 401: la tabla app_events solo permite inserts para usuarios autenticados
        if (!user?.id) return;

        await supabase.from('app_events').insert({
          event_type: 'page_view',
          user_id: user.id,
          session_id: sessionId,
          page_path: location.pathname,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
          device_type: deviceType,
          metadata: {
            search: location.search,
            hash: location.hash,
          },
        });
      } catch (error) {
        console.error('Error tracking page view:', error);
      }
    };

    // Enviar visit_end para la página anterior
    const sendVisitEnd = async () => {
      if (lastPathRef.current) {
        const duration = Date.now() - startTimeRef.current;
        try {
          const { data: { user } } = await supabase.auth.getUser();
          
          await supabase.from('app_events').insert({
            event_type: 'visit_end',
            user_id: user?.id || null,
            session_id: sessionId,
            page_path: lastPathRef.current,
            device_type: deviceType,
            duration_ms: duration
          });
        } catch (error) {
          console.error('Error tracking visit end:', error);
        }
      }
    };

    // Enviar visit_end de la página anterior y luego trackear la nueva
    sendVisitEnd().then(() => {
      trackPageView();
      startTimeRef.current = Date.now();
      lastPathRef.current = location.pathname;
    });

    // Cleanup: enviar visit_end cuando el componente se desmonte (usuario sale)
    return () => {
      const duration = Date.now() - startTimeRef.current;
      // Usar sendBeacon para garantizar que se envíe incluso al cerrar
      const payload = JSON.stringify({
        event_type: 'visit_end',
        session_id: sessionId,
        page_path: location.pathname,
        device_type: deviceType,
        duration_ms: duration
      });

      // Intentar con sendBeacon (más confiable al cerrar la página)
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        // Note: sendBeacon doesn't work directly with Supabase, so we use the standard insert
      }
    };
  }, [location.pathname]);

  // Enviar evento al cerrar/recargar la página
  useEffect(() => {
    const handleBeforeUnload = async () => {
      const sessionId = getSessionId();
      const duration = Date.now() - startTimeRef.current;
      
      try {
        await supabase.from('app_events').insert({
          event_type: 'visit_end',
          session_id: sessionId,
          page_path: location.pathname,
          device_type: getDeviceType(),
          duration_ms: duration
        });
      } catch (error) {
        // Silently fail on page unload
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [location.pathname]);
}
