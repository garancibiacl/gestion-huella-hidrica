import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, TrendingUp } from 'lucide-react';
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

type EmissionRow = {
  period: string;
  centro_trabajo: string;
  consumo_kwh: number;
  costo_total?: number | null;
  co2_producido?: number | null;
  emisiones?: number | null;
  emisiones_totales?: number | null;
  co2e?: number | null;
  factor_emision?: number | null;
};

const PRIMARY_COLOR = 'hsl(152, 55%, 42%)';

const formatPeriod = (period: string) => {
  const [year, month] = period.split('-');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${months[parseInt(month, 10) - 1]} ${year}`;
};

const getEmissions = (row: EmissionRow): number => {
  const direct =
    row.co2_producido ??
    row.emisiones_totales ??
    row.emisiones ??
    row.co2e ??
    null;
  if (direct !== null && direct !== undefined) return Number(direct);
  const factor = row.factor_emision ?? null;
  if (factor !== null && factor !== undefined) {
    return Number(row.consumo_kwh || 0) * Number(factor);
  }
  return 0;
};

export default function ElectricEmissions() {
  const { data, loading } = useElectricMeters();
  const [range, setRange] = useState<'6' | '12' | 'all'>('12');

  const rows = data as unknown as EmissionRow[];

  const periodSummaries = useMemo(() => {
    const periods = Array.from(new Set(rows.map((d) => d.period))).sort();
    return periods.map((period) => {
      const periodRows = rows.filter((d) => d.period === period);
      const emissions = periodRows.reduce((sum, r) => sum + getEmissions(r), 0);
      const kwh = periodRows.reduce((sum, r) => sum + Number(r.consumo_kwh || 0), 0);
      return { period, label: formatPeriod(period), emissions, kwh };
    });
  }, [rows]);

  const filteredSummaries = useMemo(() => {
    if (range === 'all') return periodSummaries;
    const limit = Number(range);
    return periodSummaries.slice(-limit);
  }, [periodSummaries, range]);

  const totalEmissions = filteredSummaries.reduce((sum, s) => sum + s.emissions, 0);
  const totalKwh = filteredSummaries.reduce((sum, s) => sum + s.kwh, 0);
  const emissionsPerKwh = totalKwh > 0 ? totalEmissions / totalKwh : 0;

  const latest = filteredSummaries[filteredSummaries.length - 1];
  const previous = filteredSummaries[filteredSummaries.length - 2];
  const variation = previous && previous.emissions > 0
    ? ((latest?.emissions ?? 0) - previous.emissions) / previous.emissions
    : 0;

  const emissionsByCentro = useMemo(() => {
    const grouped = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.centro_trabajo] = (acc[row.centro_trabajo] ?? 0) + getEmissions(row);
      return acc;
    }, {});
    return Object.entries(grouped).map(([centro, emissions]) => ({ centro, emissions }));
  }, [rows]);

  if (loading) {
    return (
      <div className="stat-card flex items-center justify-center py-12">
        <Activity className="w-4 h-4 text-muted-foreground mr-2" />
        <span className="text-muted-foreground">Cargando emisiones...</span>
      </div>
    );
  }

  const hasEmissions = rows.some((row) => getEmissions(row) > 0);

  if (!hasEmissions) {
    return (
      <div className="stat-card flex flex-col items-center justify-center py-12">
        <Activity className="w-8 h-8 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground text-center max-w-md">
          No hay datos de emisiones disponibles. Asegúrate de incluir la columna de CO₂ producido o factor de emisión.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Emisiones Totales</h3>
          <p className="text-sm text-muted-foreground">
            Huella de carbono asociada al consumo eléctrico.
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="electric-emissions-range" className="text-xs font-medium text-muted-foreground">
            Rango
          </label>
          <Select value={range} onValueChange={(value) => setRange(value as '6' | '12' | 'all')}>
            <SelectTrigger id="electric-emissions-range" className="w-full sm:w-48">
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
          title="Emisiones totales"
          value={`${Math.round(totalEmissions).toLocaleString()} kgCO₂e`}
          icon={<Activity className="w-5 h-5" />}
          subtitle="Suma del rango seleccionado"
          delay={0}
        />
        <StatCard
          title="Emisiones por kWh"
          value={`${emissionsPerKwh.toFixed(2)} kgCO₂e/kWh`}
          icon={<TrendingUp className="w-5 h-5" />}
          subtitle="Factor promedio del rango"
          delay={0.1}
        />
        <StatCard
          title="Variación período"
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
          <h4 className="font-semibold mb-1">Emisiones por período</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Evolución de kgCO₂e en el tiempo.
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
                  formatter={(value: number) => `${Math.round(value).toLocaleString()} kgCO₂e`}
                />
                <Legend />
                <Bar dataKey="emissions" name="Emisiones" fill={PRIMARY_COLOR} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="stat-card"
        >
          <h4 className="font-semibold mb-1">Emisiones por centro</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Concentración de huella por centro de trabajo.
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={emissionsByCentro} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis dataKey="centro" type="category" fontSize={11} width={110} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    padding: '10px 12px',
                  }}
                  formatter={(value: number) => `${Math.round(value).toLocaleString()} kgCO₂e`}
                />
                <Legend />
                <Bar dataKey="emissions" name="Emisiones" fill={PRIMARY_COLOR} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </>
  );
}
