import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, TrendingUp, Droplets } from 'lucide-react';
import { LoaderHourglass } from '@/components/ui/loader-hourglass';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { StatCard } from '@/components/ui/stat-card';
import { ChartCard } from '@/components/ui/chart-card';
import { ImpactSummary } from '@/components/ui/impact-summary';
import { EmptyState } from '@/components/ui/empty-state';
import { ProgressKpi } from '@/components/ui/progress-kpi';
import { Badge } from '@/components/ui/badge';
import { NextActionPanel } from '@/components/ui/next-action-panel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRiskSignals, type RiskRecord } from '@/hooks/useRiskSignals';
import RiskPanel from '@/components/admin/RiskPanel';
import { ExportPDFButton } from '@/components/export/ExportPDFButton';
import { calculateImpactFromM3 } from '@/lib/impact';
import { buildWaterReportHtml } from '@/lib/templates/water-report-html';
import { exportWaterReport } from '@/lib/pdf-export';

interface PeriodSummary {
  period: string;
  label: string;
  m3: number;
  cost: number;
}

const PRIMARY_COLOR = 'hsl(210, 70%, 45%)';
const SECONDARY_COLOR = 'hsl(152, 55%, 42%)';
const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: 'none',
  borderRadius: '12px',
  boxShadow: '0 10px 40px -10px rgba(0,0,0,0.3)',
  padding: '12px 16px',
};
const MOTION_EASE = [0.25, 0.46, 0.45, 0.94] as const;
const MOTION_FAST = 0.3;
const MOTION_MED = 0.5;

const formatPeriod = (period: string) => {
  const [year, month] = period.split('-');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${months[parseInt(month, 10) - 1]} ${year}`;
};

const weightedForecast = (values: number[]) => {
  if (values.length === 0) return 0;
  const weights = [0.5, 0.3, 0.2];
  const recent = values.slice(-3).reverse();
  const weighted = recent.map((value, idx) => value * (weights[idx] ?? 0.2));
  const totalWeight = weights.slice(0, recent.length).reduce((sum, w) => sum + w, 0);
  return totalWeight > 0 ? weighted.reduce((sum, v) => sum + v, 0) / totalWeight : 0;
};

export default function WaterConsumptionHistory() {
  const { user } = useAuth();
  const [range, setRange] = useState<'6' | '12' | 'all'>('12');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<{ period: string; consumo_m3: number; costo: number | null }[]>([]);
  const [humanCosts, setHumanCosts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      const [readingsRes, humanRes] = await Promise.all([
        supabase
          .from('water_readings')
          .select('period, consumo_m3, costo')
          .order('period', { ascending: true }),
        supabase
          .from('human_water_consumption')
          .select('period, total_costo'),
      ]);

      setRows((readingsRes.data || []).map((r) => ({
        period: r.period,
        consumo_m3: Number(r.consumo_m3),
        costo: r.costo === null ? null : Number(r.costo),
      })));

      const costByPeriod = (humanRes.data || []).reduce<Record<string, number>>((acc, row) => {
        const period = row.period;
        const cost = Number(row.total_costo ?? 0);
        acc[period] = (acc[period] ?? 0) + cost;
        return acc;
      }, {});
      setHumanCosts(costByPeriod);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const summaries = useMemo<PeriodSummary[]>(() => {
    const periods = Array.from(new Set(rows.map((r) => r.period))).sort();
    return periods.map((period) => {
      const periodRows = rows.filter((r) => r.period === period);
      const m3 = periodRows.reduce((sum, r) => sum + Number(r.consumo_m3), 0);
      const cost = periodRows.reduce((sum, r) => sum + Number(r.costo ?? 0), 0) + (humanCosts[period] ?? 0);
      return { period, label: formatPeriod(period), m3, cost };
    });
  }, [rows, humanCosts]);

  const filteredSummaries = useMemo(() => {
    if (range === 'all') return summaries;
    const limit = Number(range);
    return summaries.slice(-limit);
  }, [summaries, range]);

  const forecastM3 = weightedForecast(filteredSummaries.map((s) => s.m3));
  const forecastCost = weightedForecast(filteredSummaries.map((s) => s.cost));
  const averageM3 = useMemo(() => {
    const values = filteredSummaries.map((s) => s.m3);
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }, [filteredSummaries]);
  const isForecastRisk = forecastM3 > averageM3;
  const m3StdDev = useMemo(() => {
    const values = filteredSummaries.map((s) => s.m3);
    if (values.length < 2) return 0;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance);
  }, [filteredSummaries]);
  const costStdDev = useMemo(() => {
    const values = filteredSummaries.map((s) => s.cost);
    if (values.length < 2) return 0;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance);
  }, [filteredSummaries]);
  const { signals: riskSignals } = useRiskSignals(
    rows.map((row) => ({
      period: row.period,
      center: 'General',
      metric: 'water_meter',
      value: Number(row.consumo_m3),
      cost: Number(row.costo ?? 0),
    })) satisfies RiskRecord[],
  );

  const filteredRiskSignals = riskSignals.filter((signal) => signal.level !== 'low');

  const latest = filteredSummaries[filteredSummaries.length - 1];
  const previous = filteredSummaries[filteredSummaries.length - 2];
  const variation = previous && previous.m3 > 0
    ? ((latest?.m3 ?? 0) - previous.m3) / previous.m3
    : 0;

  const totalM3 = filteredSummaries.reduce((sum, s) => sum + s.m3, 0);
  const totalCost = filteredSummaries.reduce((sum, s) => sum + s.cost, 0);
  const impactMetrics = useMemo(() => calculateImpactFromM3(totalM3), [totalM3]);
  const targetM3 = averageM3 > 0 ? averageM3 * 0.9 : 0;
  const progressM3 = targetM3 > 0 ? (totalM3 / targetM3) * 100 : 0;
  const targetCost = averageM3 > 0 ? averageM3 * 0.9 * (totalCost / Math.max(totalM3, 1)) : 0;
  const progressCost = targetCost > 0 ? (totalCost / targetCost) * 100 : 0;

  const alerts = useMemo(() => {
    const items: string[] = [];
    if (latest && previous && latest.m3 > previous.m3 * 1.2) {
      items.push('Aumento > 20% vs período anterior. Revisar fugas o cambios operacionales.');
    }
    if (latest && latest.m3 > 0 && latest.cost === 0) {
      items.push('Costo en $0 con consumo > 0. Verificar tarifa o carga de datos.');
    }
    return items;
  }, [latest, previous]);
  const nextActions = useMemo(() => {
    if (alerts.length > 0) return alerts.slice(0, 3);
    return [
      'Revisar centros con mayor variación de consumo en el rango actual.',
      'Validar lecturas en períodos con cambios atípicos.',
      'Programar una revisión preventiva de fugas y equipos.',
    ];
  }, [alerts]);
  const eventNote = useMemo(() => {
    if (!latest || !previous) return null;
    const pct = variation * 100;
    if (Math.abs(pct) < 20) return null;
    return {
      label: latest.label,
      text: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}% vs ${previous.label}`,
      tone: pct > 0 ? 'warning' : 'success',
    };
  }, [latest, previous, variation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoaderHourglass label="Cargando histórico de agua" />
      </div>
    );
  }

  if (filteredSummaries.length === 0) {
    return (
      <EmptyState
        title="Sin datos históricos"
        description="No hay registros suficientes para mostrar tendencias. Sincroniza o amplía el rango."
        icon={<Droplets className="h-10 w-10 text-muted-foreground" />}
      />
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Histórico por Período</h3>
          <p className="text-sm text-muted-foreground">
            Resumen consolidado de consumo hídrico por período.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <ExportPDFButton
            onExport={async () => {
              const latestPeriod = filteredSummaries[filteredSummaries.length - 1]?.label ?? 'Sin datos';

              const apiUrl = import.meta.env.VITE_PDF_API_URL as string | undefined;
              const apiKey = import.meta.env.VITE_PDF_API_KEY as string | undefined;

              if (!apiUrl) {
                // Fallback: usar flujo jsPDF existente mientras no haya backend HTML→PDF
                const logoResponse = await fetch('/images/logo.png');
                const logoBlob = await logoResponse.blob();
                const logoDataUrl = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(reader.result as string);
                  reader.onerror = () => reject(reader.error);
                  reader.readAsDataURL(logoBlob);
                });

                exportWaterReport({
                  summaries: filteredSummaries,
                  totalM3,
                  totalCost,
                  variation,
                  forecastM3,
                  forecastCost,
                  alerts,
                  dateRange:
                    range === 'all' ? 'Todo el histórico' : `Últimos ${range} períodos`,
                  logoDataUrl,
                });
                return;
              }

              const html = buildWaterReportHtml({
                periodLabel: latestPeriod,
                monthLabel: latestPeriod.split(' ')[0] ?? latestPeriod,
                yearLabel: latestPeriod.split(' ')[1] ?? '',
                totalM3,
                totalCost,
                variation: variation * 100,
                impact: impactMetrics,
              });

              const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
                },
                body: JSON.stringify({ html }),
              });

              if (!response.ok) {
                console.error('Error al generar PDF', await response.text());
                return;
              }

              const blob = await response.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'reporte-agua.pdf';
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
            }}
            label="Exportar PDF"
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="water-history-range" className="text-xs font-medium text-muted-foreground">
              Rango
            </label>
            <Select value={range} onValueChange={(value) => setRange(value as '6' | '12' | 'all')}>
              <SelectTrigger id="water-history-range" className="w-full sm:w-48">
                <SelectValue placeholder="Selecciona rango" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">Últimos 6 períodos</SelectItem>
                <SelectItem value="12">Últimos 12 períodos</SelectItem>
                <SelectItem value="all">Todo el histórico</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Consumo total (m³)"
          value={totalM3.toLocaleString()}
          icon={<Droplets className="w-5 h-5" />}
          subtitle="Suma del rango seleccionado"
          delay={0}
          variant="primary"
        />
        <StatCard
          title="Costo total"
          value={`$${totalCost.toLocaleString()}`}
          icon={<TrendingUp className="w-5 h-5" />}
          subtitle={latest ? `Último período: ${latest.label}` : 'Sin datos'}
          delay={0.1}
          variant="minimal"
        />
        <StatCard
          title="Variación último período"
          value={`${(variation * 100).toFixed(1)}%`}
          icon={<Activity className="w-5 h-5" />}
          subtitle={previous ? `vs. ${previous.label}` : 'Sin referencia'}
          delay={0.2}
          variant="minimal"
        />
      </div>

      <ImpactSummary metrics={impactMetrics} />

      <div className="stat-card mb-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold">Metas y progreso</h3>
          <p className="text-sm text-muted-foreground">
            Seguimiento vs objetivo de reducción sobre el promedio histórico.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ProgressKpi
            title="Meta de consumo (m³)"
            value={`${Math.round(totalM3).toLocaleString()} / ${Math.round(targetM3).toLocaleString()} m³`}
            progress={progressM3}
            helper="Objetivo: 10% bajo el promedio histórico."
            tone={progressM3 <= 100 ? 'success' : 'warning'}
          />
          <ProgressKpi
            title="Meta de costo"
            value={`$${Math.round(totalCost).toLocaleString()} / $${Math.round(targetCost).toLocaleString()}`}
            progress={progressCost}
            helper="Costo objetivo ajustado al consumo promedio."
            tone={progressCost <= 100 ? 'success' : 'warning'}
          />
        </div>
      </div>

      <NextActionPanel items={nextActions} className="mb-6" />

      <div className="mb-6">
        <RiskPanel />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <StatCard
          title="Forecast 30d (m³)"
          value={Math.round(forecastM3).toLocaleString()}
          icon={<Droplets className="w-5 h-5" />}
          subtitle={`Rango ${Math.round(Math.max(0, forecastM3 - m3StdDev)).toLocaleString()}–${Math.round(forecastM3 + m3StdDev).toLocaleString()} m³`}
          badge={{
            text: isForecastRisk ? 'Atención: tendencia al alza' : 'Estable',
            variant: isForecastRisk ? 'warning' : 'success',
          }}
          delay={0}
        />
        <StatCard
          title="Forecast 30d (Costo)"
          value={`$${Math.round(forecastCost).toLocaleString()}`}
          icon={<TrendingUp className="w-5 h-5" />}
          subtitle={`Rango $${Math.round(Math.max(0, forecastCost - costStdDev)).toLocaleString()}–$${Math.round(forecastCost + costStdDev).toLocaleString()}`}
          delay={0.1}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: MOTION_MED, delay: 0.2, ease: MOTION_EASE }}
          className="relative overflow-hidden"
        >
          {/* Animated accent line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: MOTION_MED, delay: 0.35, ease: MOTION_EASE }}
            className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500/60 via-cyan-400/40 to-transparent origin-left"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <ChartCard title="Consumo por período" subtitle="Evolución del consumo hídrico.">
            {eventNote && (
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>Evento destacado: {eventNote.label}</span>
                <Badge variant="outline" className={eventNote.tone === 'warning'
                  ? 'bg-amber-500/10 text-amber-700 border-amber-200'
                  : 'bg-emerald-500/10 text-emerald-700 border-emerald-200'
                }>
                  {eventNote.text}
                </Badge>
              </div>
            )}
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: MOTION_MED, delay: 0.3, ease: MOTION_EASE }}
              className="h-72"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredSummaries}>
                  <defs>
                    <linearGradient id="waterM3Gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                      <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
                  <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    cursor={{ fill: 'hsl(var(--primary) / 0.05)' }}
                    formatter={(value: number) => `${value.toLocaleString()} m³`}
                  />
                  <Legend wrapperStyle={{ paddingTop: '16px' }} iconType="circle" iconSize={8} />
                  <Bar 
                    dataKey="m3" 
                    name="Consumo m³" 
                    fill="url(#waterM3Gradient)" 
                    radius={[6, 6, 0, 0]}
                    isAnimationActive={true}
                    animationBegin={400}
                    animationDuration={1200}
                    animationEasing="ease-out"
                  />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </ChartCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: MOTION_MED, delay: 0.25, ease: MOTION_EASE }}
          className="relative overflow-hidden"
        >
          {/* Animated accent line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: MOTION_MED, delay: 0.4, ease: MOTION_EASE }}
            className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500/60 via-teal-400/40 to-transparent origin-left"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          
          <ChartCard title="Costo por período" subtitle="Evolución del gasto asociado al consumo.">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: MOTION_MED, delay: 0.35, ease: MOTION_EASE }}
              className="h-72"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredSummaries}>
                  <defs>
                    <linearGradient id="waterCostGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                      <stop offset="100%" stopColor="#34d399" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
                  <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    cursor={{ fill: 'hsl(var(--primary) / 0.05)' }}
                    formatter={(value: number) => `$${value.toLocaleString()}`}
                  />
                  <Legend wrapperStyle={{ paddingTop: '16px' }} iconType="circle" iconSize={8} />
                  <Bar 
                    dataKey="cost" 
                    name="Costo total" 
                    fill="url(#waterCostGradient)" 
                    radius={[6, 6, 0, 0]}
                    isAnimationActive={true}
                    animationBegin={500}
                    animationDuration={1200}
                    animationEasing="ease-out"
                  />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </ChartCard>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: MOTION_MED, delay: 0.3, ease: MOTION_EASE }}
          className="lg:col-span-2 stat-card relative overflow-hidden"
        >
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/50 via-blue-400/30 to-transparent origin-left"
          />
          <h4 className="font-semibold mb-1">Detalle por período</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Base para análisis y exportación.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2 pr-3 font-medium">Período</th>
                  <th className="text-right py-2 px-3 font-medium">m³</th>
                  <th className="text-right py-2 px-3 font-medium">Costo</th>
                </tr>
              </thead>
              <tbody>
                {filteredSummaries.map((s, index) => (
                <motion.tr 
                  key={s.period} 
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: MOTION_FAST, delay: 0.35 + index * 0.02, ease: MOTION_EASE }}
                  className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                >
                    <td className="py-2 pr-3">{s.label}</td>
                    <td className="py-2 px-3 text-right">{s.m3.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right">${s.cost.toLocaleString()}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: MOTION_MED, delay: 0.35, ease: MOTION_EASE }}
          className="stat-card relative overflow-hidden"
        >
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.65 }}
            className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-warning/60 via-amber-400/40 to-transparent origin-left"
          />
          <h4 className="font-semibold mb-1">Acciones recomendadas</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Sugerencias para prevención de riesgos.
          </p>
          <div className="space-y-3 text-sm">
            {alerts.length > 0 ? (
              alerts.map((alert, index) => (
              <motion.div 
                key={index} 
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: MOTION_FAST, delay: 0.45 + index * 0.08, ease: MOTION_EASE }}
                whileHover={{ scale: 1.02, x: 4 }}
                className="flex items-start gap-3 rounded-lg border border-warning/30 bg-gradient-to-r from-warning/10 to-amber-500/5 p-3 cursor-default"
              >
                  <motion.div
                    animate={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
                  >
                    <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
                  </motion.div>
                  <span>{alert}</span>
                </motion.div>
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3"
              >
                <Activity className="w-4 h-4 text-muted-foreground mt-0.5" />
                <span>Sin alertas relevantes en el rango seleccionado.</span>
              </motion.div>
            )}
            <motion.div 
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: MOTION_FAST, delay: 0.5, ease: MOTION_EASE }}
              className="flex items-start gap-3 rounded-lg border border-border bg-background p-3"
            >
              <TrendingUp className="w-4 h-4 text-muted-foreground mt-0.5" />
              <span>Priorizar inspecciones cuando la tendencia supere el promedio histórico.</span>
            </motion.div>
          </div>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="stat-card mt-6 relative overflow-hidden"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.7 }}
          className="absolute inset-0 bg-gradient-to-br from-destructive/[0.02] via-transparent to-warning/[0.02] pointer-events-none"
        />
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="absolute top-0 left-0 w-24 h-1 bg-gradient-to-r from-blue-500/50 to-transparent rounded-full"
        />
        
        <h4 className="font-semibold mb-1">Señales de riesgo</h4>
        <p className="text-sm text-muted-foreground mb-4">
          Detección temprana basada en tendencia de 3 períodos.
        </p>
        <div className="space-y-3 text-sm">
          {filteredRiskSignals.length > 0 ? (
            filteredRiskSignals.map((signal, index) => (
              <motion.div 
                key={signal.center} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                whileHover={{ scale: 1.01, x: 4 }}
                className="rounded-lg border border-border p-3 cursor-default hover:border-primary/20 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{signal.center}</span>
                  <motion.span 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.7 + index * 0.1 }}
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    signal.level === 'high'
                      ? 'bg-gradient-to-r from-destructive/15 to-red-500/10 text-destructive border border-destructive/20'
                      : 'bg-gradient-to-r from-warning/15 to-amber-500/10 text-warning border border-warning/20'
                  }`}>
                    {signal.level === 'high' ? 'Riesgo alto' : 'Riesgo medio'}
                  </motion.span>
                </div>
                <div className="mt-2 text-muted-foreground">
                  {signal.reasons.join(' · ')}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Forecast 30d: <span className="font-medium text-foreground">
                    {Math.round(signal.forecast30d).toLocaleString()} {signal.unit}
                  </span>
                  <span className="text-muted-foreground"> ({Math.round(signal.forecastRange.min).toLocaleString()}–{Math.round(signal.forecastRange.max).toLocaleString()} {signal.unit})</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Forecast costo: <span className="font-medium text-foreground">${Math.round(signal.forecastCost30d).toLocaleString()}</span>
                  <span className="text-muted-foreground"> (${Math.round(signal.forecastCostRange.min).toLocaleString()}–${Math.round(signal.forecastCostRange.max).toLocaleString()})</span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {signal.actions.join(' · ')}
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3"
            >
              <Activity className="w-4 h-4 text-muted-foreground mt-0.5" />
              <span>Sin señales de riesgo relevantes en el rango seleccionado.</span>
            </motion.div>
          )}
        </div>
      </motion.div>
    </>
  );
}
