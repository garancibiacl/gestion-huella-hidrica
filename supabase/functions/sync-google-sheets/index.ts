import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SheetRow {
  [key: string]: string | undefined;
}

// Parse Chilean currency format: $109.242 or $1.234.567
function parseChileanCurrency(value: string | undefined): number | null {
  if (!value) return null;
  const cleaned = String(value).replace(/[$\s.]/g, '').replace(/,/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

// Parse period to YYYY-MM format
function parsePeriod(rawValue: string | undefined, year?: number): string | null {
  if (!rawValue) return null;
  
  const monthMap: Record<string, string> = {
    'enero': '01', 'ene': '01',
    'febrero': '02', 'feb': '02',
    'marzo': '03', 'mar': '03',
    'abril': '04', 'abr': '04',
    'mayo': '05', 'may': '05',
    'junio': '06', 'jun': '06',
    'julio': '07', 'jul': '07',
    'agosto': '08', 'ago': '08',
    'septiembre': '09', 'sep': '09',
    'octubre': '10', 'oct': '10',
    'noviembre': '11', 'nov': '11',
    'diciembre': '12', 'dic': '12',
  };

  const period = String(rawValue).trim();
  
  // Format: YYYY-MM
  if (/^\d{4}-\d{2}$/.test(period)) return period;
  
  // Format: MM/YYYY
  const slashMatch = period.match(/^(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const month = slashMatch[1].padStart(2, '0');
    return `${slashMatch[2]}-${month}`;
  }
  
  // Format: Month name (Enero, ene, etc.)
  const normalized = period.toLowerCase().replace(/[^a-záéíóú0-9]/g, ' ').trim();
  const parts = normalized.split(/\s+/);
  
  for (const part of parts) {
    if (monthMap[part]) {
      const yearMatch = period.match(/\d{4}/) || period.match(/\d{2}$/);
      if (yearMatch) {
        let yr = yearMatch[0];
        if (yr.length === 2) {
          yr = yr.startsWith('9') ? `19${yr}` : `20${yr}`;
        }
        return `${yr}-${monthMap[part]}`;
      } else if (year) {
        return `${year}-${monthMap[part]}`;
      }
    }
  }
  
  return null;
}

// Extract year from date string
function extractYearFromDate(rawDate: string | undefined): number | undefined {
  if (!rawDate) return undefined;
  
  const dateStr = String(rawDate).trim();
  const parts = dateStr.split(/[/\-\.]/);
  
  if (parts.length >= 3) {
    let year = parseInt(parts[2], 10);
    if (year < 100) {
      year = year < 50 ? 2000 + year : 1900 + year;
    }
    if (year >= 2000 && year <= 2100) return year;
  }
  
  return undefined;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!roleData || roleData.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's organization
    const { data: profileData } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const organizationId = profileData?.organization_id;
    if (!organizationId) {
      return new Response(JSON.stringify({ error: 'User has no organization assigned' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create sync run record
    const syncStarted = new Date().toISOString();
    const { data: syncRun, error: syncError } = await supabase
      .from('sync_runs')
      .insert({
        user_id: user.id,
        source: 'google_sheets',
        started_at: syncStarted,
      })
      .select()
      .single();

    if (syncError) throw syncError;

    const errors: string[] = [];
    let totalInserted = 0;
    let totalUpdated = 0;

    // Fetch Google Sheets data using public CSV export
    const spreadsheetId = '1L78_TmjdE58596F9tqHFK7DTjovedFJI';
    const gid = '680818774'; // Sheet ID from URL
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
    
    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`Error fetching Google Sheet: ${response.statusText}`);
    }

    const csvText = await response.text();
    
    // Parse CSV to rows
    const rows = csvText.split('\n').map(line => {
      // Simple CSV parser (handles basic cases)
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      
      return values;
    }).filter(row => row.some(cell => cell.length > 0));

    if (rows.length === 0) {
      errors.push('No data found in sheet');
    } else {
      // Parse header row
      const headers = rows[0].map((h: string) => h.trim());
      const dataRows = rows.slice(1);

      // Process human water consumption data
      const humanWaterRecords = [];

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowObj: SheetRow = {};
        
        headers.forEach((header: string, idx: number) => {
          rowObj[header] = row[idx];
        });

        // Extract fields
        const fecha = rowObj['Fecha'];
        const mes = rowObj['Mes'];
        const centroTrabajo = rowObj['Centro de Trabajo'];
        const faena = rowObj['Faena'];
        const tipo = rowObj['Tipo'];
        const proveedor = rowObj['Proveedor'];
        const cantidad = rowObj['Cantidad'];
        const costoTotal = rowObj['Costo Total'];
        const observaciones = rowObj['Observaciones'];

        // Skip empty rows
        if (!centroTrabajo && !cantidad) continue;

        // Determine period
        const yearFromDate = extractYearFromDate(fecha);
        let period = parsePeriod(mes, yearFromDate);
        if (!period && fecha) {
          period = parsePeriod(fecha);
        }

        if (!period) {
          errors.push(`Row ${i + 2}: Could not parse period`);
          continue;
        }

        if (!centroTrabajo) {
          errors.push(`Row ${i + 2}: Missing Centro de Trabajo`);
          continue;
        }

        // Determine formato
        const tipoLower = String(tipo || '').toLowerCase();
        const formato = (tipoLower.includes('bidón') || tipoLower.includes('bidon') || tipoLower.includes('20')) 
          ? 'bidon_20l' 
          : 'botella';

        const cantidadNum = parseFloat(String(cantidad || '0').replace(/,/g, ''));
        if (isNaN(cantidadNum) || cantidadNum <= 0) {
          errors.push(`Row ${i + 2}: Invalid quantity`);
          continue;
        }

        humanWaterRecords.push({
          user_id: user.id,
          organization_id: organizationId,
          period,
          fecha: fecha || null,
          centro_trabajo: String(centroTrabajo).trim(),
          faena: faena || null,
          formato,
          proveedor: proveedor || null,
          cantidad: cantidadNum,
          unidad: 'unidad',
          precio_unitario: null,
          total_costo: parseChileanCurrency(costoTotal),
        });
      }

      // Upsert human water consumption records
      if (humanWaterRecords.length > 0) {
        // Mirror sync: keep table as an exact copy of Google Sheet for this organization.
        // 1) Delete all current rows for this organization.
        const { error: deleteError } = await supabase
          .from('human_water_consumption')
          .delete()
          .eq('organization_id', organizationId);

        if (deleteError) {
          errors.push(`Delete error: ${deleteError.message}`);
        } else {
          // 2) Insert fresh rows.
          const { error: insertError } = await supabase
            .from('human_water_consumption')
            .insert(humanWaterRecords);

          if (insertError) {
            errors.push(`Insert error: ${insertError.message}`);
          } else {
            totalInserted = humanWaterRecords.length;
          }
        }
      }
    }

    // Update sync run with results
    await supabase
      .from('sync_runs')
      .update({
        finished_at: new Date().toISOString(),
        rows_inserted: totalInserted,
        rows_updated: totalUpdated,
        errors: errors,
      })
      .eq('id', syncRun.id);

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        rows_processed: totalInserted + totalUpdated,
        rows_inserted: totalInserted,
        rows_updated: totalUpdated,
        errors,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
