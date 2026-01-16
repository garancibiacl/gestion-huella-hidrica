// ============================================================================
// EMAIL TEMPLATES - Sistema HSE Buses JM
// Templates HTML para notificaciones transaccionales
// Compatible con Gmail, Outlook, Apple Mail
// ============================================================================

const ROJO_CORPORATIVO = '#B3382A';
const APP_NAME = 'Buses JM · Gestión de Seguridad (HSE)';

interface EmailData {
  recipientName: string;
  notificationType: string;
  entityType: 'hazard_report' | 'pam_task';
  payload: any;
  appLink: string;
  organizationName: string;
  auditId: string;
  timestamp: string;
}

// ============================================================================
// SUBJECTS POR TIPO
// ============================================================================
export function generateSubject(data: EmailData): string {
  const { entityType, notificationType, payload } = data;
  
  if (entityType === 'hazard_report') {
    const faena = payload.faena || payload.centroTrabajo || '';
    const riesgo = payload.criticalRisk || '';
    const dueDate = payload.dueDate ? new Date(payload.dueDate).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' }) : '';
    
    switch (notificationType) {
      case 'report_assigned':
        return `[HSE] Nuevo reporte asignado${faena ? ` · ${faena}` : ''}${riesgo ? ` · ${riesgo}` : ''}`;
      case 'report_due_soon':
        return `[HSE] Reporte por vencer${dueDate ? ` · ${dueDate}` : ''}${faena ? ` · ${faena}` : ''}`;
      case 'report_overdue':
        return `[HSE] Reporte VENCIDO${faena ? ` · ${faena}` : ''}${riesgo ? ` · ${riesgo}` : ''}`;
      case 'report_closed':
        return `[HSE] Reporte cerrado · Verificación pendiente${faena ? ` · ${faena}` : ''}`;
      default:
        return `[HSE] Actualización de reporte${faena ? ` · ${faena}` : ''}`;
    }
  }
  
  if (entityType === 'pam_task') {
    const location = payload.location || '';
    const taskDate = payload.taskDate ? new Date(payload.taskDate).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' }) : '';
    
    switch (notificationType) {
      case 'task_assigned':
        return `[HSE] Nueva tarea asignada${taskDate ? ` · ${taskDate}` : ''}${location ? ` · ${location}` : ''}`;
      case 'task_due_soon':
        return `[HSE] Tarea por vencer${taskDate ? ` · ${taskDate}` : ''}${location ? ` · ${location}` : ''}`;
      case 'task_overdue':
        return `[HSE] Tarea VENCIDA${location ? ` · ${location}` : ''}`;
      default:
        return `[HSE] Actualización de tarea${location ? ` · ${location}` : ''}`;
    }
  }
  
  return '[HSE] Notificación de seguridad';
}

// ============================================================================
// TÍTULOS Y MENSAJES POR TIPO
// ============================================================================
function getTitleAndMessage(data: EmailData): { title: string; subtitle: string; actionRequired: boolean } {
  const { entityType, notificationType } = data;
  
  if (entityType === 'hazard_report') {
    switch (notificationType) {
      case 'report_assigned':
        return {
          title: 'Nuevo Reporte de Peligro Asignado',
          subtitle: 'Se te ha asignado un reporte de peligro para revisión y cierre.',
          actionRequired: true,
        };
      case 'report_due_soon':
        return {
          title: 'Reporte Próximo a Vencer',
          subtitle: 'El plazo de cierre se acerca. Revisa y completa las acciones necesarias.',
          actionRequired: true,
        };
      case 'report_overdue':
        return {
          title: 'Reporte VENCIDO',
          subtitle: 'Este reporte ha superado su plazo de cierre. Se requiere acción inmediata.',
          actionRequired: true,
        };
      case 'report_closed':
        return {
          title: 'Reporte Cerrado',
          subtitle: 'Un reporte ha sido cerrado y requiere tu verificación.',
          actionRequired: true,
        };
      default:
        return {
          title: 'Actualización de Reporte',
          subtitle: 'Hay cambios en un reporte de peligro.',
          actionRequired: false,
        };
    }
  }
  
  if (entityType === 'pam_task') {
    switch (notificationType) {
      case 'task_assigned':
        return {
          title: 'Nueva Tarea Asignada',
          subtitle: 'Se te ha asignado una nueva tarea de seguridad.',
          actionRequired: true,
        };
      case 'task_due_soon':
        return {
          title: 'Tarea Próxima a Vencer',
          subtitle: 'La fecha límite se acerca. Completa la tarea a tiempo.',
          actionRequired: true,
        };
      case 'task_overdue':
        return {
          title: 'Tarea VENCIDA',
          subtitle: 'Esta tarea ha superado su fecha límite. Se requiere acción inmediata.',
          actionRequired: true,
        };
      default:
        return {
          title: 'Actualización de Tarea',
          subtitle: 'Hay cambios en una de tus tareas.',
          actionRequired: false,
        };
    }
  }
  
  return {
    title: 'Notificación de Seguridad',
    subtitle: 'Tienes una actualización en tu sistema HSE.',
    actionRequired: false,
  };
}

// ============================================================================
// TEMPLATE HTML PRINCIPAL
// ============================================================================
export function generateEmailHTML(data: EmailData): string {
  const { title, subtitle, actionRequired } = getTitleAndMessage(data);
  const { entityType, payload, appLink, organizationName, auditId, timestamp } = data;
  
  const isHazard = entityType === 'hazard_report';
  const isTask = entityType === 'pam_task';
  
  // Datos específicos según tipo
  const description = isHazard 
    ? (payload.description || '').substring(0, 160) 
    : (payload.taskDescription || '').substring(0, 160);
  
  const dueDate = isHazard 
    ? (payload.dueDate ? new Date(payload.dueDate).toLocaleString('es-CL', { dateStyle: 'long', timeStyle: 'short' }) : 'No especificado')
    : (payload.taskDate ? new Date(payload.taskDate).toLocaleString('es-CL', { dateStyle: 'long', timeStyle: 'short' }) : 'No especificado');
  
  const responsible = isHazard 
    ? (payload.responsibleName || 'No asignado')
    : (payload.assigneeName || payload.assigneeEmail || 'No asignado');
  
  const location = isHazard 
    ? (payload.faena || payload.centroTrabajo || 'No especificado')
    : (payload.location || 'No especificado');
  
  const riskInfo = isHazard 
    ? (payload.criticalRisk || 'Sin clasificar')
    : (payload.riskType || 'General');
  
  const hierarchySummary = isHazard && payload.gerencia
    ? `${payload.gerencia}${payload.proceso ? ` → ${payload.proceso}` : ''}${payload.actividad ? ` → ${payload.actividad}` : ''}`
    : null;
  
  const statusBadge = actionRequired 
    ? '<span style="display:inline-block;padding:4px 12px;background-color:#fee;color:#b91c1c;border:1px solid #fca5a5;border-radius:4px;font-size:12px;font-weight:600;text-transform:uppercase;">REQUIERE ACCIÓN</span>'
    : '<span style="display:inline-block;padding:4px 12px;background-color:#f0f9ff;color:#0369a1;border:1px solid #bae6fd;border-radius:4px;font-size:12px;font-weight:600;text-transform:uppercase;">INFORMATIVO</span>';
  
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]>
  <style type="text/css">
    table {border-collapse: collapse;}
  </style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  
  <!-- Contenedor principal -->
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f4f5f7;padding:20px 0;">
    <tr>
      <td align="center">
        
        <!-- Email wrapper -->
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;">
          
          <!-- HEADER -->
          <tr>
            <td style="background-color:${ROJO_CORPORATIVO};padding:3px 0;"></td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;padding:20px 30px;border-bottom:1px solid #e5e7eb;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <h1 style="margin:0;font-size:18px;font-weight:700;color:#1f2937;">${APP_NAME}</h1>
                    <p style="margin:4px 0 0 0;font-size:12px;color:#9ca3af;">Notificación automática</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- BODY -->
          <tr>
            <td style="background-color:#ffffff;padding:30px;">
              
              <!-- Título principal -->
              <h2 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:#111827;">${title}</h2>
              <p style="margin:0 0 20px 0;font-size:14px;color:#6b7280;">${subtitle}</p>
              
              <!-- Badge de estado -->
              <div style="margin:0 0 24px 0;">
                ${statusBadge}
              </div>
              
              <!-- Card de resumen -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
                <tr>
                  <td style="padding:20px;">
                    
                    <!-- Tipo -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:16px;">
                      <tr>
                        <td style="font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:4px;">
                          ${isHazard ? '📋 REPORTE DE PELIGRO' : '✓ TAREA PAM'}
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size:14px;color:#374151;line-height:1.5;">
                          ${description}${description.length >= 160 ? '...' : ''}
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Datos clave -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      ${isHazard && hierarchySummary ? `
                      <tr>
                        <td style="font-size:13px;color:#6b7280;padding:6px 0;border-top:1px solid #e5e7eb;">
                          <strong>Jerarquía:</strong>
                        </td>
                        <td style="font-size:13px;color:#111827;padding:6px 0;border-top:1px solid #e5e7eb;text-align:right;">
                          ${hierarchySummary}
                        </td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="font-size:13px;color:#6b7280;padding:6px 0;border-top:1px solid #e5e7eb;">
                          <strong>${isHazard ? 'Riesgo Crítico:' : 'Tipo de Riesgo:'}</strong>
                        </td>
                        <td style="font-size:13px;color:#111827;padding:6px 0;border-top:1px solid #e5e7eb;text-align:right;">
                          ${riskInfo}
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size:13px;color:#6b7280;padding:6px 0;border-top:1px solid #e5e7eb;">
                          <strong>${isHazard ? 'Responsable de Cierre:' : 'Asignado a:'}</strong>
                        </td>
                        <td style="font-size:13px;color:#111827;padding:6px 0;border-top:1px solid #e5e7eb;text-align:right;">
                          ${responsible}
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size:13px;color:#6b7280;padding:6px 0;border-top:1px solid #e5e7eb;">
                          <strong>${isHazard ? 'Plazo de Cierre:' : 'Fecha de Tarea:'}</strong>
                        </td>
                        <td style="font-size:13px;color:#111827;padding:6px 0;border-top:1px solid #e5e7eb;text-align:right;">
                          ${dueDate}
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size:13px;color:#6b7280;padding:6px 0;border-top:1px solid #e5e7eb;">
                          <strong>${isHazard ? 'Faena / Centro:' : 'Ubicación:'}</strong>
                        </td>
                        <td style="font-size:13px;color:#111827;padding:6px 0;border-top:1px solid #e5e7eb;text-align:right;">
                          ${location}
                        </td>
                      </tr>
                    </table>
                    
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:30px 0 0 0;">
                <tr>
                  <td align="center">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${appLink}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="10%" strokecolor="${ROJO_CORPORATIVO}" fillcolor="${ROJO_CORPORATIVO}">
                      <w:anchorlock/>
                      <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:700;">Ver en la App</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${appLink}" style="display:inline-block;padding:14px 40px;background-color:${ROJO_CORPORATIVO};color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;border-radius:6px;min-width:200px;text-align:center;">
                      Ver en la App
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>
              
              <!-- Link de respaldo -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:16px 0 0 0;">
                <tr>
                  <td align="center" style="font-size:12px;color:#9ca3af;">
                    Si el botón no funciona, copia este enlace:<br/>
                    <a href="${appLink}" style="color:${ROJO_CORPORATIVO};text-decoration:none;word-break:break-all;">${appLink}</a>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <!-- FOOTER -->
          <tr>
            <td style="background-color:#f9fafb;padding:20px 30px;border-top:1px solid #e5e7eb;">
              <p style="margin:0 0 12px 0;font-size:12px;color:#6b7280;line-height:1.5;">
                Este correo fue enviado automáticamente por el sistema HSE de ${organizationName}.<br/>
                <strong>No respondas a este mensaje.</strong>
              </p>
              <p style="margin:0 0 12px 0;font-size:12px;color:#9ca3af;">
                <a href="${appLink.split('/admin')[0]}" style="color:${ROJO_CORPORATIVO};text-decoration:none;">Abrir Plataforma</a>
              </p>
              <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.4;">
                <strong>Auditoría:</strong> ID ${auditId} · ${organizationName} · ${timestamp}
              </p>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
  `.trim();
}

// ============================================================================
// EJEMPLO DE USO (para testing local)
// ============================================================================
if (import.meta.main) {
  const exampleDataHazardOverdue: EmailData = {
    recipientName: 'Manuel Parra',
    notificationType: 'report_overdue',
    entityType: 'hazard_report',
    payload: {
      description: 'Se detecta desorden de neumáticos en el taller; no hay definido un lugar para los neumáticos en desuso.',
      dueDate: '2026-01-15T23:59:59Z',
      criticalRisk: 'Liderazgo deficiente',
      gerencia: 'Gerencia de Seguridad',
      proceso: 'Control en Terreno',
      actividad: 'Inspección en terreno',
      tarea: 'Inspección de seguridad',
      faena: 'Los andes taller',
      responsibleName: 'Leonidas Collao',
    },
    appLink: 'https://app.busesjm.cl/admin/pls/hazard-report/0702341b',
    organizationName: 'Buses JM',
    auditId: '0702341b',
    timestamp: new Date().toLocaleString('es-CL'),
  };
  
  console.log('=== SUBJECT ===');
  console.log(generateSubject(exampleDataHazardOverdue));
  console.log('\n=== HTML ===');
  console.log(generateEmailHTML(exampleDataHazardOverdue));
  
  console.log('\n\n=== EJEMPLO 2: PAM TASK ASSIGNED ===');
  const exampleDataTaskAssigned: EmailData = {
    recipientName: 'José Orellana',
    notificationType: 'task_assigned',
    entityType: 'pam_task',
    payload: {
      taskDescription: 'Revisar extintores en sector A y verificar fechas de vencimiento',
      taskDate: '2026-01-20T14:00:00Z',
      location: 'Sede Central - Piso 2',
      riskType: 'Incendio',
      assigneeName: 'José Orellana',
      assigneeEmail: 'jose.orellana@busesjm.com',
    },
    appLink: 'https://app.busesjm.cl/pls/my-activities?task=abc123',
    organizationName: 'Buses JM',
    auditId: 'abc123',
    timestamp: new Date().toLocaleString('es-CL'),
  };
  
  console.log('=== SUBJECT ===');
  console.log(generateSubject(exampleDataTaskAssigned));
}
