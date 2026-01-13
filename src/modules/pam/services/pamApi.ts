import { supabase } from "@/integrations/supabase/client";
import type { PamTask, PamTaskEvidenceInsert, PamTaskStatus } from "../types/pls.types";

export async function getPamTasksForWeek(
  weekYear: number,
  weekNumber: number
): Promise<PamTask[]> {
  const { data, error } = await supabase
    .from("pls_tasks")
    .select("*")
    .eq("week_year", weekYear)
    .eq("week_number", weekNumber)
    .order("date", { ascending: true });

  if (error) {
    console.error("Error fetching PLS tasks", error);
    throw new Error("No se pudieron cargar las tareas PLS. Inténtalo nuevamente.");
  }

  return (data || []) as PamTask[];
}

export async function updatePamTaskStatus(
  taskId: string,
  status: PamTaskStatus
): Promise<void> {
  const { error } = await supabase
    .from("pls_tasks")
    .update({ status })
    .eq("id", taskId);

  if (error) {
    console.error("Error updating PLS task status", error);
    throw new Error("No se pudo actualizar el estado de la tarea. Inténtalo nuevamente.");
  }
}

export async function createPamTaskEvidence(
  input: PamTaskEvidenceInsert
): Promise<void> {
  const { error } = await supabase.from("pls_task_evidences").insert({
    task_id: input.task_id,
    uploaded_by_user_id: input.uploaded_by_user_id,
    file_url: input.file_url,
    notes: input.notes ?? null,
  });

  if (error) {
    console.error("Error creating PLS task evidence", error);
    throw new Error("No se pudo guardar la evidencia. Inténtalo nuevamente.");
  }
}

export async function uploadPamEvidenceFile(params: {
  organizationId: string;
  taskId: string;
  file: File;
}): Promise<string> {
  const { organizationId, taskId, file } = params;

  const path = `${organizationId}/${taskId}/${Date.now()}-${file.name}`;

  const { error } = await supabase.storage.from("pls-evidence").upload(path, file, {
    upsert: false,
  });

  if (error) {
    console.error("Error uploading PLS evidence file", error);
    throw new Error("No se pudo subir el archivo de evidencia. Revisa el bucket 'pls-evidence'.");
  }

  return path;
}

export async function getAllPamTasksForWeek(
  weekYear: number,
  weekNumber: number
): Promise<PamTask[]> {
  const { data, error } = await supabase
    .from("pls_tasks")
    .select("*")
    .eq("week_year", weekYear)
    .eq("week_number", weekNumber)
    .order("assignee_name", { ascending: true })
    .order("date", { ascending: true });

  if (error) {
    console.error("Error fetching all PLS tasks", error);
    throw new Error("No se pudieron cargar las tareas PLS. Inténtalo nuevamente.");
  }

  return (data || []) as PamTask[];
}
