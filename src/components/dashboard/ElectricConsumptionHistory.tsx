import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, TrendingUp, Zap } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useElectricMeters } from '@/hooks/useElectricMeters';
import { useRiskSignals } from '@/hooks/useRiskSignals';

interface PeriodSummary {
  period: string;
  label: string;
  kwh: number;
  cost: number;
  medidores: number;
}

const PRIMARY_COLOR = 'hsl(210, 80%, 50%)';
const SECONDARY_COLOR = 'hsl(5, 63%, 43%)';

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

export default function ElectricConsumptionHistory() {
  const { data, loading, refetch } = useElectricMeters();
  const [range, setRange] = useState<'6' | '12' | 'all'>('12');

  // Refetch data on mount to ensure fresh data
  useEffect(() => {
    refetch();
  }, []);

  const summaries = useMemo<PeriodSummary[]>(() => {
    console.log('ElectricConsumptionHistory - raw data:', data);
    const periods = Array.from(new Set(data.map((d) => d.period))).sort();
    const result = periods.map((period) => {
      const periodRows = data.filter((d) => d.period === period);
      const medidores = new Set(periodRows.map((d) => d.medidor)).size;
      const kwh = periodRows.reduce((sum, d) => sum + Number(d.consumo_kwh || 0), 0);
      const cost = periodRows.reduce((sum, d) => sum + Number(d.costo_total || 0), 0);
      console.log(`Period ${period}: ${periodRows.length} rows, kwh=${kwh}, cost=${cost}`);
      return { period, label: formatPeriod(period), kwh, cost, medidores };
    });
    console.log('ElectricConsumptionHistory - summaries:', result);
    return result;
  }, [data]);

  const filteredSummaries = useMemo(() => {
    if (range === 'all') return summaries;
    const limit = Number(range);
    return summaries.slice(-limit);
  }, [summaries, range]);

  const forecastKwh = weightedForecast(filteredSummaries.map((s) => s.kwh));
  const forecastCost = weightedForecast(filteredSummaries.map((s) => s.cost));
  const averageKwh = useMemo(() => {
    const values = filteredSummaries.map((s) => s.kwh);
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }, [filteredSummaries]);
  const isForecastRisk = forecastKwh > averageKwh;
  const kwhStdDev = useMemo(() => {
    const values = filteredSummaries.map((s) => s.kwh);
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
    data.map((row) => ({
      period: row.period,
      center: row.centro_trabajo,
      liters: Number(row.consumo_kwh),
      cost: Number(row.costo_total ?? 0),
    })),
  );

  const filteredRiskSignals = riskSignals.filter((signal) => signal.level !== 'low');

  const latest = filteredSummaries[filteredSummaries.length - 1];
  const previous = filteredSummaries[filteredSummaries.length - 2];
  const variation = previous && previous.kwh > 0
    ? ((latest?.kwh ?? 0) - previous.kwh) / previous.kwh
    : 0;

  const totalKwh = filteredSummaries.reduce((sum, s) => sum + s.kwh, 0);
  const totalCost = filteredSummaries.reduce((sum, s) => sum + s.cost, 0);

  const alerts = useMemo(() => {
    const items: string[] = [];
    if (latest && previous && latest.kwh > previous.kwh * 1.2) {
      items.push('Aumento > 20% vs período anterior. Revisar equipos de alto consumo.');
    }
    if (latest && latest.kwh > 0 && latest.cost === 0) {
      items.push('Costo en $0 con consumo > 0. Verificar tarifa o carga de datos.');
    }
    const medidoresZero = filteredSummaries.filter((s) => s.medidores === 0).length;
    if (medidoresZero > 0) {
      items.push('Hay períodos sin medidores activos. Validar lecturas y disponibilidad.');
    }
    return items;
  }, [filteredSummaries, latest, previous]);

  if (loading) {
    return (
      <div className="stat-card flex items-center justify-center py-12">
        <Activity className="w-6 h-6 text-muted-foreground mr-2" />
        <span className="text-muted-foreground">Cargando histórico...</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Histórico por Período</h3>
          <p className="text-sm text-muted-foreground">
            Visión consolidada para análisis de tendencias y riesgos.
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="electric-history-range" className="text-xs font-medium text-muted-foreground">
            Rango
          </label>
          <Select value={range} onValueChange={(value) => setRange(value as '6' | '12' | 'all')}>
            <SelectTrigger id="electric-history-range" className="w-full sm:w-48">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="kWh total"
          value={totalKwh.toLocaleString()}
          icon={<Zap className="w-5 h-5" />}
          subtitle="Suma del rango seleccionado"
          delay={0}
        />
        <StatCard
          title="Costo total"
          value={`$${totalCost.toLocaleString()}`}
          icon={<TrendingUp className="w-5 h-5" />}
          subtitle={latest ? `Último período: ${latest.label}` : 'Sin datos'}
          delay={0.1}
        />
        <StatCard
          title="Variación último período"
          value={`${(variation * 100).toFixed(1)}%`}
          icon={<Activity className="w-5 h-5" />}
          subtitle={previous ? `vs. ${previous.label}` : 'Sin referencia'}
          delay={0.2}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <StatCard
          title="Forecast 30d (kWh)"
          value={Math.round(forecastKwh).toLocaleString()}
          icon={<Zap className="w-5 h-5" />}
          subtitle={`Rango ${Math.round(Math.max(0, forecastKwh - kwhStdDev)).toLocaleString()}–${Math.round(forecastKwh + kwhStdDev).toLocaleString()} kWh`}
          badge={{
            text: isForecastRisk ? 'Riesgo proyectado' : 'Riesgo estable',
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
          initial={{ opacity: 0, x: -30, rotateY: -5 }}
          animate={{ opacity: 1, x: 0, rotateY: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="stat-card relative overflow-hidden group"
        >
          {/* Animated accent line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500/60 via-yellow-400/40 to-transparent origin-left"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <h4 className="font-semibold mb-1">kWh por período</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Tendencia de consumo eléctrico acumulado.
            </p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="h-72"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredSummaries}>
                <defs>
                  <linearGradient id="historyKwhGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                    <stop offset="100%" stopColor="#fcd34d" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
                <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.3)',
                    padding: '12px 16px',
                  }}
                  cursor={{ fill: 'hsl(var(--primary) / 0.05)' }}
                  formatter={(value: number) => `${value.toLocaleString()} kWh`}
                />
                <Legend wrapperStyle={{ paddingTop: '16px' }} iconType="circle" iconSize={8} />
                <Bar 
                  dataKey="kwh" 
                  name="Consumo kWh" 
                  fill="url(#historyKwhGradient)" 
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={true}
                  animationBegin={400}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30, rotateY: 5 }}
          animate={{ opacity: 1, x: 0, rotateY: 0 }}
          transition={{ duration: 0.6, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="stat-card relative overflow-hidden group"
        >
          {/* Animated accent line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.55 }}
            className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500/60 via-red-400/40 to-transparent origin-left"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
          >
            <h4 className="font-semibold mb-1">Costo por período</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Seguimiento del gasto asociado al consumo.
            </p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="h-72"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredSummaries}>
                <defs>
                  <linearGradient id="historyCostGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                    <stop offset="100%" stopColor="#fca5a5" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
                <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.3)',
                    padding: '12px 16px',
                  }}
                  cursor={{ fill: 'hsl(var(--primary) / 0.05)' }}
                  formatter={(value: number) => `$${value.toLocaleString()}`}
                />
                <Legend wrapperStyle={{ paddingTop: '16px' }} iconType="circle" iconSize={8} />
                <Bar 
                  dataKey="cost" 
                  name="Costo total" 
                  fill="url(#historyCostGradient)" 
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={true}
                  animationBegin={500}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
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
                  <th className="text-right py-2 px-3 font-medium">kWh</th>
                  <th className="text-right py-2 px-3 font-medium">Costo</th>
                  <th className="text-right py-2 pl-3 font-medium">Medidores</th>
                </tr>
              </thead>
              <tbody>
                {filteredSummaries.map((s, index) => (
                  <motion.tr 
                    key={s.period} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.5 + index * 0.03 }}
                    className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-2 pr-3">{s.label}</td>
                    <td className="py-2 px-3 text-right">{s.kwh.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right">${s.cost.toLocaleString()}</td>
                    <td className="py-2 pl-3 text-right">{s.medidores}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 30, rotateY: 5 }}
          animate={{ opacity: 1, x: 0, rotateY: 0 }}
          transition={{ duration: 0.6, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
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
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.7 }}
              className="flex items-start gap-3 rounded-lg border border-border bg-background p-3"
            >
              <TrendingUp className="w-4 h-4 text-muted-foreground mt-0.5" />
              <span>Revisar centros con variación mensual sostenida para acciones correctivas.</span>
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
          className="absolute top-0 left-0 w-24 h-1 bg-gradient-to-r from-destructive/50 to-transparent rounded-full"
        />
        
        <h4 className="font-semibold mb-1">Señales de riesgo por centro</h4>
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
                  Forecast 30d: <span className="font-medium text-foreground">{Math.round(signal.forecast30d).toLocaleString()} L</span>
                  <span className="text-muted-foreground"> ({Math.round(signal.forecastRange.min).toLocaleString()}–{Math.round(signal.forecastRange.max).toLocaleString()} L)</span>
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
