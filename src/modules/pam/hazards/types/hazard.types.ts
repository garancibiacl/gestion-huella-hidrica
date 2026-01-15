// =====================================================
// TIPOS: Módulo de Reporte de Peligros
// =====================================================

// =====================================================
// 1. ENUMS y Constantes
// =====================================================

export const HAZARD_STATUS = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
} as const;

export type HazardStatus = typeof HAZARD_STATUS[keyof typeof HAZARD_STATUS];

export const DEVIATION_TYPE = {
  ACCION: 'ACCION',
  CONDICION: 'CONDICION',
} as const;

export type DeviationType = typeof DEVIATION_TYPE[keyof typeof DEVIATION_TYPE];

export const EVIDENCE_TYPE = {
  FINDING: 'FINDING',
  CLOSURE: 'CLOSURE',
  OTHER: 'OTHER',
} as const;

export type EvidenceType = typeof EVIDENCE_TYPE[keyof typeof EVIDENCE_TYPE];

export const EVENT_TYPE = {
  CREATED: 'CREATED',
  UPDATED: 'UPDATED',
  EVIDENCE_ADDED: 'EVIDENCE_ADDED',
  CLOSED: 'CLOSED',
  REOPENED: 'REOPENED',
  ASSIGNED: 'ASSIGNED',
  COMMENT_ADDED: 'COMMENT_ADDED',
} as const;

export type EventType = typeof EVENT_TYPE[keyof typeof EVENT_TYPE];

export const SEVERITY_LEVEL = {
  BAJA: 'BAJA',
  MEDIA: 'MEDIA',
  ALTA: 'ALTA',
  CRITICA: 'CRITICA',
} as const;

export type SeverityLevel = typeof SEVERITY_LEVEL[keyof typeof SEVERITY_LEVEL];

// =====================================================
// 2. Catálogos
// =====================================================

export interface HazardCatalogHierarchy {
  id: string;
  organization_id: string;
  gerencia: string;
  proceso?: string;
  actividad?: string;
  tarea?: string;
  faena?: string;
  centro_trabajo?: string;
  stable_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HazardCriticalRisk {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  description?: string;
  severity?: SeverityLevel;
  requires_evidence: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HazardResponsible {
  id: string;
  organization_id: string;
  name: string;
  rut?: string;
  email?: string;
  company?: string;
  can_close: boolean;
  can_verify: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HazardControlType {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

// =====================================================
// 3. Reporte Principal
// =====================================================

export interface HazardReport {
  id: string;
  organization_id: string;
  status: HazardStatus;
  report_type: string;
  
  // Jerarquía
  hierarchy_id?: string;
  gerencia: string;
  proceso?: string;
  actividad?: string;
  tarea?: string;
  
  // Ubicación
  faena?: string;
  centro_trabajo?: string;
  
  // Riesgo crítico
  critical_risk_id?: string;
  critical_risk_name?: string;
  
  // Tipo de desviación
  deviation_type: DeviationType;
  
  // Descripción
  description: string;
  root_cause?: string;
  
  // Responsables
  closing_responsible_id?: string;
  closing_responsible_name?: string;
  
  // Plazo
  due_date: string; // ISO date
  
  // Reportante (snapshot)
  reporter_user_id?: string;
  reporter_name: string;
  reporter_rut?: string;
  reporter_email?: string;
  reporter_company?: string;
  
  // Cierre
  closed_at?: string;
  closed_by_user_id?: string;
  verification_responsible_id?: string;
  verification_responsible_name?: string;
  control_type_id?: string;
  control_type_name?: string;
  closing_description?: string;
  
  // Metadatos
  created_at: string;
  updated_at: string;
}

// =====================================================
// 4. Evidencias
// =====================================================

export interface HazardReportEvidence {
  id: string;
  hazard_report_id: string;
  file_url: string;
  file_name: string;
  mime_type?: string;
  size_bytes?: number;
  evidence_type: EvidenceType;
  description?: string;
  created_by?: string;
  created_at: string;
}

// =====================================================
// 5. Eventos / Timeline
// =====================================================

export interface HazardReportEvent {
  id: string;
  hazard_report_id: string;
  event_type: EventType;
  payload?: Record<string, any>;
  created_by?: string;
  created_by_name?: string;
  created_at: string;
}

// =====================================================
// 6. DTOs y Payloads
// =====================================================

export interface CreateHazardReportPayload {
  // Jerarquía
  gerencia: string;
  proceso?: string;
  actividad?: string;
  tarea?: string;
  hierarchy_id?: string;
  
  // Ubicación
  faena?: string;
  centro_trabajo?: string;
  
  // Riesgo
  critical_risk_id: string;
  
  // Descripción
  description: string;
  root_cause?: string;
  deviation_type: DeviationType;
  
  // Responsable y plazo
  closing_responsible_id: string;
  due_date: string; // ISO date
  
  // Reportante (autocompletado desde sesión)
  reporter_name: string;
  reporter_rut?: string;
  reporter_email?: string;
  reporter_company?: string;
}

export interface CloseHazardReportPayload {
  verification_responsible_id: string;
  control_type_id: string;
  closing_description: string;
}

export interface HazardReportFilters {
  status?: HazardStatus[];
  gerencia?: string;
  critical_risk_id?: string;
  closing_responsible_id?: string;
  faena?: string;
  assigned_to_me?: boolean;
  date_from?: string;
  date_to?: string;
  search?: string;
}

// =====================================================
// 7. Opciones de Jerarquía (para selects en cascada)
// =====================================================

export interface HierarchyOptions {
  gerencias: string[];
  procesos: Map<string, string[]>; // gerencia -> procesos
  actividades: Map<string, string[]>; // proceso -> actividades
  tareas: Map<string, string[]>; // actividad -> tareas
}

// =====================================================
// 8. Importación desde Google Sheets
// =====================================================

export interface HazardCatalogImportRow {
  gerencia: string;
  proceso?: string;
  actividad?: string;
  tarea?: string;
  faena?: string;
  centro_trabajo?: string;
}

export interface HazardRiskImportRow {
  code: string;
  name: string;
  description?: string;
  severity?: SeverityLevel;
  requires_evidence?: boolean;
}

export interface HazardResponsibleImportRow {
  name: string;
  rut?: string;
  email?: string;
  company?: string;
  can_close?: boolean;
  can_verify?: boolean;
}

export interface HazardCatalogSyncResult {
  success: boolean;
  hierarchyImported: number;
  risksImported: number;
  responsiblesImported: number;
  errors: string[];
}

// =====================================================
// 9. Estadísticas / Dashboard
// =====================================================

export interface HazardReportStats {
  total: number;
  open: number;
  closed: number;
  overdue: number;
  by_gerencia: Record<string, number>;
  by_critical_risk: Record<string, number>;
  by_status: Record<HazardStatus, number>;
}

// =====================================================
// 10. Detalle Extendido (con relaciones)
// =====================================================

export interface HazardReportDetail extends HazardReport {
  evidences: HazardReportEvidence[];
  events: HazardReportEvent[];
  critical_risk?: HazardCriticalRisk;
  closing_responsible?: HazardResponsible;
  verification_responsible?: HazardResponsible;
  control_type?: HazardControlType;
}
