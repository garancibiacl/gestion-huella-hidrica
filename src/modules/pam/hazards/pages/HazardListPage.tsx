import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, AlertTriangle, User, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/ui/page-header';
import { HazardFilters } from '../components/HazardFilters';
import { HazardStatusBadge } from '../components/HazardStatusBadge';
import { useQueryClient } from '@tanstack/react-query';
import { hazardKeys, useHazardCriticalRisks, useHazardHierarchy, useHazardReports, useHazardReportStats, useHazardResponsibles } from '../hooks/useHazardReports';
import type { HazardReportFilters } from '../types/hazard.types';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { useHazardCatalogSync } from '../hooks/useHazardCatalogSync';
import { useToast } from '@/hooks/use-toast';
import { exportHazardMonthlyReport } from '@/lib/pdf-export';
import { useOrganization } from '@/hooks/useOrganization';
import { Skeleton } from '@/components/ui/skeleton';

export default function HazardListPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<HazardReportFilters>({});
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'closed'>('all');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { organizationId, loading: organizationLoading } = useOrganization();

  const { data: hierarchy = [], isLoading: hierarchyLoading } = useHazardHierarchy();
  const { data: risks = [], isLoading: risksLoading } = useHazardCriticalRisks();
  const { data: responsibles = [], isLoading: responsiblesLoading } = useHazardResponsibles();
  const { isSyncing, syncCatalogs } = useHazardCatalogSync({
    enabled: !organizationLoading && Boolean(organizationId),
  });
  const autoSyncOnceRef = useRef(false);

  useEffect(() => {
    if (organizationLoading || !organizationId) return;
    const doneLoading = !hierarchyLoading && !risksLoading && !responsiblesLoading;
    const hasCatalogs = hierarchy.length > 0 && risks.length > 0 && responsibles.length > 0;
    if (!doneLoading || hasCatalogs || isSyncing || autoSyncOnceRef.current) return;

    autoSyncOnceRef.current = true;
    (async () => {
      const result = await syncCatalogs(true);
      await queryClient.invalidateQueries({ queryKey: hazardKeys.catalogs() });
      if (!result.success) {
        return;
      }
    })();
  }, [
    hierarchy.length,
    risks.length,
    responsibles.length,
    hierarchyLoading,
    risksLoading,
    responsiblesLoading,
    isSyncing,
    syncCatalogs,
    queryClient,
    toast,
    organizationLoading,
    organizationId,
  ]);

  // Aplicar filtro de estado según tab activo
  const effectiveFilters: HazardReportFilters = {
    ...filters,
    status:
      activeTab === 'open'
        ? ['OPEN']
        : activeTab === 'closed'
        ? ['CLOSED']
        : filters.status,
  };

  const { data: reports = [], isLoading: reportsLoading, isFetching: reportsFetching } = useHazardReports(effectiveFilters);
  const { data: stats, isLoading: statsLoading, isFetching: statsFetching } = useHazardReportStats();
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const monthRangeLabel = `${format(monthStart, 'dd MMM yyyy', { locale: es })} - ${format(monthEnd, 'dd MMM yyyy', { locale: es })}`;
  const { data: monthlyReports = [], isLoading: isMonthlyLoading } = useHazardReports({
    date_from: monthStart.toISOString(),
    date_to: monthEnd.toISOString(),
  });

  const isOverdue = (dueDate: string, status: string) => {
    if (status !== 'OPEN') return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="bg-[#F4F5F7]">
      <div className="page-container space-y-6">
        <div className="mb-10 rounded-2xl border border-gray-100 bg-white px-6 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
          <PageHeader
            title="Reporte de Peligros"
            description="Gestión de reportes de peligro y condiciones inseguras"
            action={
              <div className="flex flex-wrap items-center justify-end gap-2 mt-4 sm:mt-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSyncing || organizationLoading || !organizationId}
                  className="w-full sm:w-auto h-9"
                  onClick={async () => {
                    if (!organizationId) {
                      toast({
                        title: 'Organización no disponible',
                        description: 'No se pudo determinar la organización actual.',
                        variant: 'destructive',
                      });
                      return;
                    }
                    const result = await syncCatalogs(true);
                    await queryClient.invalidateQueries({ queryKey: hazardKeys.catalogs() });
                    if (!result.success) {
                      toast({
                        title: 'Error al sincronizar catálogos',
                        description: result.errors?.[0] || 'No se pudo sincronizar',
                        variant: 'destructive',
                      });
                      return;
                    }
                    toast({
                      title: 'Catálogos sincronizados',
                      description: `Jerarquía: ${result.hierarchyImported} · Riesgos: ${result.risksImported} · Responsables: ${result.responsiblesImported}`,
                    });
                  }}
                >
                  {isSyncing ? 'Sincronizando…' : 'Sincronizar catálogos'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isMonthlyLoading}
                  className="w-full sm:w-auto h-9"
                  onClick={() => {
                    if (monthlyReports.length === 0) {
                      toast({
                        title: 'Sin reportes para el mes',
                        description: 'No hay reportes de peligro registrados en el período seleccionado.',
                      });
                      return;
                    }
                    exportHazardMonthlyReport({
                      reports: monthlyReports,
                      organization: 'Buses JM',
                      dateRange: monthRangeLabel,
                    });
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Reporte Mensual
                </Button>
                <Button size="sm" className="w-full sm:w-auto h-9 shadow-sm" onClick={() => navigate('/admin/pls/hazard-report/new')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Reporte
                </Button>
              </div>
            }
          />
        </div>

      {/* Estadísticas resumidas */}
      {stats ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-muted-foreground opacity-20" />
            </div>
          </Card>

          <Card className="p-4 border-red-200 bg-red-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">Abiertos</p>
                <p className="text-2xl font-bold text-red-700">{stats.open}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </Card>

          <Card className="p-4 border-green-200 bg-green-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Cerrados</p>
                <p className="text-2xl font-bold text-green-700">{stats.closed}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </Card>

          <Card className="p-4 border-orange-200 bg-orange-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600">Vencidos</p>
                <p className="text-2xl font-bold text-orange-700">{stats.overdue}</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </Card>
        </div>
      ) : (statsLoading || statsFetching) ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-7 w-10" />
                </div>
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {/* Filtros */}
      <Card className="p-4">
        <HazardFilters filters={filters} onFiltersChange={setFilters} />
      </Card>

      {/* Tabs y Lista */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="flex flex-wrap w-full">
          <TabsTrigger className="flex-1 min-w-[120px]" value="all">
            Todos ({stats?.total || 0})
          </TabsTrigger>
          <TabsTrigger className="flex-1 min-w-[120px]" value="open">
            Abiertos ({stats?.open || 0})
          </TabsTrigger>
          <TabsTrigger className="flex-1 min-w-[120px]" value="closed">
            Cerrados ({stats?.closed || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {(organizationLoading || reportsLoading || reportsFetching) ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-40 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-2/3" />
                    <div className="flex flex-wrap gap-4">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : reports.length === 0 ? (
            <Card className="p-12 text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground opacity-20 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay reportes</h3>
              <p className="text-muted-foreground mb-4">
                {activeTab === 'all'
                  ? 'Aún no se han creado reportes de peligro'
                  : activeTab === 'open'
                  ? 'No hay reportes abiertos'
                  : 'No hay reportes cerrados'}
              </p>
              <Button onClick={() => navigate('/admin/pls/hazard-report/new')}>
                <Plus className="mr-2 h-4 w-4" />
                Crear Primer Reporte
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <Card
                  key={report.id}
                  className="p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/admin/pls/hazard-report/${report.id}`)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      {/* Header */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <HazardStatusBadge status={report.status} />
                        {isOverdue(report.due_date, report.status) && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                            VENCIDO
                          </span>
                        )}
                        {report.critical_risk_name && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                            {report.critical_risk_name}
                          </span>
                        )}
                      </div>

                      {/* Descripción */}
                      <div>
                        <p className="font-medium">{report.description}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span>{report.gerencia}</span>
                          {report.proceso && <span>→ {report.proceso}</span>}
                          {report.deviation_type && (
                            <span>
                              •{' '}
                              {report.deviation_type === 'ACCION'
                                ? 'Acción'
                                : 'Condición'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{report.reporter_name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            Plazo:{' '}
                            {format(new Date(report.due_date), 'PP', { locale: es })}
                          </span>
                        </div>
                        {report.closing_responsible_name && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>Resp.: {report.closing_responsible_name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Fecha creación */}
                    <div className="text-xs text-muted-foreground text-right">
                      {format(new Date(report.created_at), 'PP', { locale: es })}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
