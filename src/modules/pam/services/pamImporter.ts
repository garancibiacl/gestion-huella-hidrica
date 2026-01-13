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

export function parsePamSheet(csvText: string): {
  tasks: PamTaskImportRow[];
  errors: string[];
} {
  const rows = parseCSV(csvText);
  if (rows.length < 2) {
    return { tasks: [], errors: ["El archivo está vacío o no tiene datos"] };
  }

  const headers = rows[0].map((h) => h.toLowerCase().trim());
  const dataRows = rows.slice(1);

  const colIdx = {
    semana: headers.findIndex((h) => h.includes("semana") || h.includes("week")),
    año: headers.findIndex((h) => h.includes("año") || h.includes("year")),
    fecha: headers.findIndex((h) => h.includes("fecha") || h.includes("date")),
    responsable: headers.findIndex(
      (h) => h.includes("responsable") || h.includes("email") || h.includes("asignado")
    ),
    descripcion: headers.findIndex(
      (h) => h.includes("descripcion") || h.includes("description") || h.includes("tarea")
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
    const assigneeEmail = colIdx.responsable >= 0 ? row[colIdx.responsable]?.trim() : "";
    const description = colIdx.descripcion >= 0 ? row[colIdx.descripcion]?.trim() : "";
    const location = colIdx.ubicacion >= 0 ? row[colIdx.ubicacion]?.trim() : "";
    const riskType = colIdx.riesgo >= 0 ? row[colIdx.riesgo]?.trim() : "";

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
    if (!description) {
      errors.push(`Fila ${rowNum}: Descripción faltante`);
      continue;
    }

    tasks.push({
      weekNumber,
      weekYear,
      date,
      assigneeEmail: assigneeEmail.toLowerCase(),
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
    // 1. Verificar que todos los responsables existen
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

    const missingEmails = uniqueEmails.filter((email) => !emailToUserId.has(email));
    if (missingEmails.length > 0) {
      return {
        success: false,
        tasksCreated: 0,
        errors: [
          `Los siguientes emails no existen en la organización: ${missingEmails.join(", ")}`,
        ],
      };
    }

    // 2. Crear o actualizar pam_weeks_plan
    const { data: weekPlan, error: weekPlanError } = await supabase
      .from("pam_weeks_plan")
      .upsert(
        {
          organization_id: organizationId,
          week_number: weekNumber,
          week_year: weekYear,
          uploaded_by: uploadedByUserId,
          source_filename: sourceFilename || null,
        },
        { onConflict: "week_number,week_year" }
      )
      .select("id")
      .single();

    if (weekPlanError) throw weekPlanError;
    if (!weekPlan) throw new Error("No se pudo crear el plan de semana");

    // 3. Eliminar tareas existentes de esa semana
    const { error: deleteError } = await supabase
      .from("pam_tasks")
      .delete()
      .eq("week_plan_id", weekPlan.id);

    if (deleteError) throw deleteError;

    // 4. Crear nuevas tareas
    const taskRecords = tasks.map((task) => {
      const userInfo = emailToUserId.get(task.assigneeEmail)!;
      return {
        organization_id: organizationId,
        week_plan_id: weekPlan.id,
        week_number: task.weekNumber,
        week_year: task.weekYear,
        date: task.date,
        assignee_user_id: userInfo.userId,
        assignee_name: userInfo.fullName || task.assigneeEmail,
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
      weekPlanId: weekPlan.id,
    };
  } catch (error: any) {
    console.error("Error importing PAM week", error);
    return {
      success: false,
      tasksCreated: 0,
      errors: [error instanceof Error ? error.message : "Error desconocido al importar"],
    };
  }
}
