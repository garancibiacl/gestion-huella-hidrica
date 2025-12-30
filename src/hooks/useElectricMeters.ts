import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Tables } from '@/integrations/supabase/types';

export type ElectricMeterReading = Tables<'electric_meter_readings'>;

interface UseElectricMetersResult {
  data: ElectricMeterReading[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useElectricMeters(): UseElectricMetersResult {
  const { user } = useAuth();
  const [data, setData] = useState<ElectricMeterReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data: rows, error: queryError } = await supabase
        .from('electric_meter_readings')
        .select('*')
        .order('period', { ascending: true });

      if (queryError) throw queryError;
      setData(rows || []);
    } catch (err: any) {
      console.error('Error loading electric meter readings', err);
      setError('No se pudieron cargar los datos de consumo eléctrico. Reintenta la sincronización.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return { data, loading, error, refetch: load };
}
