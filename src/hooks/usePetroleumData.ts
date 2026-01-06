import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  PetroleumPeriodAggregate,
  PetroleumDashboardMetrics,
  PetroleumRecommendationsSummary,
  PetroleumCompanyAggregate,
  MitigationAnalysis,
} from '@/lib/petroleum/types';
import {
  aggregatePetroleumByPeriod,
  calculatePetroleumDashboardMetrics,
  buildPetroleumRecommendations,
  aggregatePetroleumByCompany,
  buildMitigationAnalysis,
} from '@/lib/petroleum/utils';
 
// Tipo local para filas de la tabla petroleum_consumption.
// Esto evita depender de la regeneración automática de tipos de Supabase.
export interface PetroleumConsumptionRow {
  id: string | number;
  user_id: string;
  organization_id: string;
  period: string;
  period_label: string | null;
  date_emission: string | null;
  date_payment: string | null;
  created_at?: string | null;
  center: string | null;
  company: string | null;
  supplier: string | null;
  liters: number | null;
  total_cost: number | null;
  mining_use_raw: string | null;
  is_mining_use: boolean | null;
}

interface UsePetroleumDataResult {
  loading: boolean;
  error: string | null;
  rows: PetroleumConsumptionRow[];
  aggregates: PetroleumPeriodAggregate[];
  companyAggregates: PetroleumCompanyAggregate[];
  metrics: PetroleumDashboardMetrics | null;
  recommendations: PetroleumRecommendationsSummary | null;
  mitigationAnalysis: MitigationAnalysis[];
  lastUpdated: number | null;
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
      // Primero obtener organization_id del perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();

      const organizationId = profile?.organization_id;
      if (!organizationId) {
        throw new Error('No se pudo determinar la organización del usuario.');
      }

      console.log('usePetroleumData: fetching for user', user.id, 'org', organizationId);

      const { data, error: queryError } = await supabase
        .from('petroleum_consumption')
        .select('*')
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .order('period', { ascending: true });

      if (queryError) throw queryError;
      
      console.log('usePetroleumData: fetched', data?.length || 0, 'rows');
      setRows(data || []);
    } catch (err: any) {
      console.error('Error loading petroleum consumption', err);
      setError(err.message || 'No se pudieron cargar los datos de petróleo. Intenta sincronizar nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const { aggregates, companyAggregates, metrics, recommendations, mitigationAnalysis, lastUpdated } = useMemo(() => {
    if (rows.length === 0) {
      return {
        aggregates: [] as PetroleumPeriodAggregate[],
        companyAggregates: [] as PetroleumCompanyAggregate[],
        metrics: null as PetroleumDashboardMetrics | null,
        recommendations: null as PetroleumRecommendationsSummary | null,
        mitigationAnalysis: [] as MitigationAnalysis[],
        lastUpdated: null,
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
      unit: 'L' as const,
      totalCost: Number(row.total_cost ?? 0),
      miningUseRaw: row.mining_use_raw ?? '',
      isMiningUse: Boolean(row.is_mining_use),
    }));

    const aggregatesResult = aggregatePetroleumByPeriod(
      mappedRows,
      PETROLEUM_EMISSION_FACTOR_KG_CO2E_PER_LITER,
    );

    const companyAggregatesResult = aggregatePetroleumByCompany(
      mappedRows,
      PETROLEUM_EMISSION_FACTOR_KG_CO2E_PER_LITER,
    );

    const metricsResult = calculatePetroleumDashboardMetrics(
      mappedRows,
      PETROLEUM_EMISSION_FACTOR_KG_CO2E_PER_LITER,
    );

    const recommendationsResult = buildPetroleumRecommendations(aggregatesResult);

    const mitigationAnalysisResult = buildMitigationAnalysis(
      companyAggregatesResult,
      PETROLEUM_EMISSION_FACTOR_KG_CO2E_PER_LITER,
    );

    const lastUpdatedTs = rows.reduce<number>((max, row) => {
      const dateStr = row.date_emission || row.date_payment || row.created_at || null;
      if (!dateStr) return max;
      const ts = new Date(dateStr).getTime();
      if (Number.isNaN(ts)) return max;
      return Math.max(max, ts);
    }, 0);

    return {
      aggregates: aggregatesResult,
      companyAggregates: companyAggregatesResult,
      metrics: metricsResult,
      recommendations: recommendationsResult,
      mitigationAnalysis: mitigationAnalysisResult,
      lastUpdated: lastUpdatedTs || null,
    };
  }, [rows]);

  return {
    loading,
    error,
    rows,
    aggregates,
    companyAggregates,
    metrics,
    recommendations,
    mitigationAnalysis,
    lastUpdated,
    refetch: load,
  };
}
