import { Droplets, Leaf, Zap } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import type { ImpactMetrics } from "@/lib/impact";

interface ImpactSummaryProps {
  title?: string;
  subtitle?: string;
  metrics: ImpactMetrics;
}

const formatRounded = (value: number) => Math.round(value).toLocaleString();

export function ImpactSummary({
  title = "Impacto Ambiental",
  subtitle = "Tus acciones están generando este impacto positivo.",
  metrics,
}: ImpactSummaryProps) {
  return (
    <div className="stat-card mb-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px]">
              🌱
            </span>
            <span>{title}</span>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
          {subtitle}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          title="Ahorra agua"
          value={`${formatRounded(metrics.litersSaved)} L`}
          icon={<Droplets className="h-5 w-5 text-sky-600" />}
          subtitle="Litros de agua estimados"
          delay={0}
        />
        <StatCard
          title="Ahorra energía"
          value={`${formatRounded(metrics.energySavedKwh)} kWh`}
          icon={<Zap className="h-5 w-5 text-amber-600" />}
          subtitle="kWh electricidad"
          delay={0.05}
        />
        <StatCard
          title="Evita emisiones"
          value={`${metrics.emissionsAvoidedKg.toFixed(1)} kg CO₂e`}
          icon={<Leaf className="h-5 w-5 text-emerald-600" />}
          subtitle="Emisiones evitadas (kg CO₂e)"
          delay={0.1}
        />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Cálculos de ecoequivalencia basados en los consumos de agua gestionados en el período seleccionado.
      </p>
    </div>
  );
}
