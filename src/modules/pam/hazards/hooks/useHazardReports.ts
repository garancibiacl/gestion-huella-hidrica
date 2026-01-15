import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/hooks/useOrganization';
import {
  listHazardReports,
  getHazardReport,
  createHazardReport,
  closeHazardReport,
  addHazardEvidence,
  getHazardReportStats,
  getHazardHierarchy,
  getHazardCriticalRisks,
  getHazardResponsibles,
  getHazardControlTypes,
} from '../services/hazardApi';
import type {
  HazardReportFilters,
  CreateHazardReportPayload,
  CloseHazardReportPayload,
} from '../types/hazard.types';

// =====================================================
// QUERY KEYS
// =====================================================

export const hazardKeys = {
  all: ['hazard-reports'] as const,
  lists: () => [...hazardKeys.all, 'list'] as const,
  list: (orgId: string, filters?: HazardReportFilters) =>
    [...hazardKeys.lists(), orgId, filters] as const,
  details: () => [...hazardKeys.all, 'detail'] as const,
  detail: (id: string) => [...hazardKeys.details(), id] as const,
  stats: (orgId: string) => [...hazardKeys.all, 'stats', orgId] as const,
  
  // Catálogos
  catalogs: () => ['hazard-catalogs'] as const,
  hierarchy: (orgId: string) => [...hazardKeys.catalogs(), 'hierarchy', orgId] as const,
  risks: (orgId: string) => [...hazardKeys.catalogs(), 'risks', orgId] as const,
  responsibles: (orgId: string) => [...hazardKeys.catalogs(), 'responsibles', orgId] as const,
  controlTypes: (orgId: string) => [...hazardKeys.catalogs(), 'control-types', orgId] as const,
};

// =====================================================
// HOOKS: Catálogos
// =====================================================

export function useHazardHierarchy() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: hazardKeys.hierarchy(organizationId || ''),
    queryFn: () => getHazardHierarchy(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useHazardCriticalRisks() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: hazardKeys.risks(organizationId || ''),
    queryFn: () => getHazardCriticalRisks(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useHazardResponsibles() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: hazardKeys.responsibles(organizationId || ''),
    queryFn: () => getHazardResponsibles(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useHazardControlTypes() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: hazardKeys.controlTypes(organizationId || ''),
    queryFn: () => getHazardControlTypes(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

// =====================================================
// HOOKS: Listado y Filtros
// =====================================================

export function useHazardReports(filters?: HazardReportFilters) {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: hazardKeys.list(organizationId || '', filters),
    queryFn: () => listHazardReports(organizationId!, filters),
    enabled: !!organizationId,
    staleTime: 1 * 60 * 1000, // 1 minuto
  });
}

// =====================================================
// HOOKS: Detalle
// =====================================================

export function useHazardReport(reportId: string | undefined) {
  return useQuery({
    queryKey: hazardKeys.detail(reportId || ''),
    queryFn: () => getHazardReport(reportId!),
    enabled: !!reportId,
    staleTime: 30 * 1000, // 30 segundos
  });
}

// =====================================================
// HOOKS: Estadísticas
// =====================================================

export function useHazardReportStats() {
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: hazardKeys.stats(organizationId || ''),
    queryFn: () => getHazardReportStats(organizationId!),
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

// =====================================================
// MUTATIONS: Crear Reporte
// =====================================================

export function useCreateHazardReport() {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateHazardReportPayload) =>
      createHazardReport(organizationId!, payload),
    onSuccess: () => {
      // Invalidar listas y estadísticas
      queryClient.invalidateQueries({ queryKey: hazardKeys.lists() });
      queryClient.invalidateQueries({ queryKey: hazardKeys.stats(organizationId!) });
    },
  });
}

// =====================================================
// MUTATIONS: Cerrar Reporte
// =====================================================

export function useCloseHazardReport() {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reportId, payload }: { reportId: string; payload: CloseHazardReportPayload }) =>
      closeHazardReport(reportId, payload),
    onSuccess: (data, variables) => {
      // Invalidar detalle del reporte
      queryClient.invalidateQueries({ queryKey: hazardKeys.detail(variables.reportId) });
      // Invalidar listas y estadísticas
      queryClient.invalidateQueries({ queryKey: hazardKeys.lists() });
      queryClient.invalidateQueries({ queryKey: hazardKeys.stats(organizationId!) });
    },
  });
}

// =====================================================
// MUTATIONS: Agregar Evidencia
// =====================================================

export function useAddHazardEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      reportId: string;
      file: File;
      evidenceType: 'FINDING' | 'CLOSURE' | 'OTHER';
      description?: string;
    }) => addHazardEvidence(params),
    onSuccess: (data, variables) => {
      // Invalidar detalle del reporte
      queryClient.invalidateQueries({ queryKey: hazardKeys.detail(variables.reportId) });
    },
  });
}
