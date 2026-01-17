/**
 * EMAIL TEMPLATES - JM HSE
 * 
 * Plantillas profesionales para notificaciones transaccionales
 * Compatible con: Gmail, Outlook, Apple Mail, clientes corporativos
 * 
 * Arquitectura:
 * - HTML con tablas (máxima compatibilidad)
 * - Inline CSS (no stylesheets externos)
 * - Mobile-first, ancho 600px
 * - Accesible (WCAG AA)
 */

// ============================================================================
// TIPOS Y CONFIGURACIÓN
// ============================================================================

export interface EmailNotificationPayload {
  // Común
  type: string;
  title: string;
  message: string;
  organizationName?: string;

  // Reportes de Peligro
  reportId?: string;
  description?: string;
  dueDate?: string;
  riskLabel?: string;
  faena?: string;
  hierarchySummary?: string;
  createdAt?: string;
  verificationResponsibleName?: string;

  // Tareas PAM
  taskId?: string;
  location?: string;
  riskType?: string;
  assignedTo?: string;
}

// ============================================================================
// SUBJECTS DINÁMICOS
// ============================================================================

export function generateEmailSubject(
  notificationType: string,
  payload: EmailNotificationPayload
): string {
  const subjects: Record<string, string> = {
    // REPORTES DE PELIGRO
    report_assigned: `[HSE] Nuevo reporte asignado · ${payload.faena || 'Revisar'} · ${payload.riskLabel || 'Peligro identificado'}`,
    
    report_due_soon: `[HSE] ⚠️ Reporte próximo a vencer · ${truncate(payload.description, 40)}`,
    
    report_overdue: `[HSE] 🚨 Reporte VENCIDO · ${truncate(payload.description, 40)}`,
    
    report_closed: `[HSE] Reporte cerrado · Requiere verificación · ${truncate(payload.description, 30)}`,
    
    report_verified: `[HSE] ✅ Reporte verificado y archivado · ${truncate(payload.description, 35)}`,

    // TAREAS PAM
    task_assigned: `[HSE] Nueva tarea asignada · ${payload.location || 'Revisar'} · ${payload.riskType || 'PAM'}`,
    
    task_due_soon: `[HSE] ⚠️ Tarea próxima a vencer · ${truncate(payload.description, 40)}`,
    
    task_overdue: `[HSE] 🚨 Tarea VENCIDA · ${truncate(payload.description, 40)}`,
  };

  return subjects[notificationType] || `[HSE] Notificación · ${payload.title}`;
}

function truncate(text: string | undefined, maxLength: number): string {
  if (!text) return 'Ver detalles';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// ============================================================================
// GENERADOR DE HTML
// ============================================================================

export function generateEmailHtml(
  notificationType: string,
  payload: EmailNotificationPayload,
  recipientName: string,
  ctaUrl: string
): string {
  // Configuración según tipo de notificación
  const config = getNotificationConfig(notificationType, payload);

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${config.title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6; line-height: 1.6;">
  
  <!-- EMAIL CONTAINER (600px) -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- HEADER -->
          <tr>
            <td style="background: linear-gradient(135deg, ${config.headerColor} 0%, ${config.headerColorDark} 100%); padding: 24px 32px; text-align: left; border-bottom: 4px solid ${config.accentColor};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <h1 style="margin: 0; padding: 0; color: #ffffff; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                      ${config.badge}
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- TITLE -->
          <tr>
            <td style="padding: 32px 32px 16px 32px;">
              <h2 style="margin: 0; padding: 0; color: #111827; font-size: 24px; font-weight: 700; line-height: 1.3;">
                ${config.title}
              </h2>
            </td>
          </tr>

          <!-- GREETING -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <p style="margin: 0; padding: 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hola <strong>${recipientName}</strong>,
              </p>
              <p style="margin: 12px 0 0 0; padding: 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
                ${config.intro}
              </p>
            </td>
          </tr>

          <!-- CARD: RESUMEN DEL ITEM -->
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9fafb; border-left: 4px solid ${config.accentColor}; border-radius: 6px; overflow: hidden;">
                <tr>
                  <td style="padding: 20px 24px;">
                    
                    <!-- Badge de Estado -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 16px;">
                      <tr>
                        <td style="background-color: ${config.badgeColor}; color: ${config.badgeTextColor}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 6px 12px; border-radius: 4px;">
                          ${config.statusLabel}
                        </td>
                      </tr>
                    </table>

                    <!-- Descripción -->
                    ${payload.description ? `
                    <p style="margin: 0 0 16px 0; padding: 0; color: #111827; font-size: 15px; font-weight: 600; line-height: 1.5;">
                      ${escapeHtml(payload.description)}
                    </p>
                    ` : ''}

                    <!-- Datos Clave -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 14px; color: #6b7280;">
                      ${generateKeyValueRows(config.details)}
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA BUTTON -->
          <tr>
            <td style="padding: 0 32px 24px 32px; text-align: center;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                <tr>
                  <td style="background-color: ${config.ctaColor}; border-radius: 6px; text-align: center;">
                    <a href="${ctaUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 14px 32px; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; text-transform: uppercase; letter-spacing: 0.5px;">
                      ${config.ctaText}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- LINK FALLBACK -->
          <tr>
            <td style="padding: 0 32px 32px 32px; text-align: center;">
              <p style="margin: 0; padding: 0; color: #9ca3af; font-size: 13px; line-height: 1.5;">
                Si el botón no funciona, copia este enlace:<br>
                <a href="${ctaUrl}" target="_blank" rel="noopener noreferrer" style="color: ${config.accentColor}; text-decoration: underline; word-break: break-all;">
                  ${ctaUrl}
                </a>
              </p>
            </td>
          </tr>

          <!-- DIVIDER -->
          <tr>
            <td style="padding: 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-top: 1px solid #e5e7eb;"></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding: 24px 32px 32px 32px; text-align: center;">
              <p style="margin: 0 0 8px 0; padding: 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
                <strong>JM HSE</strong> · Gestión de Seguridad y Medio Ambiente
              </p>
              <p style="margin: 0 0 12px 0; padding: 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
                Este es un correo automático. Por favor, no respondas a este mensaje.
              </p>
              ${payload.organizationName ? `
              <p style="margin: 0; padding: 0; color: #d1d5db; font-size: 11px; line-height: 1.4;">
                Organización: ${escapeHtml(payload.organizationName)}<br>
                Enviado: ${new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })}
              </p>
              ` : ''}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
`;
}

// ============================================================================
// CONFIGURACIÓN POR TIPO DE NOTIFICACIÓN
// ============================================================================

function getNotificationConfig(type: string, payload: EmailNotificationPayload) {
  const configs: Record<string, any> = {
    // ========================================================================
    // REPORTES DE PELIGRO
    // ========================================================================
    report_assigned: {
      badge: '🚨 REPORTE DE PELIGRO',
      title: 'Nuevo Reporte de Peligro Asignado',
      intro: 'Se te ha asignado un nuevo reporte de peligro que requiere tu atención y acción inmediata.',
      statusLabel: 'REQUIERE ACCIÓN',
      headerColor: '#b91c1c',
      headerColorDark: '#991b1b',
      accentColor: '#dc2626',
      badgeColor: '#fef2f2',
      badgeTextColor: '#991b1b',
      ctaColor: '#dc2626',
      ctaText: 'Ver Reporte en la App',
      details: [
        { label: '📋 Descripción', value: payload.description },
        { label: '⚠️ Riesgo Crítico', value: payload.riskLabel },
        { label: '📍 Faena', value: payload.faena },
        { label: '🏢 Proceso', value: payload.hierarchySummary },
        { label: '📅 Plazo de Cierre', value: formatDate(payload.dueDate) },
        { label: '🕐 Reportado', value: formatDate(payload.createdAt) },
      ],
    },

    report_due_soon: {
      badge: '⚠️ RECORDATORIO',
      title: 'Reporte de Peligro Próximo a Vencer',
      intro: 'El siguiente reporte está próximo a su fecha límite. Asegúrate de completar las acciones necesarias.',
      statusLabel: 'PRÓXIMO A VENCER',
      headerColor: '#f59e0b',
      headerColorDark: '#d97706',
      accentColor: '#f59e0b',
      badgeColor: '#fffbeb',
      badgeTextColor: '#d97706',
      ctaColor: '#f59e0b',
      ctaText: 'Revisar Reporte',
      details: [
        { label: '📋 Descripción', value: payload.description },
        { label: '⚠️ Riesgo Crítico', value: payload.riskLabel },
        { label: '📍 Faena', value: payload.faena },
        { label: '⏰ Vence', value: formatDate(payload.dueDate) },
      ],
    },

    report_overdue: {
      badge: '🚨 URGENTE',
      title: 'Reporte de Peligro VENCIDO',
      intro: 'Este reporte ha superado su fecha límite. Se requiere acción inmediata para regularizar la situación.',
      statusLabel: 'VENCIDO',
      headerColor: '#991b1b',
      headerColorDark: '#7f1d1d',
      accentColor: '#dc2626',
      badgeColor: '#7f1d1d',
      badgeTextColor: '#ffffff',
      ctaColor: '#dc2626',
      ctaText: 'Regularizar Ahora',
      details: [
        { label: '📋 Descripción', value: payload.description },
        { label: '⚠️ Riesgo Crítico', value: payload.riskLabel },
        { label: '📍 Faena', value: payload.faena },
        { label: '❌ Venció', value: formatDate(payload.dueDate) },
      ],
    },

    report_closed: {
      badge: '✅ REPORTE CERRADO',
      title: 'Reporte Cerrado · Requiere Verificación',
      intro: `El responsable ha cerrado el siguiente reporte. Revisa la evidencia y verifica que las acciones cumplan con los estándares HSE.`,
      statusLabel: 'PENDIENTE DE VERIFICACIÓN',
      headerColor: '#10b981',
      headerColorDark: '#059669',
      accentColor: '#10b981',
      badgeColor: '#ecfdf5',
      badgeTextColor: '#047857',
      ctaColor: '#10b981',
      ctaText: 'Verificar Reporte',
      details: [
        { label: '📋 Descripción', value: payload.description },
        { label: '⚠️ Riesgo Crítico', value: payload.riskLabel },
        { label: '📍 Faena', value: payload.faena },
        { label: '✅ Cerrado', value: formatDate(new Date().toISOString()) },
      ],
    },

    report_verified: {
      badge: '✅ REPORTE VERIFICADO',
      title: 'Reporte Verificado y Archivado',
      intro: 'El reporte ha sido verificado exitosamente por el responsable de seguridad. Se archiva como completado.',
      statusLabel: 'COMPLETADO',
      headerColor: '#10b981',
      headerColorDark: '#059669',
      accentColor: '#10b981',
      badgeColor: '#ecfdf5',
      badgeTextColor: '#047857',
      ctaColor: '#6b7280',
      ctaText: 'Ver Reporte',
      details: [
        { label: '📋 Descripción', value: payload.description },
        { label: '✅ Verificado por', value: payload.verificationResponsibleName },
        { label: '📍 Faena', value: payload.faena },
      ],
    },

    // ========================================================================
    // TAREAS PAM
    // ========================================================================
    task_assigned: {
      badge: '📋 TAREA PAM',
      title: 'Nueva Tarea Asignada',
      intro: 'Se te ha asignado una nueva tarea en el Plan de Acción Mensual (PAM). Revisa los detalles y plazos.',
      statusLabel: 'ASIGNADA',
      headerColor: '#b91c1c',
      headerColorDark: '#991b1b',
      accentColor: '#dc2626',
      badgeColor: '#fef2f2',
      badgeTextColor: '#991b1b',
      ctaColor: '#dc2626',
      ctaText: 'Ver Tarea en la App',
      details: [
        { label: '📋 Descripción', value: payload.description },
        { label: '⚠️ Tipo de Riesgo', value: payload.riskType },
        { label: '📍 Ubicación', value: payload.location },
        { label: '📅 Plazo', value: formatDate(payload.dueDate) },
        { label: '🕐 Creada', value: formatDate(payload.createdAt) },
      ],
    },

    task_due_soon: {
      badge: '⚠️ RECORDATORIO',
      title: 'Tarea Próxima a Vencer',
      intro: 'La siguiente tarea del PAM está próxima a su fecha límite. Asegúrate de completarla a tiempo.',
      statusLabel: 'PRÓXIMA A VENCER',
      headerColor: '#f59e0b',
      headerColorDark: '#d97706',
      accentColor: '#f59e0b',
      badgeColor: '#fffbeb',
      badgeTextColor: '#d97706',
      ctaColor: '#f59e0b',
      ctaText: 'Revisar Tarea',
      details: [
        { label: '📋 Descripción', value: payload.description },
        { label: '⚠️ Tipo de Riesgo', value: payload.riskType },
        { label: '📍 Ubicación', value: payload.location },
        { label: '⏰ Vence', value: formatDate(payload.dueDate) },
      ],
    },

    task_overdue: {
      badge: '🚨 URGENTE',
      title: 'Tarea VENCIDA',
      intro: 'Esta tarea del PAM ha superado su fecha límite. Actualiza el estado o contacta a tu supervisor.',
      statusLabel: 'VENCIDA',
      headerColor: '#991b1b',
      headerColorDark: '#7f1d1d',
      accentColor: '#dc2626',
      badgeColor: '#7f1d1d',
      badgeTextColor: '#ffffff',
      ctaColor: '#dc2626',
      ctaText: 'Actualizar Tarea',
      details: [
        { label: '📋 Descripción', value: payload.description },
        { label: '⚠️ Tipo de Riesgo', value: payload.riskType },
        { label: '📍 Ubicación', value: payload.location },
        { label: '❌ Venció', value: formatDate(payload.dueDate) },
      ],
    },
  };

  return configs[type] || {
    badge: '📧 NOTIFICACIÓN',
    title: payload.title || 'Nueva Notificación',
    intro: payload.message || 'Tienes una nueva notificación en JM HSE.',
    statusLabel: 'INFORMACIÓN',
    headerColor: '#6b7280',
    headerColorDark: '#4b5563',
    accentColor: '#6b7280',
    badgeColor: '#f3f4f6',
    badgeTextColor: '#374151',
    ctaColor: '#6b7280',
    ctaText: 'Ver Detalles',
    details: [],
  };
}

// ============================================================================
// UTILIDADES
// ============================================================================

function generateKeyValueRows(details: Array<{ label: string; value?: string }>): string {
  return details
    .filter((item) => item.value) // Solo mostrar si hay valor
    .map((item) => `
      <tr>
        <td style="padding: 4px 0; vertical-align: top; width: 40%;">
          <strong style="color: #374151;">${item.label}</strong>
        </td>
        <td style="padding: 4px 0; vertical-align: top; color: #6b7280;">
          ${escapeHtml(item.value!)}
        </td>
      </tr>
    `)
    .join('');
}

function formatDate(dateString: string | undefined): string {
  if (!dateString) return 'No especificada';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
