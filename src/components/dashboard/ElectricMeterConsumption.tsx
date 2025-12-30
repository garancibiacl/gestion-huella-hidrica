import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, Building2, DollarSign, Activity } from 'lucide-react';
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
import { SkeletonCard, SkeletonChart } from '@/components/ui/skeleton-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useElectricMeters } from '@/hooks/useElectricMeters';

interface CentroChartData {
  centro: string;
  consumo: number;
  costo: number;
}

interface MedidorChartData {
  medidor: string;
  consumo: number;
}

const PRIMARY_COLOR = 'hsl(210, 80%, 50%)'; // azul para consumo kWh
const SECONDARY_COLOR = 'hsl(5, 63%, 43%)'; // rojo corporativo para resaltar

export default function ElectricMeterConsumption() {
  const { data, loading, error, refetch } = useElectricMeters();
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [selectedCentro, setSelectedCentro] = useState<string>('all');
  const [selectedMedidor, setSelectedMedidor] = useState<string>('all');

  // Refetch data on mount to ensure fresh data after sync
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
    () => Array.from(new Set(data.map((d) => d.medidor))).sort(),
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

  const totalKwh = filtered.reduce((sum, d) => sum + Number(d.consumo_kwh), 0);
  const totalCosto = filtered.reduce(
    (sum, d) => sum + Number(d.costo_total ?? 0),
    0
  );
  const totalMedidores = new Set(filtered.map((d) => d.medidor)).size;

  const chartByCentro: CentroChartData[] = centros.map((centro) => {
    const centroData = filtered.filter((d) => d.centro_trabajo === centro);
    if (centroData.length === 0) return { centro, consumo: 0, costo: 0 };
    return {
      centro: centro.length > 18 ? centro.substring(0, 15) + '…' : centro,
      consumo: centroData.reduce((sum, d) => sum + Number(d.consumo_kwh), 0),
      costo: centroData.reduce((sum, d) => sum + Number(d.costo_total ?? 0), 0),
    };
  }).filter((d) => d.consumo > 0);

  const chartByMedidor: MedidorChartData[] = medidores.map((m) => {
    const medidorData = filtered.filter((d) => d.medidor === m);
    if (medidorData.length === 0) return { medidor: m, consumo: 0 };
    return {
      medidor: m,
      consumo: medidorData.reduce((sum, d) => sum + Number(d.consumo_kwh), 0),
    };
  }).filter((d) => d.consumo > 0);

  const formatPeriod = (period: string) => {
    const [year, month] = period.split('-');
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  const evolutionData = periods.slice(0, 12).reverse().map((p) => {
    const periodData = filtered.filter((d) => d.period === p);
    return {
      period: formatPeriod(p),
      consumo: periodData.reduce((sum, d) => sum + Number(d.consumo_kwh), 0),
    };
  });

  if (loading) {
    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonChart />
      </>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="stat-card flex flex-col items-center justify-center py-12 border-destructive/50"
      >
        <Zap className="w-16 h-16 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2 text-destructive">Error cargando datos</h3>
        <p className="text-muted-foreground text-center mb-2 max-w-md">
          {error}
        </p>
      </motion.div>
    );
  }

  if (data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="stat-card flex flex-col items-center justify-center py-12"
      >
        <Zap className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Sin datos de consumo eléctrico</h3>
        <p className="text-muted-foreground text-center mb-2 max-w-md">
          Aún no hay registros de consumo de energía eléctrica por medidor.
        </p>
        <p className="text-muted-foreground text-xs text-center max-w-md">
          Sincroniza los datos desde Google Sheets para comenzar a monitorear kWh y costos.
        </p>
      </motion.div>
    );
  }

  return (
    <>
      {/* Filtros */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="electric-period" className="text-xs font-medium text-muted-foreground">
              Período
            </label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger id="electric-period" className="w-full [&>span]:line-clamp-2 [&>span]:leading-tight">
                <SelectValue placeholder="Selecciona un período" />
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
            <label htmlFor="electric-centro" className="text-xs font-medium text-muted-foreground">
              Centro de trabajo
            </label>
            <Select value={selectedCentro} onValueChange={setSelectedCentro}>
              <SelectTrigger id="electric-centro" className="w-full [&>span]:line-clamp-2 [&>span]:leading-tight">
                <SelectValue placeholder="Selecciona un centro" />
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
            <label htmlFor="electric-medidor" className="text-xs font-medium text-muted-foreground">
              Medidor
            </label>
            <Select value={selectedMedidor} onValueChange={setSelectedMedidor}>
              <SelectTrigger id="electric-medidor" className="w-full [&>span]:line-clamp-2 [&>span]:leading-tight">
                <SelectValue placeholder="Selecciona un medidor" />
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
        </div>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="kWh totales"
          value={totalKwh.toLocaleString()}
          icon={<Zap className="w-5 h-5" />}
          subtitle="Consumo acumulado en el período filtrado"
          delay={0}
        />
        <StatCard
          title="Costo total"
          value={`$${totalCosto.toLocaleString()}`}
          icon={<DollarSign className="w-5 h-5" />}
          delay={0.1}
        />
        <StatCard
          title="Medidores activos"
          value={totalMedidores.toString()}
          icon={<Building2 className="w-5 h-5" />}
          subtitle="Con registros en el período filtrado"
          delay={0.2}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Consumo por centro */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="stat-card"
        >
          <h3 className="font-semibold mb-1">Consumo por Centro de Trabajo</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Distribución de kWh y costo por centro de trabajo
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartByCentro} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  horizontal
                  vertical={false}
                  opacity={0.5}
                />
                <XAxis
                  type="number"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="centro"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  width={110}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '14px',
                    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.12)',
                    padding: '12px 16px',
                  }}
                  formatter={(value: any, name: string, props: any) => {
                    if (name === 'Consumo') {
                      return [`${value.toLocaleString()} kWh`, 'Consumo'];
                    }
                    return [`$${value.toLocaleString()}`, 'Costo'];
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: '16px' }} iconType="circle" iconSize={8} />
                <Bar dataKey="consumo" name="Consumo" fill={PRIMARY_COLOR} radius={[0, 6, 6, 0]} />
                <Bar dataKey="costo" name="Costo" fill={SECONDARY_COLOR} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Consumo por medidor */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="stat-card"
        >
          <h3 className="font-semibold mb-1">Consumo por Medidor</h3>
          <p className="text-sm text-muted-foreground mb-4">
            kWh acumulados por medidor en el período filtrado
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartByMedidor}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                  opacity={0.5}
                />
                <XAxis
                  dataKey="medidor"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '14px',
                    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.12)',
                    padding: '12px 16px',
                  }}
                  formatter={(value: any) => [`${value.toLocaleString()} kWh`, 'Consumo']}
                />
                <Legend wrapperStyle={{ paddingTop: '16px' }} iconType="circle" iconSize={8} />
                <Bar dataKey="consumo" name="Consumo" fill={PRIMARY_COLOR} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Evolución mensual */}
      {periods.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="stat-card"
        >
          <h3 className="font-semibold mb-1">Evolución Mensual de Consumo</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Tendencia de kWh consumidos por período
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={evolutionData}>
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
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '14px',
                    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.12)',
                    padding: '12px 16px',
                  }}
                  formatter={(value: any) => [`${value.toLocaleString()} kWh`, 'Consumo']}
                />
                <Legend wrapperStyle={{ paddingTop: '16px' }} iconType="circle" iconSize={8} />
                <Bar dataKey="consumo" name="Consumo" fill={PRIMARY_COLOR} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}
    </>
  );
}
