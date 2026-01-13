import { supabase } from '@/integrations/supabase/client';

export interface PamImportResult {
  success: boolean;
  imported_count: number;
  week_plan_id: string;
  error?: string;
}

export interface PamImportParams {
  sheetUrl: string;
  organizationId: string;
  weekYear: number;
  weekNumber: number;
}

export async function importPamWeekFromGoogleSheets({
  sheetUrl,
  organizationId,
  weekYear,
  weekNumber,
}: PamImportParams): Promise<PamImportResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('No hay sesión activa');
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const functionUrl = `${supabaseUrl}/functions/v1/import-pam-week`;

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        sheet_url: sheetUrl,
        organization_id: organizationId,
        week_year: weekYear,
        week_number: weekNumber,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al importar desde Google Sheets');
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Error importing PAM week:', error);
    return {
      success: false,
      imported_count: 0,
      week_plan_id: '',
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}
