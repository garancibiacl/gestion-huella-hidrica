import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ElectricMeterReading {
  id: string;
  period: string;
  centro_trabajo: string;
  medidor: string;
  tipo_uso: string | null;
  consumo_kwh: number;
  costo_total: number | null;
  proveedor: string | null;
}

interface UseElectricMetersResult {
  data: ElectricMeterReading[];
  loading: boolean;
  error: string | null;
}

export function useElectricMeters(): UseElectricMetersResult {
  const { user } = useAuth();
  const [data, setData] = useState<ElectricMeterReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: rows, error } = await supabase
          .from('electric_meter_readings')
          .select('*')
          .order('period', { ascending: true });

        if (error) throw error;
        if (!rows) {
          if (!cancelled) setData([]);
          return;
        }

        const mapped: ElectricMeterReading[] = rows.map((r: any) => ({
          id: r.id,
          period: r.period,
          centro_trabajo: r.centro_trabajo,
          medidor: r.medidor,
          tipo_uso: r.tipo_uso,
          consumo_kwh: Number(r.consumo_kwh),
          costo_total: r.costo_total !== null ? Number(r.costo_total) : null,
          proveedor: r.proveedor,
        }));

        if (!cancelled) setData(mapped);
      } catch (err: any) {
        console.error('Error loading electric meter readings', err);
        if (!cancelled) setError('No se pudieron cargar los datos de consumo eléctrico.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return { data, loading, error };
}
