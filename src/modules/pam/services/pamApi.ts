import { supabase } from "@/integrations/supabase/client";
import type { PamTask, PamTaskEvidenceInsert, PamTaskInsert, PamTaskStatus } from "../types/pam.types";

interface PamSheetSyncPayload {
  action: "create" | "update" | "delete";
  task: {
    id: string;
    week_year?: number | null;
    date?: string | null;
    end_date?: string | null;
    assignee_name?: string | null;
    assignee_user_id?: string | null;
    description?: string | null;
    location?: string | null;
    contractor?: string | null;
    risk_type?: string | null;
  };
}

async function syncPamTaskToSheet(payload: PamSheetSyncPayload): Promise<void> {
  const { data, error } = await supabase.functions.invoke("pam-sync-task-sheet", {
    body: payload,
  });

  if (error || data?.error) {
    const message = error?.message || data?.error || "Error desconocido en sincronización con Sheet.";
    throw new Error(message);
  }
}

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
  weekPlanId: string;
  date: string;
  endDate?: string | null;
  description: string;
  assigneeUserId?: string | null;
  assigneeName?: string | null;
  location?: string | null;
  contractor?: string | null;
}): Promise<void> {
  const {
    organizationId,
    weekYear,
    weekNumber,
    weekPlanId,
    date,
    endDate,
    description,
    assigneeUserId,
    assigneeName,
    location,
    contractor,
  } = params;

  const { data, error } = await supabase
    .from("pam_tasks")
    .insert({
      organization_id: organizationId,
      week_year: weekYear,
      week_number: weekNumber,
      week_plan_id: weekPlanId,
      date,
      end_date: endDate ?? null,
      assignee_user_id: assigneeUserId ?? null,
      assignee_name: assigneeName ?? null,
      description,
      location: location ?? null,
      contractor: contractor ?? null,
      status: "PENDING" as PamTaskStatus,
      has_evidence: false,
      risk_type: null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating manual PLS task", error);
    const message = typeof error.message === "string" ? error.message : "No se pudo crear la tarea PLS. Inténtalo nuevamente.";
    throw new Error(message);
  }

  const createdTask = data as PamTask;
  await syncPamTaskToSheet({
    action: "create",
    task: {
      id: createdTask.id,
      week_year: createdTask.week_year,
      date: createdTask.date,
      end_date: createdTask.end_date,
      assignee_name: createdTask.assignee_name,
      assignee_user_id: createdTask.assignee_user_id,
      description: createdTask.description,
      location: createdTask.location,
      contractor: createdTask.contractor,
      risk_type: createdTask.risk_type,
    },
  });
}

export async function updatePamTask(params: {
  taskId: string;
  date: string;
  endDate?: string | null;
  description: string;
  assigneeName?: string | null;
  location?: string | null;
  contractor?: string | null;
}): Promise<void> {
  const { taskId, date, endDate, description, assigneeName, location, contractor } = params;

  const updatePayload: Partial<PamTaskInsert> = {
    date,
    end_date: endDate ?? null,
    assignee_name: assigneeName ?? null,
    description,
    location: location ?? null,
    contractor: contractor ?? null,
  };

  const { data, error } = await supabase
    .from("pam_tasks")
    .update(updatePayload)
    .eq("id", taskId)
    .select()
    .single();

  if (error) {
    console.error("Error updating PLS task", error);
    const message = typeof error.message === "string" ? error.message : "No se pudo actualizar la tarea PLS. Inténtalo nuevamente.";
    throw new Error(message);
  }

  const updatedTask = data as PamTask;
  await syncPamTaskToSheet({
    action: "update",
    task: {
      id: updatedTask.id,
      week_year: updatedTask.week_year,
      date: updatedTask.date,
      end_date: updatedTask.end_date,
      assignee_name: updatedTask.assignee_name,
      assignee_user_id: updatedTask.assignee_user_id,
      description: updatedTask.description,
      location: updatedTask.location,
      contractor: updatedTask.contractor,
      risk_type: updatedTask.risk_type,
    },
  });
}

export async function deletePamTask(taskId: string): Promise<void> {
  const { error } = await supabase.from("pam_tasks").delete().eq("id", taskId);

  if (error) {
    console.error("Error deleting PLS task", error);
    const message = typeof error.message === "string" ? error.message : "No se pudo eliminar la tarea PLS. Inténtalo nuevamente.";
    throw new Error(message);
  }

  await syncPamTaskToSheet({
    action: "delete",
    task: { id: taskId },
  });
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
