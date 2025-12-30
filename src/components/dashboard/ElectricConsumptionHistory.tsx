import { useMemo, useState } from 'react';
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

export default function ElectricConsumptionHistory() {
  const { data, loading } = useElectricMeters();
  const [range, setRange] = useState<'6' | '12' | 'all'>('12');

  const summaries = useMemo<PeriodSummary[]>(() => {
    const periods = Array.from(new Set(data.map((d) => d.period))).sort();
    return periods.map((period) => {
      const periodRows = data.filter((d) => d.period === period);
      const medidores = new Set(periodRows.map((d) => d.medidor)).size;
      const kwh = periodRows.reduce((sum, d) => sum + Number(d.consumo_kwh), 0);
      const cost = periodRows.reduce((sum, d) => sum + Number(d.costo_total ?? 0), 0);
      return { period, label: formatPeriod(period), kwh, cost, medidores };
    });
  }, [data]);

  const filteredSummaries = useMemo(() => {
    if (range === 'all') return summaries;
    const limit = Number(range);
    return summaries.slice(-limit);
  }, [summaries, range]);

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="stat-card"
        >
          <h4 className="font-semibold mb-1">kWh por período</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Tendencia de consumo eléctrico acumulado.
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredSummaries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    padding: '10px 12px',
                  }}
                  formatter={(value: number) => `${value.toLocaleString()} kWh`}
                />
                <Legend />
                <Bar dataKey="kwh" name="Consumo kWh" fill={PRIMARY_COLOR} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="stat-card"
        >
          <h4 className="font-semibold mb-1">Costo por período</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Seguimiento del gasto asociado al consumo.
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredSummaries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    padding: '10px 12px',
                  }}
                  formatter={(value: number) => `$${value.toLocaleString()}`}
                />
                <Legend />
                <Bar dataKey="cost" name="Costo total" fill={SECONDARY_COLOR} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 stat-card">
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
                {filteredSummaries.map((s) => (
                  <tr key={s.period} className="border-b last:border-b-0">
                    <td className="py-2 pr-3">{s.label}</td>
                    <td className="py-2 px-3 text-right">{s.kwh.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right">${s.cost.toLocaleString()}</td>
                    <td className="py-2 pl-3 text-right">{s.medidores}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="stat-card">
          <h4 className="font-semibold mb-1">Acciones recomendadas</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Sugerencias para prevención de riesgos.
          </p>
          <div className="space-y-3 text-sm">
            {alerts.length > 0 ? (
              alerts.map((alert, index) => (
                <div key={index} className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3">
                  <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
                  <span>{alert}</span>
                </div>
              ))
            ) : (
              <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
                <Activity className="w-4 h-4 text-muted-foreground mt-0.5" />
                <span>Sin alertas relevantes en el rango seleccionado.</span>
              </div>
            )}
            <div className="flex items-start gap-3 rounded-lg border border-border bg-background p-3">
              <TrendingUp className="w-4 h-4 text-muted-foreground mt-0.5" />
              <span>Revisar centros con variación mensual sostenida para acciones correctivas.</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
