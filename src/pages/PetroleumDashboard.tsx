import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Fuel, Factory, CheckCircle2, Clock, RefreshCw, Building2, Zap, TrendingDown, DollarSign, Leaf } from 'lucide-react';
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
import { exportPetroleumReport } from '@/lib/pdf-export';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function PetroleumDashboard() {
  const { loading, error, aggregates, companyAggregates, metrics, recommendations, mitigationAnalysis, lastUpdated, refetch } = usePetroleumData();
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
              if (!hasData || !metrics || aggregates.length === 0) return;

              const summaries = aggregates.map((agg) => ({
                period: agg.periodKey,
                label: agg.periodLabel,
                liters: agg.totalLiters,
                cost: agg.totalCost,
              }));

              exportPetroleumReport({
                summaries,
                totalLiters: metrics.totalLiters,
                totalCost: metrics.totalCost,
                totalEmissionsKgCO2e: metrics.totalEmissionsKgCO2e,
                variationLitersPct,
              });
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
            value="empresas"
            className="gap-2 whitespace-nowrap rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm"
          >
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Por Empresa</span>
            <span className="sm:hidden">Empresas</span>
          </TabsTrigger>
          <TabsTrigger
            value="transicion"
            className="gap-2 whitespace-nowrap rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm"
          >
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">Transición Energética</span>
            <span className="sm:hidden">Transición</span>
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

        <TabsContent value="empresas" className="mt-6 space-y-4">
          {hasData && companyAggregates.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="stat-card">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    Consumo por Empresa
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Desglose del consumo de combustible por razón social. Permite identificar qué empresa tiene mayor impacto.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {companyAggregates.map((company) => (
                    <div
                      key={company.company}
                      className="rounded-lg border bg-gradient-to-br from-blue-50 to-slate-50 p-4"
                    >
                      <h4 className="font-semibold text-sm text-blue-900 mb-3 flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        {company.company}
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Consumo total:</span>
                          <span className="font-medium text-blue-800">
                            {company.totalLiters.toLocaleString('es-CL', { maximumFractionDigits: 0 })} L
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Costo total:</span>
                          <span className="font-medium text-blue-800">
                            ${company.totalCost.toLocaleString('es-CL')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Emisiones CO₂e:</span>
                          <span className="font-medium text-orange-700">
                            {(company.totalEmissionsKgCO2e / 1000).toLocaleString('es-CL', { maximumFractionDigits: 2 })} t
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Períodos registrados:</span>
                          <span className="font-medium">{company.periodCount}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="stat-card">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold">Distribución por Empresa</h3>
                </div>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={companyAggregates.map((c) => ({
                        name: c.company.length > 15 ? c.company.substring(0, 15) + '...' : c.company,
                        litros: c.totalLiters,
                        costo: c.totalCost,
                      }))}
                      layout="vertical"
                      margin={{ top: 8, right: 16, left: 100, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                      <RechartsTooltip
                        formatter={(value: any, name: string) => {
                          if (name === 'Litros') {
                            return [Number(value).toLocaleString('es-CL', { maximumFractionDigits: 0 }), 'Litros'];
                          }
                          return [value, name];
                        }}
                      />
                      <Bar dataKey="litros" name="Litros" fill="hsl(210, 70%, 50%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              Aún no hay datos suficientes para mostrar el desglose por empresa. Sincroniza los datos de Petróleo.
            </div>
          )}
        </TabsContent>

        <TabsContent value="transicion" className="mt-6 space-y-4">
          {hasData && mitigationAnalysis.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="stat-card bg-gradient-to-br from-emerald-50 to-teal-50">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-emerald-800">
                    <Zap className="w-4 h-4" />
                    Plan de Transición Energética
                  </h3>
                  <p className="text-xs text-emerald-700/80 mt-1">
                    Análisis de inversión y retorno para migrar a tecnologías más limpias. Incluye buses eléctricos,
                    híbridos y medidas de eficiencia operacional.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3 mb-6">
                  <StatCard
                    title="Ahorro potencial anual"
                    value={`$${mitigationAnalysis.reduce((sum, m) => sum + m.totalPotentialSavingsCLP, 0).toLocaleString('es-CL')}`}
                    subtitle="Si se implementan todas las medidas"
                    icon={<DollarSign className="w-6 h-6" />}
                    variant="primary"
                  />
                  <StatCard
                    title="Reducción de combustible"
                    value={`${mitigationAnalysis.reduce((sum, m) => sum + m.totalPotentialSavingsLiters, 0).toLocaleString('es-CL', { maximumFractionDigits: 0 })} L/año`}
                    subtitle="Litros de diésel evitados"
                    icon={<TrendingDown className="w-6 h-6" />}
                  />
                  <StatCard
                    title="Emisiones evitadas"
                    value={`${(mitigationAnalysis.reduce((sum, m) => sum + m.totalPotentialEmissionsReductionKgCO2e, 0) / 1000).toLocaleString('es-CL', { maximumFractionDigits: 1 })} tCO₂e/año`}
                    subtitle="Reducción de huella de carbono"
                    icon={<Leaf className="w-6 h-6" />}
                  />
                </div>
              </div>

              {mitigationAnalysis.map((analysis) => (
                <div key={analysis.company} className="stat-card">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-600" />
                        {analysis.company}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Consumo anual estimado: {analysis.currentAnnualLiters.toLocaleString('es-CL', { maximumFractionDigits: 0 })} L
                        (${analysis.currentAnnualCost.toLocaleString('es-CL')})
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Emisiones actuales</div>
                      <div className="text-sm font-semibold text-orange-600">
                        {(analysis.currentAnnualEmissionsKgCO2e / 1000).toLocaleString('es-CL', { maximumFractionDigits: 1 })} tCO₂e/año
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {analysis.measures.map((measure) => (
                      <div
                        key={measure.id}
                        className={`rounded-lg border p-3 ${
                          measure.type === 'electric_bus'
                            ? 'border-emerald-200 bg-emerald-50/50'
                            : measure.type === 'hybrid_bus'
                            ? 'border-teal-200 bg-teal-50/50'
                            : measure.type === 'route_optimization'
                            ? 'border-blue-200 bg-blue-50/50'
                            : 'border-slate-200 bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {measure.type === 'electric_bus' && <Zap className="w-4 h-4 text-emerald-600" />}
                            {measure.type === 'hybrid_bus' && <Fuel className="w-4 h-4 text-teal-600" />}
                            {measure.type === 'route_optimization' && <TrendingDown className="w-4 h-4 text-blue-600" />}
                            {measure.type === 'fleet_maintenance' && <Factory className="w-4 h-4 text-slate-600" />}
                            <span className="font-semibold text-xs">{measure.title}</span>
                          </div>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            measure.paybackYears <= 5
                              ? 'bg-emerald-100 text-emerald-700'
                              : measure.paybackYears <= 10
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            Retorno: {measure.paybackYears.toFixed(1)} años
                          </span>
                        </div>

                        <p className="text-[11px] text-muted-foreground mb-3">{measure.description}</p>

                        <div className="grid grid-cols-2 gap-2 text-[10px] mb-2">
                          <div>
                            <span className="text-muted-foreground">Inversión:</span>
                            <span className="ml-1 font-medium">${measure.investmentCLP.toLocaleString('es-CL')}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Ahorro anual:</span>
                            <span className="ml-1 font-medium text-emerald-700">
                              ${measure.annualCostSavingsCLP.toLocaleString('es-CL')}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Combustible evitado:</span>
                            <span className="ml-1 font-medium">
                              {measure.annualFuelSavingsLiters.toLocaleString('es-CL', { maximumFractionDigits: 0 })} L/año
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">CO₂e evitado:</span>
                            <span className="ml-1 font-medium text-emerald-700">
                              {(measure.annualEmissionsSavingsKgCO2e / 1000).toLocaleString('es-CL', { maximumFractionDigits: 1 })} t/año
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {measure.additionalBenefits.slice(0, 3).map((benefit, i) => (
                            <span
                              key={i}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-white/80 text-muted-foreground border"
                            >
                              {benefit}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              Aún no hay datos suficientes para generar el análisis de transición energética. Sincroniza los datos de Petróleo.
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
