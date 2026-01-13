import { useMemo, useState } from "react";
import { usePamWeekSelector } from "../hooks/usePamWeekSelector";
import { usePamTasks } from "../hooks/usePamTasks";
import type { PamTaskStatus } from "../types/pam.types";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { PamEvidenceUploadDialog } from "../components/worker/PamEvidenceUploadDialog";

const STATUS_LABELS: Record<PamTaskStatus, string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En curso",
  DONE: "Hecha",
  OVERDUE: "Vencida",
};

export default function PamWorkerTasksPage() {
  const week = usePamWeekSelector();
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
        title="Mis tareas PAM"
        description={week.label}
      />

      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="inline-flex rounded-full border bg-background p-1 text-xs">
          <button
            type="button"
            onClick={() => setScope("today")}
            className={`px-3 py-1.5 rounded-full ${
              scope === "today" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => setScope("week")}
            className={`px-3 py-1.5 rounded-full ${
              scope === "week" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            Esta semana
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={week.goToPreviousWeek}
          >
            Semana anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={week.goToCurrentWeek}
          >
            Semana actual
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={week.goToNextWeek}
          >
            Próxima semana
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={statusFilter === "ALL" ? "default" : "outline"}
          onClick={() => setStatusFilter("ALL")}
        >
          Todas
        </Button>
        {(["PENDING", "IN_PROGRESS", "DONE", "OVERDUE"] as PamTaskStatus[]).map((status) => (
          <Button
            key={status}
            type="button"
            size="sm"
            variant={statusFilter === status ? "default" : "outline"}
            onClick={() => setStatusFilter(status)}
          >
            {STATUS_LABELS[status]}
          </Button>
        ))}
      </div>

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
            No tienes tareas PAM asignadas para este rango.
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
