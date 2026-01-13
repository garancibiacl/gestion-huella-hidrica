import { supabase } from "@/integrations/supabase/client";

export interface PamTaskImportRow {
  weekNumber: number;
  weekYear: number;
  date: string; // ISO date YYYY-MM-DD
  assigneeEmail: string;
  assigneeName?: string;
  description: string;
  location?: string;
  riskType?: string;
}

export interface PamImportResult {
  success: boolean;
  tasksCreated: number;
  errors: string[];
  weekPlanId?: string;
}

function parseWeekNumber(value: string | undefined): number | null {
  if (!value) return null;
  const cleaned = String(value).trim().replace(/^W/i, "");
  const num = parseInt(cleaned, 10);
  return isNaN(num) || num < 1 || num > 53 ? null : num;
}

function parseYear(value: string | undefined): number | null {
  if (!value) return null;
  const num = parseInt(String(value).trim(), 10);
  return isNaN(num) || num < 2020 || num > 2100 ? null : num;
}

function parseDate(value: string | undefined): string | null {
  if (!value) return null;
  const str = String(value).trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return null;
}

function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
    } else if ((char === "\n" || (char === "\r" && nextChar === "\n")) && !inQuotes) {
      currentRow.push(currentCell.trim());
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
      if (char === "\r") i++;
    } else if (char !== "\r") {
      currentCell += char;
    }
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((cell) => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Elimina tildes y acentos
}

export function parsePamSheet(csvText: string): {
  tasks: PamTaskImportRow[];
  errors: string[];
} {
  const ALLOWED_EMAIL_DOMAIN = "@busesjm.com";

  const rows = parseCSV(csvText);
  if (rows.length < 2) {
    return { tasks: [], errors: ["El archivo está vacío o no tiene datos"] };
  }

  const headers = rows[0].map((h) => normalizeString(h));
  const dataRows = rows.slice(1);

  // Primero buscamos explícitamente columnas de email ("email" / "mail").
  // Si no existen, usamos columnas de responsable/asignado como fallback.
  const emailColumnIndex = headers.findIndex(
    (h) => h.includes("email") || h.includes("mail")
  );
  const responsableFallbackIndex = headers.findIndex(
    (h) => h.includes("responsable") || h.includes("asignado")
  );

  const colIdx = {
    semana: headers.findIndex((h) => h.includes("semana") || h.includes("week")),
    año: headers.findIndex((h) => h.includes("ano") || h.includes("year")),
    fecha: headers.findIndex((h) => h.includes("fecha") || h.includes("date")),
    responsable:
      emailColumnIndex >= 0 ? emailColumnIndex : responsableFallbackIndex,
    descripcion: headers.findIndex(
      (h) => h.includes("descripcion") || h.includes("description") || h.includes("tarea")
    ),
    titulo: headers.findIndex(
      (h) => h.includes("titulo") || h.includes("actividad")
    ),
    ubicacion: headers.findIndex(
      (h) => h.includes("ubicacion") || h.includes("location") || h.includes("lugar")
    ),
    riesgo: headers.findIndex((h) => h.includes("riesgo") || h.includes("risk") || h.includes("tipo")),
  };

  const tasks: PamTaskImportRow[] = [];
  const errors: string[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNum = i + 2;

    const weekNumber = parseWeekNumber(colIdx.semana >= 0 ? row[colIdx.semana] : undefined);
    const weekYear = parseYear(colIdx.año >= 0 ? row[colIdx.año] : undefined);
    const date = parseDate(colIdx.fecha >= 0 ? row[colIdx.fecha] : undefined);
    const assigneeEmailRaw = colIdx.responsable >= 0 ? row[colIdx.responsable]?.trim() : "";
    const rawDescription = colIdx.descripcion >= 0 ? row[colIdx.descripcion]?.trim() : "";
    const titleFallback = colIdx.titulo >= 0 ? row[colIdx.titulo]?.trim() : "";
    const description = rawDescription || titleFallback;
    const location = colIdx.ubicacion >= 0 ? row[colIdx.ubicacion]?.trim() : "";
    const riskType = colIdx.riesgo >= 0 ? row[colIdx.riesgo]?.trim() : "";

    const assigneeEmail = assigneeEmailRaw.toLowerCase();

    if (!weekNumber) {
      errors.push(`Fila ${rowNum}: Semana inválida o faltante`);
      continue;
    }
    if (!weekYear) {
      errors.push(`Fila ${rowNum}: Año inválido o faltante`);
      continue;
    }
    if (!date) {
      errors.push(`Fila ${rowNum}: Fecha inválida o faltante`);
      continue;
    }
    if (!assigneeEmail || !assigneeEmail.includes("@")) {
      errors.push(`Fila ${rowNum}: Email de responsable inválido o faltante`);
      continue;
    }
    if (!assigneeEmail.endsWith(ALLOWED_EMAIL_DOMAIN)) {
      errors.push(
        `Fila ${rowNum}: Email inválido (debe terminar en ${ALLOWED_EMAIL_DOMAIN}): ${assigneeEmailRaw}`
      );
      continue;
    }
    if (!description) {
      errors.push(`Fila ${rowNum}: Descripción faltante`);
      continue;
    }

    tasks.push({
      weekNumber,
      weekYear,
      date,
      assigneeEmail,
      description,
      location: location || undefined,
      riskType: riskType || undefined,
    });
  }

  return { tasks, errors };
}

export async function importPamWeek(params: {
  organizationId: string;
  uploadedByUserId: string;
  tasks: PamTaskImportRow[];
  sourceFilename?: string;
}): Promise<PamImportResult> {
  const { organizationId, uploadedByUserId, tasks, sourceFilename } = params;

  if (tasks.length === 0) {
    return { success: false, tasksCreated: 0, errors: ["No hay tareas válidas para importar"] };
  }

  const firstTask = tasks[0];
  const { weekNumber, weekYear } = firstTask;

  try {
    // 1. Obtener perfiles existentes (sin bloquear si faltan algunos)
    const uniqueEmails = [...new Set(tasks.map((t) => t.assigneeEmail))];
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, email, full_name")
      .eq("organization_id", organizationId)
      .in("email", uniqueEmails);

    if (profilesError) throw profilesError;

    const emailToUserId = new Map<string, { userId: string; fullName: string | null }>();
    (profiles || []).forEach((p) => {
      if (p.email) {
        emailToUserId.set(p.email.toLowerCase(), {
          userId: p.user_id,
          fullName: p.full_name,
        });
      }
    });

    // Nota: Ya no bloqueamos si faltan emails. Las tareas se crearán con assignee_id null
    // para los correos que no existan en profiles.

    // 2. Crear o actualizar pam_weeks_plan (sin usar upsert para evitar dependencia de índices únicos)
    const { data: existingWeekPlan, error: fetchWeekPlanError } = await supabase
      .from("pam_weeks_plan")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("week_number", weekNumber)
      .eq("week_year", weekYear)
      .maybeSingle();

    if (fetchWeekPlanError) throw fetchWeekPlanError;

    let weekPlanId: string;

    if (existingWeekPlan?.id) {
      // Actualizar metadatos del plan existente
      const { data: updatedWeekPlan, error: updateWeekPlanError } = await supabase
        .from("pam_weeks_plan")
        .update({
          uploaded_by: uploadedByUserId,
          source_filename: sourceFilename || null,
        })
        .eq("id", existingWeekPlan.id)
        .select("id")
        .single();

      if (updateWeekPlanError) throw updateWeekPlanError;
      if (!updatedWeekPlan) throw new Error("No se pudo actualizar el plan de semana");
      weekPlanId = updatedWeekPlan.id;
    } else {
      // Crear nuevo plan de semana
      const { data: insertedWeekPlan, error: insertWeekPlanError } = await supabase
        .from("pam_weeks_plan")
        .insert({
          organization_id: organizationId,
          week_number: weekNumber,
          week_year: weekYear,
          uploaded_by: uploadedByUserId,
          source_filename: sourceFilename || null,
        })
        .select("id")
        .single();

      if (insertWeekPlanError) throw insertWeekPlanError;
      if (!insertedWeekPlan) throw new Error("No se pudo crear el plan de semana");
      weekPlanId = insertedWeekPlan.id;
    }

    // 3. Eliminar tareas existentes de esa semana
    const { error: deleteError } = await supabase
      .from("pam_tasks")
      .delete()
      .eq("week_plan_id", weekPlanId);

    if (deleteError) throw deleteError;

    // 4. Crear nuevas tareas
    const taskRecords = tasks.map((task) => {
      const userInfo = emailToUserId.get(task.assigneeEmail);

      return {
        organization_id: organizationId,
        week_plan_id: weekPlanId,
        week_number: task.weekNumber,
        week_year: task.weekYear,
        date: task.date,
        assignee_user_id: userInfo?.userId || null,
        assignee_name: userInfo?.fullName || task.assigneeEmail,
        description: task.description,
        location: task.location || null,
        risk_type: task.riskType || null,
        status: "PENDING" as const,
        has_evidence: false,
      };
    });

    const { error: insertError } = await supabase.from("pam_tasks").insert(taskRecords);

    if (insertError) throw insertError;

    return {
      success: true,
      tasksCreated: taskRecords.length,
      errors: [],
      weekPlanId,
    };
  } catch (error: any) {
    console.error("Error importing PLS week", error);

    let message = "Error desconocido al importar";

    if (error instanceof Error) {
      message = error.message;
    } else if (error && typeof error === "object") {
      // Intentar extraer mensaje de objetos de error de Supabase
      if (typeof error.message === "string") {
        message = error.message;
      } else {
        try {
          message = JSON.stringify(error);
        } catch {
          // mantener mensaje por defecto
        }
      }
    }

    return {
      success: false,
      tasksCreated: 0,
      errors: [message],
    };
  }
}
