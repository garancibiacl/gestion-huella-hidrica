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
      <div className="mb-4">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          title="Litros ahorrados"
          value={`${formatRounded(metrics.litersSaved)} L`}
          icon={<Droplets className="h-5 w-5" />}
          subtitle="Estimado según consumo gestionado"
          delay={0}
        />
        <StatCard
          title="Energía asociada"
          value={`${formatRounded(metrics.energySavedKwh)} kWh`}
          icon={<Zap className="h-5 w-5" />}
          subtitle="Tratamiento y bombeo"
          delay={0.05}
        />
        <StatCard
          title="Emisiones evitadas"
          value={`${metrics.emissionsAvoidedKg.toFixed(1)} kg CO₂e`}
          icon={<Leaf className="h-5 w-5" />}
          subtitle="Huella indirecta reducida"
          delay={0.1}
        />
      </div>
    </div>
  );
}
