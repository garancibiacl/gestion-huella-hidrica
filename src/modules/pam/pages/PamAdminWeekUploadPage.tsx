import { useState } from "react";
import { Navigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRole } from "@/hooks/useRole";
import { usePamSync } from "../hooks/usePamSync";
import { usePamWeekSelector } from "../hooks/usePamWeekSelector";
import { usePamBoard } from "../hooks/usePamBoard";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, RefreshCw, CheckCircle2, AlertTriangle, ExternalLink, PlusCircle, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createPamTask } from "../services/pamApi";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSm6kI2pKhHhLX5kwP2AWWwbc1fYr9h96k9OqumbRqJtcxSKeW7VUbhtDmXQuyksQ/pubhtml';

export default function PamAdminWeekUploadPage() {
  const { isAdmin, isPrevencionista, loading } = useRole();
  const { toast } = useToast();
  const [syncErrors, setSyncErrors] = useState<string[]>([]);
  const [lastSyncResult, setLastSyncResult] = useState<{ tasksCreated: number } | null>(null);
  const [tableFilter, setTableFilter] = useState<"all" | "recent">("all");
  const { organizationId } = useOrganization();

  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [assignTitle, setAssignTitle] = useState("");
  const [assignResponsible, setAssignResponsible] = useState("");
  const [assignStartDate, setAssignStartDate] = useState("");
  const [assignEndDate, setAssignEndDate] = useState("");
  const [assignLocation, setAssignLocation] = useState("");
  const [assignContractor, setAssignContractor] = useState("");
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  const week = usePamWeekSelector();
  const { tasks, isLoading: isLoadingPreview, refetch: refetchPreview } = usePamBoard(
    week.weekYear,
    week.weekNumber
  );

  const { syncPam, isSyncing, lastSyncAt } = usePamSync({
    enabled: true,
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

    try {
      setIsCreatingTask(true);
      await createPamTask({
        organizationId: orgIdToUse,
        weekYear: week.weekYear,
        weekNumber: week.weekNumber,
        date: assignStartDate,
        endDate: assignEndDate || null,
        description: assignTitle.trim(),
        assigneeUserId: null,
        assigneeName: assignResponsible || null,
        location: assignLocation || null,
        contractor: assignContractor || null,
        weekPlanId: fallbackWeekPlanId,
      });

      await refetchPreview();

      setAssignTitle("");
      setAssignResponsible("");
      setAssignStartDate("");
      setAssignEndDate("");
      setAssignLocation("");
      setAssignContractor("");
      setIsAssignDialogOpen(false);

      toast({
        title: "Tarea creada",
        description: "La tarea fue agregada a la planificación de esta semana.",
      });
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

  if (loading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center text-sm text-muted-foreground">
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

  const filteredTasks =
    tableFilter === "all"
      ? tasks
      : tasks.filter((t) => {
          const createdAtMs = Date.parse(t.created_at);
          const updatedAtMs = Date.parse(t.updated_at);
          return createdAtMs >= recentCutoffMs || updatedAtMs >= recentCutoffMs;
        });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Planificación semanal PLS"
        description="Sincronización automática con Google Sheets"
      />

      {/* Info de Google Sheets */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Google Sheets - Planificación PLS</h3>
              <p className="text-sm text-muted-foreground">
                La planificación se sincroniza automáticamente desde Google Sheets.
                Los cambios en la hoja se reflejarán automáticamente en la aplicación.
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {lastSyncAt && (
                  <span>Última sincronización: {formatLastSync(lastSyncAt)}</span>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(SHEET_URL, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir Sheet
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleSync} disabled={isSyncing}>
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
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Asignar tarea PLS</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Semana seleccionada: {week.label}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium">Título / Descripción</label>
                    <Input
                      value={assignTitle}
                      onChange={(e) => setAssignTitle(e.target.value)}
                      placeholder="Ej: Inspección PLS en patio"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Responsable (texto)</label>
                    <Input
                      value={assignResponsible}
                      onChange={(e) => setAssignResponsible(e.target.value)}
                      placeholder="Nombre del responsable"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Fecha inicio</label>
                    <Input
                      type="date"
                      value={assignStartDate}
                      onChange={(e) => setAssignStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Fecha fin (opcional)</label>
                    <Input
                      type="date"
                      value={assignEndDate}
                      onChange={(e) => setAssignEndDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Gerencia</label>
                    <Input
                      value={assignLocation}
                      onChange={(e) => setAssignLocation(e.target.value)}
                      placeholder="Ej: Gerencia de Seguridad"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Proceso/Empresa Contratista</label>
                    <Input
                      value={assignContractor}
                      onChange={(e) => setAssignContractor(e.target.value)}
                      placeholder="Ej: Buses JM"
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="mt-4">
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
                  "Crear tarea"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>

      {/* Formato esperado */}
      <Card className="p-4 bg-muted/50">
        <div className="space-y-2 text-sm">
          <p className="font-medium">Formato del Google Sheet:</p>
          <p className="text-muted-foreground">
            Columnas requeridas: 
            <strong>
              Título de la actividad, Responsable, Email, Fecha inicio (o Fecha), Descripción
            </strong>
          </p>
          <p className="text-muted-foreground">
            Columnas opcionales: 
            <strong>
              Tipo de control, Gerencia (se usa como ubicación en el preview), Proceso/Empresa
              Contratista (Opcional)
            </strong>
          </p>
        </div>
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

      {/* Éxito */}
      {lastSyncResult && lastSyncResult.tasksCreated > 0 && (
        <Alert className="border-emerald-200 bg-emerald-50">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription>
            <p className="font-medium text-emerald-900">
              ✓ Última sincronización: {lastSyncResult.tasksCreated} tareas importadas
            </p>
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
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsAssignDialogOpen(true)}
              >
                Asignar tarea
              </Button>
            </div>
          </div>
        </div>

        {isLoadingPreview ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <Loader2 className="w-4 h-4 animate-spin" />
            Cargando tareas de la semana...
          </div>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No hay tareas PLS planificadas para esta semana.
          </p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-2 py-2 border-b bg-background">
              <div className="flex items-center gap-2">
                <Button
                  variant={tableFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTableFilter("all")}
                >
                  Todas
                </Button>
                <Button
                  variant={tableFilter === "recent" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTableFilter("recent")}
                >
                  Recientes
                </Button>
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
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredTasks.slice(0, 50).map((task) => {
                    const createdAtMs = Date.parse(task.created_at);
                    const updatedAtMs = Date.parse(task.updated_at);
                    const isNew = createdAtMs >= recentCutoffMs;
                    const isRecentlyUpdated = !isNew && updatedAtMs >= recentCutoffMs;

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
                        <td className="p-2 text-xs">{task.assignee_name}</td>
                        <td className="p-2 text-xs">{task.description}</td>
                        <td className="p-2 text-xs text-muted-foreground">{task.location || "-"}</td>
                        <td className="p-2 text-xs text-muted-foreground">{task.contractor || "-"}</td>
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
        )}
      </Card>
    </div>
  );
}
