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
      // Fetch tasks directly from pam_tasks table and calculate metrics
      let query = supabase
        .from('pam_tasks')
        .select('*')
        .eq('organization_id', organizationId);
      
      if (weekYear && weekNumber) {
        query = query.eq('week_year', weekYear).eq('week_number', weekNumber);
      }

      const { data: tasks, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const taskList = tasks || [];
      const total = taskList.length;
      const completed = taskList.filter(t => t.status === 'DONE').length;
      const inProgress = taskList.filter(t => t.status === 'IN_PROGRESS').length;
      const pending = taskList.filter(t => t.status === 'PENDING').length;
      const overdue = taskList.filter(t => t.status === 'OVERDUE').length;
      const compliance = total > 0 ? (completed / total) * 100 : 0;

      // Group by location
      const locationGroups = new Map<string, { total: number; completed: number }>();
      taskList.forEach(task => {
        const loc = task.location || 'Sin ubicación';
        const current = locationGroups.get(loc) || { total: 0, completed: 0 };
        current.total++;
        if (task.status === 'DONE') current.completed++;
        locationGroups.set(loc, current);
      });

      const byLocation = Array.from(locationGroups.entries()).map(([name, data]) => ({
        name,
        total: data.total,
        completed: data.completed,
        compliance: data.total > 0 ? (data.completed / data.total) * 100 : 0,
      }));

      setMetrics({
        total_tasks: total,
        completed_tasks: completed,
        in_progress_tasks: inProgress,
        pending_tasks: pending,
        overdue_tasks: overdue,
        compliance_percentage: compliance,
        by_contract: [],
        by_area: [],
        by_location: byLocation,
        by_role: [],
      });
    } catch (err) {
      console.error('Error fetching PAM dashboard metrics:', err);
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
