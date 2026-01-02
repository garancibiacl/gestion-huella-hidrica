import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Activity, TrendingUp, Grid2X2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useRiskSignals, type RiskRecord } from '@/hooks/useRiskSignals';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface WaterRow {
  period: string;
  centro_trabajo: string;
  formato: 'botella' | 'bidon_20l';
  cantidad: number;
  total_costo: number | null;
}

interface ElectricRow {
  period: string;
  centro_trabajo: string;
  consumo_kwh: number;
  costo_total: number | null;
}

interface WaterMeterRow {
  period: string;
  consumo_m3: number;
  costo: number | null;
}

interface RiskAlertRow {
  id: string;
  center: string;
  metric: 'water_human' | 'water_meter' | 'energy';
  period: string;
  latest_value: number;
  forecast_value: number;
  forecast_cost: number;
  range_min: number;
  range_max: number;
  range_cost_min: number;
  range_cost_max: number;
  score: number;
  level: 'low' | 'medium' | 'high';
  reasons: string[] | null;
  actions: string[] | null;
  change_detected: boolean;
  outlier: boolean;
  mix_current_pct: number | null;
  mix_avg_pct: number | null;
  mix_shift_pct: number | null;
  status: 'open' | 'acknowledged' | 'resolved';
  created_at: string;
}

interface RiskRunRow {
  id: string;
  started_at: string;
  finished_at: string | null;
  alerts_created: number;
  alerts_updated: number;
  alerts_skipped: number;
  errors: string[] | null;
}

const METRIC_LABELS: Record<RiskAlertRow['metric'], { label: string; unit: string }> = {
  water_human: { label: 'Agua humana', unit: 'L' },
  water_meter: { label: 'Agua medidor', unit: 'm³' },
  energy: { label: 'Energia', unit: 'kWh' },
};

const ALLOWED_ALERT_STATUSES: RiskAlertRow['status'][] = ['open', 'acknowledged', 'resolved'];

export default function RiskPanel() {
  const { toast } = useToast();
  const [rows, setRows] = useState<WaterRow[]>([]);
  const [electricRows, setElectricRows] = useState<ElectricRow[]>([]);
  const [waterMeterRows, setWaterMeterRows] = useState<WaterMeterRow[]>([]);
  const [alertRows, setAlertRows] = useState<RiskAlertRow[]>([]);
  const [riskRuns, setRiskRuns] = useState<RiskRunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [updatingAlertId, setUpdatingAlertId] = useState<string | null>(null);
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | RiskAlertRow['status']>('all');
  const [historyMetricFilter, setHistoryMetricFilter] = useState<'all' | RiskAlertRow['metric']>('all');
  const [historyCenterFilter, setHistoryCenterFilter] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [humanRes, electricRes, waterRes] = await Promise.all([
        supabase
          .from('human_water_consumption')
          .select('period, centro_trabajo, formato, cantidad, total_costo')
          .order('period', { ascending: true }),
        supabase
          .from('electric_meter_readings')
          .select('period, centro_trabajo, consumo_kwh, costo_total')
          .order('period', { ascending: true }),
        supabase
          .from('water_readings')
          .select('period, consumo_m3, costo')
          .order('period', { ascending: true }),
      ]);

      setRows((humanRes.data || []) as WaterRow[]);
      setElectricRows((electricRes.data || []) as ElectricRow[]);
      setWaterMeterRows((waterRes.data || []) as WaterMeterRow[]);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const loadAlerts = async () => {
      setLoadingAlerts(true);
      const { data, error } = await supabase
        .from('risk_alerts')
        .select('id, center, metric, period, latest_value, forecast_value, forecast_cost, range_min, range_max, range_cost_min, range_cost_max, score, level, reasons, actions, change_detected, outlier, mix_current_pct, mix_avg_pct, mix_shift_pct, status, created_at')
        .order('created_at', { ascending: false })
        .limit(250);

      if (!error && data) {
        setAlertRows(data.map((row) => ({
          id: row.id,
          center: row.center,
          metric: row.metric as RiskAlertRow['metric'],
          period: row.period,
          latest_value: row.latest_value,
          forecast_value: row.forecast_value,
          forecast_cost: row.forecast_cost,
          range_min: row.range_min,
          range_max: row.range_max,
          range_cost_min: row.range_cost_min,
          range_cost_max: row.range_cost_max,
          score: row.score,
          level: row.level as RiskAlertRow['level'],
          reasons: row.reasons as string[] | null,
          actions: row.actions as string[] | null,
          change_detected: row.change_detected,
          outlier: row.outlier,
          mix_current_pct: row.mix_current_pct,
          mix_avg_pct: row.mix_avg_pct,
          mix_shift_pct: row.mix_shift_pct,
          status: row.status as RiskAlertRow['status'],
          created_at: row.created_at,
        })));
      }
      setLoadingAlerts(false);
    };
    loadAlerts();
  }, []);

  useEffect(() => {
    const loadRuns = async () => {
      setLoadingRuns(true);
      const { data, error } = await supabase
        .from('risk_runs')
        .select('id, started_at, finished_at, alerts_created, alerts_updated, alerts_skipped, errors')
        .order('started_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setRiskRuns(data.map((row) => ({
          id: row.id,
          started_at: row.started_at,
          finished_at: row.finished_at ?? null,
          alerts_created: row.alerts_created ?? 0,
          alerts_updated: row.alerts_updated ?? 0,
          alerts_skipped: row.alerts_skipped ?? 0,
          errors: row.errors as string[] | null,
        })));
      }
      setLoadingRuns(false);
    };
    loadRuns();
  }, []);

  const riskData = useMemo<RiskRecord[]>(() => {
    const humanRows = rows.map((row) => {
      const bottles = row.formato === 'botella' ? row.cantidad : 0;
      const bidons = row.formato === 'bidon_20l' ? row.cantidad : 0;
      const liters = (bottles * 0.5) + (bidons * 20);
      return {
        period: row.period,
        center: `Agua humana · ${row.centro_trabajo}`,
        metric: 'water_human',
        value: liters,
        cost: Number(row.total_costo ?? 0),
        bottles,
        bidons,
      } satisfies RiskRecord;
    });

    const energyRows = electricRows.map((row) => ({
      period: row.period,
      center: `Energia · ${row.centro_trabajo}`,
      metric: 'energy',
      value: Number(row.consumo_kwh),
      cost: Number(row.costo_total ?? 0),
    })) satisfies RiskRecord[];

    const waterMeter = waterMeterRows.map((row) => ({
      period: row.period,
      center: 'Agua medidor · General',
      metric: 'water_meter',
      value: Number(row.consumo_m3),
      cost: Number(row.costo ?? 0),
    })) satisfies RiskRecord[];

    return [...humanRows, ...energyRows, ...waterMeter];
  }, [rows, electricRows, waterMeterRows]);

  const { signals, topRisks } = useRiskSignals(riskData);
  const alertSignals = useMemo(() => {
    if (alertRows.length === 0) return [];
    return alertRows.map((row) => ({
      center: row.center,
      metric: row.metric,
      label: METRIC_LABELS[row.metric].label,
      unit: METRIC_LABELS[row.metric].unit,
      level: row.level,
      reasons: row.reasons ?? [],
      actions: row.actions ?? [],
      forecast30d: Number(row.forecast_value ?? 0),
      forecastCost30d: Number(row.forecast_cost ?? 0),
      forecastRange: { min: Number(row.range_min ?? 0), max: Number(row.range_max ?? 0) },
      forecastCostRange: { min: Number(row.range_cost_min ?? 0), max: Number(row.range_cost_max ?? 0) },
      outlier: row.outlier,
      changeDetected: row.change_detected,
      mixShiftPct: row.mix_shift_pct,
      mixCurrentPct: row.mix_current_pct,
      mixAvgPct: row.mix_avg_pct,
      latestValue: Number(row.latest_value ?? 0),
      score: Number(row.score ?? 0),
      scoreRaw: Number(row.score ?? 0),
    }));
  }, [alertRows]);

  const activeSignals = alertSignals.length > 0 ? alertSignals : signals;
  const activeRisks = activeSignals.filter((signal) => signal.level !== 'low');
  const topRiskSignals = alertSignals.length > 0
    ? [...activeSignals].filter((signal) => signal.level !== 'low').slice(0, 3)
    : topRisks;

  const heatmapRows = useMemo(() => {
    const grouped = activeSignals.reduce<Record<string, typeof activeSignals>>((acc, signal) => {
      if (!acc[signal.center]) acc[signal.center] = [];
      acc[signal.center].push(signal);
      return acc;
    }, {});
    return Object.entries(grouped).map(([center, centerSignals]) => ({
      center,
      metrics: centerSignals.reduce<Record<string, (typeof activeSignals)[number]>>((acc, signal) => {
        acc[signal.metric] = signal;
        return acc;
      }, {}),
    }));
  }, [activeSignals]);

  const actionItems = useMemo(() => {
    if (alertRows.length > 0) {
      return [...alertRows]
        .filter((row) => row.level !== 'low')
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
        .map((row) => ({
          id: row.id,
          center: row.center,
          metricLabel: METRIC_LABELS[row.metric].label,
          level: row.level,
          actions: row.actions ?? [],
          reasons: row.reasons ?? [],
          status: row.status,
        }));
    }

    return [...activeRisks]
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((signal) => ({
        id: null,
        center: signal.center,
        metricLabel: signal.label,
        level: signal.level,
        actions: signal.actions,
        reasons: signal.reasons,
        status: null,
      }));
  }, [activeRisks, alertRows]);

  const formatStatus = (status: RiskAlertRow['status']) => {
    if (status === 'acknowledged') return 'ack';
    return status;
  };

  const handleStatusUpdate = async (alertId: string, status: RiskAlertRow['status']) => {
    setUpdatingAlertId(alertId);
    const { error } = await supabase
      .from('risk_alerts')
      .update({ status })
      .eq('id', alertId);

    if (error) {
      toast({
        title: 'No se pudo actualizar la alerta',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setAlertRows((prev) => prev.map((row) => (
        row.id === alertId ? { ...row, status } : row
      )));
      toast({
        title: 'Alerta actualizada',
        description: `Estado marcado como ${formatStatus(status)}.`,
      });
    }
    setUpdatingAlertId(null);
  };

  const invalidStatusCount = useMemo(() => {
    return alertRows.filter((row) => !ALLOWED_ALERT_STATUSES.includes(row.status)).length;
  }, [alertRows]);

  const filteredHistoryRows = useMemo(() => {
    return alertRows.filter((row) => {
      if (historyStatusFilter !== 'all' && row.status !== historyStatusFilter) return false;
      if (historyMetricFilter !== 'all' && row.metric !== historyMetricFilter) return false;
      if (historyCenterFilter.trim().length > 0) {
        const query = historyCenterFilter.toLowerCase();
        if (!row.center.toLowerCase().includes(query)) return false;
      }
      return true;
    });
  }, [alertRows, historyCenterFilter, historyMetricFilter, historyStatusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredHistoryRows.length / pageSize));
  const pagedHistoryRows = useMemo(() => {
    const start = (historyPage - 1) * pageSize;
    return filteredHistoryRows.slice(start, start + pageSize);
  }, [filteredHistoryRows, historyPage, pageSize]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historyCenterFilter, historyMetricFilter, historyStatusFilter]);

  if (loading || loadingAlerts || loadingRuns) {
    return (
      <div className="stat-card flex items-center justify-center py-8">
        <Activity className="w-4 h-4 text-muted-foreground mr-2" />
        <span className="text-muted-foreground">Cargando señales de riesgo...</span>
      </div>
    );
  }

  return (
    <div className="stat-card">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Capa predictiva (solo lectura)</h3>
          <p className="text-sm text-muted-foreground">
            Tendencias, forecast 30 días y anomalías por centro.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
            alertSignals.length > 0
              ? 'bg-success/10 text-success'
              : 'bg-muted text-muted-foreground'
          }`}>
            {alertSignals.length > 0 ? 'Risk alerts: activo' : 'Risk alerts: local'}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
            invalidStatusCount > 0
              ? 'bg-destructive/10 text-destructive'
              : 'bg-success/10 text-success'
          }`}>
            Estados válidos: {invalidStatusCount === 0 ? 'OK' : `${invalidStatusCount} con error`}
          </span>
          <span>
            Centros con riesgo: <span className="font-medium text-foreground">{activeRisks.length}</span>
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {topRiskSignals.length > 0 ? (
          topRiskSignals.map((risk, index) => (
            <div key={risk.center} className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{risk.center}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  risk.level === 'high'
                    ? 'bg-destructive/10 text-destructive'
                    : risk.level === 'medium'
                      ? 'bg-warning/10 text-warning'
                      : 'bg-success/10 text-success'
                }`}>
                  {risk.level === 'high' ? 'Riesgo alto' : risk.level === 'medium' ? 'Riesgo medio' : 'Riesgo bajo'} · {risk.score}/10
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-border px-2 py-0.5">Top {index + 1}</span>
                <span className="rounded-full border border-border px-2 py-0.5">{risk.label}</span>
                <span className="rounded-full border border-border px-2 py-0.5">Score {risk.score}/10</span>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {risk.reasons.join(' · ')}
              </div>
              {risk.mixCurrentPct !== null && risk.mixAvgPct !== null && (
                <div className="mt-1 text-xs text-muted-foreground">
                  Mix botellas: <span className="font-medium text-foreground">{risk.mixCurrentPct.toFixed(1)}%</span>
                  <span className="text-muted-foreground"> (promedio {risk.mixAvgPct.toFixed(1)}%)</span>
                  <span className="text-muted-foreground"> · Bidones {Math.max(0, 100 - risk.mixCurrentPct).toFixed(1)}%</span>
                  <span className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    Math.abs(risk.mixCurrentPct - (risk.mixAvgPct ?? 0)) >= 10
                      ? 'bg-warning/10 text-warning'
                      : 'bg-success/10 text-success'
                  }`}>
                    {Math.abs(risk.mixCurrentPct - (risk.mixAvgPct ?? 0)) >= 10 ? 'Mix cambiando' : 'Mix estable'}
                  </span>
                </div>
              )}
              <div className="mt-2 text-xs text-muted-foreground">
                Forecast 30d: <span className="font-medium text-foreground">
                  {Math.round(risk.forecast30d).toLocaleString()} {risk.unit}
                </span>
                <span className="text-muted-foreground"> ({Math.round(risk.forecastRange.min).toLocaleString()}–{Math.round(risk.forecastRange.max).toLocaleString()} {risk.unit})</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Forecast costo: <span className="font-medium text-foreground">${Math.round(risk.forecastCost30d).toLocaleString()}</span>
                <span className="text-muted-foreground"> (${Math.round(risk.forecastCostRange.min).toLocaleString()}–${Math.round(risk.forecastCostRange.max).toLocaleString()})</span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <TrendingUp className="w-3.5 h-3.5" />
                {risk.actions.join(' · ')}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            Sin riesgos relevantes detectados en el período actual.
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">Mapa de calor por centro y métrica</h4>
              <p className="text-xs text-muted-foreground">
                Vista rápida de riesgo por recurso. Pasa el mouse para detalles.
              </p>
            </div>
            <Grid2X2 className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-3 font-medium">Centro</th>
                  <th className="text-center py-2 px-2 font-medium">Agua humana</th>
                  <th className="text-center py-2 px-2 font-medium">Agua medidor</th>
                  <th className="text-center py-2 px-2 font-medium">Energia</th>
                </tr>
              </thead>
              <tbody>
                {heatmapRows.length > 0 ? (
                  heatmapRows.map((row) => (
                    <tr key={row.center} className="border-b border-border/60 last:border-b-0">
                      <td className="py-2 pr-3 text-left font-medium">{row.center}</td>
                      {(['water_human', 'water_meter', 'energy'] as const).map((metric) => {
                        const signal = row.metrics[metric];
                        const level = signal?.level ?? 'low';
                        const cellClass = level === 'high'
                          ? 'bg-destructive/15 text-destructive'
                          : level === 'medium'
                            ? 'bg-warning/15 text-warning'
                            : 'bg-success/10 text-success';
                        return (
                          <td key={metric} className="py-2 px-2 text-center">
                            <div className={`rounded-md px-2 py-1 ${cellClass}`}>
                              {signal ? `${signal.score}/10` : '--'}
                            </div>
                            {signal && (
                              <div className="mt-1 text-[10px] text-muted-foreground">
                                {Math.round(signal.latestValue).toLocaleString()} {signal.unit}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground">
                      Sin datos suficientes para mapa de calor.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h5 className="font-semibold">Historial reciente</h5>
              <span className="text-[11px] text-muted-foreground">
                {filteredHistoryRows.length} alertas · Página {historyPage} de {totalPages}
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label htmlFor="alert-center-filter" className="text-[11px] font-medium text-muted-foreground">
                  Centro
                </label>
                <Input
                  id="alert-center-filter"
                  value={historyCenterFilter}
                  onChange={(event) => setHistoryCenterFilter(event.target.value)}
                  placeholder="Buscar centro..."
                  className="mt-1 h-8 text-xs"
                />
              </div>
              <div className="w-full sm:w-44">
                <label htmlFor="alert-metric-filter" className="text-[11px] font-medium text-muted-foreground">
                  Metrica
                </label>
                <Select
                  value={historyMetricFilter}
                  onValueChange={(value) => setHistoryMetricFilter(value as typeof historyMetricFilter)}
                >
                  <SelectTrigger id="alert-metric-filter" className="mt-1 h-8 text-xs">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="water_human">Agua humana</SelectItem>
                    <SelectItem value="water_meter">Agua medidor</SelectItem>
                    <SelectItem value="energy">Energia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-40">
                <label htmlFor="alert-status-filter" className="text-[11px] font-medium text-muted-foreground">
                  Estado
                </label>
                <Select
                  value={historyStatusFilter}
                  onValueChange={(value) => setHistoryStatusFilter(value as typeof historyStatusFilter)}
                >
                  <SelectTrigger id="alert-status-filter" className="mt-1 h-8 text-xs">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="open">open</SelectItem>
                    <SelectItem value="acknowledged">ack</SelectItem>
                    <SelectItem value="resolved">resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-3 font-medium">Centro</th>
                    <th className="text-left py-2 px-3 font-medium">Metrica</th>
                    <th className="text-right py-2 px-3 font-medium">Score</th>
                    <th className="text-left py-2 px-3 font-medium">Estado</th>
                    <th className="text-right py-2 pl-3 font-medium">Generado</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedHistoryRows.length > 0 ? (
                    pagedHistoryRows.map((row) => (
                      <tr key={row.id} className="border-b border-border/60 last:border-b-0">
                        <td className="py-2 pr-3 text-left font-medium">{row.center}</td>
                        <td className="py-2 px-3 text-left">{METRIC_LABELS[row.metric].label}</td>
                        <td className="py-2 px-3 text-right">{row.score}/10</td>
                        <td className="py-2 px-3 text-left">{formatStatus(row.status)}</td>
                        <td className="py-2 pl-3 text-right">
                          {new Date(row.created_at).toLocaleString('es-CL', {
                            timeZone: 'America/Santiago',
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: 'short',
                          })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted-foreground">
                        Sin historial de alertas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="mt-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          setHistoryPage((prev) => Math.max(1, prev - 1));
                        }}
                        aria-disabled={historyPage === 1}
                        className={historyPage === 1 ? 'pointer-events-none opacity-50' : undefined}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, idx) => {
                      const page = idx + 1;
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            href="#"
                            isActive={page === historyPage}
                            onClick={(event) => {
                              event.preventDefault();
                              setHistoryPage(page);
                            }}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          setHistoryPage((prev) => Math.min(totalPages, prev + 1));
                        }}
                        aria-disabled={historyPage === totalPages}
                        className={historyPage === totalPages ? 'pointer-events-none opacity-50' : undefined}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <h4 className="font-semibold">Panel de acciones</h4>
          <p className="text-xs text-muted-foreground">
            Sugerencias priorizadas para reducir riesgo operativo.
          </p>
          <div className="mt-4 space-y-3 text-sm">
            {actionItems.length > 0 ? (
              actionItems.map((item) => (
                <div key={`${item.center}-${item.metricLabel}`} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{item.center}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      item.level === 'high'
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-warning/10 text-warning'
                    }`}>
                      {item.metricLabel}
                    </span>
                  </div>
                  {item.status && (
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      Estado: <span className="font-medium text-foreground">{formatStatus(item.status)}</span>
                    </div>
                  )}
                  <div className="mt-2 text-xs text-muted-foreground">
                    {item.reasons.slice(0, 2).join(' · ')}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    {item.actions.slice(0, 3).map((action) => (
                      <span key={action} className="rounded-full border border-border px-2 py-0.5">
                        {action}
                      </span>
                    ))}
                  </div>
                  {item.id && item.status !== 'resolved' && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={updatingAlertId === item.id || item.status === 'acknowledged'}
                        onClick={() => handleStatusUpdate(item.id as string, 'acknowledged')}
                      >
                        {updatingAlertId === item.id ? 'Actualizando...' : 'Marcar ack'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={updatingAlertId === item.id}
                        onClick={() => handleStatusUpdate(item.id as string, 'resolved')}
                      >
                        Resolver
                      </Button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
                <Activity className="w-4 h-4 text-muted-foreground mt-0.5" />
                <span className="text-muted-foreground">Sin alertas activas.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold">Monitoreo de runs</h4>
            <p className="text-xs text-muted-foreground">Últimas ejecuciones del cron.</p>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {riskRuns.length} runs
          </span>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-3 font-medium">Inicio</th>
                <th className="text-right py-2 px-3 font-medium">Creadas</th>
                <th className="text-right py-2 px-3 font-medium">Actualizadas</th>
                <th className="text-right py-2 px-3 font-medium">Omitidas</th>
                <th className="text-left py-2 px-3 font-medium">Errores</th>
              </tr>
            </thead>
            <tbody>
              {riskRuns.length > 0 ? (
                riskRuns.map((run) => (
                  <tr key={run.id} className="border-b border-border/60 last:border-b-0">
                    <td className="py-2 pr-3">
                      {new Date(run.started_at).toLocaleString('es-CL', {
                        timeZone: 'America/Santiago',
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: 'short',
                      })}
                    </td>
                    <td className="py-2 px-3 text-right">{run.alerts_created}</td>
                    <td className="py-2 px-3 text-right">{run.alerts_updated}</td>
                    <td className="py-2 px-3 text-right">{run.alerts_skipped}</td>
                    <td className="py-2 px-3 text-left text-muted-foreground">
                      {(run.errors ?? []).length > 0 ? 'Con errores' : 'OK'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted-foreground">
                    Sin runs registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
