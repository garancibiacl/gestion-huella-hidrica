import { useMemo, useState } from "react";
import { AlertTriangle, ClipboardList, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChartCard } from "@/components/ui/chart-card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useWaterMeters } from "@/hooks/useWaterMeters";
import { useWaterMeterRisk } from "@/hooks/useWaterMeterRisk";
import { supabase } from "@/integrations/supabase/client";

export default function WaterMeterRisks() {
  const { toast } = useToast();
  const [selectedCentro, setSelectedCentro] = useState<string>("all");
  const [selectedMedidor, setSelectedMedidor] = useState<string>("all");
  const [minDelta, setMinDelta] = useState<number>(0.2);

  const { data } = useWaterMeters();
  const centros = useMemo(
    () => Array.from(new Set(data.map((d) => d.centro_trabajo))).sort(),
    [data]
  );
  const medidores = useMemo(
    () =>
      Array.from(new Set(data.map((d) => d.medidor)))
        .filter((m) => m && m !== "Sin medidor" && m !== "Sin especificar")
        .sort(),
    [data]
  );

  const { risks, loading, error, refetch } = useWaterMeterRisk({
    windowSize: 6,
    minBaseline: 1,
    centro: selectedCentro,
    medidor: selectedMedidor,
  });

  const visible = risks.filter((r) => r.delta_pct >= minDelta).slice(0, 50);

  const createTask = async (risk: (typeof risks)[number]) => {
    try {
      const { data: alertRes, error: alertErr } = await (supabase as any)
        .from("water_meter_alerts")
        .upsert({
          centro_trabajo: risk.centro_trabajo,
          medidor: risk.medidor,
          period: risk.period,
          baseline_m3: risk.baseline_m3,
          current_m3: risk.current_m3,
          delta_pct: risk.delta_pct,
          confidence: risk.confidence,
          data_points: risk.data_points,
          status: "open",
        })
        .select("id")
        .limit(1);
      if (alertErr) throw alertErr;
      const alertId = alertRes?.[0]?.id;
      if (!alertId) throw new Error("No se pudo obtener el id de alerta");

      const { error: taskErr } = await (supabase as any)
        .from("water_alert_tasks")
        .insert({
          alert_id: alertId,
          title: `Revisar sobreconsumo en ${risk.centro_trabajo} / ${risk.medidor}`,
          status: "pending",
        });
      if (taskErr) throw taskErr;

      toast({
        title: "Tarea creada",
        description: "Se creó una tarea para esta alerta",
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          e?.message ||
          "No se pudo crear la tarea. Verifica que existan las tablas requeridas.",
      });
    }
  };

  if (loading) {
    return (
      <ChartCard
        title="Riesgos por medidor"
        subtitle="Detección por centro y medidor con explicabilidad"
      >
        <div className="py-8 text-sm text-muted-foreground">
          Calculando riesgos…
        </div>
      </ChartCard>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="No pudimos calcular riesgos"
        description={error}
        icon={<AlertTriangle className="h-10 w-10 text-destructive" />}
        tone="error"
      />
    );
  }

  if (risks.length === 0) {
    return (
      <EmptyState
        title="Sin datos"
        description="Sincroniza datos para ver riesgos por medidor"
        icon={<ClipboardList className="h-10 w-10 text-muted-foreground" />}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">
            Centro
          </label>
          <Select value={selectedCentro} onValueChange={setSelectedCentro}>
            <SelectTrigger>
              <SelectValue placeholder="Todos los centros" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {centros.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">
            Medidor
          </label>
          <Select value={selectedMedidor} onValueChange={setSelectedMedidor}>
            <SelectTrigger>
              <SelectValue placeholder="Todos los medidores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {medidores.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">
            Umbral Delta %
          </label>
          <Select
            value={String(minDelta)}
            onValueChange={(v) => setMinDelta(parseFloat(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Umbral" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0.1">10%</SelectItem>
              <SelectItem value="0.2">20%</SelectItem>
              <SelectItem value="0.3">30%</SelectItem>
              <SelectItem value="0.5">50%</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <ChartCard
        title="Riesgos por medidor"
        subtitle="Ordenado por mayor delta"
      >
        {visible.length === 0 ? (
          <div className="py-8 text-sm text-muted-foreground">
            No hay riesgos que superen el umbral seleccionado
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((r) => (
              <li
                key={`${r.centro_trabajo}-${r.medidor}-${r.period}`}
                className="py-3 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {r.centro_trabajo} / {r.medidor} · {r.period}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Baseline: {r.baseline_m3.toLocaleString()} m³ · Actual:{" "}
                    {r.current_m3.toLocaleString()} m³ · Delta:{" "}
                    {(r.delta_pct * 100).toFixed(1)}% · Confidence:{" "}
                    {(r.confidence * 100).toFixed(0)}% · Datos: {r.data_points}
                  </div>
                </div>
                <div className="shrink-0">
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => createTask(r)}
                  >
                    <PlusCircle className="w-4 h-4" />
                    Crear tarea
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </ChartCard>
    </div>
  );
}
