import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Fuel, Factory, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
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
import { usePetroleumSync } from '@/hooks/usePetroleumSync';
import { ExportPDFButton } from '@/components/export/ExportPDFButton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function PetroleumDashboard() {
  const { loading, error, aggregates, metrics, recommendations, lastUpdated, refetch } = usePetroleumData();
  const { sync: syncPetroleum, isSyncing, lastSyncAt } = usePetroleumSync({
    enabled: true,
    onSyncComplete: async (success, rowsProcessed) => {
      if (success && rowsProcessed > 0) {
        await refetch();
      }
    },
  });

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

  const formatLastSync = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return date.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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

  const hasData = !!metrics && aggregates.length > 0;
  const totalEmissionsTons = hasData ? metrics.totalEmissionsKgCO2e / 1000 : 0;

  return (
    <div className="page-container space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <PageHeader
          title="Dashboard Petróleo"
          description="Consumo de combustibles fósiles, costos asociados y huella de carbono."
        />

        <div className="flex items-center gap-3">
          <Button
            onClick={() => syncPetroleum(true)}
            disabled={isSyncing}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar Petróleo'}
          </Button>

          <AnimatePresence mode="wait">
            {(lastSyncAt || lastUpdated) && !isSyncing && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                <Clock className="w-3.5 h-3.5" />
                <span>{formatLastSync(lastSyncAt || lastUpdated!)}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <ExportPDFButton
            onExport={async () => {
              // El flujo de PDF detallado se implementará en una etapa posterior
              console.log('Exportar PDF Petróleo - pendiente de implementación de plantilla específica');
            }}
            label="Exportar PDF"
          />
        </div>
      </div>

      <Tabs defaultValue="consumo" className="w-full">
        <TabsList className="flex w-full max-w-full gap-2 overflow-x-auto rounded-xl bg-muted/60 p-1">
          <TabsTrigger
            value="consumo"
            className="gap-2 whitespace-nowrap rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm"
          >
            <Flame className="w-4 h-4" />
            <span className="hidden sm:inline">Consumo y costos</span>
            <span className="sm:hidden">Consumo</span>
          </TabsTrigger>
          <TabsTrigger
            value="huella"
            className="gap-2 whitespace-nowrap rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm"
          >
            <Factory className="w-4 h-4" />
            <span className="hidden sm:inline">Huella de carbono</span>
            <span className="sm:hidden">Huella</span>
          </TabsTrigger>
          <TabsTrigger
            value="medidas"
            className="gap-2 whitespace-nowrap rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm"
          >
            <Fuel className="w-4 h-4" />
            <span className="hidden sm:inline">Medidas de reducción</span>
            <span className="sm:hidden">Medidas</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="consumo" className="mt-6 space-y-6">
          {hasData ? (
            <>
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
            </>
          ) : (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              Aún no hay datos de petróleo cargados. Usa "Sincronizar Petróleo" para traer los datos desde la hoja de
              cálculo y ver aquí los KPIs y el histórico.
            </div>
          )}
        </TabsContent>

        <TabsContent value="huella" className="mt-6 space-y-4">
          {hasData ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="stat-card"
            >
              <div className="mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Factory className="w-4 h-4 text-slate-700" />
                  Huella de carbono asociada al petróleo
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Estimación de emisiones de CO₂e derivadas del consumo total de combustibles líquidos. Úsalo como base
                  para metas de reducción y reportes de huella.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                  title="Emisiones totales estimadas"
                  value={`${totalEmissionsTons.toLocaleString('es-CL', { maximumFractionDigits: 2 })} tCO₂e`}
                  subtitle="Período consolidado"
                  icon={<Factory className="w-6 h-6" />}
                  variant="primary"
                />
                <StatCard
                  title="Intensidad de emisiones"
                  value={`${(metrics.totalEmissionsKgCO2e / metrics.totalLiters).toFixed(2)} kgCO₂e/L`}
                  subtitle="Factor promedio implícito"
                />
                <StatCard
                  title="Tendencia reciente"
                  value={latest && previous
                    ? `${variationEmissionsPct.toFixed(1)}% vs período anterior`
                    : 'Sin datos suficientes'}
                  subtitle="Comparación último período"
                  badge={latest && previous ? {
                    text: variationEmissionsPct <= 0 ? 'Emisiones en descenso' : 'Emisiones en aumento',
                    variant: variationEmissionsPct <= 0 ? 'success' : 'warning',
                  } : undefined}
                />
              </div>
            </motion.div>
          ) : (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              Aún no hay datos suficientes para calcular huella de carbono. Sincroniza primero los datos de Petróleo.
            </div>
          )}
        </TabsContent>

        <TabsContent value="medidas" className="mt-6 space-y-4">
          {hasData && recommendations && recommendations.recommendations.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="stat-card"
            >
              <div className="mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Fuel className="w-4 h-4 text-emerald-600" />
                  Medidas sugeridas para reducir consumo y emisiones
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Recomendaciones generadas en base a los períodos de mayor consumo. Úsalas como guía para planes de
                  acción en terreno.
                </p>
              </div>

              <ul className="space-y-3 text-xs">
                {recommendations.recommendations.map((rec, index) => (
                  <li
                    key={`${rec.center}-${index}`}
                    className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-emerald-900"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">
                        {rec.center}
                      </span>
                      {rec.potentialSavingVolume && (
                        <span className="text-[11px] font-medium text-emerald-700">
                          Potencial: {rec.potentialSavingVolume.toLocaleString('es-CL', { maximumFractionDigits: 0 })} L (
                          ~
                          {rec.potentialSavingEmissionsKgCO2e
                            ? (rec.potentialSavingEmissionsKgCO2e / 1000).toFixed(2)
                            : '0'}{' '}
                          tCO₂e)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] leading-snug text-emerald-900/90">
                      {rec.message}
                    </p>
                  </li>
                ))}
              </ul>
            </motion.div>
          ) : (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              Aún no hay suficiente histórico para generar medidas específicas. Sincroniza varios períodos de Petróleo
              para ver recomendaciones de reducción.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
