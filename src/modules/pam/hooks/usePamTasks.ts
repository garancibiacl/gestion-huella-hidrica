import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import type { PamTask, PamTaskStatus } from "../types/pam.types";
import { createPamTaskEvidence, getPamTasksForWeek, updatePamTaskStatus } from "../services/pamApi";

export type PamTaskScopeFilter = "today" | "week";

export interface UsePamTasksOptions {
  weekYear: number;
  weekNumber: number;
}

export interface UsePamTasksResult {
  tasks: PamTask[];
  isLoading: boolean;
  error: string | null;
  scope: PamTaskScopeFilter;
  statusFilter: PamTaskStatus | "ALL";
  setScope: (scope: PamTaskScopeFilter) => void;
  setStatusFilter: (status: PamTaskStatus | "ALL") => void;
  refetch: () => Promise<void>;
  updateTaskStatus: (taskId: string, status: PamTaskStatus) => Promise<void>;
  uploadEvidence: (args: { taskId: string; fileUrl: string; notes?: string }) => Promise<void>;
}

function isSameDay(dateA: string, dateB: string): boolean {
  return dateA.slice(0, 10) === dateB.slice(0, 10);
}

export function usePamTasks(options: UsePamTasksOptions): UsePamTasksResult {
  const { weekYear, weekNumber } = options;
  const { user } = useAuth();
  const { toast } = useToast();

  const [rawTasks, setRawTasks] = useState<PamTask[]>([]);
  const [tasks, setTasks] = useState<PamTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<PamTaskScopeFilter>("week");
  const [statusFilter, setStatusFilter] = useState<PamTaskStatus | "ALL">("ALL");

  const applyFilters = useCallback(
    (source: PamTask[], currentScope: PamTaskScopeFilter, currentStatus: PamTaskStatus | "ALL") => {
      const today = new Date().toISOString().slice(0, 10);

      const filtered = source.filter((task) => {
        if (currentScope === "today" && !isSameDay(task.date, today)) {
          return false;
        }

        if (currentStatus !== "ALL" && task.status !== currentStatus) {
          return false;
        }

        return true;
      });

      console.log(`usePamTasks: After filtering (scope: ${currentScope}, status: ${currentStatus}): ${filtered.length} tasks`, filtered);
      setTasks(filtered);
    },
    []
  );

  const load = useCallback(async () => {
    if (!user) {
      console.log("usePamTasks: No user, skipping load");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      console.log(`usePamTasks: Loading tasks for week ${weekYear}-W${weekNumber}, user:`, user.id);
      const data = await getPamTasksForWeek(weekYear, weekNumber);
      console.log(`usePamTasks: Fetched ${data.length} tasks from DB:`, data);
      setRawTasks(data);
      applyFilters(data, scope, statusFilter);
    } catch (err: any) {
      console.error("Error loading PLS tasks", err);
      const message = err instanceof Error ? err.message : "Error desconocido al cargar tareas PLS.";
      setError(message);
      toast({
        title: "Error al cargar tareas PLS",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, weekYear, weekNumber, applyFilters, scope, statusFilter, toast]);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user, load]);

  useEffect(() => {
    applyFilters(rawTasks, scope, statusFilter);
  }, [rawTasks, scope, statusFilter, applyFilters]);

  const handleUpdateTaskStatus = useCallback(
    async (taskId: string, status: PamTaskStatus) => {
      setRawTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, status } : task)));
      try {
        await updatePamTaskStatus(taskId, status);
        toast({
          title: "Estado actualizado",
          description: "La tarea se actualizó correctamente.",
        });
      } catch (err: any) {
        console.error("Error updating task status", err);
        const message =
          err instanceof Error ? err.message : "No se pudo actualizar el estado de la tarea.";
        toast({
          title: "Error al actualizar",
          description: message,
          variant: "destructive",
        });
        // Revert on error
        setRawTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, status: task.status } : task)));
      }
    },
    [toast]
  );

  const uploadEvidence = useCallback(
    async ({ taskId, fileUrl, notes }: { taskId: string; fileUrl: string; notes?: string }) => {
      if (!user) return;
      try {
        await createPamTaskEvidence({
          task_id: taskId,
          uploaded_by_user_id: user.id,
          file_url: fileUrl,
          notes: notes ?? null,
        });
        setRawTasks((prev) =>
          prev.map((task) => (task.id === taskId ? { ...task, has_evidence: true } : task))
        );
        toast({
          title: "Evidencia subida",
          description: "La evidencia se guardó correctamente.",
        });
      } catch (err: any) {
        console.error("Error uploading evidence", err);
        const message =
          err instanceof Error ? err.message : "No se pudo subir la evidencia. Inténtalo nuevamente.";
        toast({
          title: "Error al subir evidencia",
          description: message,
          variant: "destructive",
        });
      }
    },
    [toast, user]
  );

  return {
    tasks,
    isLoading,
    error,
    scope,
    statusFilter,
    setScope,
    setStatusFilter,
    refetch: load,
    updateTaskStatus: handleUpdateTaskStatus,
    uploadEvidence,
  };
}
