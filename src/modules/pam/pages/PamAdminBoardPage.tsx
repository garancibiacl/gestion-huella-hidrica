import { useState } from "react";
import { Navigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRole } from "@/hooks/useRole";
import { usePamWeekSelector } from "../hooks/usePamWeekSelector";
import { usePamBoard } from "../hooks/usePamBoard";
import type { PamTaskStatus } from "../types/pam.types";
import { Users, LayoutGrid, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_LABELS: Record<PamTaskStatus, string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En curso",
  DONE: "Hecha",
  OVERDUE: "Vencida",
};

export default function PamAdminBoardPage() {
  const { isAdmin, isPrevencionista, loading } = useRole();
  const week = usePamWeekSelector();
  const { tasks, isLoading, error, byAssignee, byStatus, overdueTasks, refetch } = usePamBoard(
    week.weekYear,
    week.weekNumber
  );

  if (loading) {
    return (
      <div className="bg-[#F4F5F7]">
        <div className="page-container flex items-center justify-center text-sm text-muted-foreground">
          Cargando permisos...
        </div>
      </div>
    );
  }

  if (!isAdmin && !isPrevencionista) {
    return <Navigate to="/dashboard/agua" replace />;
  }

  return (
    <div className="bg-[#F4F5F7]">
      <div className="page-container space-y-4">
        <div className="mb-10 flex flex-col items-start justify-between gap-4 rounded-2xl border border-gray-100 bg-white px-6 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.12)] sm:flex-row sm:items-center">
          <PageHeader title="Seguimiento PLS" description={week.label} />
        </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={week.goToPreviousWeek}>
          Semana anterior
        </Button>
        <Button variant="outline" size="sm" onClick={week.goToCurrentWeek}>
          Semana actual
        </Button>
        <Button variant="outline" size="sm" onClick={week.goToNextWeek}>
          Próxima semana
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-32" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="p-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-32 mt-2" />
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {Array.from({ length: 4 }).map((__, chipIndex) => (
                    <Skeleton key={chipIndex} className="h-10 w-full" />
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!isLoading && error && (
        <Card className="p-6 space-y-3">
          <p className="text-sm text-destructive font-medium">{error}</p>
          <Button size="sm" onClick={refetch}>
            Reintentar
          </Button>
        </Card>
      )}

      {!isLoading && !error && tasks.length === 0 && (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">
            No hay tareas PLS para esta semana.
          </p>
        </Card>
      )}

      {!isLoading && !error && tasks.length > 0 && (
        <Tabs defaultValue="assignee" className="space-y-4">
          <TabsList>
            <TabsTrigger value="assignee" className="gap-2">
              <Users className="w-4 h-4" />
              Por responsable
            </TabsTrigger>
            <TabsTrigger value="status" className="gap-2">
              <LayoutGrid className="w-4 h-4" />
              Por estado
            </TabsTrigger>
            <TabsTrigger value="overdue" className="gap-2">
              <AlertTriangle className="w-4 h-4" />
              Vencidas ({overdueTasks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assignee" className="space-y-3">
            {byAssignee.map((assignee) => (
              <Card key={assignee.assigneeUserId} className="p-4">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div>
                    <p className="font-medium">{assignee.assigneeName}</p>
                    <p className="text-xs text-muted-foreground">
                      {assignee.total} tareas · {assignee.completionRate}% completado
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {assignee.overdue > 0 && (
                      <Badge variant="destructive">{assignee.overdue} vencidas</Badge>
                    )}
                    {assignee.done === assignee.total && assignee.total > 0 && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 rounded bg-muted">
                    <p className="font-semibold">{assignee.pending}</p>
                    <p className="text-muted-foreground">Pendiente</p>
                  </div>
                  <div className="p-2 rounded bg-muted">
                    <p className="font-semibold">{assignee.inProgress}</p>
                    <p className="text-muted-foreground">En curso</p>
                  </div>
                  <div className="p-2 rounded bg-muted">
                    <p className="font-semibold">{assignee.done}</p>
                    <p className="text-muted-foreground">Hecha</p>
                  </div>
                  <div className="p-2 rounded bg-muted">
                    <p className="font-semibold">{assignee.overdue}</p>
                    <p className="text-muted-foreground">Vencida</p>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="status" className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {([
                { key: "pending", label: "Pendiente", tasks: byStatus.pending },
                { key: "inProgress", label: "En curso", tasks: byStatus.inProgress },
                { key: "done", label: "Hecha", tasks: byStatus.done },
                { key: "overdue", label: "Vencida", tasks: byStatus.overdue },
              ] as const).map(({ key, label, tasks: statusTasks }) => (
                <Card key={key} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-medium text-sm">{label}</p>
                    <Badge variant="outline">{statusTasks.length}</Badge>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {statusTasks.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sin tareas</p>
                    ) : (
                      statusTasks.map((task) => (
                        <div
                          key={task.id}
                          className="p-2 rounded bg-muted/50 text-xs space-y-1"
                        >
                          <p className="font-medium line-clamp-2">{task.description}</p>
                          <p className="text-muted-foreground">
                            {task.assignee_name} · {task.date}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="overdue" className="space-y-3">
            {overdueTasks.length === 0 ? (
              <Card className="p-6">
                <p className="text-sm text-muted-foreground">
                  No hay tareas vencidas. ¡Excelente trabajo!
                </p>
              </Card>
            ) : (
              overdueTasks.map((task) => {
                const today = new Date().toISOString().slice(0, 10);
                const daysOverdue = Math.floor(
                  (new Date(today).getTime() - new Date(task.date).getTime()) /
                    (1000 * 60 * 60 * 24)
                );
                return (
                  <Card key={task.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="font-medium">{task.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {task.assignee_name} · {task.location || "Sin ubicación"}
                        </p>
                        <p className="text-xs text-destructive font-medium">
                          Vencida hace {daysOverdue} día{daysOverdue !== 1 ? "s" : ""} (Fecha:
                          {task.date})
                        </p>
                      </div>
                      <Badge variant="outline">{STATUS_LABELS[task.status]}</Badge>
                    </div>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      )}
      </div>
    </div>
  );
}
