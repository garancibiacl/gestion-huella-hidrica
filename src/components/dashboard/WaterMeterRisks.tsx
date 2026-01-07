import { useMemo, useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  ClipboardList,
  PlusCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChartCard } from "@/components/ui/chart-card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
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
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";

type TaskInfo = {
  id: string;
  title: string;
  status: string;
  evidence_url?: string | null;
  assignee_id?: string | null;
  due_date?: string | null;
};

type AlertWithTasks = {
  id: string;
  centro_trabajo: string;
  medidor: string;
  period: string;
  status: string;
  water_alert_tasks: TaskInfo[];
};

type Profile = {
  user_id: string;
  full_name: string | null;
  email: string | null;
};

export default function WaterMeterRisks() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const [selectedCentro, setSelectedCentro] = useState<string>("all");
  const [selectedMedidor, setSelectedMedidor] = useState<string>("all");
  const [minDelta, setMinDelta] = useState<number>(-1); // Show all by default
  const [existingAlerts, setExistingAlerts] = useState<
    Map<string, AlertWithTasks>
  >(new Map());
  const [profiles, setProfiles] = useState<Profile[]>([]);

  // Fetch existing alerts with their tasks
  const fetchExistingAlerts = useCallback(async () => {
    if (!organizationId) return;
    const { data, error } = await supabase
      .from("water_meter_alerts")
      .select(
        "id, centro_trabajo, medidor, period, status, water_alert_tasks(id, title, status, evidence_url, assignee_id, due_date)"
      )
      .eq("organization_id", organizationId);
    if (error) {
      console.error("Error fetching existing alerts:", error);
      return;
    }
    const map = new Map<string, AlertWithTasks>();
    (data ?? []).forEach((alert) => {
      const key = `${alert.centro_trabajo}-${alert.medidor}-${alert.period}`;
      map.set(key, alert as AlertWithTasks);
    });
    setExistingAlerts(map);
  }, [organizationId]);

  // Fetch profiles for assignee dropdown
  const fetchProfiles = useCallback(async () => {
    if (!organizationId) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .eq("organization_id", organizationId);
    if (error) {
      console.error("Error fetching profiles:", error);
      return;
    }
    setProfiles(data ?? []);
  }, [organizationId]);

  useEffect(() => {
    fetchExistingAlerts();
    fetchProfiles();
  }, [fetchExistingAlerts, fetchProfiles]);

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

  // Modal state for task management
  const [isTasksOpen, setIsTasksOpen] = useState(false);
  const [currentAlertKey, setCurrentAlertKey] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>("");
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>("");
  const [taskFilter, setTaskFilter] = useState<"all" | "pending" | "completed">(
    "all"
  );
  const [creatingTask, setCreatingTask] = useState(false);

  const currentAlert = useMemo(() => {
    return currentAlertKey ? existingAlerts.get(currentAlertKey) : undefined;
  }, [currentAlertKey, existingAlerts]);

  const openTasksModal = async (risk: (typeof risks)[number]) => {
    // Ensure alert exists, or create it without adding a task
    try {
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user?.id || "")
        .maybeSingle();
      if (profileErr) throw profileErr;
      const orgId = profile?.organization_id as string | null;
      if (!orgId) throw new Error("No se encontró la organización del usuario");

      const { error: upsertErr } = await supabase
        .from("water_meter_alerts")
        .upsert(
          {
            organization_id: orgId,
            centro_trabajo: risk.centro_trabajo,
            medidor: risk.medidor,
            period: risk.period,
            baseline_m3: risk.baseline_m3,
            current_m3: risk.current_m3,
            delta_pct: risk.delta_pct,
            confidence: risk.confidence,
            data_points: risk.data_points,
            status: "open",
          },
          { onConflict: "organization_id,centro_trabajo,medidor,period" }
        );
      if (upsertErr) throw upsertErr;

      await fetchExistingAlerts();
      setCurrentAlertKey(
        `${risk.centro_trabajo}-${risk.medidor}-${risk.period}`
      );
      setIsTasksOpen(true);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e?.message || "No se pudieron cargar las tareas",
      });
    }
  };

  const getEvidenceUrl = async (path: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from("water-evidence")
        .createSignedUrl(path, 60 * 10);
      if (error) throw error;
      return data?.signedUrl ?? null;
    } catch (_) {
      return null;
    }
  };

  const completeTask = async (taskId: string) => {
    const { error: err } = await supabase
      .from("water_alert_tasks")
      .update({ status: "completed" })
      .eq("id", taskId);
    if (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message,
      });
      return;
    }
    await fetchExistingAlerts();
  };

  const deleteTask = async (taskId: string) => {
    const { error: err } = await supabase
      .from("water_alert_tasks")
      .delete()
      .eq("id", taskId);
    if (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message,
      });
      return;
    }
    await fetchExistingAlerts();
  };

  const updateTask = async (
    taskId: string,
    patch: { assignee_id?: string | null; due_date?: string | null }
  ) => {
    const { error } = await supabase
      .from("water_alert_tasks")
      .update(patch)
      .eq("id", taskId);
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
      return;
    }
    await fetchExistingAlerts();
  };

  const createNewTask = async () => {
    if (!currentAlert || !newTaskTitle.trim()) return;
    setCreatingTask(true);
    const { error } = await supabase.from("water_alert_tasks").insert({
      alert_id: currentAlert.id,
      title: newTaskTitle.trim(),
      status: "pending",
      assignee_id: newTaskAssignee || null,
      due_date: newTaskDueDate || null,
    });
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
      setCreatingTask(false);
      return;
    }
    setNewTaskTitle("");
    setNewTaskAssignee("");
    setNewTaskDueDate("");
    await fetchExistingAlerts();
    setCreatingTask(false);
  };

  const uploadEvidence = async (taskId: string, file: File) => {
    try {
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user?.id || "")
        .maybeSingle();
      if (profileErr) throw profileErr;
      const orgId = profile?.organization_id as string | null;
      if (!orgId) throw new Error("No se encontró la organización del usuario");

      const alertId = currentAlert?.id;
      if (!alertId) throw new Error("Alerta no encontrada");

      const path = `${orgId}/${alertId}/${taskId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("water-evidence")
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      const { error: updErr } = await supabase
        .from("water_alert_tasks")
        .update({ evidence_url: path })
        .eq("id", taskId);
      if (updErr) throw updErr;

      toast({
        title: "Evidencia adjunta",
        description: "El archivo fue subido correctamente",
      });
      await fetchExistingAlerts();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error al adjuntar",
        description:
          e?.message ||
          "No se pudo subir la evidencia. Verifica el bucket 'water-evidence'.",
      });
    }
  };

  const createTask = async (risk: (typeof risks)[number]) => {
    try {
      if (!user?.id) {
        toast({
          variant: "destructive",
          title: "Sesión requerida",
          description: "Inicia sesión para crear tareas.",
        });
        return;
      }

      // Obtener organization_id del perfil del usuario para cumplir RLS y los índices únicos
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profileErr) throw profileErr;
      const organizationId = profile?.organization_id as string | null;
      if (!organizationId) {
        toast({
          variant: "destructive",
          title: "Organización no encontrada",
          description: "No se pudo determinar la organización del usuario.",
        });
        return;
      }

      const { data: alertRes, error: alertErr } = await supabase
        .from("water_meter_alerts")
        .upsert(
          {
            organization_id: organizationId,
            centro_trabajo: risk.centro_trabajo,
            medidor: risk.medidor,
            period: risk.period,
            baseline_m3: risk.baseline_m3,
            current_m3: risk.current_m3,
            delta_pct: risk.delta_pct,
            confidence: risk.confidence,
            data_points: risk.data_points,
            status: "open",
          },
          { onConflict: "organization_id,centro_trabajo,medidor,period" }
        )
        .select("id")
        .limit(1);
      if (alertErr) {
        console.error("Alert upsert error", alertErr);
        throw alertErr;
      }
      const alertId = alertRes?.[0]?.id;
      if (!alertId) throw new Error("No se pudo obtener el id de alerta");

      const { error: taskErr } = await supabase
        .from("water_alert_tasks")
        .insert({
          alert_id: alertId,
          title: `Revisar sobreconsumo en ${risk.centro_trabajo} / ${risk.medidor}`,
          status: "pending",
        });
      if (taskErr) {
        console.error("Task insert error", taskErr);
        throw taskErr;
      }

      toast({
        title: "Tarea creada",
        description: "Se creó una tarea para esta alerta",
      });

      // Refresh alerts to update badges
      fetchExistingAlerts();
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
      <ChartCard
        title="Riesgos por medidor"
        subtitle="Ordenado por mayor delta"
      >
        {/* Inline filters inside the card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
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
                <SelectItem value="-1">Todos</SelectItem>
                <SelectItem value="0">Solo positivos</SelectItem>
                <SelectItem value="0.1">+10%</SelectItem>
                <SelectItem value="0.2">+20%</SelectItem>
                <SelectItem value="0.3">+30%</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="py-8 text-sm text-muted-foreground">
            No hay riesgos que superen el umbral seleccionado
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((r) => {
              const key = `${r.centro_trabajo}-${r.medidor}-${r.period}`;
              const existingAlert = existingAlerts.get(key);
              const hasTasks =
                existingAlert && existingAlert.water_alert_tasks.length > 0;
              const taskCount = existingAlert?.water_alert_tasks.length ?? 0;
              const pendingTasks =
                existingAlert?.water_alert_tasks.filter(
                  (t) => t.status !== "completed"
                ) ?? [];
              const pendingCount = pendingTasks.length;

              // Get unique assignees for pending tasks
              const assigneeIds = [
                ...new Set(
                  pendingTasks
                    .map((t) => t.assignee_id)
                    .filter((id): id is string => !!id)
                ),
              ];
              const assigneeNames = assigneeIds
                .map((id) => {
                  const p = profiles.find((pr) => pr.user_id === id);
                  return p?.full_name || p?.email?.split("@")[0] || null;
                })
                .filter((n): n is string => !!n);
              const assigneeSummary =
                assigneeNames.length > 0
                  ? assigneeNames.length === 1
                    ? assigneeNames[0]
                    : `${assigneeNames[0]} +${assigneeNames.length - 1}`
                  : null;

              // Color indicators based on delta level
              const deltaPct = r.delta_pct * 100;
              let riskLevel: "low" | "medium" | "high" | "negative" = "low";
              if (deltaPct < 0) riskLevel = "negative";
              else if (deltaPct >= 30) riskLevel = "high";
              else if (deltaPct >= 15) riskLevel = "medium";

              const riskColors = {
                negative:
                  "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
                low: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
                medium: "bg-amber-500/15 text-amber-600 border-amber-500/30",
                high: "bg-red-500/15 text-red-600 border-red-500/30",
              };

              const RiskIcon =
                deltaPct < 0
                  ? TrendingDown
                  : deltaPct >= 15
                  ? TrendingUp
                  : Minus;

              return (
                <li
                  key={key}
                  className="py-3 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full border ${riskColors[riskLevel]}`}
                    >
                      <RiskIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate flex items-center gap-2">
                        {r.centro_trabajo} / {r.medidor} · {r.period}
                        {hasTasks && (
                          <Badge
                            variant={pendingCount > 0 ? "secondary" : "default"}
                            className="gap-1 text-xs"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            {pendingCount > 0
                              ? `${taskCount} tarea${taskCount > 1 ? "s" : ""}`
                              : "Completada"}
                            {assigneeSummary && (
                              <span className="ml-1 text-muted-foreground">
                                · {assigneeSummary}
                              </span>
                            )}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-2">
                        <span>
                          Baseline: {r.baseline_m3.toLocaleString()} m³
                        </span>
                        <span>Actual: {r.current_m3.toLocaleString()} m³</span>
                        <span
                          className={`font-medium ${
                            deltaPct < 0
                              ? "text-emerald-600"
                              : deltaPct >= 30
                              ? "text-red-600"
                              : deltaPct >= 15
                              ? "text-amber-600"
                              : "text-muted-foreground"
                          }`}
                        >
                          Delta: {deltaPct >= 0 ? "+" : ""}
                          {deltaPct.toFixed(1)}%
                        </span>
                        <span>
                          Confianza: {(r.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={hasTasks ? "outline" : "default"}
                      className="gap-2"
                      onClick={async () => {
                        await createTask(r);
                        await openTasksModal(r);
                      }}
                    >
                      <PlusCircle className="w-4 h-4" />
                      {hasTasks ? "Agregar tarea" : "Crear tarea"}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openTasksModal(r)}
                    >
                      Ver tareas
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </ChartCard>
      {/* Tasks modal */}
      <Dialog open={isTasksOpen} onOpenChange={setIsTasksOpen}>
        <DialogContent className="sm:max-w-2xl p-6 sm:p-8">
          <DialogHeader className="pb-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle>Gestión de tareas</DialogTitle>
                <DialogDescription>
                  {currentAlert ? (
                    <span>
                      {currentAlert.centro_trabajo} / {currentAlert.medidor} ·{" "}
                      {currentAlert.period}
                    </span>
                  ) : (
                    "Selecciona una alerta"
                  )}
                </DialogDescription>
              </div>
              <Button
                size="sm"
                onClick={createNewTask}
                disabled={!newTaskTitle.trim() || creatingTask}
                className="h-9"
              >
                {creatingTask && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {creatingTask ? "Agregando" : "Agregar"}
              </Button>
            </div>
          </DialogHeader>

          {/* Create task - wider grid */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-end mt-4">
            <div className="sm:col-span-5">
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Título
              </label>
              <Input
                placeholder="Ej: Revisar fuga"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
              />
            </div>
            <div className="sm:col-span-4">
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Responsable
              </label>
              <Select
                value={newTaskAssignee || "none"}
                onValueChange={(v) => setNewTaskAssignee(v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {profiles.map((p) => (
                    <SelectItem key={p.user_id} value={p.user_id}>
                      {p.full_name || p.email || p.user_id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Fecha compromiso
              </label>
              <Input
                type="date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Tasks toolbar */}
          <div className="mt-6 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">Tareas</div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Filtrar</label>
              <Select
                value={taskFilter}
                onValueChange={(v) => setTaskFilter(v as any)}
              >
                <SelectTrigger className="h-8 w-36">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="completed">Completadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tasks list */}
          <div className="mt-3 space-y-3">
            {currentAlert && currentAlert.water_alert_tasks.length > 0 ? (
              currentAlert.water_alert_tasks
                .filter((t) =>
                  taskFilter === "all"
                    ? true
                    : taskFilter === "pending"
                    ? t.status !== "completed"
                    : t.status === "completed"
                )
                .map((t) => {
                  const assignee = profiles.find(
                    (p) => p.user_id === t.assignee_id
                  );
                  return (
                    <div
                      key={t.id}
                      className="border rounded-md px-4 py-3 space-y-3 bg-muted"
                    >
                      {/* Task title and status */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`shrink-0 ${
                              t.status === "completed"
                                ? "text-emerald-600"
                                : "text-amber-600"
                            }`}
                          >
                            {t.status === "completed"
                              ? "✓ Completada"
                              : "○ Pendiente"}
                          </span>
                          <span className="truncate font-medium">
                            {t.title}
                          </span>
                        </div>
                      </div>

                      {/* Inline editing row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-center text-sm">
                        <Select
                          value={t.assignee_id || "none"}
                          onValueChange={(v) =>
                            updateTask(t.id, {
                              assignee_id: v === "none" ? null : v,
                            })
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Sin asignar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin asignar</SelectItem>
                            {profiles.map((p) => (
                              <SelectItem key={p.user_id} value={p.user_id}>
                                {p.full_name ||
                                  p.email ||
                                  p.user_id.slice(0, 8)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Input
                          type="date"
                          className="h-8"
                          value={t.due_date || ""}
                          onChange={(e) =>
                            updateTask(t.id, {
                              due_date: e.target.value || null,
                            })
                          }
                        />

                        {/* Action buttons */}
                        <div className="col-span-2 flex items-center gap-1 flex-wrap">
                          {t.status !== "completed" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-8"
                              onClick={() => completeTask(t.id)}
                            >
                              Completar
                            </Button>
                          )}
                          {t.evidence_url ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8"
                              onClick={async () => {
                                const url = await getEvidenceUrl(
                                  t.evidence_url!
                                );
                                if (url) window.open(url, "_blank");
                                else
                                  toast({
                                    variant: "destructive",
                                    title: "Sin acceso",
                                    description:
                                      "No fue posible generar el enlace",
                                  });
                              }}
                            >
                              Ver evidencia
                            </Button>
                          ) : null}
                          <label className="text-xs text-muted-foreground cursor-pointer">
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) uploadEvidence(t.id, file);
                                e.currentTarget.value = "";
                              }}
                            />
                            <span className="underline">Adjuntar</span>
                          </label>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8"
                              >
                                Eliminar
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  ¿Eliminar tarea?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteTask(t.id)}
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  );
                })
            ) : (
              <div className="text-xs text-muted-foreground">
                Sin tareas aún
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTasksOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
