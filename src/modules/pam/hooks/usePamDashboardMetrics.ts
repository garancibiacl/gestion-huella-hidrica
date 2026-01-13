import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PamDashboardMetrics {
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  pending_tasks: number;
  overdue_tasks: number;
  compliance_percentage: number;
  by_contract: Array<{
    name: string;
    total: number;
    completed: number;
    compliance: number;
  }>;
  by_area: Array<{
    name: string;
    total: number;
    completed: number;
    compliance: number;
  }>;
  by_location: Array<{
    name: string;
    total: number;
    completed: number;
    compliance: number;
  }>;
  by_role: Array<{
    name: string;
    total: number;
    completed: number;
    compliance: number;
  }>;
}

interface UsePamDashboardMetricsParams {
  organizationId?: string;
  weekYear?: number;
  weekNumber?: number;
}

interface UsePamDashboardMetricsResult {
  metrics: PamDashboardMetrics | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePamDashboardMetrics({
  organizationId,
  weekYear,
  weekNumber,
}: UsePamDashboardMetricsParams): UsePamDashboardMetricsResult {
  const [metrics, setMetrics] = useState<PamDashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    if (!organizationId) {
      setMetrics(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase.rpc('get_pls_dashboard_metrics', {
        p_organization_id: organizationId,
        p_week_year: weekYear || null,
        p_week_number: weekNumber || null,
      });

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        const row = data[0];
        setMetrics({
          total_tasks: Number(row.total_tasks) || 0,
          completed_tasks: Number(row.completed_tasks) || 0,
          in_progress_tasks: Number(row.in_progress_tasks) || 0,
          pending_tasks: Number(row.pending_tasks) || 0,
          overdue_tasks: Number(row.overdue_tasks) || 0,
          compliance_percentage: Number(row.compliance_percentage) || 0,
          by_contract: row.by_contract || [],
          by_area: row.by_area || [],
          by_location: row.by_location || [],
          by_role: row.by_role || [],
        });
      } else {
        setMetrics({
          total_tasks: 0,
          completed_tasks: 0,
          in_progress_tasks: 0,
          pending_tasks: 0,
          overdue_tasks: 0,
          compliance_percentage: 0,
          by_contract: [],
          by_area: [],
          by_location: [],
          by_role: [],
        });
      }
    } catch (err) {
      console.error('Error fetching PLS dashboard metrics:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar métricas');
      setMetrics(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [organizationId, weekYear, weekNumber]);

  return { metrics, isLoading, error, refetch: fetchMetrics };
}
