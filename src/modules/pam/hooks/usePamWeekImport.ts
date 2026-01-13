import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/components/ui/use-toast";
import { parsePamSheet, importPamWeek, type PamTaskImportRow } from "../services/plsImporter";

export interface UsePamWeekImportResult {
  isProcessing: boolean;
  previewTasks: PamTaskImportRow[];
  parseErrors: string[];
  importErrors: string[];
  tasksCreated: number | null;
  processFile: (file: File) => Promise<void>;
  confirmImport: () => Promise<void>;
  reset: () => void;
}

export function usePamWeekImport(): UsePamWeekImportResult {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const { toast } = useToast();

  const [isProcessing, setIsProcessing] = useState(false);
  const [previewTasks, setPreviewTasks] = useState<PamTaskImportRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [tasksCreated, setTasksCreated] = useState<number | null>(null);
  const [sourceFilename, setSourceFilename] = useState<string | null>(null);

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setPreviewTasks([]);
    setParseErrors([]);
    setImportErrors([]);
    setTasksCreated(null);
    setSourceFilename(file.name);

    try {
      const text = await file.text();
      const { tasks, errors } = parsePamSheet(text);

      setPreviewTasks(tasks);
      setParseErrors(errors);

      if (tasks.length > 0) {
        toast({
          title: "Archivo procesado",
          description: `${tasks.length} tareas listas para importar. Revisa el preview y confirma.`,
        });
      } else if (errors.length > 0) {
        toast({
          title: "Errores en el archivo",
          description: `Se encontraron ${errors.length} errores. Revisa el detalle.`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error processing PLS file", error);
      toast({
        title: "Error al procesar archivo",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
      setParseErrors(["Error al leer el archivo. Verifica que sea un CSV válido."]);
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const confirmImport = useCallback(async () => {
    if (!user?.id || !organizationId || previewTasks.length === 0) {
      toast({
        title: "No se puede importar",
        description: "No hay tareas para importar o falta información de usuario/organización.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setImportErrors([]);

    try {
      const result = await importPamWeek({
        organizationId,
        uploadedByUserId: user.id,
        tasks: previewTasks,
        sourceFilename: sourceFilename || undefined,
      });

      if (result.success) {
        setTasksCreated(result.tasksCreated);
        toast({
          title: "Importación exitosa",
          description: `Se crearon ${result.tasksCreated} tareas PLS.`,
        });
      } else {
        setImportErrors(result.errors);
        toast({
          title: "Error al importar",
          description: result.errors[0] || "Error desconocido",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error importing PLS week", error);
      const errorMsg = error instanceof Error ? error.message : "Error desconocido al importar";
      setImportErrors([errorMsg]);
      toast({
        title: "Error al importar",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [user, organizationId, previewTasks, sourceFilename, toast]);

  const reset = useCallback(() => {
    setPreviewTasks([]);
    setParseErrors([]);
    setImportErrors([]);
    setTasksCreated(null);
    setSourceFilename(null);
  }, []);

  return {
    isProcessing,
    previewTasks,
    parseErrors,
    importErrors,
    tasksCreated,
    processFile,
    confirmImport,
    reset,
  };
}
