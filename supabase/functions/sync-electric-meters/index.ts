import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SheetRow {
  [key: string]: string | undefined;
}

function normalizeHeader(header: string): string {
  // Normaliza encabezados para que sean tolerantes a tildes, símbolos y espacios
  return header
    .toLowerCase()
    // Reemplaza caracteres con tilde por su versión simple
    .normalize("NFD")
    // Elimina marcas diacríticas (acentos) de forma compatible con más runtimes
    .replace(/[\u0300-\u036f]/g, "")
    // Reemplaza cualquier cosa que no sea letra o número por espacio
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseChileanCurrency(value: string | undefined): number | null {
  if (!value) return null;
  const cleaned = String(value).replace(/[$\s.]/g, "").replace(/,/g, "");
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

function parsePeriod(rawValue: string | undefined): string | null {
  if (!rawValue) return null;
  const value = String(rawValue).trim();

  if (/^\d{4}-\d{2}$/.test(value)) return value;

  // Soporta fechas numéricas tipo 24-01-2025 o 24/01/2025
  const dateMatch = value.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10);
    const monthNum = parseInt(dateMatch[2], 10);
    const yearNum = parseInt(dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3], 10);
    if (!isNaN(day) && !isNaN(monthNum) && !isNaN(yearNum) && monthNum >= 1 && monthNum <= 12) {
      const month = monthNum.toString().padStart(2, "0");
      return `${yearNum}-${month}`;
    }
  }

  const monthMap: Record<string, string> = {
    enero: "01",
    ene: "01",
    febrero: "02",
    feb: "02",
    marzo: "03",
    mar: "03",
    abril: "04",
    abr: "04",
    mayo: "05",
    may: "05",
    junio: "06",
    jun: "06",
    julio: "07",
    jul: "07",
    agosto: "08",
    ago: "08",
    septiembre: "09",
    sep: "09",
    octubre: "10",
    oct: "10",
    noviembre: "11",
    nov: "11",
    diciembre: "12",
    dic: "12",
  };

  const normalized = value.toLowerCase().replace(/[^a-záéíóú0-9]/g, " ").trim();
  const parts = normalized.split(/\s+/);
  let month: string | null = null;
  for (const p of parts) {
    if (monthMap[p]) {
      month = monthMap[p];
      break;
    }
  }
  if (!month) return null;

  const yearMatch = value.match(/\d{4}/);
  if (!yearMatch) return null;
  const year = yearMatch[0];
  return `${year}-${month}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!roleData || roleData.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden: Admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const organizationId = profileData?.organization_id;
    if (!organizationId) {
      return new Response(JSON.stringify({ error: "User has no organization assigned" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const errors: string[] = [];
    let totalInserted = 0;

    // Sheet de consumo de luz por medidor
    const spreadsheetId = "18Chw9GKYlblBOljJ7ZGJ0aJBYQU7t1Ax";
    const gid = "0"; // primera hoja del documento
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;

    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`Error fetching Google Sheet: ${response.statusText}`);
    }

    const csvText = await response.text();
    const rows = csvText
      .split("\n")
      .map((line) => {
        const values: string[] = [];
        let current = "";
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
            values.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        values.push(current.trim());
        return values;
      })
      .filter((row) => row.some((cell) => cell.length > 0));

    if (rows.length === 0) {
      errors.push("No data found in sheet");
    } else {
      const headers = rows[0].map((h) => h.trim());
      const normalizedHeaders = headers.map((h) => normalizeHeader(h));
      const dataRows = rows.slice(1);

      const records: any[] = [];

      dataRows.forEach((row, i) => {
        const rowObj: SheetRow = {};
        normalizedHeaders.forEach((normalizedHeader, idx) => {
          rowObj[normalizedHeader] = row[idx];
        });

        // Encabezados reales del sheet de luz (normalizados):
        // fecha, centro trabajo, direccion, n medidor, lectura en m3,
        // m3 consumidos por periodo, sobre consumo en m3, total pagar, observaciones

        const fecha = rowObj["fecha"]; // "Fecha"
        const centroTrabajo = rowObj["centro trabajo"]; // "Centro de Trabajo"
        const medidor = rowObj["n medidor"] || rowObj["medidor"]; // "N° de Medidor" o "Medidor"

        // Columna de consumo principal: "M3 Consumidos por Periodo." o fallback a consumo kWh
        const consumoPeriodo =
          rowObj["m3 consumidos por periodo"] ||
          rowObj["consumo kwh"] ||
          rowObj["consumo"];

        // Total a pagar: "Total Pagar" o fallback antiguo
        const costoTotal = rowObj["total pagar"] || rowObj["costo total"];

        const tipoUso = rowObj["tipo"] || rowObj["tipo medidor uso"] || null;
        const proveedor = rowObj["proveedor"] || null;
        const observaciones = rowObj["observaciones"] || null;

        if (!centroTrabajo && !consumoPeriodo) return;

        const period = parsePeriod(fecha || undefined);
        if (!period) {
          errors.push(`Row ${i + 2}: Could not parse period`);
          return;
        }

        if (!centroTrabajo || !medidor) {
          errors.push(`Row ${i + 2}: Missing Centro de Trabajo or Medidor`);
          return;
        }

        const consumoNum = parseFloat(String(consumoPeriodo || "0").replace(/,/g, ""));
        if (isNaN(consumoNum) || consumoNum <= 0) {
          errors.push(`Row ${i + 2}: Invalid consumo_kwh`);
          return;
        }

        records.push({
          user_id: user.id,
          organization_id: organizationId,
          period,
          fecha: fecha || null,
          centro_trabajo: String(centroTrabajo).trim(),
          medidor: String(medidor).trim(),
          tipo_uso: tipoUso || null,
          consumo_kwh: consumoNum,
          costo_total: parseChileanCurrency(costoTotal),
          proveedor: proveedor || null,
          observaciones: observaciones || null,
        });
      });

      if (records.length > 0) {
        // Mirror: borrar todo lo de la organización y volver a insertar
        const { error: deleteError } = await supabase
          .from("electric_meter_readings")
          .delete()
          .eq("organization_id", organizationId);

        if (deleteError) {
          errors.push(`Delete error: ${deleteError.message}`);
        } else {
          const { error: insertError } = await supabase
            .from("electric_meter_readings")
            .insert(records);

          if (insertError) {
            errors.push(`Insert error: ${insertError.message}`);
          } else {
            totalInserted = records.length;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        rows_inserted: totalInserted,
        errors,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Sync electric meters error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
