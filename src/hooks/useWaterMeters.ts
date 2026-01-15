import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import type { Tables } from '@/integrations/supabase/types';

export type WaterMeterReading = Tables<'water_meter_readings'>;

interface UseWaterMetersResult {
  data: WaterMeterReading[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useWaterMeters(): UseWaterMetersResult {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const [data, setData] = useState<WaterMeterReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!user || !organizationId) return;
    setLoading(true);
    setError(null);
    try {
      console.log('useWaterMeters: fetching data...');
      const { data: rows, error: queryError } = await supabase
        .from('water_meter_readings')
        .select('*')
        .eq('organization_id', organizationId)
        .order('period', { ascending: true });

      if (queryError) throw queryError;
      console.log('useWaterMeters: fetched', rows?.length || 0, 'rows');
      setData(rows || []);
    } catch (err: any) {
      console.error('Error loading water meter readings', err);
      setError('No se pudieron cargar los datos de consumo de agua. Reintenta la sincronización.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || !organizationId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, organizationId]);

  return { data, loading, error, refetch: load };
}
