import { supabase } from "@/integrations/supabase/client";
import type { PamTask, PamTaskEvidenceInsert, PamTaskStatus } from "../types/pam.types";

export async function getPamTasksForWeek(
  weekYear: number,
  weekNumber: number
): Promise<PamTask[]> {
  const { data, error } = await supabase
    .from("pam_tasks")
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
    .from("pam_tasks")
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
  const { error } = await supabase.from("pam_task_evidences").insert({
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

export async function createPamTask(params: {
  organizationId: string;
  weekYear: number;
  weekNumber: number;
  date: string;
  endDate?: string | null;
  description: string;
  assigneeUserId?: string | null;
  assigneeName?: string | null;
  location?: string | null;
  contractor?: string | null;
  weekPlanId?: string | null;
}): Promise<void> {
  const {
    organizationId,
    weekYear,
    weekNumber,
    date,
    endDate,
    description,
    assigneeUserId,
    assigneeName,
    location,
    contractor,
    weekPlanId,
  } = params;

  const insertPayload: any = {
    organization_id: organizationId,
    week_year: weekYear,
    week_number: weekNumber,
    week_plan_id: weekPlanId ?? undefined,
    date,
    end_date: endDate ?? null,
    assignee_user_id: assigneeUserId ?? null,
    assignee_name: assigneeName ?? null,
    description,
    location: location ?? null,
    contractor: contractor ?? null,
    status: "PENDING" as PamTaskStatus,
    has_evidence: false,
  };

  const { error } = await supabase.from("pam_tasks").insert(insertPayload);

  if (error) {
    console.error("Error creating manual PLS task", error);
    const message = typeof error.message === "string" ? error.message : "No se pudo crear la tarea PLS. Inténtalo nuevamente.";
    throw new Error(message);
  }
}

export async function getAllPamTasksForWeek(
  weekYear: number,
  weekNumber: number
): Promise<PamTask[]> {
  const { data, error } = await supabase
    .from("pam_tasks")
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
