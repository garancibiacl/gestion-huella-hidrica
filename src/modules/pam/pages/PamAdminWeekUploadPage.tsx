import { Navigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useRole } from "@/hooks/useRole";
import { usePamWeekImport } from "../hooks/usePamWeekImport";
import { Loader2, Upload, CheckCircle2, AlertTriangle, FileText } from "lucide-react";

export default function PamAdminWeekUploadPage() {
  const { isAdmin, isPrevencionista, loading } = useRole();
  const {
    isProcessing,
    previewTasks,
    parseErrors,
    importErrors,
    tasksCreated,
    processFile,
    confirmImport,
    reset,
  } = usePamWeekImport();

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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const uniqueAssignees = new Set(previewTasks.map((t) => t.assigneeEmail));
  const weekInfo = previewTasks.length > 0 ? previewTasks[0] : null;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Planificación semanal PAM"
        description="Carga la planificación semanal de tareas PAM desde un archivo CSV."
      />

      {/* Formato esperado */}
      <Card className="p-4 bg-muted/50">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div className="space-y-2 text-sm">
            <p className="font-medium">Formato del archivo CSV:</p>
            <p className="text-muted-foreground">
              Columnas requeridas: <strong>Semana, Año, Fecha, Responsable (email), Descripción</strong>
            </p>
            <p className="text-muted-foreground">
              Columnas opcionales: <strong>Ubicación, Tipo de riesgo</strong>
            </p>
          </div>
        </div>
      </Card>

      {/* Selector de archivo */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pam-file">Archivo CSV</Label>
            <Input
              id="pam-file"
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              disabled={isProcessing}
            />
          </div>
          {isProcessing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Procesando archivo...
            </div>
          )}
        </div>
      </Card>

      {/* Errores de parseo */}
      {parseErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-2">Errores encontrados ({parseErrors.length}):</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              {parseErrors.slice(0, 10).map((error, i) => (
                <li key={i}>{error}</li>
              ))}
              {parseErrors.length > 10 && (
                <li className="text-muted-foreground">... y {parseErrors.length - 10} más</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Preview de tareas */}
      {previewTasks.length > 0 && tasksCreated === null && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Preview de importación</h3>
              {weekInfo && (
                <p className="text-sm text-muted-foreground">
                  Semana {weekInfo.weekNumber} / {weekInfo.weekYear} · {previewTasks.length} tareas ·{" "}
                  {uniqueAssignees.size} responsables
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={reset} disabled={isProcessing}>
                Cancelar
              </Button>
              <Button onClick={confirmImport} disabled={isProcessing}>
                {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirmar importación
              </Button>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium">Fecha</th>
                    <th className="text-left p-2 font-medium">Responsable</th>
                    <th className="text-left p-2 font-medium">Descripción</th>
                    <th className="text-left p-2 font-medium">Ubicación</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {previewTasks.slice(0, 50).map((task, i) => (
                    <tr key={i} className="hover:bg-muted/50">
                      <td className="p-2 text-xs">{task.date}</td>
                      <td className="p-2 text-xs">{task.assigneeEmail}</td>
                      <td className="p-2">{task.description}</td>
                      <td className="p-2 text-xs text-muted-foreground">{task.location || "-"}</td>
                    </tr>
                  ))}
                  {previewTasks.length > 50 && (
                    <tr>
                      <td colSpan={4} className="p-2 text-center text-xs text-muted-foreground">
                        ... y {previewTasks.length - 50} tareas más
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* Errores de importación */}
      {importErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-2">Error al importar:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              {importErrors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Éxito */}
      {tasksCreated !== null && (
        <Alert className="border-emerald-200 bg-emerald-50">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription>
            <p className="font-medium text-emerald-900">
              ✓ Importación exitosa: {tasksCreated} tareas creadas
            </p>
            <Button variant="outline" size="sm" onClick={reset} className="mt-3">
              Cargar otra semana
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
