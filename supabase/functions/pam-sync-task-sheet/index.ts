import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PamTaskPayload {
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
}

interface SyncRequestBody {
  action: "create" | "update" | "delete";
  task: PamTaskPayload;
}

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

const SHEET_ID = Deno.env.get("PLS_SHEET_ID") ?? "";
const SHEET_RANGE = Deno.env.get("PLS_SHEET_RANGE") ?? "PLS!A:Q";
const SERVICE_ACCOUNT_JSON = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON") ?? "";

function base64UrlEncode(input: Uint8Array | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const cleaned = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function getAccessToken(): Promise<string> {
  if (!SERVICE_ACCOUNT_JSON) {
    throw new Error("Falta GOOGLE_SERVICE_ACCOUNT_JSON en variables de entorno.");
  }

  const serviceAccount = JSON.parse(SERVICE_ACCOUNT_JSON);
  const clientEmail = serviceAccount.client_email as string | undefined;
  const privateKey = (serviceAccount.private_key as string | undefined)?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error("Credenciales inválidas: client_email o private_key faltante.");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: clientEmail,
    scope: GOOGLE_SHEETS_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 60 * 60,
  };

  const unsignedJwt = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claimSet))}`;

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedJwt),
  );

  const jwt = `${unsignedJwt}.${base64UrlEncode(new Uint8Array(signature))}`;

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    const errorBody = await tokenResponse.text();
    throw new Error(`Error obteniendo token Google: ${tokenResponse.status} ${errorBody}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token as string;
}

function buildRowValues(task: PamTaskPayload): string[] {
  return [
    task.id ?? "",
    task.week_year?.toString() ?? "",
    task.risk_type ?? "",
    task.description ?? "",
    task.assignee_name ?? "",
    task.assignee_email ?? "",
    task.date ?? "",
    task.end_date ?? "",
    task.location ?? "",
    task.contractor ?? "",
    "",
    "",
    "",
    "",
    "",
    "",
    task.description ?? "",
  ];
}

async function fetchSheetValues(accessToken: string, range: string): Promise<string[][]> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}?majorDimension=ROWS`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Error leyendo Google Sheet: ${response.status} ${errorBody}`);
  }

  const payload = await response.json();
  return (payload.values as string[][] | undefined) ?? [];
}

async function findRowByTaskId(accessToken: string, sheetName: string, taskId: string): Promise<number> {
  const values = await fetchSheetValues(accessToken, `${sheetName}!A:A`);
  for (let i = 0; i < values.length; i += 1) {
    if ((values[i]?.[0] ?? "").trim() === taskId) {
      return i + 1;
    }
  }
  return -1;
}

async function appendRow(accessToken: string, sheetName: string, rowValues: string[]): Promise<void> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(sheetName + "!A:Q")}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [rowValues] }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Error agregando fila en Sheet: ${response.status} ${errorBody}`);
  }
}

async function updateRow(accessToken: string, sheetName: string, rowNumber: number, rowValues: string[]): Promise<void> {
  const range = `${sheetName}!A${rowNumber}:Q${rowNumber}`;
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [rowValues] }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Error actualizando fila en Sheet: ${response.status} ${errorBody}`);
  }
}

async function getSheetId(accessToken: string, sheetName: string): Promise<number | null> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?fields=sheets.properties`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  const sheet = (payload.sheets as Array<{ properties: { title: string; sheetId: number } }> | undefined)
    ?.find((item) => item.properties.title === sheetName);
  return sheet?.properties.sheetId ?? null;
}

async function deleteRow(accessToken: string, sheetName: string, rowNumber: number): Promise<void> {
  const sheetId = await getSheetId(accessToken, sheetName);
  if (sheetId === null) {
    const range = `${sheetName}!A${rowNumber}:Q${rowNumber}`;
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}:clear`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Error limpiando fila en Sheet: ${response.status} ${errorBody}`);
    }
    return;
  }

  if (rowNumber <= 1) {
    throw new Error("No se puede eliminar el encabezado del Sheet.");
  }

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: rowNumber - 1,
                endIndex: rowNumber,
              },
            },
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Error eliminando fila en Sheet: ${response.status} ${errorBody}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!SHEET_ID) {
      throw new Error("Falta PLS_SHEET_ID en variables de entorno.");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: SyncRequestBody = await req.json();
    const { action, task } = body;

    if (!action || !task?.id) {
      return new Response(JSON.stringify({ error: "Parámetros requeridos faltantes" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sheetName = SHEET_RANGE.split("!")[0] || "PLS";
    const accessToken = await getAccessToken();

    if (action === "create") {
      await appendRow(accessToken, sheetName, buildRowValues(task));
    }

    if (action === "update") {
      const rowNumber = await findRowByTaskId(accessToken, sheetName, task.id);
      if (rowNumber === -1) {
        throw new Error(`No se encontró la tarea ${task.id} en el Sheet.`);
      }
      await updateRow(accessToken, sheetName, rowNumber, buildRowValues(task));
    }

    if (action === "delete") {
      const rowNumber = await findRowByTaskId(accessToken, sheetName, task.id);
      if (rowNumber === -1) {
        throw new Error(`No se encontró la tarea ${task.id} en el Sheet.`);
      }
      await deleteRow(accessToken, sheetName, rowNumber);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error en pam-sync-task-sheet:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
