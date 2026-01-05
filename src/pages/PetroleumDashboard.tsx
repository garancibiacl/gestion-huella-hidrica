import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Flame, Fuel, Factory, FileDown } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { LoaderHourglass } from '@/components/ui/loader-hourglass';
import { usePetroleumData } from '@/hooks/usePetroleumData';
import { ExportPDFButton } from '@/components/export/ExportPDFButton';

export default function PetroleumDashboard() {
  const { loading, error, aggregates, metrics } = usePetroleumData();

  const latest = aggregates[aggregates.length - 1];
  const previous = aggregates[aggregates.length - 2];

  const variationLitersPct = useMemo(() => {
    if (!latest || !previous || previous.totalLiters <= 0) return 0;
    return ((latest.totalLiters - previous.totalLiters) / previous.totalLiters) * 100;
  }, [latest, previous]);

  const variationEmissionsPct = useMemo(() => {
    if (!latest || !previous || previous.totalEmissionsKgCO2e <= 0) return 0;
    return ((latest.totalEmissionsKgCO2e - previous.totalEmissionsKgCO2e) / previous.totalEmissionsKgCO2e) * 100;
  }, [latest, previous]);

  const chartData = useMemo(
    () =>
      aggregates.map((agg) => ({
        period: agg.periodLabel,
        liters: agg.totalLiters,
        cost: agg.totalCost,
      })),
    [aggregates],
  );

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center py-12">
        <LoaderHourglass label="Cargando datos de petróleo" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <PageHeader
          title="Dashboard Petróleo"
          description="Monitoreo de consumo de combustibles fósiles y su huella de carbono."
        />
        <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      </div>
    );
  }

  if (!metrics || aggregates.length === 0) {
    return (
      <div className="page-container">
        <PageHeader
          title="Dashboard Petróleo"
          description="Monitoreo de consumo de combustibles fósiles y su huella de carbono."
        />
        <div className="mt-6 rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
          Aún no hay datos de petróleo cargados. Importa tus registros desde "Importar Petróleo" para comenzar a ver el
          dashboard.
        </div>
      </div>
    );
  }

  const totalEmissionsTons = metrics.totalEmissionsKgCO2e / 1000;

  return (
    <div className="page-container space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <PageHeader
          title="Dashboard Petróleo"
          description="Consumo de combustibles fósiles, costos asociados y huella de carbono."
        />

        <div className="flex items-center gap-3">
          <ExportPDFButton
            onExport={async () => {
              // El flujo de PDF detallado se implementará en una etapa posterior
              console.log('Exportar PDF Petróleo - pendiente de implementación de plantilla específica');
            }}
            label="Exportar PDF"
          />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-4 md:grid-cols-3"
      >
        <StatCard
          title="Consumo total de petróleo"
          value={`${metrics.totalLiters.toLocaleString('es-CL', { maximumFractionDigits: 0 })} L`}
          subtitle="Período consolidado"
          icon={<Flame className="w-6 h-6" />}
          variant="primary"
        />

        <StatCard
          title="Costo total asociado"
          value={`$${metrics.totalCost.toLocaleString('es-CL')}`}
          subtitle="Costos de combustible"
          icon={<Fuel className="w-6 h-6" />}
        />

        <StatCard
          title="Huella de carbono estimada"
          value={`${totalEmissionsTons.toLocaleString('es-CL', { maximumFractionDigits: 2 })} tCO₂e`}
          subtitle="Emisiones derivadas del consumo de petróleo"
          icon={<Factory className="w-6 h-6" />}
          trend={latest && previous ? {
            value: `${variationEmissionsPct.toFixed(1)}% vs período anterior`,
            positive: variationEmissionsPct <= 0,
          } : undefined}
          badge={{
            text: variationEmissionsPct <= 0 ? 'Tendencia a la baja en emisiones' : 'Emisiones en aumento',
            variant: variationEmissionsPct <= 0 ? 'success' : 'warning',
          }}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="stat-card"
      >
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              Histórico de consumo de petróleo
            </h3>
            <p className="text-xs text-muted-foreground">
              Litros y costo total por período. Útil para ver tendencias y detectar meses críticos.
            </p>
          </div>
        </div>

        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={40} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
              <RechartsTooltip
                formatter={(value: any, name: string) => {
                  if (name === 'Litros') {
                    return [
                      Number(value).toLocaleString('es-CL', { maximumFractionDigits: 0 }),
                      'Litros',
                    ];
                  }
                  if (name === 'Costo') {
                    return [`$${Number(value).toLocaleString('es-CL')}`, 'Costo'];
                  }
                  return [value, name];
                }}
              />
              <Bar
                yAxisId="left"
                dataKey="liters"
                name="Litros"
                fill="hsl(24, 95%, 58%)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                yAxisId="right"
                dataKey="cost"
                name="Costo"
                fill="hsl(210, 70%, 45%)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}
