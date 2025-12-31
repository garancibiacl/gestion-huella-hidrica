import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, TrendingUp, TrendingDown, Leaf, Factory, Info } from 'lucide-react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';

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

// Factor de emisión por defecto para Chile (Sistema Eléctrico Nacional - SEN)
// Fuente: Ministerio de Energía Chile - promedio 2023
const DEFAULT_EMISSION_FACTOR = 0.4; // kgCO₂e/kWh

const PRIMARY_COLOR = 'hsl(152, 55%, 42%)';
const SECONDARY_COLOR = 'hsl(45, 93%, 47%)';

const formatPeriod = (period: string) => {
  const [year, month] = period.split('-');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${months[parseInt(month, 10) - 1]} ${year}`;
};

const getEmissions = (row: EmissionRow): number => {
  // Primero intentar usar datos directos de emisiones si existen
  const direct =
    row.co2_producido ??
    row.emisiones_totales ??
    row.emisiones ??
    row.co2e ??
    null;
  if (direct !== null && direct !== undefined && Number(direct) > 0) {
    return Number(direct);
  }
  
  // Si hay factor de emisión en los datos, usarlo
  const factor = row.factor_emision ?? null;
  if (factor !== null && factor !== undefined && Number(factor) > 0) {
    return Number(row.consumo_kwh || 0) * Number(factor);
  }
  
  // Usar factor por defecto basado en consumo
  return Number(row.consumo_kwh || 0) * DEFAULT_EMISSION_FACTOR;
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
  const isPositiveVariation = variation > 0;

  const emissionsByCentro = useMemo(() => {
    const grouped = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.centro_trabajo] = (acc[row.centro_trabajo] ?? 0) + getEmissions(row);
      return acc;
    }, {});
    return Object.entries(grouped)
      .map(([centro, emissions]) => ({ centro, emissions }))
      .sort((a, b) => b.emissions - a.emissions);
  }, [rows]);

  // Detectar si estamos usando factor por defecto
  const usesDefaultFactor = !rows.some((row) => 
    (row.co2_producido && Number(row.co2_producido) > 0) ||
    (row.emisiones_totales && Number(row.emisiones_totales) > 0) ||
    (row.emisiones && Number(row.emisiones) > 0) ||
    (row.co2e && Number(row.co2e) > 0) ||
    (row.factor_emision && Number(row.factor_emision) > 0)
  );

  if (loading) {
    return (
      <div className="stat-card flex items-center justify-center py-12">
        <Leaf className="w-4 h-4 text-muted-foreground mr-2 animate-pulse" />
        <span className="text-muted-foreground">Cargando emisiones...</span>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="stat-card flex flex-col items-center justify-center py-12">
        <Factory className="w-8 h-8 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground text-center max-w-md">
          No hay datos de consumo eléctrico disponibles. Sincroniza los datos desde Google Sheets.
        </p>
      </div>
    );
  }

  return (
    <>
      {usesDefaultFactor && (
        <Alert className="mb-6 border-amber-500/50 bg-amber-500/10">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm">
            Emisiones calculadas con factor estándar de Chile ({DEFAULT_EMISSION_FACTOR} kgCO₂e/kWh).
            Para mayor precisión, incluye la columna "CO₂ Producido" o "Factor Emisión" en tus datos.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Leaf className="w-5 h-5 text-emerald-500" />
            Emisiones Totales de CO₂
          </h3>
          <p className="text-sm text-muted-foreground">
            Huella de carbono asociada al consumo eléctrico — base para decisiones de reducción.
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
          value={`${Math.round(totalEmissions).toLocaleString('es-CL')} kgCO₂e`}
          icon={<Leaf className="w-5 h-5 text-emerald-500" />}
          subtitle="Huella de carbono del rango"
          delay={0}
        />
        <StatCard
          title="Factor promedio"
          value={`${emissionsPerKwh.toFixed(3)} kgCO₂e/kWh`}
          icon={<Activity className="w-5 h-5 text-blue-500" />}
          subtitle="Intensidad de emisiones"
          delay={0.1}
        />
        <StatCard
          title="Variación período"
          value={`${isPositiveVariation ? '+' : ''}${(variation * 100).toFixed(1)}%`}
          icon={isPositiveVariation 
            ? <TrendingUp className="w-5 h-5 text-red-500" /> 
            : <TrendingDown className="w-5 h-5 text-emerald-500" />
          }
          subtitle={previous ? `vs. ${previous.label}` : 'Sin período anterior'}
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
            Evolución de huella de carbono en kgCO₂e.
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredSummaries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}t`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    padding: '10px 12px',
                  }}
                  formatter={(value: number) => [`${Math.round(value).toLocaleString('es-CL')} kgCO₂e`, 'Emisiones']}
                  labelFormatter={(label) => `Período: ${label}`}
                />
                <Legend />
                <Bar dataKey="emissions" name="Emisiones CO₂" fill={PRIMARY_COLOR} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="stat-card"
        >
          <h4 className="font-semibold mb-1">Emisiones por centro de trabajo</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Identifica los centros con mayor huella para priorizar acciones.
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={emissionsByCentro.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(1)}t`} />
                <YAxis 
                  dataKey="centro" 
                  type="category" 
                  fontSize={10} 
                  width={100} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(v) => v.length > 14 ? `${v.slice(0, 14)}...` : v}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    padding: '10px 12px',
                  }}
                  formatter={(value: number) => [`${Math.round(value).toLocaleString('es-CL')} kgCO₂e`, 'Emisiones']}
                />
                <Bar dataKey="emissions" name="Emisiones CO₂" fill={SECONDARY_COLOR} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Tabla resumen por centro */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="stat-card"
      >
        <h4 className="font-semibold mb-1">Detalle de emisiones por centro</h4>
        <p className="text-sm text-muted-foreground mb-4">
          Ranking de centros por huella de carbono total.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Centro</th>
                <th className="text-right py-2 px-3 font-medium text-muted-foreground">Emisiones (kgCO₂e)</th>
                <th className="text-right py-2 px-3 font-medium text-muted-foreground">% del Total</th>
              </tr>
            </thead>
            <tbody>
              {emissionsByCentro.map((item, idx) => (
                <tr key={item.centro} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-2 px-3 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 text-xs flex items-center justify-center font-medium">
                      {idx + 1}
                    </span>
                    {item.centro}
                  </td>
                  <td className="text-right py-2 px-3 font-mono">
                    {Math.round(item.emissions).toLocaleString('es-CL')}
                  </td>
                  <td className="text-right py-2 px-3 text-muted-foreground">
                    {totalEmissions > 0 ? ((item.emissions / totalEmissions) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </>
  );
}
