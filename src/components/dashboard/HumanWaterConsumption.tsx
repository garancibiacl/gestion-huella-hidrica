import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Droplets,
  Package,
  Building2,
  DollarSign,
  TrendingUp,
  Upload,
  CalendarCheck,
  Leaf,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/ui/stat-card";
import { SkeletonCard, SkeletonChart } from "@/components/ui/skeleton-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ExportPDFButton } from "@/components/export/ExportPDFButton";
import { exportHumanWaterReport } from "@/lib/pdf-export";
import { LoaderHourglass } from "@/components/ui/loader-hourglass";

interface HumanWaterData {
  id: string;
  period: string;
  centro_trabajo: string;
  faena: string | null;
  formato: "botella" | "bidon_20l";
  cantidad: number;
  total_costo: number | null;
  proveedor: string | null;
}

interface ChartData {
  centro: string;
  botellas: number;
  bidones: number;
  costo: number;
}

// Corporate color palette - Primary red + complementary
const PRIMARY_COLOR = "hsl(5, 63%, 43%)"; // #b3382a
const PRIMARY_LIGHT = "hsl(5, 63%, 55%)";
const SECONDARY_COLOR = "hsl(152, 55%, 42%)"; // Green for success
const ACCENT_COLOR = "hsl(220, 13%, 46%)"; // Neutral gray
const COLORS = [
  PRIMARY_COLOR,
  SECONDARY_COLOR,
  "#8b5cf6",
  "#f59e0b",
  "#ec4899",
];

export default function HumanWaterConsumption() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HumanWaterData[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [selectedCentro, setSelectedCentro] = useState<string>("all");
  const [selectedFaena, setSelectedFaena] = useState<string>("all");
  const [selectedFormato, setSelectedFormato] = useState<string>("all");
  const [periods, setPeriods] = useState<string[]>([]);
  const [centros, setCentros] = useState<string[]>([]);
  const [faenas, setFaenas] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: consumptionData, error } = await supabase
        .from("human_water_consumption")
        .select("*")
        .order("period", { ascending: false });

      if (error) throw error;

      if (consumptionData) {
        const typedData = consumptionData.map((item) => ({
          ...item,
          formato: item.formato as "botella" | "bidon_20l",
        }));
        setData(typedData);

        // Extract unique periods, centros and faenas
        const uniquePeriods = [...new Set(consumptionData.map((d) => d.period))]
          .sort()
          .reverse();
        const uniqueCentros = [
          ...new Set(consumptionData.map((d) => d.centro_trabajo)),
        ].sort();
        const uniqueFaenas = [
          ...new Set(
            consumptionData.map((d) => d.faena).filter(Boolean) as string[]
          ),
        ].sort();
        setPeriods(uniquePeriods);
        setCentros(uniqueCentros);
        setFaenas(uniqueFaenas);
      }
    } catch (error) {
      console.error("Error fetching human water data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter((d) => {
    if (selectedPeriod !== "all" && d.period !== selectedPeriod) return false;
    if (selectedCentro !== "all" && d.centro_trabajo !== selectedCentro)
      return false;
    if (selectedFaena !== "all" && d.faena !== selectedFaena) return false;
    if (selectedFormato !== "all" && d.formato !== selectedFormato)
      return false;
    return true;
  });

  const topCenterByLiters = useMemo(() => {
    if (centros.length === 0) return null;
    const totals = centros.map((centro) => {
      const centroRows = data.filter((d) => d.centro_trabajo === centro);
      const litros = centroRows.reduce((sum, row) => {
        return (
          sum +
          (row.formato === "botella"
            ? Number(row.cantidad) * 0.5
            : Number(row.cantidad) * 20)
        );
      }, 0);
      return { centro, litros };
    });
    const sorted = totals.sort((a, b) => b.litros - a.litros);
    return sorted[0]?.centro ?? null;
  }, [centros, data]);

  const targetCenter =
    selectedCentro !== "all" ? selectedCentro : topCenterByLiters;

  const targetCenterData = targetCenter
    ? data.filter((d) => d.centro_trabajo === targetCenter)
    : [];

  const bottleRows = targetCenterData.filter((d) => d.formato === "botella");
  const bidonRows = targetCenterData.filter((d) => d.formato === "bidon_20l");
  const totalBottleUnits = bottleRows.reduce(
    (sum, d) => sum + Number(d.cantidad),
    0
  );
  const totalBidonUnits = bidonRows.reduce(
    (sum, d) => sum + Number(d.cantidad),
    0
  );
  const bottleCostTotal = bottleRows.reduce(
    (sum, d) => sum + (Number(d.total_costo) || 0),
    0
  );
  const bidonCostTotal = bidonRows.reduce(
    (sum, d) => sum + (Number(d.total_costo) || 0),
    0
  );
  const bottleUnitCost =
    totalBottleUnits > 0 ? bottleCostTotal / totalBottleUnits : 0;
  const bidonUnitCost =
    totalBidonUnits > 0 ? bidonCostTotal / totalBidonUnits : 0;
  const bottleCostPerLiter =
    totalBottleUnits > 0 ? bottleCostTotal / (totalBottleUnits * 0.5) : 0;
  const bidonCostPerLiter =
    totalBidonUnits > 0 ? bidonCostTotal / (totalBidonUnits * 20) : 0;
  const totalCenterCost = bottleCostTotal + bidonCostTotal;

  const replaceBottlePct = 0.3;
  const cantimploraPct = 0.15;

  const litersShifted = totalBottleUnits * 0.5 * replaceBottlePct;
  const savingsFromShift = Math.max(
    0,
    litersShifted * (bottleCostPerLiter - bidonCostPerLiter)
  );
  const savingsFromCantimploras =
    totalBottleUnits * cantimploraPct * bottleUnitCost;
  const estimatedMonthlySavings = savingsFromShift + savingsFromCantimploras;
  const savings3mPct =
    totalCenterCost > 0
      ? Math.min(100, ((estimatedMonthlySavings * 3) / totalCenterCost) * 100)
      : 0;
  const savings6mPct =
    totalCenterCost > 0
      ? Math.min(100, ((estimatedMonthlySavings * 6) / totalCenterCost) * 100)
      : 0;

  const centerMetrics = useMemo(() => {
    const grouped = filteredData.reduce<
      Record<string, { period: string; litros: number; cost: number }[]>
    >((acc, row) => {
      if (!acc[row.centro_trabajo]) acc[row.centro_trabajo] = [];
      const litros =
        row.formato === "botella"
          ? Number(row.cantidad) * 0.5
          : Number(row.cantidad) * 20;
      const existing = acc[row.centro_trabajo].find(
        (item) => item.period === row.period
      );
      if (existing) {
        existing.litros += litros;
        existing.cost += Number(row.total_costo ?? 0);
      } else {
        acc[row.centro_trabajo].push({
          period: row.period,
          litros,
          cost: Number(row.total_costo ?? 0),
        });
      }
      return acc;
    }, {});

    const metrics = Object.entries(grouped).map(([centro, rows]) => {
      const ordered = [...rows].sort((a, b) =>
        a.period.localeCompare(b.period)
      );
      const last = ordered[ordered.length - 1];
      const prev = ordered[ordered.length - 2];
      const variationPct =
        last && prev && prev.litros > 0
          ? ((last.litros - prev.litros) / prev.litros) * 100
          : 0;
      const costPerLiter =
        last && last.litros > 0 ? last.cost / last.litros : 0;
      const prevCostPerLiter =
        prev && prev.litros > 0 ? prev.cost / prev.litros : 0;
      const costPerLiterPct =
        prevCostPerLiter > 0
          ? ((costPerLiter - prevCostPerLiter) / prevCostPerLiter) * 100
          : 0;
      return { centro, variationPct, costPerLiter, costPerLiterPct };
    });

    const topVariation = [...metrics]
      .sort((a, b) => b.variationPct - a.variationPct)
      .slice(0, 3);
    const topCostPerLiter = [...metrics]
      .sort((a, b) => b.costPerLiterPct - a.costPerLiterPct)
      .slice(0, 3);
    return { topVariation, topCostPerLiter };
  }, [filteredData]);

  // Calculate totals
  const totalBotellas = filteredData
    .filter((d) => d.formato === "botella")
    .reduce((sum, d) => sum + Number(d.cantidad), 0);

  const totalBidones = filteredData
    .filter((d) => d.formato === "bidon_20l")
    .reduce((sum, d) => sum + Number(d.cantidad), 0);

  const totalCosto = filteredData.reduce(
    (sum, d) => sum + (Number(d.total_costo) || 0),
    0
  );

  // Total liters (assuming 500ml bottles and 20L jugs)
  const totalLitros = totalBotellas * 0.5 + totalBidones * 20;

  // Chart data by centro
  const chartByCentro: ChartData[] = centros
    .map((centro) => {
      const centroData = filteredData.filter(
        (d) => d.centro_trabajo === centro
      );
      return {
        centro: centro.length > 15 ? centro.substring(0, 12) + "..." : centro,
        botellas: centroData
          .filter((d) => d.formato === "botella")
          .reduce((sum, d) => sum + Number(d.cantidad), 0),
        bidones: centroData
          .filter((d) => d.formato === "bidon_20l")
          .reduce((sum, d) => sum + Number(d.cantidad), 0),
        costo: centroData.reduce(
          (sum, d) => sum + (Number(d.total_costo) || 0),
          0
        ),
      };
    })
    .filter((d) => d.botellas > 0 || d.bidones > 0);

  // Pie data for format distribution
  const pieData = [
    { name: "Botellas", value: totalBotellas, litros: totalBotellas * 0.5 },
    { name: "Bidones 20L", value: totalBidones, litros: totalBidones * 20 },
  ].filter((d) => d.value > 0);

  const formatPeriod = (period: string) => {
    const [year, month] = period.split("-");
    const months = [
      "Ene",
      "Feb",
      "Mar",
      "Abr",
      "May",
      "Jun",
      "Jul",
      "Ago",
      "Sep",
      "Oct",
      "Nov",
      "Dic",
    ];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center py-6">
          <LoaderHourglass label="Cargando consumo humano" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonChart />
      </>
    );
  }

  if (data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="stat-card flex flex-col items-center justify-center py-12"
      >
        <Droplets className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">
          Sin datos de consumo humano
        </h3>
        <p className="text-muted-foreground text-center mb-4 max-w-md">
          Aún no hay registros de consumo de agua para consumo humano. Importa
          datos desde tu archivo Excel.
        </p>
        <Link to="/importar">
          <Button className="gap-2">
            <Upload className="w-4 h-4" />
            Importar datos
          </Button>
        </Link>
      </motion.div>
    );
  }

  return (
    <>
      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="human-water-period"
              className="text-xs font-medium text-muted-foreground"
            >
              Período
            </label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger
                id="human-water-period"
                className="w-full [&>span]:line-clamp-2 [&>span]:leading-tight"
              >
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
            <label
              htmlFor="human-water-centro"
              className="text-xs font-medium text-muted-foreground"
            >
              Centro de trabajo
            </label>
            <Select value={selectedCentro} onValueChange={setSelectedCentro}>
              <SelectTrigger
                id="human-water-centro"
                className="w-full [&>span]:line-clamp-2 [&>span]:leading-tight"
              >
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

          {faenas.length > 0 && (
            <div className="flex flex-col gap-1">
              <label
                htmlFor="human-water-faena"
                className="text-xs font-medium text-muted-foreground"
              >
                Faena
              </label>
              <Select value={selectedFaena} onValueChange={setSelectedFaena}>
                <SelectTrigger
                  id="human-water-faena"
                  className="w-full [&>span]:line-clamp-2 [&>span]:leading-tight"
                >
                  <SelectValue placeholder="Selecciona una faena" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las faenas</SelectItem>
                  {faenas.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label
              htmlFor="human-water-formato"
              className="text-xs font-medium text-muted-foreground"
            >
              Formato
            </label>
            <Select value={selectedFormato} onValueChange={setSelectedFormato}>
              <SelectTrigger
                id="human-water-formato"
                className="w-full [&>span]:line-clamp-2 [&>span]:leading-tight"
              >
                <SelectValue placeholder="Selecciona un formato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los formatos</SelectItem>
                <SelectItem value="botella">Botellas</SelectItem>
                <SelectItem value="bidon_20l">Bidones 20L</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </motion.div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border border-border bg-background px-3 py-1">
            Litros botellas:{" "}
            <span className="font-medium text-foreground">
              {(totalBotellas * 0.5).toLocaleString()} L
            </span>
            <span className="text-muted-foreground">
              {" "}
              (
              {totalLitros > 0
                ? (((totalBotellas * 0.5) / totalLitros) * 100).toFixed(0)
                : "0"}
              %)
            </span>
          </span>
          <span className="rounded-full border border-border bg-background px-3 py-1">
            Litros bidones:{" "}
            <span className="font-medium text-foreground">
              {(totalBidones * 20).toLocaleString()} L
            </span>
            <span className="text-muted-foreground">
              {" "}
              (
              {totalLitros > 0
                ? (((totalBidones * 20) / totalLitros) * 100).toFixed(0)
                : "0"}
              %)
            </span>
          </span>
        </div>
        <ExportPDFButton
          onExport={async () => {
            const logoResponse = await fetch("/images/logo.png");
            const logoBlob = await logoResponse.blob();
            const logoDataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => reject(reader.error);
              reader.readAsDataURL(logoBlob);
            });
            const periodData = periods
              .slice(0, 12)
              .reverse()
              .map((period) => {
                const pData = data.filter((d) => d.period === period);
                return {
                  period: formatPeriod(period),
                  botellas: pData
                    .filter((d) => d.formato === "botella")
                    .reduce((sum, d) => sum + Number(d.cantidad), 0),
                  bidones: pData
                    .filter((d) => d.formato === "bidon_20l")
                    .reduce((sum, d) => sum + Number(d.cantidad), 0),
                  costo: pData.reduce(
                    (sum, d) => sum + (Number(d.total_costo) || 0),
                    0
                  ),
                };
              });
            exportHumanWaterReport({
              periods: periodData,
              totalBotellas,
              totalBidones,
              totalLitros,
              totalCosto,
              logoDataUrl,
              recommendations: targetCenter
                ? {
                    center: targetCenter,
                    savingsFromCantimploras,
                    savingsFromShift,
                    monthlySavings: estimatedMonthlySavings,
                    savings3m: estimatedMonthlySavings * 3,
                    savings6m: estimatedMonthlySavings * 6,
                  }
                : undefined,
              dateRange:
                selectedPeriod === "all"
                  ? "Todos los períodos"
                  : formatPeriod(selectedPeriod),
            });
          }}
          label="Exportar PDF"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard
          title="Total Botellas"
          value={totalBotellas.toLocaleString()}
          icon={<Package className="w-5 h-5" />}
          subtitle={`${(totalBotellas * 0.5).toLocaleString()} litros`}
          delay={0}
        />
        <StatCard
          title="Total Bidones 20L"
          value={totalBidones.toLocaleString()}
          icon={<Droplets className="w-5 h-5" />}
          subtitle={`${(totalBidones * 20).toLocaleString()} litros`}
          delay={0.1}
        />
        <StatCard
          title="Litros Totales"
          value={totalLitros.toLocaleString()}
          icon={<Droplets className="w-5 h-5" />}
          subtitle="Botellas + bidones"
          delay={0.2}
        />
        <StatCard
          title="Costo Total"
          value={`$${totalCosto.toLocaleString()}`}
          icon={<DollarSign className="w-5 h-5" />}
          delay={0.3}
        />
        <StatCard
          title="Centros de Trabajo"
          value={centros.length.toString()}
          icon={<Building2 className="w-5 h-5" />}
          subtitle="Con registros cargados"
          delay={0.4}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="stat-card">
          <h4 className="font-semibold mb-1">Variación vs período anterior</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Top centros con mayor aumento de litros.
          </p>
          <div className="space-y-3 text-sm">
            {centerMetrics.topVariation.length > 0 ? (
              centerMetrics.topVariation.map((item) => (
                <div
                  key={item.centro}
                  className="flex items-center justify-between border-b border-border/60 pb-2 last:border-b-0 last:pb-0"
                >
                  <span className="font-medium">{item.centro}</span>
                  <span
                    className={`text-xs font-medium ${
                      item.variationPct > 0 ? "text-warning" : "text-success"
                    }`}
                  >
                    {item.variationPct.toFixed(1)}%
                  </span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">
                Sin datos suficientes para comparar.
              </p>
            )}
          </div>
        </div>
        <div className="stat-card">
          <h4 className="font-semibold mb-1">Costo por litro</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Centros con alza de costo unitario.
          </p>
          <div className="space-y-3 text-sm">
            {centerMetrics.topCostPerLiter.length > 0 ? (
              centerMetrics.topCostPerLiter.map((item) => (
                <div
                  key={item.centro}
                  className="flex items-center justify-between border-b border-border/60 pb-2 last:border-b-0 last:pb-0"
                >
                  <span className="font-medium">{item.centro}</span>
                  <span
                    className={`text-xs font-medium ${
                      item.costPerLiterPct > 0 ? "text-warning" : "text-success"
                    }`}
                  >
                    {item.costPerLiter.toFixed(2)} $/L ·{" "}
                    {item.costPerLiterPct.toFixed(1)}%
                  </span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">
                Sin datos suficientes para comparar.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="stat-card mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h4 className="font-semibold mb-1">
              Medidas recomendadas (consumo humano)
            </h4>
            <p className="text-sm text-muted-foreground">
              Propuesta para reducir botellas y aumentar bidones
              {targetCenter ? ` en ${targetCenter}` : ""}.
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="human-water-target-center"
              className="text-xs font-medium text-muted-foreground"
            >
              Centro objetivo
            </label>
            <Select value={selectedCentro} onValueChange={setSelectedCentro}>
              <SelectTrigger
                id="human-water-target-center"
                className="w-full sm:w-56"
              >
                <SelectValue placeholder="Selecciona centro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Centro con mayor consumo</SelectItem>
                {centros.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {targetCenter ? (
            <>
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-lg bg-success/10 text-success flex items-center justify-center">
                      <Leaf className="h-4 w-4" />
                    </div>
                    <p className="font-medium">
                      Cantimploras (reducir botellas)
                    </p>
                  </div>
                  <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                    -{(cantimploraPct * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Sustituye botellas por cantimploras reutilizables en el centro
                  objetivo.
                </p>
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground">
                    Ahorro mensual estimado
                  </p>
                  <p className="text-xl font-semibold">
                    ${Math.round(savingsFromCantimploras).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Droplets className="h-4 w-4" />
                    </div>
                    <p className="font-medium">Migración a bidones 20L</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    -{(replaceBottlePct * 100).toFixed(0)}% botellas
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Sustituye litros de botellas por bidones con menor costo por
                  litro.
                </p>
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground">
                    Ahorro mensual estimado
                  </p>
                  <p className="text-xl font-semibold">
                    ${Math.round(savingsFromShift).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
                      <CalendarCheck className="h-4 w-4" />
                    </div>
                    <p className="font-medium">Impacto proyectado</p>
                  </div>
                  <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                    3-6 meses
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Proyección acumulada si se mantienen las medidas.
                </p>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-muted px-2 py-0.5">
                      Ahora
                    </span>
                    <span className="h-px flex-1 bg-muted" />
                    <span className="rounded-full bg-warning/10 px-2 py-0.5 text-warning">
                      3 meses
                    </span>
                    <span className="h-px flex-1 bg-muted" />
                    <span className="rounded-full bg-warning/10 px-2 py-0.5 text-warning">
                      6 meses
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-warning/40 to-warning"
                      style={{ width: `${savings3mPct.toFixed(0)}%` }}
                    />
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-warning/40 to-warning"
                      style={{ width: `${savings6mPct.toFixed(0)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>3 meses</span>
                    <span>
                      $
                      {Math.round(estimatedMonthlySavings * 3).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>6 meses</span>
                    <span>
                      $
                      {Math.round(estimatedMonthlySavings * 6).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ahorro mensual combinado: $
                    {Math.round(estimatedMonthlySavings).toLocaleString()}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              Selecciona un centro para ver recomendaciones específicas.
            </div>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Bar chart by centro */}
        <motion.div
          initial={{ opacity: 0, x: -30, rotateY: -5 }}
          animate={{ opacity: 1, x: 0, rotateY: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="stat-card relative overflow-hidden group"
        >
          {/* Animated accent line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500/60 via-red-400/40 to-transparent origin-left"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <h3 className="font-semibold mb-1">
              Consumo por Centro de Trabajo
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Distribución de botellas y bidones
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="h-72"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartByCentro} layout="vertical">
                <defs>
                  <linearGradient
                    id="botellasGradient"
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="0"
                  >
                    <stop
                      offset="0%"
                      stopColor={PRIMARY_COLOR}
                      stopOpacity={0.9}
                    />
                    <stop
                      offset="100%"
                      stopColor={PRIMARY_LIGHT}
                      stopOpacity={1}
                    />
                  </linearGradient>
                  <linearGradient
                    id="bidonesGradient"
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="0"
                  >
                    <stop
                      offset="0%"
                      stopColor={SECONDARY_COLOR}
                      stopOpacity={0.9}
                    />
                    <stop
                      offset="100%"
                      stopColor="hsl(152, 55%, 50%)"
                      stopOpacity={1}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  horizontal={true}
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
                  width={100}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "none",
                    borderRadius: "12px",
                    boxShadow: "0 10px 40px -10px rgba(0,0,0,0.3)",
                    padding: "12px 16px",
                  }}
                  labelStyle={{
                    fontWeight: 600,
                    marginBottom: "6px",
                    color: "hsl(var(--foreground))",
                  }}
                  cursor={{ fill: "hsl(var(--primary) / 0.05)" }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: "16px" }}
                  iconType="circle"
                  iconSize={8}
                />
                <Bar
                  dataKey="botellas"
                  name="Botellas"
                  fill="url(#botellasGradient)"
                  radius={[0, 6, 6, 0]}
                  isAnimationActive={true}
                  animationBegin={500}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
                <Bar
                  dataKey="bidones"
                  name="Bidones 20L"
                  fill="url(#bidonesGradient)"
                  radius={[0, 6, 6, 0]}
                  isAnimationActive={true}
                  animationBegin={700}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </motion.div>

        {/* Pie chart for format distribution */}
        <motion.div
          initial={{ opacity: 0, x: 30, rotateY: 5 }}
          animate={{ opacity: 1, x: 0, rotateY: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="stat-card relative overflow-hidden group"
        >
          {/* Animated accent line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500/60 via-teal-400/40 to-transparent origin-left"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <h3 className="font-semibold mb-1">Distribución por Formato</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Proporción de botellas vs bidones
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="h-72"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="hsl(var(--card))"
                  strokeWidth={2}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={{
                    stroke: "hsl(var(--muted-foreground))",
                    strokeWidth: 1,
                  }}
                  isAnimationActive={true}
                  animationBegin={600}
                  animationDuration={1500}
                  animationEasing="ease-out"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.name === "Botellas"
                          ? PRIMARY_COLOR
                          : SECONDARY_COLOR
                      }
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "none",
                    borderRadius: "12px",
                    boxShadow: "0 10px 40px -10px rgba(0,0,0,0.3)",
                    padding: "12px 16px",
                  }}
                  formatter={(value: number, name: string, props: any) => [
                    `${value.toLocaleString()} unidades (${props.payload.litros.toLocaleString()}L)`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        </motion.div>
      </div>

      {/* Summary by period */}
      {selectedPeriod === "all" && periods.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="stat-card relative overflow-hidden group"
        >
          {/* Animated background gradient */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.8 }}
            className="absolute inset-0 bg-gradient-to-br from-rose-500/[0.03] via-transparent to-emerald-500/[0.02] pointer-events-none"
          />

          {/* Animated corner accent */}
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
            className="absolute top-0 left-0 w-32 h-1 bg-gradient-to-r from-rose-500/50 via-red-400/30 to-transparent rounded-full"
          />

          <div className="relative">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
            >
              <h3 className="font-semibold mb-1">Evolución Mensual</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Tendencia de consumo humano por período
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="h-72"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={periods
                    .slice(0, 12)
                    .reverse()
                    .map((period) => {
                      const periodData = data.filter(
                        (d) => d.period === period
                      );
                      return {
                        period: formatPeriod(period),
                        botellas: periodData
                          .filter((d) => d.formato === "botella")
                          .reduce((sum, d) => sum + Number(d.cantidad), 0),
                        bidones: periodData
                          .filter((d) => d.formato === "bidon_20l")
                          .reduce((sum, d) => sum + Number(d.cantidad), 0),
                        costo: periodData.reduce(
                          (sum, d) => sum + (Number(d.total_costo) || 0),
                          0
                        ),
                      };
                    })}
                >
                  <defs>
                    <linearGradient
                      id="botellasGradientV"
                      x1="0"
                      y1="1"
                      x2="0"
                      y2="0"
                    >
                      <stop
                        offset="0%"
                        stopColor={PRIMARY_COLOR}
                        stopOpacity={0.6}
                      />
                      <stop
                        offset="100%"
                        stopColor={PRIMARY_LIGHT}
                        stopOpacity={1}
                      />
                    </linearGradient>
                    <linearGradient
                      id="bidonesGradientV"
                      x1="0"
                      y1="1"
                      x2="0"
                      y2="0"
                    >
                      <stop
                        offset="0%"
                        stopColor={SECONDARY_COLOR}
                        stopOpacity={0.6}
                      />
                      <stop
                        offset="100%"
                        stopColor="hsl(152, 55%, 55%)"
                        stopOpacity={1}
                      />
                    </linearGradient>
                    <filter id="humanGlow">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
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
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "none",
                      borderRadius: "12px",
                      boxShadow: "0 10px 40px -10px rgba(0,0,0,0.3)",
                      padding: "12px 16px",
                    }}
                    labelStyle={{
                      fontWeight: 600,
                      marginBottom: "6px",
                      color: "hsl(var(--foreground))",
                    }}
                    cursor={{ fill: "hsl(var(--primary) / 0.05)" }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: "16px" }}
                    iconType="circle"
                    iconSize={8}
                  />
                  <Bar
                    dataKey="botellas"
                    name="Botellas"
                    fill="url(#botellasGradientV)"
                    radius={[6, 6, 0, 0]}
                    filter="url(#humanGlow)"
                    isAnimationActive={true}
                    animationBegin={700}
                    animationDuration={1500}
                    animationEasing="ease-out"
                  />
                  <Bar
                    dataKey="bidones"
                    name="Bidones 20L"
                    fill="url(#bidonesGradientV)"
                    radius={[6, 6, 0, 0]}
                    isAnimationActive={true}
                    animationBegin={900}
                    animationDuration={1500}
                    animationEasing="ease-out"
                  />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </div>
        </motion.div>
      )}
    </>
  );
}
