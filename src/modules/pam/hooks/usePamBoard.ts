import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import type { PamTask, PamTaskStatus } from "../types/pam.types";
import { getAllPamTasksForWeek } from "../services/pamApi";

export interface PamBoardByAssignee {
  assigneeUserId: string;
  assigneeName: string;
  total: number;
  pending: number;
  inProgress: number;
  done: number;
  overdue: number;
  completionRate: number;
}

export interface PamBoardByStatus {
  pending: PamTask[];
  inProgress: PamTask[];
  done: PamTask[];
  overdue: PamTask[];
}

export interface UsePamBoardResult {
  tasks: PamTask[];
  isLoading: boolean;
  error: string | null;
  byAssignee: PamBoardByAssignee[];
  byStatus: PamBoardByStatus;
  overdueTasks: PamTask[];
  refetch: () => Promise<void>;
}

function calculateOverdue(task: PamTask): boolean {
  if (task.status === "DONE") return false;
  const today = new Date().toISOString().slice(0, 10);
  return task.date < today;
}

export function usePamBoard(weekYear: number, weekNumber: number): UsePamBoardResult {
  const { user } = useAuth();
  const { toast } = useToast();

  const [tasks, setTasks] = useState<PamTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    try {
      const data = await getAllPamTasksForWeek(weekYear, weekNumber);
      setTasks(data);
    } catch (err: any) {
      console.error("Error loading PLS board", err);
      const message = err instanceof Error ? err.message : "Error desconocido al cargar tablero PLS.";
      setError(message);
      toast({
        title: "Error al cargar tablero PLS",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, weekYear, weekNumber, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const byAssignee = useMemo(() => {
    const assigneeMap = new Map<string, PamBoardByAssignee>();

    tasks.forEach((task) => {
      const key = task.assignee_user_id;
      if (!assigneeMap.has(key)) {
        assigneeMap.set(key, {
          assigneeUserId: key,
          assigneeName: task.assignee_name || "Sin nombre",
          total: 0,
          pending: 0,
          inProgress: 0,
          done: 0,
          overdue: 0,
          completionRate: 0,
        });
      }

      const entry = assigneeMap.get(key)!;
      entry.total++;

      const isOverdue = calculateOverdue(task);
      if (isOverdue && task.status !== "DONE") {
        entry.overdue++;
      }

      switch (task.status) {
        case "PENDING":
          entry.pending++;
          break;
        case "IN_PROGRESS":
          entry.inProgress++;
          break;
        case "DONE":
          entry.done++;
          break;
        case "OVERDUE":
          entry.overdue++;
          break;
      }
    });

    const result: PamBoardByAssignee[] = [];
    assigneeMap.forEach((entry) => {
      entry.completionRate = entry.total > 0 ? Math.round((entry.done / entry.total) * 100) : 0;
      result.push(entry);
    });

    return result.sort((a, b) => a.assigneeName.localeCompare(b.assigneeName));
  }, [tasks]);

  const byStatus = useMemo<PamBoardByStatus>(() => ({
    pending: tasks.filter((t) => t.status === "PENDING"),
    inProgress: tasks.filter((t) => t.status === "IN_PROGRESS"),
    done: tasks.filter((t) => t.status === "DONE"),
    overdue: tasks.filter((t) => t.status === "OVERDUE"),
  }), [tasks]);

  const overdueTasks = useMemo(
    () => tasks.filter((t) => calculateOverdue(t)).sort((a, b) => a.date.localeCompare(b.date)),
    [tasks]
  );

  return {
    tasks,
    isLoading,
    error,
    byAssignee,
    byStatus,
    overdueTasks,
    refetch: load,
  };
}
