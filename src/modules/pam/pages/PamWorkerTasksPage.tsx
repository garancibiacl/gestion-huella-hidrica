import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { usePamWeekSelector } from "../hooks/usePamWeekSelector";
import { usePamTasks } from "../hooks/usePamTasks";
import type { PamTaskStatus } from "../types/pam.types";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, Filter, Calendar } from "lucide-react";
import { PamEvidenceUploadDialog } from "../components/worker/PamEvidenceUploadDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPamTaskById } from "../services/pamApi";
import { useToast } from "@/components/ui/use-toast";
import { PamWeekSelector } from "../components/week/PamWeekSelector";

const STATUS_LABELS: Record<PamTaskStatus, string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En curso",
  DONE: "Completada",
  OVERDUE: "Vencida",
};

export default function PamWorkerTasksPage() {
  const week = usePamWeekSelector({ useStoredWeek: false });
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const {
    tasks,
    isLoading,
    error,
    scope,
    statusFilter,
    setScope,
    setStatusFilter,
    refetch,
    updateTaskStatus,
    uploadEvidence,
  } = usePamTasks({ weekYear: week.weekYear, weekNumber: week.weekNumber });

  const [evidenceDialogOpen, setEvidenceDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const hasInitializedWeek = useRef(false);

  useEffect(() => {
    const taskId = searchParams.get("task");
    if (!taskId && !hasInitializedWeek.current) {
      week.goToCurrentWeek();
      hasInitializedWeek.current = true;
    }
  }, [searchParams, week.goToCurrentWeek]);

  useEffect(() => {
    const taskId = searchParams.get("task");
    if (!taskId) return;

    const loadTaskWeek = async () => {
      try {
        const task = await getPamTaskById(taskId);
        if (task) {
          week.setWeek(task.week_year, task.week_number);
          setScope("week");
          setStatusFilter("ALL");
          setSelectedTaskId(task.id);
          hasInitializedWeek.current = true;
        }
      } catch (loadError) {
        toast({
          variant: "destructive",
          title: "No se pudo abrir la tarea",
          description: loadError instanceof Error ? loadError.message : "Error desconocido.",
        });
      }
    };

    loadTaskWeek();
  }, [searchParams, setScope, setStatusFilter, toast, week]);

  const groupedByDate = useMemo(() => {
    return tasks.reduce<Record<string, typeof tasks>>((acc, task) => {
      const key = task.date.slice(0, 10);
      if (!acc[key]) acc[key] = [];
      acc[key].push(task);
      return acc;
    }, {});
  }, [tasks]);

  const sortedDates = useMemo(() => Object.keys(groupedByDate).sort(), [groupedByDate]);

  const handleAcknowledge = async (taskId: string, currentStatus: PamTaskStatus) => {
    if (currentStatus !== "PENDING") return;
    await updateTaskStatus(taskId, "IN_PROGRESS");
  };

  const handleOpenEvidenceDialog = (taskId: string) => {
    setSelectedTaskId(taskId);
    setEvidenceDialogOpen(true);
  };

  const handleEvidenceSaved = async (params: { taskId: string; fileUrl: string; notes?: string }) => {
    await uploadEvidence(params);
    setEvidenceDialogOpen(false);
    setSelectedTaskId(null);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <PageHeader
        title="Mis tareas PLS"
        description="Tareas asignadas a ti"
      />

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <PamWeekSelector week={week} triggerClassName="w-[220px] h-9" />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select
              value={statusFilter}
              onValueChange={(value: any) => setStatusFilter(value)}
            >
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas las tareas</SelectItem>
                <SelectItem value="PENDING">Pendientes</SelectItem>
                <SelectItem value="IN_PROGRESS">En progreso</SelectItem>
                <SelectItem value="DONE">Completadas</SelectItem>
                <SelectItem value="OVERDUE">Vencidas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && error && (
        <Card className="p-6 space-y-3">
          <p className="text-sm text-destructive font-medium">
            {error}
          </p>
          <Button size="sm" onClick={refetch}>
            Reintentar
          </Button>
        </Card>
      )}

      {!isLoading && !error && tasks.length === 0 && (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">
            No tienes tareas PLS asignadas para este rango.
          </p>
        </Card>
      )}

      {!isLoading && !error && tasks.length > 0 && (
        <div className="space-y-4">
          {sortedDates.map((date) => (
            <div key={date} className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">
                {date}
              </p>
              <div className="space-y-2">
                {groupedByDate[date].map((task) => (
                  <Card key={task.id} className="p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{task.description}</p>
                        {task.location && (
                          <p className="text-xs text-muted-foreground">{task.location}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="outline">{STATUS_LABELS[task.status]}</Badge>
                        {task.has_evidence && (
                          <span className="text-[11px] text-emerald-600">
                            Evidencia subida
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={task.status !== "PENDING"}
                        onClick={() => handleAcknowledge(task.id, task.status)}
                      >
                        Acusar recibo
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={task.status === "PENDING"}
                        onClick={() => handleOpenEvidenceDialog(task.id)}
                      >
                        Subir evidencia
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <PamEvidenceUploadDialog
        taskId={selectedTaskId}
        open={evidenceDialogOpen}
        onOpenChange={setEvidenceDialogOpen}
        onEvidenceSaved={handleEvidenceSaved}
      />
    </div>
  );
}
