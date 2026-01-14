import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImportRow {
  fecha: string;
  descripcion: string;
  responsable_email: string;
  responsable_nombre: string;
  ubicacion?: string;
  contrato?: string;
  area?: string;
  rol?: string;
  tipo_riesgo?: string;
}

interface ImportRequest {
  sheet_url: string;
  organization_id: string;
  week_year: number;
  week_number: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { sheet_url, organization_id, week_year, week_number }: ImportRequest = await req.json();

    if (!sheet_url || !organization_id || !week_year || !week_number) {
      return new Response(
        JSON.stringify({ error: "Faltan parámetros requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const csvUrl = sheet_url.replace("/edit", "/export?format=csv");
    const response = await fetch(csvUrl);
    
    if (!response.ok) {
      throw new Error("No se pudo acceder al Google Sheet. Verifica que sea público.");
    }

    const csvText = await response.text();
    const lines = csvText.split("\n").filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error("El archivo está vacío o no tiene datos");
    }

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const rows: ImportRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim());
      
      if (values.length < 3) continue;

      const row: ImportRow = {
        fecha: values[headers.indexOf("fecha")] || "",
        descripcion: values[headers.indexOf("descripcion")] || values[headers.indexOf("descripción")] || "",
        responsable_email: values[headers.indexOf("responsable_email")] || values[headers.indexOf("email")] || "",
        responsable_nombre: values[headers.indexOf("responsable_nombre")] || values[headers.indexOf("nombre")] || "",
        ubicacion: values[headers.indexOf("ubicacion")] || values[headers.indexOf("ubicación")] || undefined,
        contrato: values[headers.indexOf("contrato")] || undefined,
        area: values[headers.indexOf("area")] || values[headers.indexOf("área")] || undefined,
        rol: values[headers.indexOf("rol")] || undefined,
        tipo_riesgo: values[headers.indexOf("tipo_riesgo")] || values[headers.indexOf("riesgo")] || undefined,
      };

      if (row.fecha && row.descripcion && row.responsable_email) {
        rows.push(row);
      }
    }

    if (rows.length === 0) {
      throw new Error("No se encontraron filas válidas para importar");
    }

    const { data: weekPlan, error: weekPlanError } = await supabaseClient
      .from("pam_weeks_plan")
      .upsert({
        organization_id,
        week_year,
        week_number,
      }, {
        onConflict: "organization_id,week_year,week_number",
      })
      .select()
      .single();

    if (weekPlanError) throw weekPlanError;

    const { error: deleteError } = await supabaseClient
      .from("pam_tasks")
      .delete()
      .eq("week_plan_id", weekPlan.id);

    if (deleteError) throw deleteError;

    const tasksToInsert = [];

    for (const row of rows) {
      let assigneeUserId = null;

      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("user_id")
        .eq("email", row.responsable_email)
        .eq("organization_id", organization_id)
        .single();

      if (profile) {
        assigneeUserId = profile.user_id;
      }

      tasksToInsert.push({
        week_plan_id: weekPlan.id,
        organization_id,
        week_year,
        week_number,
        date: row.fecha,
        description: row.descripcion,
        assignee_user_id: assigneeUserId || user.id,
        assignee_name: row.responsable_nombre,
        assignee_email: row.responsable_email,
        location: row.ubicacion || null,
        contract: row.contrato || null,
        area: row.area || null,
        assignee_role: row.rol || null,
        risk_type: row.tipo_riesgo || null,
        status: "PENDING",
      });
    }

    const { data: insertedTasks, error: insertError } = await supabaseClient
      .from("pam_tasks")
      .insert(tasksToInsert)
      .select();

    if (insertError) throw insertError;

    for (const task of insertedTasks) {
      if (task.assignee_user_id) {
        await supabaseClient.from("pam_notifications").insert({
          user_id: task.assignee_user_id,
          organization_id,
          task_id: task.id,
          type: "task_assigned",
          title: "Nueva tarea PAM asignada",
          message: `Se te ha asignado: ${task.description}`,
        });
      }
    }

    await supabaseClient.rpc("calculate_pam_metrics", {
      p_organization_id: organization_id,
      p_week_year: week_year,
      p_week_number: week_number,
    });

    return new Response(
      JSON.stringify({
        success: true,
        imported_count: insertedTasks.length,
        week_plan_id: weekPlan.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error en import-pam-week:", error);
    const errorMessage = error instanceof Error ? error.message : "Error al importar tareas";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
