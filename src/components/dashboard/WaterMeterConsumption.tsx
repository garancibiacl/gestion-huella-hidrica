import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Droplets, Building2, DollarSign, Activity } from 'lucide-react';
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
import { EmptyState } from '@/components/ui/empty-state';
import { ChartCard } from '@/components/ui/chart-card';
import { ImpactSummary } from '@/components/ui/impact-summary';
import { ProgressKpi } from '@/components/ui/progress-kpi';
import { calculateImpactFromM3 } from '@/lib/impact';
import { SkeletonCard, SkeletonChart } from '@/components/ui/skeleton-card';
import { LoaderHourglass } from '@/components/ui/loader-hourglass';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWaterMeters } from '@/hooks/useWaterMeters';

interface CentroChartData {
  centro: string;
  consumo: number;
  costo: number;
}

interface MedidorChartData {
  medidor: string;
  consumo: number;
}

const PRIMARY_COLOR = 'hsl(200, 80%, 50%)'; // azul agua para consumo m³
const SECONDARY_COLOR = 'hsl(5, 63%, 43%)'; // rojo corporativo para costo
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

export default function WaterMeterConsumption() {
  const { data, loading, error, refetch } = useWaterMeters();
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [selectedCentro, setSelectedCentro] = useState<string>('all');
  const [selectedMedidor, setSelectedMedidor] = useState<string>('all');

  useEffect(() => {
    refetch();
  }, []);

  const periods = useMemo(
    () => Array.from(new Set(data.map((d) => d.period))).sort().reverse(),
    [data]
  );

  const centros = useMemo(
    () => Array.from(new Set(data.map((d) => d.centro_trabajo))).sort(),
    [data]
  );

  const medidores = useMemo(
    () => Array.from(new Set(data.map((d) => d.medidor)))
      .filter((m) => m && m !== 'Sin medidor' && m !== 'Sin especificar')
      .sort(),
    [data]
  );

  const filtered = useMemo(
    () =>
      data.filter((d) => {
        if (selectedPeriod !== 'all' && d.period !== selectedPeriod) return false;
        if (selectedCentro !== 'all' && d.centro_trabajo !== selectedCentro) return false;
        if (selectedMedidor !== 'all' && d.medidor !== selectedMedidor) return false;
        return true;
      }),
    [data, selectedPeriod, selectedCentro, selectedMedidor]
  );

  const totalM3 = filtered.reduce((sum, d) => sum + Number(d.consumo_m3), 0);
  const totalCosto = filtered.reduce(
    (sum, d) => sum + Number(d.costo_total ?? 0),
    0
  );
  const totalMedidores = new Set(filtered.map((d) => d.medidor)).size;
  const impactMetrics = useMemo(() => calculateImpactFromM3(totalM3), [totalM3]);
  const averageM3 = useMemo(() => {
    if (filtered.length === 0) return 0;
    return totalM3 / Math.max(1, new Set(filtered.map((d) => d.period)).size);
  }, [filtered, totalM3]);
  const targetM3 = averageM3 > 0 ? averageM3 * 0.9 : 0;
  const progressM3 = targetM3 > 0 ? (totalM3 / targetM3) * 100 : 0;
  const targetCost = totalM3 > 0 ? targetM3 * (totalCosto / totalM3) : 0;
  const progressCost = targetCost > 0 ? (totalCosto / targetCost) * 100 : 0;

  const chartByCentro: CentroChartData[] = centros.map((centro) => {
    const centroData = filtered.filter((d) => d.centro_trabajo === centro);
    return {
      centro,
      consumo: centroData.reduce((sum, d) => sum + Number(d.consumo_m3), 0),
      costo: centroData.reduce((sum, d) => sum + Number(d.costo_total ?? 0), 0),
    };
  }).filter((d) => d.consumo > 0 || d.costo > 0);

  const chartByMedidor: MedidorChartData[] = medidores.map((medidor) => {
    const medidorData = filtered.filter((d) => d.medidor === medidor);
    return {
      medidor,
      consumo: medidorData.reduce((sum, d) => sum + Number(d.consumo_m3), 0),
    };
  }).filter((d) => d.consumo > 0);

  const evolutionData = useMemo(() => {
    return periods.slice(0, 12).reverse().map((period) => {
      const periodData = data.filter((d) => d.period === period);
      return {
        period: formatPeriod(period),
        consumo: periodData.reduce((sum, d) => sum + Number(d.consumo_m3), 0),
      };
    });
  }, [periods, data]);

  function formatPeriod(period: string): string {
    const [year, month] = period.split('-');
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${months[parseInt(month, 10) - 1]} ${year}`;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-4">
          <LoaderHourglass label="Preparando consumo por medidor" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonChart />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="No pudimos cargar el consumo"
        description={error}
        icon={<Activity className="h-10 w-10 text-destructive" />}
        tone="error"
      />
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        title="Sin datos de consumo"
        description="Sincroniza los datos para visualizar el consumo por medidor."
        icon={<Droplets className="h-10 w-10 text-muted-foreground" />}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: MOTION_FAST, ease: MOTION_EASE }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="water-period" className="text-xs font-medium text-muted-foreground">
            Período
          </label>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger id="water-period">
              <SelectValue placeholder="Todos los períodos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los períodos</SelectItem>
              {periods.map((p) => (
                <SelectItem key={p} value={p}>
                  {formatPeriod(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="water-centro" className="text-xs font-medium text-muted-foreground">
            Centro de trabajo
          </label>
          <Select value={selectedCentro} onValueChange={setSelectedCentro}>
            <SelectTrigger id="water-centro">
              <SelectValue placeholder="Todos los centros" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los centros</SelectItem>
              {centros.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="water-medidor" className="text-xs font-medium text-muted-foreground">
            Medidor
          </label>
          <Select value={selectedMedidor} onValueChange={setSelectedMedidor}>
            <SelectTrigger id="water-medidor">
              <SelectValue placeholder="Todos los medidores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los medidores</SelectItem>
              {medidores.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Consumo total (m³)"
          value={totalM3.toLocaleString()}
          icon={<Droplets className="w-5 h-5" />}
          subtitle="Suma del período filtrado"
          delay={0.1}
          variant="primary"
        />
        <StatCard
          title="Costo total"
          value={`$${totalCosto.toLocaleString()}`}
          icon={<DollarSign className="w-5 h-5" />}
          subtitle="Gasto asociado al consumo"
          delay={0.15}
          variant="minimal"
        />
        <StatCard
          title="Medidores activos"
          value={totalMedidores.toString()}
          icon={<Building2 className="w-5 h-5" />}
          subtitle="Con consumo registrado"
          delay={0.2}
          variant="minimal"
        />
      </div>

      <ImpactSummary metrics={impactMetrics} />

      <div className="stat-card mb-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold">Metas y progreso</h3>
          <p className="text-sm text-muted-foreground">
            Seguimiento vs objetivo de reducción sobre el promedio del rango.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ProgressKpi
            title="Meta de consumo (m³)"
            value={`${Math.round(totalM3).toLocaleString()} / ${Math.round(targetM3).toLocaleString()} m³`}
            progress={progressM3}
            helper="Objetivo: 10% bajo el promedio del rango."
            tone={progressM3 <= 100 ? 'success' : 'warning'}
          />
          <ProgressKpi
            title="Meta de costo"
            value={`$${Math.round(totalCosto).toLocaleString()} / $${Math.round(targetCost).toLocaleString()}`}
            progress={progressCost}
            helper="Costo objetivo ajustado al consumo promedio."
            tone={progressCost <= 100 ? 'success' : 'warning'}
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Consumo por centro */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: MOTION_MED, delay: 0.2, ease: MOTION_EASE }}
          className="relative overflow-hidden"
        >
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500/60 via-blue-400/40 to-transparent origin-left"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <ChartCard
            title="Consumo por centro de trabajo"
            subtitle="Comparativo de consumo y costo por centro"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: MOTION_MED, delay: 0.3, ease: MOTION_EASE }}
              className="h-72"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartByCentro} layout="vertical">
                  <defs>
                    <linearGradient id="waterConsumoGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity={1} />
                    </linearGradient>
                    <linearGradient id="waterCostoGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#dc2626" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    horizontal={false}
                    opacity={0.5}
                  />
                  <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    dataKey="centro"
                    type="category"
                    width={100}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    cursor={{ fill: 'hsl(var(--primary) / 0.05)' }}
                    formatter={(value: any, name: string) => {
                      if (name === 'Consumo') {
                        return [`${value.toLocaleString()} m³`, 'Consumo'];
                      }
                      return [`$${value.toLocaleString()}`, 'Costo'];
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '16px' }} iconType="circle" iconSize={8} />
                  <Bar 
                    dataKey="consumo" 
                    name="Consumo" 
                    fill="url(#waterConsumoGradient)" 
                    radius={[0, 6, 6, 0]}
                    isAnimationActive={true}
                    animationBegin={400}
                    animationDuration={1200}
                    animationEasing="ease-out"
                  />
                  <Bar 
                    dataKey="costo" 
                    name="Costo" 
                    fill="url(#waterCostoGradient)" 
                    radius={[0, 6, 6, 0]}
                    isAnimationActive={true}
                    animationBegin={600}
                    animationDuration={1200}
                    animationEasing="ease-out"
                  />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </ChartCard>
        </motion.div>

        {/* Consumo por medidor */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: MOTION_MED, delay: 0.25, ease: MOTION_EASE }}
          className="relative overflow-hidden"
        >
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.55 }}
            className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500/60 via-cyan-400/40 to-transparent origin-left"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <ChartCard
            title="Consumo por medidor"
            subtitle="Acumulado del período seleccionado"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: MOTION_MED, delay: 0.35, ease: MOTION_EASE }}
              className="h-72"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartByMedidor}>
                  <defs>
                    <linearGradient id="waterMedidorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity={1} />
                      <stop offset="100%" stopColor="#0284c7" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                    opacity={0.5}
                  />
                  <XAxis
                    dataKey="medidor"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    cursor={{ fill: 'hsl(var(--primary) / 0.05)' }}
                    formatter={(value: any) => [`${value.toLocaleString()} m³`, 'Consumo']}
                  />
                  <Legend wrapperStyle={{ paddingTop: '16px' }} iconType="circle" iconSize={8} />
                  <Bar 
                    dataKey="consumo" 
                    name="Consumo" 
                    fill="url(#waterMedidorGradient)" 
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

      {/* Evolution chart */}
      {periods.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: MOTION_MED, delay: 0.3, ease: MOTION_EASE }}
          className="relative overflow-hidden"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.6 }}
            className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.03] via-transparent to-blue-500/[0.02] pointer-events-none"
          />
          
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.7, ease: "easeOut" }}
            className="absolute top-0 left-0 w-32 h-1 bg-gradient-to-r from-cyan-500/50 via-blue-400/30 to-transparent rounded-full"
          />
          
          <ChartCard
            title="Evolución mensual"
            subtitle="Tendencia de consumo por período"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: MOTION_MED, delay: 0.4, ease: MOTION_EASE }}
              className="h-72"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={evolutionData}>
                  <defs>
                    <linearGradient id="waterEvolutionGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.9} />
                      <stop offset="50%" stopColor="#0ea5e9" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.4} />
                    </linearGradient>
                    <filter id="waterGlow">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                    opacity={0.5}
                  />
                  <XAxis
                    dataKey="period"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    dx={-10}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    cursor={{ fill: 'hsl(var(--primary) / 0.05)' }}
                    formatter={(value: any) => [`${value.toLocaleString()} m³`, 'Consumo']}
                  />
                  <Legend wrapperStyle={{ paddingTop: '16px' }} iconType="circle" iconSize={8} />
                  <Bar 
                    dataKey="consumo" 
                    name="Consumo" 
                    fill="url(#waterEvolutionGradient)" 
                    radius={[6, 6, 0, 0]}
                    filter="url(#waterGlow)"
                    isAnimationActive={true}
                    animationBegin={600}
                    animationDuration={1500}
                    animationEasing="ease-out"
                  />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </ChartCard>
        </motion.div>
      )}
    </div>
  );
}
