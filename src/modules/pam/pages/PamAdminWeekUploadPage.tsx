import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useRole } from "@/hooks/useRole";
import { usePamSync } from "../hooks/usePamSync";
import { usePamWeekSelector } from "../hooks/usePamWeekSelector";
import { usePamBoard } from "../hooks/usePamBoard";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, RefreshCw, CheckCircle2, AlertTriangle, ExternalLink, PlusCircle, Pencil, Filter, Calendar, Trash2, Edit3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { createPamTask, deletePamTask, updatePamTask, updatePamTaskEvidenceFlag, updatePamTaskStatus } from "../services/pamApi";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Swal from "sweetalert2";
import { PamWeekSelector } from "../components/week/PamWeekSelector";
import { createPamNotification } from "../services/notificationApi";

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSm6kI2pKhHhLX5kwP2AWWwbc1fYr9h96k9OqumbRqJtcxSKeW7VUbhtDmXQuyksQ/pubhtml';

interface PamAdminWeekUploadPageProps {
  pageTitle?: string;
  sectionTitle?: string;
}

export default function PamAdminWeekUploadPage({
  pageTitle = "Planificación semanal PLS",
  sectionTitle = "Planificación PLS",
}: PamAdminWeekUploadPageProps) {
  const { isAdmin, isPrevencionista, loading } = useRole();
  const { toast } = useToast();
  const [syncErrors, setSyncErrors] = useState<string[]>([]);
  const [lastSyncResult, setLastSyncResult] = useState<{ tasksCreated: number } | null>(null);
  const [tableFilter, setTableFilter] = useState<"all" | "recent" | "pending" | "in_progress" | "done">("all");
  const { organizationId } = useOrganization();

  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [assignTitle, setAssignTitle] = useState("");
  const [assignResponsible, setAssignResponsible] = useState("");
  const [assignEmail, setAssignEmail] = useState("");
  const [assignStartDate, setAssignStartDate] = useState("");
  const [assignEndDate, setAssignEndDate] = useState("");
  const [assignLocation, setAssignLocation] = useState("");
  const [assignContractor, setAssignContractor] = useState("");
  const [assignStatus, setAssignStatus] = useState<"PENDING" | "IN_PROGRESS" | "DONE">("PENDING");
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  const week = usePamWeekSelector();
  const { tasks, isLoading: isLoadingPreview, refetch: refetchPreview } = usePamBoard(
    week.weekYear,
    week.weekNumber
  );

  // Resetear filtro a "all" cuando cambia la semana
  useEffect(() => {
    setTableFilter("all");
  }, [week.weekYear, week.weekNumber]);

  const { syncPam, isSyncing, lastSyncAt } = usePamSync({
    enabled: false,
    onSyncComplete: async (success, tasksCreated, errors, importedWeek) => {
      if (success) {
        if (tasksCreated > 0) {
          setLastSyncResult({ tasksCreated });
          setSyncErrors([]);
          if (importedWeek) {
            // Si la importación trae una semana distinta, actualizamos el selector;
            // usePamBoard se encargará de recargar automáticamente esa semana.
            const isSameWeek =
              importedWeek.weekYear === week.weekYear &&
              importedWeek.weekNumber === week.weekNumber;

            if (!isSameWeek) {
              week.setWeek(importedWeek.weekYear, importedWeek.weekNumber);
            } else {
              // Si es la misma semana seleccionada, hacemos refetch explícito.
              await refetchPreview();
            }
          } else {
            // Si no hay información de semana importada, hacemos refetch de la semana actual.
            await refetchPreview();
          }
          toast({
            title: 'Sincronización PLS completada',
            description: `${tasksCreated} tareas importadas desde Google Sheets`,
          });
        } else {
          toast({
            title: 'Sincronización completada',
            description: 'No hubo cambios en la planificación',
          });
        }
      } else {
        setSyncErrors(errors);
        toast({
          variant: 'destructive',
          title: 'Error al sincronizar',
          description: errors[0] || 'Error desconocido',
        });
      }
    },
  });

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleCreateManualTask = async () => {
    const firstTask = tasks[0] as any | undefined;
    const fallbackOrgId = firstTask?.organization_id as string | undefined;
    const fallbackWeekPlanId = firstTask?.week_plan_id as string | undefined;
    const orgIdToUse = organizationId || fallbackOrgId;

    if (!orgIdToUse) {
      toast({
        variant: "destructive",
        title: "Organización no encontrada",
        description: "No se pudo determinar la organización actual.",
      });
      return;
    }

    if (!fallbackWeekPlanId) {
      toast({
        variant: "destructive",
        title: "Plan de semana no encontrado",
        description: "Primero sincroniza esta semana desde Google Sheets antes de crear tareas manuales.",
      });
      return;
    }

    if (!assignTitle.trim() || !assignStartDate) {
      toast({
        variant: "destructive",
        title: "Datos incompletos",
        description: "Completa al menos título y fecha inicio para crear la tarea.",
      });
      return;
    }

    if (!assignEmail.trim() || !isValidEmail(assignEmail)) {
      toast({
        variant: "destructive",
        title: "Email inválido",
        description: "Ingresa un email válido del responsable para notificar la tarea.",
      });
      return;
    }

    try {
      setIsCreatingTask(true);
      if (editingTaskId) {
        const { sheetSyncError } = await updatePamTask({
          taskId: editingTaskId,
          organizationId: orgIdToUse,
          date: assignStartDate,
          endDate: assignEndDate || null,
          description: assignTitle,
          assigneeEmail: assignEmail,
          assigneeName: assignResponsible || null,
          status: assignStatus,
          location: assignLocation || null,
          contractor: assignContractor || null,
        });
        if (sheetSyncError) {
          toast({
            title: "Sincronización incompleta",
            description: "La tarea se guardó, pero falló la sincronización con Google Sheets.",
          });
        }
      } else {
        const { sheetSyncError } = await createPamTask({
          organizationId: orgIdToUse,
          weekYear: week.weekYear,
          weekNumber: week.weekNumber,
          weekPlanId: fallbackWeekPlanId,
          date: assignStartDate,
          endDate: assignEndDate || null,
          description: assignTitle,
          assigneeEmail: assignEmail,
          assigneeName: assignResponsible || null,
          status: assignStatus,
          location: assignLocation || null,
          contractor: assignContractor || null,
        });
        if (sheetSyncError) {
          toast({
            title: "Sincronización incompleta",
            description: "La tarea se guardó, pero falló la sincronización con Google Sheets.",
          });
        }
      }

      await refetchPreview();

      setAssignTitle("");
      setAssignResponsible("");
      setAssignEmail("");
      setAssignStartDate("");
      setAssignEndDate("");
      setAssignLocation("");
      setAssignContractor("");
      setAssignStatus("PENDING");
      setIsAssignDialogOpen(false);
      setEditingTaskId(null);
      setAssignTitle("");
      setAssignResponsible("");
      setAssignEmail("");
      setAssignStartDate("");
      setAssignEndDate("");
      setAssignLocation("");
      setAssignContractor("");
      setAssignStatus("PENDING");
      await refetchPreview();
      if (editingTaskId) {
        toast({
          title: "Tarea actualizada",
          description: "La tarea fue actualizada en la planificación de esta semana.",
        });
      } else {
        toast({
          title: "Tarea creada",
          description: "La tarea fue agregada a la planificación de esta semana.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al crear tarea",
        description: error?.message || "No se pudo crear la tarea.",
      });
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleOpenCreateDialog = () => {
    setEditingTaskId(null);
    setAssignTitle("");
    setAssignResponsible("");
    setAssignEmail("");
    setAssignStartDate("");
    setAssignEndDate("");
    setAssignLocation("");
    setAssignContractor("");
    setAssignStatus("PENDING");
    setIsAssignDialogOpen(true);
  };

  const handleOpenEditTask = (task: any) => {
    setEditingTaskId(task.id);
    setAssignTitle(task.description || "");
    setAssignResponsible(task.assignee_name || "");
    setAssignEmail(task.assignee_email || "");
    setAssignStartDate(task.date?.slice(0, 10) || "");
    setAssignEndDate(task.end_date?.slice(0, 10) || "");
    setAssignLocation(task.location || "");
    setAssignContractor(task.contractor || "");
    setAssignStatus(task.status || "PENDING");
    setIsAssignDialogOpen(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    const result = await Swal.fire({
      title: "Eliminar tarea",
      text: "¿Eliminar esta tarea de la planificación?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#e11d48",
      cancelButtonColor: "#6b7280",
      reverseButtons: true,
      focusCancel: true,
    });

    if (!result.isConfirmed) return;

    try {
      const { sheetSyncError } = await deletePamTask(taskId);
      toast({
        title: "Tarea eliminada",
        description: "La tarea fue eliminada de la planificación.",
      });
      if (sheetSyncError) {
        toast({
          title: "Sincronización pendiente",
          description: "La tarea se eliminó, pero falló la sincronización con Google Sheets.",
        });
      }
      await refetchPreview();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al eliminar",
        description: error.message || "No se pudo eliminar la tarea.",
      });
    }
  };

  const handleApproveEvidence = async (task: any) => {
    const result = await Swal.fire({
      title: "Aprobar evidencia",
      text: "¿Confirmas que la evidencia es válida y la tarea puede marcarse como completada?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, completar",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
      confirmButtonColor: "#b3382a",
      cancelButtonColor: "#9ca3af",
    });

    if (!result.isConfirmed) return;

    try {
      await updatePamTaskStatus(task.id, "DONE");
      toast({
        title: "Tarea completada",
        description: "La evidencia fue aprobada.",
      });
      await refetchPreview();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al aprobar",
        description: error?.message || "No se pudo aprobar la evidencia.",
      });
    }
  };

  const handleRejectEvidence = async (task: any) => {
    const result = await Swal.fire({
      title: "Rechazar evidencia",
      input: "textarea",
      inputLabel: "Comentario para el responsable",
      inputPlaceholder: "Indica qué falta o qué debe corregir.",
      inputAttributes: {
        "aria-label": "Comentario de rechazo",
      },
      showCancelButton: true,
      confirmButtonText: "Rechazar",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
      confirmButtonColor: "#b3382a",
      cancelButtonColor: "#9ca3af",
    });

    if (!result.isConfirmed) return;

    try {
      await updatePamTaskStatus(task.id, "IN_PROGRESS");
      await updatePamTaskEvidenceFlag(task.id, false);
      if (task.assignee_user_id) {
        await createPamNotification({
          user_id: task.assignee_user_id,
          organization_id: task.organization_id,
          task_id: task.id,
          type: "task_assigned",
          title: "Evidencia rechazada",
          message: result.value
            ? `Tu evidencia fue rechazada: ${result.value}`
            : "Tu evidencia fue rechazada. Por favor, sube una nueva evidencia.",
        });
      }
      toast({
        title: "Evidencia rechazada",
        description: "Se solicitó nueva evidencia.",
      });
      await refetchPreview();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al rechazar",
        description: error?.message || "No se pudo rechazar la evidencia.",
      });
    }
  };

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center text-sm text-muted-foreground">
        Cargando permisos...
      </div>
    );
  }

  if (!isAdmin && !isPrevencionista) {
    return <Navigate to="/dashboard/agua" replace />;
  }

  const handleSync = async () => {
    setSyncErrors([]);
    setLastSyncResult(null);
    await syncPam({ force: true, weekYear: week.weekYear, weekNumber: week.weekNumber });
  };

  const formatLastSync = (timestamp: number) => {
    return formatDistanceToNow(new Date(timestamp), {
      addSuffix: true,
      locale: es,
    });
  };

  const recentCutoffMs = Date.now() - 24 * 60 * 60 * 1000;

  const filteredTasks = tasks.filter((t) => {
    if (tableFilter === "all") return true;
    if (tableFilter === "recent") {
      const createdAtMs = Date.parse(t.created_at);
      const updatedAtMs = Date.parse(t.updated_at);
      return createdAtMs >= recentCutoffMs || updatedAtMs >= recentCutoffMs;
    }
    if (tableFilter === "pending") return t.status === "PENDING";
    if (tableFilter === "in_progress") return t.status === "IN_PROGRESS";
    if (tableFilter === "done") return t.status === "DONE";
    return true;
  });

  const getStatusMeta = (status: string) => {
    switch (status) {
      case "PENDING":
        return {
          label: "Pendiente",
          className: "bg-amber-50 text-amber-700 border border-amber-100",
        };
      case "IN_PROGRESS":
        return {
          label: "En curso",
          className: "bg-sky-50 text-sky-700 border border-sky-100",
        };
      case "DONE":
        return {
          label: "Completada",
          className: "bg-emerald-50 text-emerald-700 border border-emerald-100",
        };
      case "OVERDUE":
        return {
          label: "Vencida",
          className: "bg-rose-50 text-rose-700 border border-rose-100",
        };
      default:
        return {
          label: status,
          className: "bg-slate-50 text-slate-700 border border-slate-100",
        };
    }
  };

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title={pageTitle}
        description="Sincronización automática con Google Sheets"
      />

      {/* Planificación PLS */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold">{sectionTitle}</h3>
              <p className="text-sm text-muted-foreground">
                Sincronización automática con Google Sheets
              </p>
              {lastSyncResult && lastSyncResult.tasksCreated > 0 && (
                <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-md w-fit">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Última sincronización: {lastSyncResult.tasksCreated} tareas importadas</span>
                </div>
              )}
              {lastSyncAt && !lastSyncResult && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Última sincronización: {formatLastSync(lastSyncAt)}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(SHEET_URL, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir Sheet
              </Button>
              <Button onClick={handleSync} disabled={isSyncing} size="sm">
                {isSyncing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sincronizar ahora
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
        <Dialog
          open={isAssignDialogOpen}
          onOpenChange={(open) => {
            setIsAssignDialogOpen(open);
            if (!open) {
              setEditingTaskId(null);
            }
          }}
        >
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{editingTaskId ? "Editar tarea PLS" : "Asignar tarea PLS"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 mt-4">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Semana seleccionada: {week.label}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-medium">Título / Descripción</label>
                    <Input
                      value={assignTitle}
                      onChange={(e) => setAssignTitle(e.target.value)}
                      placeholder="Ej: Inspección PLS en patio"
                      className="h-10"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Nombre responsable (opcional)</label>
                    <Input
                      value={assignResponsible}
                      onChange={(e) => setAssignResponsible(e.target.value)}
                      placeholder="Nombre del responsable"
                      className="h-10"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Email responsable (obligatorio)</label>
                    <Input
                      type="email"
                      value={assignEmail}
                      onChange={(e) => setAssignEmail(e.target.value)}
                      placeholder="correo@empresa.com"
                      required
                      className="h-10"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Estado de la tarea</label>
                    <Select value={assignStatus} onValueChange={(value) => setAssignStatus(value as typeof assignStatus)}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Seleccionar estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">Pendiente</SelectItem>
                        <SelectItem value="IN_PROGRESS">En proceso</SelectItem>
                        <SelectItem value="DONE">Completada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium">Fecha inicio</label>
                    <Input
                      type="date"
                      value={assignStartDate}
                      onChange={(e) => setAssignStartDate(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Fecha fin (opcional)</label>
                    <Input
                      type="date"
                      value={assignEndDate}
                      onChange={(e) => setAssignEndDate(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Gerencia</label>
                    <Input
                      value={assignLocation}
                      onChange={(e) => setAssignLocation(e.target.value)}
                      placeholder="Ej: Gerencia de Seguridad"
                      className="h-10"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Proceso/Empresa Contratista</label>
                    <Input
                      value={assignContractor}
                      onChange={(e) => setAssignContractor(e.target.value)}
                      placeholder="Ej: Buses JM"
                      className="h-10"
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                onClick={() => setIsAssignDialogOpen(false)}
                disabled={isCreatingTask}
              >
                Cancelar
              </Button>
              <Button onClick={handleCreateManualTask} disabled={isCreatingTask}>
                {isCreatingTask ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  editingTaskId ? "Guardar cambios" : "Crear tarea"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>

      {/* Errores de sincronización */}
      {syncErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-2">Errores de sincronización ({syncErrors.length}):</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              {syncErrors.slice(0, 10).map((error, i) => (
                <li key={i}>{error}</li>
              ))}
              {syncErrors.length > 10 && (
                <li className="text-muted-foreground">... y {syncErrors.length - 10} más</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Preview de tareas de la semana seleccionada */}
      <Card className="p-6 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-sm">Preview de planificación</h3>
            <p className="text-xs text-muted-foreground">
              {(() => {
                const uniqueAssignees = new Set(
                  tasks.map((t) => t.assignee_user_id || t.assignee_name || "")
                );
                return `${week.label} · ${tasks.length} tareas · ${uniqueAssignees.size} responsables`;
              })()}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 text-xs text-muted-foreground">
            <span className="text-[11px] uppercase tracking-wide bg-muted px-2 py-0.5 rounded-full">
              Fuente: Google Sheets PLS
            </span>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <PamWeekSelector week={week} triggerClassName="w-[220px] h-8" />
              <Button
                variant="default"
                size="sm"
                onClick={handleOpenCreateDialog}
              >
                Asignar tarea
              </Button>
            </div>
          </div>
        </div>

        {isLoadingPreview ? (
          <div className="space-y-3 py-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              No hay tareas PLS planificadas para {week.label}.
            </p>
            <p className="text-xs text-muted-foreground">
              Sincroniza desde Google Sheets o crea una tarea manual para esta semana.
            </p>
          </div>
        ) : (
          <TooltipProvider>
          <div className="border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-background">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={tableFilter} onValueChange={(value: any) => setTableFilter(value)}>
                  <SelectTrigger className="w-[180px] h-8">
                    <SelectValue placeholder="Filtrar tareas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las tareas</SelectItem>
                    <SelectItem value="recent">Recientes (24h)</SelectItem>
                    <SelectItem value="pending">Pendientes</SelectItem>
                    <SelectItem value="in_progress">En progreso</SelectItem>
                    <SelectItem value="done">Completadas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <span className="text-xs text-muted-foreground">
                Mostrando {filteredTasks.length} de {tasks.length}
              </span>
            </div>
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium text-xs w-[28px]"></th>
                    <th className="text-left p-2 font-medium text-xs">Fecha inicio</th>
                    <th className="text-left p-2 font-medium text-xs">Fecha fin</th>
                    <th className="text-left p-2 font-medium text-xs">Responsable</th>
                    <th className="text-left p-2 font-medium text-xs">Título de la actividad / Descripción</th>
                    <th className="text-left p-2 font-medium text-xs">Gerencia</th>
                    <th className="text-left p-2 font-medium text-xs">Proceso/Empresa Contratista</th>
                    <th className="text-right p-2 font-medium text-xs w-[72px]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredTasks.slice(0, 50).map((task) => {
                    const createdAtMs = Date.parse(task.created_at);
                    const updatedAtMs = Date.parse(task.updated_at);
                    const isNew = createdAtMs >= recentCutoffMs;
                    const isRecentlyUpdated = !isNew && updatedAtMs >= recentCutoffMs;
                    const isLocked = task.status === "DONE";

                    return (
                      <tr key={task.id} className="hover:bg-muted/50">
                        <td className="p-2 text-xs text-muted-foreground">
                          {isNew ? (
                            <PlusCircle className="w-4 h-4 text-emerald-600" />
                          ) : isRecentlyUpdated ? (
                            <Pencil className="w-4 h-4 text-amber-600" />
                          ) : null}
                        </td>
                        <td className="p-2 text-xs">{task.date?.slice(0, 10)}</td>
                        <td className="p-2 text-xs">{task.end_date?.slice(0, 10) || "-"}</td>
                        <td className="p-2 text-xs">{task.assignee_name || task.assignee_email || "-"}</td>
                        <td className="p-2 text-xs">
                          <div className="flex items-center gap-2">
                            {(() => {
                              const meta = getStatusMeta(task.status);
                              return (
                                <Badge
                                  variant="outline"
                                  className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${meta.className}`}
                                >
                                  {meta.label}
                                </Badge>
                              );
                            })()}
                            {isLocked && (
                              <Badge
                                variant="outline"
                                className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"
                              >
                                Cerrada
                              </Badge>
                            )}
                            <span className="truncate" title={task.description}>
                              {task.description}
                            </span>
                          </div>
                        </td>
                        <td className="p-2 text-xs text-muted-foreground">{task.location || "-"}</td>
                        <td className="p-2 text-xs text-muted-foreground">{task.contractor || "-"}</td>
                        <td className="p-2 text-xs">
                          <div className="flex items-center justify-end gap-1">
                            {task.has_evidence && !isLocked && (
                              <>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-emerald-600 hover:text-emerald-700"
                                      onClick={() => handleApproveEvidence(task)}
                                    >
                                      <CheckCircle2 className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Aprobar evidencia</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-amber-600 hover:text-amber-700"
                                      onClick={() => handleRejectEvidence(task)}
                                    >
                                      <AlertTriangle className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Rechazar evidencia</TooltipContent>
                                </Tooltip>
                              </>
                            )}
                            {!isLocked && (
                              <>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                      onClick={() => handleOpenEditTask(task)}
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Editar tarea</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-muted-foreground hover:text-red-600"
                                      onClick={() => handleDeleteTask(task.id)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Eliminar tarea</TooltipContent>
                                </Tooltip>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredTasks.length > 50 && (
                    <tr>
                      <td colSpan={5} className="p-2 text-center text-xs text-muted-foreground">
                        ... y {filteredTasks.length - 50} tareas más
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </TooltipProvider>
        )}
      </Card>
    </div>
  );
}
