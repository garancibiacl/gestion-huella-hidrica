// ============================================================================
// NOTIFICATION EMAIL DISPATCHER
// Edge Function para procesar cola de notificaciones y enviar emails con Resend
// Ejecutado por cron cada 3 minutos
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 5;
const RESEND_API_URL = 'https://api.resend.com/emails';

// ============================================================================
// TIPOS - Coinciden con la tabla notification_outbox
// ============================================================================
interface OutboxRecord {
  id: string;
  entity_type: 'hazard' | 'pam';
  entity_id: string;
  notification_id: string;
  notification_type: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  html_body: string;
  status: string;
  attempts: number;
  last_error: string | null;
  message_id: string | null;
  created_at: string;
  sent_at: string | null;
}

interface ProcessResult {
  processed: number;
  sent: number;
  failed: number;
  errors: string[];
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Envía email usando Resend API
 */
async function sendEmailWithResend(params: {
  to: string;
  subject: string;
  html: string;
  from: string;
  apiKey: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    console.log(`Sending email to ${params.to}: ${params.subject}`);
    
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${params.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: params.from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('Resend API error:', result);
      return {
        success: false,
        error: result.message || `HTTP ${response.status}`,
      };
    }
    
    console.log(`Email sent successfully, message_id: ${result.id}`);
    return {
      success: true,
      messageId: result.id,
    };
  } catch (error: any) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Marca registro como sent
 */
async function markAsSent(
  supabaseClient: any,
  recordId: string,
  messageId?: string
): Promise<void> {
  const updateData: any = {
    status: 'sent',
    sent_at: new Date().toISOString(),
  };
  
  if (messageId) {
    updateData.message_id = messageId;
  }
  
  const { error } = await supabaseClient
    .from('notification_outbox')
    .update(updateData)
    .eq('id', recordId);
    
  if (error) {
    console.error(`Error marking record ${recordId} as sent:`, error);
  }
}

/**
 * Marca registro como failed o vuelve a pending para retry
 */
async function markAsFailedOrRetry(
  supabaseClient: any,
  recordId: string,
  attempts: number,
  error: string
): Promise<void> {
  const newAttempts = attempts + 1;
  const shouldRetry = newAttempts < MAX_ATTEMPTS;
  
  const updateData: any = {
    status: shouldRetry ? 'pending' : 'failed',
    attempts: newAttempts,
    last_error: error,
  };
  
  const { error: updateError } = await supabaseClient
    .from('notification_outbox')
    .update(updateData)
    .eq('id', recordId);
  
  if (updateError) {
    console.error(`Error updating record ${recordId}:`, updateError);
  }
  
  if (!shouldRetry) {
    console.error(`Record ${recordId} marked as failed after ${newAttempts} attempts: ${error}`);
  } else {
    console.log(`Record ${recordId} will retry (attempt ${newAttempts}/${MAX_ATTEMPTS})`);
  }
}

// ============================================================================
// HANDLER PRINCIPAL
// ============================================================================
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Health check
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ status: 'ok', service: 'notification-email-dispatcher' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  try {
    // 1. Validar secrets
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const resendFrom = Deno.env.get('RESEND_FROM') || 'Notificaciones HSE <notificaciones@busesjm.cl>';
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Supabase credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // 2. Crear cliente Supabase con service role
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    
    // 3. Obtener registros pending
    const { data: records, error: selectError } = await supabaseClient
      .from('notification_outbox')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', MAX_ATTEMPTS)
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);
    
    if (selectError) {
      console.error('Error selecting pending records:', selectError);
      return new Response(
        JSON.stringify({ error: 'Database error', details: selectError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!records || records.length === 0) {
      console.log('No pending notifications to process');
      return new Response(
        JSON.stringify({ message: 'No pending notifications', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // 4. Procesar cada registro
    const result: ProcessResult = {
      processed: records.length,
      sent: 0,
      failed: 0,
      errors: [],
    };
    
    console.log(`Processing ${records.length} notifications...`);
    
    for (const record of records as OutboxRecord[]) {
      // Validar que tenga email
      if (!record.recipient_email) {
        await markAsFailedOrRetry(
          supabaseClient,
          record.id,
          record.attempts,
          'No recipient email'
        );
        result.failed++;
        result.errors.push(`${record.id}: No recipient email`);
        continue;
      }
      
      // Enviar email (subject y html_body ya vienen del trigger)
      const sendResult = await sendEmailWithResend({
        to: record.recipient_email,
        subject: record.subject,
        html: record.html_body,
        from: resendFrom,
        apiKey: resendApiKey,
      });
      
      if (sendResult.success) {
        await markAsSent(supabaseClient, record.id, sendResult.messageId);
        result.sent++;
        console.log(`✓ Email sent: ${record.id} (${record.entity_type}/${record.notification_type})`);
      } else {
        await markAsFailedOrRetry(
          supabaseClient,
          record.id,
          record.attempts,
          sendResult.error || 'Unknown error'
        );
        result.failed++;
        result.errors.push(`${record.id}: ${sendResult.error}`);
        console.error(`✗ Failed: ${record.id} - ${sendResult.error}`);
      }
    }
    
    console.log(`Batch complete: ${result.sent} sent, ${result.failed} failed`);
    
    // 5. Retornar resultado
    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Unhandled error in dispatcher:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

console.log('notification-email-dispatcher v2 started');
