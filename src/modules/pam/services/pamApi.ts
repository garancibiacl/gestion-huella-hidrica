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
    assignee_email?: string | null;
    assignee_user_id?: string | null;
    description?: string | null;
    location?: string | null;
    contractor?: string | null;
    risk_type?: string | null;
  };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function resolveAssigneeByEmail(params: {
  organizationId: string;
  assigneeEmail: string;
}): Promise<{ assigneeUserId: string; assigneeName: string | null; assigneeEmail: string }> {
  const normalizedEmail = params.assigneeEmail.trim().toLowerCase();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("user_id, full_name, email")
    .eq("organization_id", params.organizationId)
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (error) {
    throw new Error("No se pudo validar el email del responsable.");
  }

  if (!profile || !profile.user_id) {
    throw new Error("El email no corresponde a un usuario activo de la organización.");
  }

  return {
    assigneeUserId: profile.user_id,
    assigneeName: profile.full_name ?? null,
    assigneeEmail: profile.email ?? normalizedEmail,
  };
}

async function syncPamTaskToSheet(payload: PamSheetSyncPayload): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("pam-sync-task-sheet", {
      body: payload,
    });

    if (error || data?.error) {
      const message = error?.message || data?.error || "Error desconocido en sincronización con Sheet.";
      return message;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido en sincronización con Sheet.";
    return message;
  }

  return null;
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
  assigneeEmail: string;
  assigneeName?: string | null;
  status?: PamTaskStatus;
  location?: string | null;
  contractor?: string | null;
}): Promise<{ sheetSyncError?: string }> {
  const {
    organizationId,
    weekYear,
    weekNumber,
    weekPlanId,
    date,
    endDate,
    description,
    assigneeEmail,
    assigneeName,
    status,
    location,
    contractor,
  } = params;

  if (!assigneeEmail.trim() || !isValidEmail(assigneeEmail)) {
    throw new Error("Ingresa un email válido para el responsable.");
  }

  const resolvedAssignee = await resolveAssigneeByEmail({
    organizationId,
    assigneeEmail,
  });
  const assigneeNameToUse =
    resolvedAssignee.assigneeName ||
    assigneeName?.trim() ||
    resolvedAssignee.assigneeEmail;

  const { data, error } = await supabase
    .from("pam_tasks")
    .insert({
      organization_id: organizationId,
      week_year: weekYear,
      week_number: weekNumber,
      week_plan_id: weekPlanId,
      date,
      end_date: endDate ?? null,
      assignee_user_id: resolvedAssignee.assigneeUserId,
      assignee_name: assigneeNameToUse,
      assignee_email: resolvedAssignee.assigneeEmail,
      description,
      location: location ?? null,
      contractor: contractor ?? null,
      status: status ?? "PENDING",
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
  const sheetSyncError = await syncPamTaskToSheet({
    action: "create",
    task: {
      id: createdTask.id,
      week_year: createdTask.week_year,
      date: createdTask.date,
      end_date: createdTask.end_date,
      assignee_name: createdTask.assignee_name,
      assignee_email: createdTask.assignee_email,
      assignee_user_id: createdTask.assignee_user_id,
      description: createdTask.description,
      location: createdTask.location,
      contractor: createdTask.contractor,
      risk_type: createdTask.risk_type,
    },
  });

  return sheetSyncError ? { sheetSyncError } : {};
}

export async function updatePamTask(params: {
  taskId: string;
  organizationId: string;
  date: string;
  endDate?: string | null;
  description: string;
  assigneeEmail: string;
  assigneeName?: string | null;
  status?: PamTaskStatus;
  location?: string | null;
  contractor?: string | null;
}): Promise<{ sheetSyncError?: string }> {
  const { taskId, organizationId, date, endDate, description, assigneeEmail, assigneeName, status, location, contractor } = params;

  if (!assigneeEmail.trim() || !isValidEmail(assigneeEmail)) {
    throw new Error("Ingresa un email válido para el responsable.");
  }

  const resolvedAssignee = await resolveAssigneeByEmail({
    organizationId,
    assigneeEmail,
  });
  const assigneeNameToUse =
    resolvedAssignee.assigneeName ||
    assigneeName?.trim() ||
    resolvedAssignee.assigneeEmail;

  const updatePayload: Partial<PamTaskInsert> = {
    date,
    end_date: endDate ?? null,
    assignee_user_id: resolvedAssignee.assigneeUserId,
    assignee_name: assigneeNameToUse,
    assignee_email: resolvedAssignee.assigneeEmail,
    description,
    location: location ?? null,
    contractor: contractor ?? null,
    status: status ?? undefined,
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
  const sheetSyncError = await syncPamTaskToSheet({
    action: "update",
    task: {
      id: updatedTask.id,
      week_year: updatedTask.week_year,
      date: updatedTask.date,
      end_date: updatedTask.end_date,
      assignee_name: updatedTask.assignee_name,
      assignee_email: updatedTask.assignee_email,
      assignee_user_id: updatedTask.assignee_user_id,
      description: updatedTask.description,
      location: updatedTask.location,
      contractor: updatedTask.contractor,
      risk_type: updatedTask.risk_type,
    },
  });

  return sheetSyncError ? { sheetSyncError } : {};
}

export async function deletePamTask(taskId: string): Promise<{ sheetSyncError?: string }> {
  const { error } = await supabase.from("pam_tasks").delete().eq("id", taskId);

  if (error) {
    console.error("Error deleting PLS task", error);
    const message = typeof error.message === "string" ? error.message : "No se pudo eliminar la tarea PLS. Inténtalo nuevamente.";
    throw new Error(message);
  }

  const sheetSyncError = await syncPamTaskToSheet({
    action: "delete",
    task: { id: taskId },
  });

  return sheetSyncError ? { sheetSyncError } : {};
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
