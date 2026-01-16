// ============================================================================
// NOTIFICATION EMAIL DISPATCHER
// Edge Function para procesar cola de notificaciones y enviar emails con Resend
// Ejecutado por cron cada 2-5 minutos
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { generateSubject, generateEmailHTML } from './email-templates.ts';

const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 5;
const RESEND_API_URL = 'https://api.resend.com/emails';

// ============================================================================
// TIPOS
// ============================================================================
interface OutboxRecord {
  id: string;
  organization_id: string;
  user_id: string | null;
  recipient_email: string | null;
  source_table: string;
  source_id: string;
  entity_type: 'hazard_report' | 'pam_task';
  entity_id: string;
  notification_type: string;
  payload: any;
  attempts: number;
}

interface ProcessResult {
  processed: number;
  sent: number;
  failed: number;
  errors: string[];
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Resuelve el email del destinatario
 */
async function resolveRecipientEmail(
  supabaseClient: any,
  record: OutboxRecord
): Promise<string | null> {
  // 1. Si hay user_id, buscar en profiles
  if (record.user_id) {
    const { data: profile, error } = await supabaseClient
      .from('profiles')
      .select('email')
      .eq('user_id', record.user_id)
      .single();
    
    if (!error && profile?.email) {
      return profile.email;
    }
  }
  
  // 2. Fallback: recipient_email directo del outbox
  if (record.recipient_email) {
    return record.recipient_email;
  }
  
  // 3. Último intento: buscar en auth.users (solo service role puede)
  if (record.user_id) {
    const { data: authUser, error } = await supabaseClient.auth.admin.getUserById(
      record.user_id
    );
    
    if (!error && authUser?.user?.email) {
      return authUser.user.email;
    }
  }
  
  return null;
}

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
 * Procesa un registro del outbox
 */
async function processOutboxRecord(
  supabaseClient: any,
  record: OutboxRecord,
  config: {
    resendApiKey: string;
    resendFrom: string;
    appBaseUrl: string;
  }
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    // 1. Resolver destinatario
    const recipientEmail = await resolveRecipientEmail(supabaseClient, record);
    
    if (!recipientEmail) {
      return {
        success: false,
        error: 'No se pudo resolver el email del destinatario',
      };
    }
    
    // 2. Construir link a la app
    const appLink = record.entity_type === 'hazard_report'
      ? `${config.appBaseUrl}/admin/pls/hazard-report/${record.entity_id}`
      : `${config.appBaseUrl}/pls/my-activities?task=${record.entity_id}`;
    
    // 3. Preparar datos para template
    const emailData = {
      recipientName: record.payload.assigneeName || record.payload.responsibleName || 'Usuario',
      notificationType: record.notification_type,
      entityType: record.entity_type,
      payload: record.payload,
      appLink,
      organizationName: record.payload.organizationName || 'Buses JM',
      auditId: record.entity_id.substring(0, 8),
      timestamp: new Date().toLocaleString('es-CL', {
        dateStyle: 'long',
        timeStyle: 'short',
      }),
    };
    
    // 4. Generar subject y HTML
    const subject = generateSubject(emailData);
    const html = generateEmailHTML(emailData);
    
    // 5. Enviar email con Resend
    const sendResult = await sendEmailWithResend({
      to: recipientEmail,
      subject,
      html,
      from: config.resendFrom,
      apiKey: config.resendApiKey,
    });
    
    if (!sendResult.success) {
      return {
        success: false,
        error: sendResult.error,
      };
    }
    
    return {
      success: true,
      messageId: sendResult.messageId,
    };
  } catch (error: any) {
    console.error('Error processing outbox record:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Marca registro como processing
 */
async function markAsProcessing(
  supabaseClient: any,
  recordId: string
): Promise<void> {
  await supabaseClient
    .from('notification_outbox')
    .update({
      status: 'processing',
    })
    .eq('id', recordId);
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
  
  await supabaseClient
    .from('notification_outbox')
    .update(updateData)
    .eq('id', recordId);
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
  
  await supabaseClient
    .from('notification_outbox')
    .update(updateData)
    .eq('id', recordId);
  
  if (!shouldRetry) {
    console.error(`Record ${recordId} marked as failed after ${newAttempts} attempts: ${error}`);
  }
}

// ============================================================================
// HANDLER PRINCIPAL
// ============================================================================
serve(async (req: Request) => {
  // Solo permitir POST (llamado por cron) o GET (para health check)
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  // Health check
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ status: 'ok' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  try {
    // 1. Validar secrets
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const resendFrom = Deno.env.get('RESEND_FROM');
    const appBaseUrl = Deno.env.get('APP_BASE_URL');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!resendApiKey || !resendFrom || !appBaseUrl || !supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({
          error: 'Missing configuration',
          details: {
            hasResendApiKey: !!resendApiKey,
            hasResendFrom: !!resendFrom,
            hasAppBaseUrl: !!appBaseUrl,
            hasSupabaseUrl: !!supabaseUrl,
            hasSupabaseServiceKey: !!supabaseServiceKey,
          },
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    // 2. Crear cliente Supabase con service role
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    
    // 3. Obtener registros pending con SKIP LOCKED (concurrency-safe)
    const { data: records, error: selectError } = await supabaseClient
      .from('notification_outbox')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);
    
    if (selectError) {
      console.error('Error selecting pending records:', selectError);
      return new Response(
        JSON.stringify({ error: 'Database error', details: selectError }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    if (!records || records.length === 0) {
      console.log('No pending notifications to process');
      return new Response(
        JSON.stringify({ message: 'No pending notifications', processed: 0 }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
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
    
    for (const record of records) {
      // Marcar como processing
      await markAsProcessing(supabaseClient, record.id);
      
      // Procesar y enviar email
      const processResult = await processOutboxRecord(supabaseClient, record as OutboxRecord, {
        resendApiKey,
        resendFrom,
        appBaseUrl,
      });
      
      if (processResult.success) {
        await markAsSent(supabaseClient, record.id, processResult.messageId);
        result.sent++;
        console.log(`✓ Email sent for record ${record.id} (${record.entity_type}/${record.notification_type})`);
      } else {
        await markAsFailedOrRetry(
          supabaseClient,
          record.id,
          record.attempts,
          processResult.error || 'Unknown error'
        );
        result.failed++;
        result.errors.push(`${record.id}: ${processResult.error}`);
        console.error(`✗ Failed to send email for record ${record.id}: ${processResult.error}`);
      }
    }
    
    console.log(`Batch complete: ${result.sent} sent, ${result.failed} failed`);
    
    // 5. Retornar resultado
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Unhandled error in dispatcher:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

// ============================================================================
// Log de inicio
// ============================================================================
console.log('notification-email-dispatcher started');
