import { supabase } from '@/integrations/supabase/client';
import type {
  HazardReport,
  HazardReportDetail,
  HazardReportFilters,
  CreateHazardReportPayload,
  CloseHazardReportPayload,
  HazardReportEvidence,
  HazardCatalogHierarchy,
  HazardCriticalRisk,
  HazardResponsible,
  HazardControlType,
  HazardReportStats,
} from '../types/hazard.types';

const HAZARD_EVIDENCE_BUCKET = 'hazard-evidence';

// =====================================================
// CATALOGS: Obtener catálogos desde Supabase
// =====================================================

export async function getHazardHierarchy(organizationId: string): Promise<HazardCatalogHierarchy[]> {
  const { data, error } = await (supabase as any)
    .from('hazard_catalog_hierarchy')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('gerencia', { ascending: true });

  if (error) throw error;
  return (data || []) as HazardCatalogHierarchy[];
}

export async function getHazardCriticalRisks(organizationId: string): Promise<HazardCriticalRisk[]> {
  const { data, error } = await (supabase as any)
    .from('hazard_critical_risks')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []) as HazardCriticalRisk[];
}

export async function getHazardResponsibles(organizationId: string): Promise<HazardResponsible[]> {
  const { data, error } = await (supabase as any)
    .from('hazard_responsibles')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []) as HazardResponsible[];
}

export async function getHazardControlTypes(organizationId: string): Promise<HazardControlType[]> {
  const { data, error } = await (supabase as any)
    .from('hazard_control_types')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []) as HazardControlType[];
}

// =====================================================
// REPORTS: CRUD Básico
// =====================================================

export async function listHazardReports(
  organizationId: string,
  filters?: HazardReportFilters
): Promise<HazardReport[]> {
  let query = (supabase as any)
    .from('hazard_reports')
    .select('*')
    .eq('organization_id', organizationId);

  // Filtros
  if (filters?.status && filters.status.length > 0) {
    query = query.in('status', filters.status);
  }

  if (filters?.gerencia) {
    query = query.eq('gerencia', filters.gerencia);
  }

  if (filters?.critical_risk_id) {
    query = query.eq('critical_risk_id', filters.critical_risk_id);
  }

  if (filters?.closing_responsible_id) {
    query = query.eq('closing_responsible_id', filters.closing_responsible_id);
  }

  if (filters?.faena) {
    query = query.eq('faena', filters.faena);
  }

  if (filters?.assigned_to_me) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Obtener responsables asociados al usuario (por email)
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', user.id)
        .single();

      if (profile?.email) {
        const { data: responsible } = await (supabase as any)
          .from('hazard_responsibles')
          .select('id')
          .eq('email', profile.email)
          .single();

        if (responsible) {
          query = query.eq('closing_responsible_id', responsible.id);
        }
      }
    }
  }

  if (filters?.date_from) {
    query = query.gte('due_date', filters.date_from);
  }

  if (filters?.date_to) {
    query = query.lte('due_date', filters.date_to);
  }

  if (filters?.search) {
    query = query.or(
      `description.ilike.%${filters.search}%,reporter_name.ilike.%${filters.search}%`
    );
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as HazardReport[];
}

export async function getHazardReport(reportId: string): Promise<HazardReportDetail | null> {
  // 1. Obtener el reporte
  const { data: report, error: reportError } = await (supabase as any)
    .from('hazard_reports')
    .select('*')
    .eq('id', reportId)
    .single();

  if (reportError) throw reportError;
  if (!report) return null;

  // 2. Obtener evidencias
  const { data: evidences, error: evidencesError } = await (supabase as any)
    .from('hazard_report_evidences')
    .select('*')
    .eq('hazard_report_id', reportId)
    .order('created_at', { ascending: false });

  if (evidencesError) throw evidencesError;

  // 3. Obtener eventos (timeline)
  const { data: events, error: eventsError } = await (supabase as any)
    .from('hazard_report_events')
    .select('*')
    .eq('hazard_report_id', reportId)
    .order('created_at', { ascending: false });

  if (eventsError) throw eventsError;

  // 4. Obtener relaciones (opcional, ya desnormalizado)
  let critical_risk, closing_responsible, verification_responsible, control_type;

  if (report.critical_risk_id) {
    const { data } = await (supabase as any)
      .from('hazard_critical_risks')
      .select('*')
      .eq('id', report.critical_risk_id)
      .single();
    critical_risk = data || undefined;
  }

  if (report.closing_responsible_id) {
    const { data } = await (supabase as any)
      .from('hazard_responsibles')
      .select('*')
      .eq('id', report.closing_responsible_id)
      .single();
    closing_responsible = data || undefined;
  }

  if (report.verification_responsible_id) {
    const { data } = await (supabase as any)
      .from('hazard_responsibles')
      .select('*')
      .eq('id', report.verification_responsible_id)
      .single();
    verification_responsible = data || undefined;
  }

  if (report.control_type_id) {
    const { data } = await (supabase as any)
      .from('hazard_control_types')
      .select('*')
      .eq('id', report.control_type_id)
      .single();
    control_type = data || undefined;
  }

  return {
    ...report,
    evidences: (evidences || []) as HazardReportEvidence[],
    events: (events || []) as any[],
    critical_risk,
    closing_responsible,
    verification_responsible,
    control_type,
  } as HazardReportDetail;
}

export async function createHazardReport(
  organizationId: string,
  payload: CreateHazardReportPayload
): Promise<HazardReport> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuario no autenticado');

  // Obtener nombres desnormalizados
  let critical_risk_name: string | undefined;
  let closing_responsible_name: string | undefined;

  if (payload.critical_risk_id) {
    const { data } = await (supabase as any)
      .from('hazard_critical_risks')
      .select('name')
      .eq('id', payload.critical_risk_id)
      .single();
    critical_risk_name = data?.name;
  }

  if (payload.closing_responsible_id) {
    const { data } = await (supabase as any)
      .from('hazard_responsibles')
      .select('name')
      .eq('id', payload.closing_responsible_id)
      .single();
    closing_responsible_name = data?.name;
  }

  const record = {
    organization_id: organizationId,
    status: 'OPEN' as const,
    report_type: 'DANGER_REPORT',
    
    // Jerarquía
    hierarchy_id: payload.hierarchy_id || null,
    gerencia: payload.gerencia,
    proceso: payload.proceso || null,
    actividad: payload.actividad || null,
    tarea: payload.tarea || null,
    
    // Ubicación
    faena: payload.faena || null,
    centro_trabajo: payload.centro_trabajo || null,
    
    // Riesgo
    critical_risk_id: payload.critical_risk_id,
    critical_risk_name,
    
    // Descripción
    description: payload.description,
    root_cause: payload.root_cause || null,
    deviation_type: payload.deviation_type,
    
    // Responsable y plazo
    closing_responsible_id: payload.closing_responsible_id,
    closing_responsible_name,
    due_date: payload.due_date,
    
    // Reportante
    reporter_user_id: user.id,
    reporter_name: payload.reporter_name,
    reporter_rut: payload.reporter_rut || null,
    reporter_email: payload.reporter_email || null,
    reporter_company: payload.reporter_company || null,
  };

  const { data, error } = await (supabase as any)
    .from('hazard_reports')
    .insert(record)
    .select()
    .single();

  if (error) throw error;
  return data as HazardReport;
}

export async function closeHazardReport(
  reportId: string,
  payload: CloseHazardReportPayload
): Promise<HazardReport> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuario no autenticado');

  // Obtener nombres desnormalizados
  let verification_responsible_name: string | undefined;
  let control_type_name: string | undefined;

  if (payload.verification_responsible_id) {
    const { data } = await (supabase as any)
      .from('hazard_responsibles')
      .select('name')
      .eq('id', payload.verification_responsible_id)
      .single();
    verification_responsible_name = data?.name;
  }

  if (payload.control_type_id) {
    const { data } = await (supabase as any)
      .from('hazard_control_types')
      .select('name')
      .eq('id', payload.control_type_id)
      .single();
    control_type_name = data?.name;
  }

  const { data, error } = await (supabase as any)
    .from('hazard_reports')
    .update({
      status: 'CLOSED',
      closed_at: new Date().toISOString(),
      closed_by_user_id: user.id,
      verification_responsible_id: payload.verification_responsible_id,
      verification_responsible_name,
      control_type_id: payload.control_type_id,
      control_type_name,
      closing_description: payload.closing_description,
    })
    .eq('id', reportId)
    .select()
    .single();

  if (error) throw error;
  return data as HazardReport;
}

// =====================================================
// EVIDENCES: Subir y listar
// =====================================================

export async function addHazardEvidence(params: {
  reportId: string;
  file: File;
  evidenceType: 'FINDING' | 'CLOSURE' | 'OTHER';
  description?: string;
}): Promise<HazardReportEvidence> {
  const { reportId, file, evidenceType, description } = params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuario no autenticado');

  // 1. Obtener organization_id del reporte
  const { data: report } = await (supabase as any)
    .from('hazard_reports')
    .select('organization_id')
    .eq('id', reportId)
    .single();

  if (!report) throw new Error('Reporte no encontrado');

  // 2. Subir archivo a storage
  const safeName = file.name.replace(/[^\w.\-() ]+/g, '_');
  const filePath = `${report.organization_id}/hazards/${reportId}/${evidenceType}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(HAZARD_EVIDENCE_BUCKET)
    .upload(filePath, file, { upsert: false });

  if (uploadError) throw uploadError;

  // 3. Registrar evidencia en DB
  const { data, error } = await (supabase as any)
    .from('hazard_report_evidences')
    .insert({
      hazard_report_id: reportId,
      // Guardamos el PATH en storage (bucket privado). La UI genera signed URL al renderizar.
      file_url: filePath,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      evidence_type: evidenceType,
      description: description || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;

  // 4. Crear evento
  await (supabase as any).from('hazard_report_events').insert({
    hazard_report_id: reportId,
    event_type: 'EVIDENCE_ADDED',
    payload: {
      evidence_type: evidenceType,
      file_name: file.name,
    },
    created_by: user.id,
  });

  return data as HazardReportEvidence;
}

// =====================================================
// STATS: Estadísticas para dashboard
// =====================================================

export async function getHazardReportStats(organizationId: string): Promise<HazardReportStats> {
  const { data, error } = await (supabase as any)
    .from('hazard_reports')
    .select('status, gerencia, critical_risk_name, due_date')
    .eq('organization_id', organizationId);

  if (error) throw error;

  const reports = (data || []) as any[];
  const now = new Date().toISOString().split('T')[0];

  const stats: HazardReportStats = {
    total: reports.length,
    open: reports.filter((r) => r.status === 'OPEN').length,
    closed: reports.filter((r) => r.status === 'CLOSED').length,
    overdue: reports.filter((r) => r.status === 'OPEN' && r.due_date < now).length,
    by_gerencia: {},
    by_critical_risk: {},
    by_status: { OPEN: 0, CLOSED: 0, CANCELLED: 0 },
  };

  reports.forEach((report) => {
    // Por gerencia
    if (report.gerencia) {
      stats.by_gerencia[report.gerencia] = (stats.by_gerencia[report.gerencia] || 0) + 1;
    }

    // Por riesgo crítico
    if (report.critical_risk_name) {
      stats.by_critical_risk[report.critical_risk_name] =
        (stats.by_critical_risk[report.critical_risk_name] || 0) + 1;
    }

    // Por estado
    stats.by_status[report.status as keyof typeof stats.by_status] =
      (stats.by_status[report.status as keyof typeof stats.by_status] || 0) + 1;
  });

  return stats;
}
