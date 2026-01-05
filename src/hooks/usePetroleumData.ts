import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Tables } from '@/integrations/supabase/types';
import {
  PetroleumPeriodAggregate,
  PetroleumDashboardMetrics,
  PetroleumRecommendationsSummary,
} from '@/lib/petroleum/types';
import {
  aggregatePetroleumByPeriod,
  calculatePetroleumDashboardMetrics,
  buildPetroleumRecommendations,
} from '@/lib/petroleum/utils';

export type PetroleumConsumptionRow = Tables<'petroleum_consumption'>;

interface UsePetroleumDataResult {
  loading: boolean;
  error: string | null;
  rows: PetroleumConsumptionRow[];
  aggregates: PetroleumPeriodAggregate[];
  metrics: PetroleumDashboardMetrics | null;
  recommendations: PetroleumRecommendationsSummary | null;
  refetch: () => Promise<void>;
}

// Factor genérico de emisión por litro de combustible (kgCO2e/L)
const PETROLEUM_EMISSION_FACTOR_KG_CO2E_PER_LITER = 2.68;

export function usePetroleumData(): UsePetroleumDataResult {
  const { user } = useAuth();
  const [rows, setRows] = useState<PetroleumConsumptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from('petroleum_consumption')
        .select('*')
        .order('period', { ascending: true });

      if (queryError) throw queryError;
      setRows(data || []);
    } catch (err: any) {
      console.error('Error loading petroleum consumption', err);
      setError('No se pudieron cargar los datos de petróleo. Intenta importar nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const { aggregates, metrics, recommendations } = useMemo(() => {
    if (rows.length === 0) {
      return {
        aggregates: [] as PetroleumPeriodAggregate[],
        metrics: null as PetroleumDashboardMetrics | null,
        recommendations: null as PetroleumRecommendationsSummary | null,
      };
    }

    const mappedRows = rows.map((row) => ({
      id: `${row.id}`,
      periodKey: row.period,
      periodLabel: row.period_label ?? row.period,
      dateEmission: row.date_emission,
      datePayment: row.date_payment,
      center: row.center ?? '',
      company: row.company ?? '',
      supplier: row.supplier ?? '',
      liters: Number(row.liters ?? 0),
      unit: 'L',
      totalCost: Number(row.total_cost ?? 0),
      miningUseRaw: row.mining_use_raw ?? '',
      isMiningUse: Boolean(row.is_mining_use),
    }));

    const aggregatesResult = aggregatePetroleumByPeriod(
      mappedRows,
      PETROLEUM_EMISSION_FACTOR_KG_CO2E_PER_LITER,
    );

    const metricsResult = calculatePetroleumDashboardMetrics(
      mappedRows,
      PETROLEUM_EMISSION_FACTOR_KG_CO2E_PER_LITER,
    );

    const recommendationsResult = buildPetroleumRecommendations(aggregatesResult);

    return {
      aggregates: aggregatesResult,
      metrics: metricsResult,
      recommendations: recommendationsResult,
    };
  }, [rows]);

  return {
    loading,
    error,
    rows,
    aggregates,
    metrics,
    recommendations,
    refetch: load,
  };
}
