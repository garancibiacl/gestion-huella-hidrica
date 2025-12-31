import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, TrendingUp, TrendingDown, Leaf, Factory, Info, Lightbulb, Target, Zap, Clock, CheckCircle2, FileDown } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { useElectricMeters } from '@/hooks/useElectricMeters';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { exportCarbonFootprintReport } from '@/lib/pdf-export';
import { useToast } from '@/hooks/use-toast';

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

  const { toast } = useToast();

  const handleExportPDF = () => {
    const emissionsByCentroWithPercentage = emissionsByCentro.map(c => ({
      ...c,
      percentage: totalEmissions > 0 ? (c.emissions / totalEmissions) * 100 : 0
    }));

    const opportunities = emissionsByCentro.slice(0, 3).map((centro, idx) => ({
      centro: centro.centro,
      priority: (idx === 0 ? 'alta' : idx === 1 ? 'media' : 'baja') as 'alta' | 'media' | 'baja',
      potentialReduction: centro.emissions * 0.15,
      actions: getSuggestionsForRank(idx, centro.centro, centro.emissions).map(s => s.title)
    }));

    const dateRange = filteredSummaries.length > 0 
      ? `${filteredSummaries[0].label} - ${filteredSummaries[filteredSummaries.length - 1].label}`
      : undefined;

    exportCarbonFootprintReport({
      periodSummaries: filteredSummaries,
      emissionsByCentro: emissionsByCentroWithPercentage,
      opportunities,
      totalEmissions,
      totalKwh,
      emissionsPerKwh,
      variation,
      usesDefaultFactor,
      organization: 'Sistema de Gestión Ambiental',
      dateRange,
    });

    toast({
      title: 'Reporte exportado',
      description: 'El reporte de huella de carbono se ha descargado correctamente.',
    });
  };

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
        <div className="flex flex-wrap items-end gap-3">
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
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportPDF}
            className="gap-2 border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10"
          >
            <FileDown className="w-4 h-4" />
            Exportar PDF
          </Button>
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

      {/* Panel de Oportunidades de Reducción */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="stat-card mt-6 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-emerald-500/20">
            <Lightbulb className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h4 className="font-semibold">Oportunidades de Reducción</h4>
            <p className="text-sm text-muted-foreground">
              Acciones priorizadas según huella de carbono por centro.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {emissionsByCentro.slice(0, 3).map((centro, idx) => {
            const percentage = totalEmissions > 0 ? (centro.emissions / totalEmissions) * 100 : 0;
            const potentialReduction = centro.emissions * 0.15; // 15% potential
            const priority = idx === 0 ? 'alta' : idx === 1 ? 'media' : 'baja';
            const priorityColor = idx === 0 ? 'bg-red-500/10 text-red-600 border-red-500/30' : 
                                  idx === 1 ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' : 
                                  'bg-blue-500/10 text-blue-600 border-blue-500/30';
            
            // Generar sugerencias basadas en el ranking
            const suggestions = getSuggestionsForRank(idx, centro.centro, centro.emissions);
            
            return (
              <div 
                key={centro.centro}
                className="p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-card/80 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-600 text-sm flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    <div>
                      <h5 className="font-medium">{centro.centro}</h5>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(centro.emissions).toLocaleString('es-CL')} kgCO₂e ({percentage.toFixed(1)}% del total)
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={priorityColor}>
                    Prioridad {priority}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {suggestions.map((suggestion, sIdx) => (
                    <div 
                      key={sIdx}
                      className="flex items-start gap-2 p-3 rounded-lg bg-muted/30"
                    >
                      <suggestion.icon className={`w-4 h-4 mt-0.5 ${suggestion.iconColor}`} />
                      <div>
                        <p className="text-sm font-medium">{suggestion.title}</p>
                        <p className="text-xs text-muted-foreground">{suggestion.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-600">
                    <Target className="w-3.5 h-3.5" />
                    <span>Potencial reducción: <strong>{Math.round(potentialReduction).toLocaleString('es-CL')} kgCO₂e/año</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Tiempo estimado: {idx === 0 ? '3-6 meses' : idx === 1 ? '6-12 meses' : '1-2 años'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Resumen de potencial total */}
        <div className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              <div>
                <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                  Potencial de reducción total estimado
                </p>
                <p className="text-sm text-muted-foreground">
                  Implementando las acciones sugeridas en los 3 centros principales
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-emerald-600">
                {Math.round(emissionsByCentro.slice(0, 3).reduce((sum, c) => sum + c.emissions * 0.15, 0)).toLocaleString('es-CL')}
              </p>
              <p className="text-xs text-muted-foreground">kgCO₂e/año</p>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// Función para generar sugerencias basadas en el ranking
function getSuggestionsForRank(rank: number, centro: string, emissions: number) {
  const allSuggestions = [
    // Sugerencias de alta prioridad (rank 0)
    [
      {
        icon: Zap,
        iconColor: 'text-amber-500',
        title: 'Auditoría energética inmediata',
        description: 'Identificar equipos de alto consumo y patrones de uso ineficiente.'
      },
      {
        icon: Lightbulb,
        iconColor: 'text-yellow-500',
        title: 'Migración a iluminación LED',
        description: 'Reducción de hasta 70% en consumo de iluminación.'
      },
      {
        icon: Clock,
        iconColor: 'text-blue-500',
        title: 'Optimizar horarios operativos',
        description: 'Evaluar turnos y horarios de máximo consumo.'
      },
      {
        icon: Target,
        iconColor: 'text-emerald-500',
        title: 'Metas de reducción mensuales',
        description: 'Establecer KPIs de consumo por área.'
      }
    ],
    // Sugerencias de prioridad media (rank 1)
    [
      {
        icon: Zap,
        iconColor: 'text-amber-500',
        title: 'Mantenimiento preventivo',
        description: 'Revisar eficiencia de equipos eléctricos principales.'
      },
      {
        icon: Lightbulb,
        iconColor: 'text-yellow-500',
        title: 'Sensores de movimiento',
        description: 'Automatizar iluminación en áreas de tránsito.'
      },
      {
        icon: Activity,
        iconColor: 'text-purple-500',
        title: 'Monitoreo en tiempo real',
        description: 'Instalar medidores inteligentes para seguimiento.'
      },
      {
        icon: Target,
        iconColor: 'text-emerald-500',
        title: 'Capacitación del personal',
        description: 'Concientización sobre uso eficiente de energía.'
      }
    ],
    // Sugerencias de baja prioridad (rank 2+)
    [
      {
        icon: Zap,
        iconColor: 'text-amber-500',
        title: 'Evaluación de equipos',
        description: 'Considerar reemplazo por equipos eficientes.'
      },
      {
        icon: Lightbulb,
        iconColor: 'text-yellow-500',
        title: 'Aprovechamiento luz natural',
        description: 'Optimizar disposición de espacios de trabajo.'
      },
      {
        icon: TrendingDown,
        iconColor: 'text-emerald-500',
        title: 'Seguimiento trimestral',
        description: 'Revisar tendencias y ajustar acciones.'
      },
      {
        icon: CheckCircle2,
        iconColor: 'text-blue-500',
        title: 'Documentar mejores prácticas',
        description: 'Replicar éxitos en otros centros.'
      }
    ]
  ];

  return allSuggestions[Math.min(rank, 2)];
}
