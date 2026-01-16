import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Fuel, Factory, RefreshCw, Building2, Zap, TrendingDown, DollarSign, Leaf } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { DashboardHeader } from '@/components/ui/dashboard-header';
import { StatCard } from '@/components/ui/stat-card';
import { LoaderHourglass } from '@/components/ui/loader-hourglass';
import { EmptyState } from '@/components/ui/empty-state';
import { ChartCard } from '@/components/ui/chart-card';
import { NextActionPanel } from '@/components/ui/next-action-panel';
import { PETROLEUM_EMISSION_FACTOR_KG_CO2E_PER_LITER, usePetroleumData } from '@/hooks/usePetroleumData';
import { usePetroleumSync } from '@/hooks/usePetroleumSync';
import { ExportPDFButton } from '@/components/export/ExportPDFButton';
import { exportPetroleumReport } from '@/lib/pdf-export';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  aggregatePetroleumByCompany,
  aggregatePetroleumByPeriod,
  buildMitigationAnalysis,
  buildPetroleumRecommendations,
  calculatePetroleumDashboardMetrics,
} from '@/lib/petroleum/utils';

export default function PetroleumDashboard() {
  const {
    loading,
    error,
    lastUpdated,
    refetch,
    readings,
  } = usePetroleumData();
  const { sync: syncPetroleum, isSyncing, lastSyncAt } = usePetroleumSync({
    enabled: true,
    onSyncComplete: async (success, rowsProcessed) => {
      if (success && rowsProcessed > 0) {
        await refetch();
      }
    },
  });

  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [selectedCenter, setSelectedCenter] = useState('all');
  const [selectedMedidor, setSelectedMedidor] = useState('all');

  const periodOptions = useMemo(() => {
    const map = new Map<string, string>();
    readings.forEach((reading) => {
      if (!map.has(reading.periodKey)) {
        map.set(reading.periodKey, reading.periodLabel);
      }
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [readings]);

  const centerOptions = useMemo(
    () => Array.from(new Set(readings.map((reading) => reading.center).filter(Boolean))).sort(),
    [readings],
  );

  const medidorOptions = useMemo(
    () => Array.from(new Set(readings.map((reading) => reading.supplier).filter(Boolean))).sort(),
    [readings],
  );

  const filteredReadings = useMemo(
    () =>
      readings.filter((reading) => {
        if (selectedPeriod !== 'all' && reading.periodKey !== selectedPeriod) return false;
        if (selectedCenter !== 'all' && reading.center !== selectedCenter) return false;
        if (selectedMedidor !== 'all' && reading.supplier !== selectedMedidor) return false;
        return true;
      }),
    [readings, selectedPeriod, selectedCenter, selectedMedidor],
  );

  const filteredAggregates = useMemo(
    () =>
      aggregatePetroleumByPeriod(filteredReadings, PETROLEUM_EMISSION_FACTOR_KG_CO2E_PER_LITER),
    [filteredReadings],
  );

  const filteredCompanyAggregates = useMemo(
    () =>
      aggregatePetroleumByCompany(filteredReadings, PETROLEUM_EMISSION_FACTOR_KG_CO2E_PER_LITER),
    [filteredReadings],
  );

  const filteredMetrics = useMemo(() => {
    if (filteredReadings.length === 0) return null;
    return calculatePetroleumDashboardMetrics(filteredReadings, PETROLEUM_EMISSION_FACTOR_KG_CO2E_PER_LITER);
  }, [filteredReadings]);

  const filteredRecommendations = useMemo(() => {
    if (filteredAggregates.length === 0) return null;
    return buildPetroleumRecommendations(filteredAggregates);
  }, [filteredAggregates]);

  const filteredMitigationAnalysis = useMemo(() => {
    if (filteredCompanyAggregates.length === 0) return [];
    return buildMitigationAnalysis(filteredCompanyAggregates, PETROLEUM_EMISSION_FACTOR_KG_CO2E_PER_LITER);
  }, [filteredCompanyAggregates]);

  const latest = filteredAggregates[filteredAggregates.length - 1];
  const previous = filteredAggregates[filteredAggregates.length - 2];
  const nextActions = useMemo(() => {
    if (filteredRecommendations && filteredRecommendations.recommendations.length > 0) {
      return filteredRecommendations.recommendations.slice(0, 3).map((rec) => rec.message);
    }
    return [
      'Revisar centros con mayor consumo de combustible.',
      'Validar rutas con alza sostenida de litros.',
      'Priorizar medidas de eficiencia operativa en faenas críticas.',
    ];
  }, [filteredRecommendations]);

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
      filteredAggregates.map((agg) => ({
        period: agg.periodLabel,
        liters: agg.totalLiters,
        cost: agg.totalCost,
      })),
    [filteredAggregates],
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
      <div className="bg-[#F4F5F7]">
        <div className="page-container flex items-center justify-center py-12">
          <LoaderHourglass label="Preparando datos de petróleo" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#F4F5F7]">
        <div className="page-container">
          <DashboardHeader
            title="Dashboard Petróleo"
            description="Monitoreo de consumo de combustibles fósiles y su huella de carbono."
            className="mb-10 flex flex-col items-start justify-between gap-4 rounded-2xl border border-gray-100 bg-white px-6 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.12)] sm:flex-row sm:items-center"
          />
          <div className="mt-6">
            <EmptyState
              title="No pudimos cargar los datos"
              description={error}
              icon={<Factory className="h-10 w-10 text-destructive" />}
              tone="error"
            />
          </div>
        </div>
      </div>
    );
  }

  const hasData = !!filteredMetrics && filteredAggregates.length > 0;
  const totalEmissionsTons = hasData ? filteredMetrics!.totalEmissionsKgCO2e / 1000 : 0;

  return (
    <div className="bg-[#F4F5F7]">
      <div className="page-container space-y-6">
        <DashboardHeader
        title="Dashboard Petróleo"
        description="Consumo de combustibles fósiles, costos asociados y huella de carbono."
        narrative="Este mes puedes revisar consumo, costos y huella para orientar planes de eficiencia."
        className="mb-10 flex flex-col items-start justify-between gap-4 rounded-2xl border border-gray-100 bg-white px-6 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.12)] sm:flex-row sm:items-center"
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => syncPetroleum(true)}
              disabled={isSyncing}
              size="sm"
              className="gap-2 bg-[#C3161D] text-white hover:bg-[#A31217]"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Sincronizar Petróleo'}
            </Button>
            <ExportPDFButton
              onExport={async () => {
                if (!hasData || !filteredMetrics || filteredAggregates.length === 0) return;

                const summaries = filteredAggregates.map((agg) => ({
                  period: agg.periodKey,
                  label: agg.periodLabel,
                  liters: agg.totalLiters,
                  cost: agg.totalCost,
                }));

                exportPetroleumReport({
                  summaries,
                  totalLiters: filteredMetrics.totalLiters,
                  totalCost: filteredMetrics.totalCost,
                  totalEmissionsKgCO2e: filteredMetrics.totalEmissionsKgCO2e,
                  variationLitersPct,
                });
              }}
              label="Exportar PDF"
            />
          </div>
        }
        statusLabel={isSyncing ? 'Sincronizando' : (lastSyncAt || lastUpdated) ? 'Actualizado' : 'Pendiente'}
        statusTone={isSyncing ? 'warning' : (lastSyncAt || lastUpdated) ? 'success' : 'muted'}
        statusDetail={
          (lastSyncAt || lastUpdated) && !isSyncing
            ? `Última actualización: ${formatLastSync(lastSyncAt || lastUpdated!)}`
            : !lastSyncAt && !lastUpdated && !isSyncing
            ? 'Sin sincronizaciones recientes'
            : undefined
        }
        />

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

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="petroleum-period" className="text-xs font-medium text-muted-foreground">
              Período
            </label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger id="petroleum-period" className="w-full [&>span]:line-clamp-2 [&>span]:leading-tight">
                <SelectValue placeholder="Todos los períodos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los períodos</SelectItem>
                {periodOptions.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="petroleum-center" className="text-xs font-medium text-muted-foreground">
              Centro de trabajo
            </label>
            <Select value={selectedCenter} onValueChange={setSelectedCenter}>
              <SelectTrigger id="petroleum-center" className="w-full [&>span]:line-clamp-2 [&>span]:leading-tight">
                <SelectValue placeholder="Todos los centros" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los centros</SelectItem>
                {centerOptions.map((center) => (
                  <SelectItem key={center} value={center}>
                    {center}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="petroleum-medidor" className="text-xs font-medium text-muted-foreground">
              Medidor
            </label>
            <Select value={selectedMedidor} onValueChange={setSelectedMedidor}>
              <SelectTrigger id="petroleum-medidor" className="w-full [&>span]:line-clamp-2 [&>span]:leading-tight">
                <SelectValue placeholder="Todos los medidores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los medidores</SelectItem>
                {medidorOptions.map((medidor) => (
                  <SelectItem key={medidor} value={medidor}>
                    {medidor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        <TabsContent value="consumo" className="mt-6 space-y-6">
          {hasData ? (
            <>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid gap-4 md:grid-cols-3"
              >
                <StatCard
                  title="Consumo total"
                  value={`${filteredMetrics!.totalLiters.toLocaleString('es-CL', { maximumFractionDigits: 0 })} L`}
                  subtitle="Suma del período consolidado"
                  icon={<Flame className="w-6 h-6" />}
                  variant="primary"
                />

                <StatCard
                  title="Costo total asociado"
                  value={`$${filteredMetrics!.totalCost.toLocaleString('es-CL')}`}
                  subtitle="Gasto asociado al consumo"
                  icon={<Fuel className="w-6 h-6" />}
                  variant="minimal"
                />

                <StatCard
                  title="Huella estimada"
                  value={`${totalEmissionsTons.toLocaleString('es-CL', { maximumFractionDigits: 2 })} tCO₂e`}
                  subtitle="Emisiones asociadas al consumo"
                  icon={<Factory className="w-6 h-6" />}
                  trend={latest && previous ? {
                    value: `${variationEmissionsPct.toFixed(1)}% vs período anterior`,
                    positive: variationEmissionsPct <= 0,
                  } : undefined}
                  badge={{
                    text: variationEmissionsPct <= 0 ? 'Emisiones a la baja' : 'Atención: alza en emisiones',
                    variant: variationEmissionsPct <= 0 ? 'success' : 'warning',
                  }}
                  variant="minimal"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="stat-card"
              >
                <ChartCard
                  title="Histórico de consumo"
                  subtitle="Litros y costos por período para identificar tendencias."
                >
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="period" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={40} />
                        <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                        <RechartsTooltip
                          contentStyle={TOOLTIP_STYLE}
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
                </ChartCard>
              </motion.div>

              <NextActionPanel items={nextActions} />
            </>
          ) : (
            <EmptyState
              title="Sin datos de petróleo"
              description='Sincroniza para ver KPIs e histórico de consumo.'
              icon={<Flame className="h-10 w-10 text-muted-foreground" />}
            />
          )}
        </TabsContent>

        <TabsContent value="huella" className="mt-6 space-y-4">
          {hasData ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="stat-card"
            >
              <ChartCard
                title="Huella de carbono asociada al petróleo"
                subtitle="Estimación de emisiones de CO₂e derivadas del consumo total."
              >
                <div className="grid gap-4 md:grid-cols-3">
                  <StatCard
                    title="Emisiones totales"
                    value={`${totalEmissionsTons.toLocaleString('es-CL', { maximumFractionDigits: 2 })} tCO₂e`}
                    subtitle="Suma del período consolidado"
                    icon={<Factory className="w-6 h-6" />}
                    variant="primary"
                  />
                  <StatCard
                    title="Intensidad de emisiones"
                    value={`${(filteredMetrics!.totalEmissionsKgCO2e / filteredMetrics!.totalLiters).toFixed(2)} kgCO₂e/L`}
                    subtitle="Factor promedio implícito"
                    variant="minimal"
                  />
                  <StatCard
                    title="Tendencia reciente"
                    value={latest && previous
                      ? `${variationEmissionsPct.toFixed(1)}% vs período anterior`
                      : 'Sin datos suficientes'}
                    subtitle="Comparación último período"
                    badge={latest && previous ? {
                      text: variationEmissionsPct <= 0 ? 'Emisiones a la baja' : 'Atención: alza en emisiones',
                      variant: variationEmissionsPct <= 0 ? 'success' : 'warning',
                    } : undefined}
                    variant="minimal"
                  />
                </div>
              </ChartCard>

            </motion.div>
          ) : (
            <EmptyState
              title="Sin datos de huella"
              description="Sincroniza primero los datos de Petróleo para calcular emisiones."
              icon={<Factory className="h-10 w-10 text-muted-foreground" />}
            />
          )}
        </TabsContent>

        <TabsContent value="empresas" className="mt-6 space-y-4">
          {hasData && filteredCompanyAggregates.length > 0 ? (
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
                  {filteredCompanyAggregates.map((company) => (
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
                      data={filteredCompanyAggregates.map((c) => ({
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
            <EmptyState
              title="Sin datos por empresa"
              description="Sincroniza datos de Petróleo para ver el desglose por empresa."
              icon={<Building2 className="h-10 w-10 text-muted-foreground" />}
            />
          )}
        </TabsContent>

        <TabsContent value="transicion" className="mt-6 space-y-4">
          {hasData && filteredMitigationAnalysis.length > 0 ? (
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
                    value={`$${filteredMitigationAnalysis.reduce((sum, m) => sum + m.totalPotentialSavingsCLP, 0).toLocaleString('es-CL')}`}
                    subtitle="Si se implementan todas las medidas"
                    icon={<DollarSign className="w-6 h-6" />}
                    variant="primary"
                  />
                  <StatCard
                    title="Reducción de combustible"
                    value={`${filteredMitigationAnalysis.reduce((sum, m) => sum + m.totalPotentialSavingsLiters, 0).toLocaleString('es-CL', { maximumFractionDigits: 0 })} L/año`}
                    subtitle="Litros de diésel evitados"
                    icon={<TrendingDown className="w-6 h-6" />}
                  />
                  <StatCard
                    title="Emisiones evitadas"
                    value={`${(filteredMitigationAnalysis.reduce((sum, m) => sum + m.totalPotentialEmissionsReductionKgCO2e, 0) / 1000).toLocaleString('es-CL', { maximumFractionDigits: 1 })} tCO₂e/año`}
                    subtitle="Reducción de huella de carbono"
                    icon={<Leaf className="w-6 h-6" />}
                  />
                </div>
              </div>

              {filteredMitigationAnalysis.map((analysis) => (
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
            <EmptyState
              title="Sin datos para transición"
              description="Sincroniza datos de Petróleo para generar el análisis de transición energética."
              icon={<Zap className="h-10 w-10 text-muted-foreground" />}
            />
          )}
        </TabsContent>

        <TabsContent value="medidas" className="mt-6 space-y-4">
          {hasData && filteredRecommendations && filteredRecommendations.recommendations.length > 0 ? (
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
                {filteredRecommendations.recommendations.map((rec, index) => (
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
            <EmptyState
              title="Sin medidas disponibles"
              description="Sincroniza más períodos de Petróleo para generar recomendaciones."
              icon={<Fuel className="h-10 w-10 text-muted-foreground" />}
            />
          )}
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
  const TOOLTIP_STYLE = {
    backgroundColor: 'hsl(var(--card))',
    border: 'none',
    borderRadius: '12px',
    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.3)',
    padding: '12px 16px',
  };
