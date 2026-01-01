import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Activity, TrendingUp, Grid2X2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useRiskSignals, type RiskRecord } from '@/hooks/useRiskSignals';

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

export default function RiskPanel() {
  const [rows, setRows] = useState<WaterRow[]>([]);
  const [electricRows, setElectricRows] = useState<ElectricRow[]>([]);
  const [waterMeterRows, setWaterMeterRows] = useState<WaterMeterRow[]>([]);
  const [loading, setLoading] = useState(true);

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
  const activeRisks = signals.filter((signal) => signal.level !== 'low');

  const heatmapRows = useMemo(() => {
    const grouped = signals.reduce<Record<string, typeof signals>>((acc, signal) => {
      if (!acc[signal.center]) acc[signal.center] = [];
      acc[signal.center].push(signal);
      return acc;
    }, {});
    return Object.entries(grouped).map(([center, centerSignals]) => ({
      center,
      metrics: centerSignals.reduce<Record<string, (typeof signals)[number]>>((acc, signal) => {
        acc[signal.metric] = signal;
        return acc;
      }, {}),
    }));
  }, [signals]);

  const actionItems = useMemo(() => {
    return [...activeRisks]
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((signal) => ({
        center: signal.center,
        metricLabel: signal.label,
        level: signal.level,
        actions: signal.actions,
        reasons: signal.reasons,
      }));
  }, [activeRisks]);

  if (loading) {
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
        <div className="text-xs text-muted-foreground">
          Centros con riesgo: <span className="font-medium text-foreground">{activeRisks.length}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {topRisks.length > 0 ? (
          topRisks.map((risk, index) => (
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
    </div>
  );
}
