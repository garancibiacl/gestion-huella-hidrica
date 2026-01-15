import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { HazardForm } from '../components/HazardForm';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateHazardReport, useHazardCriticalRisks, useHazardHierarchy, useHazardResponsibles, hazardKeys } from '../hooks/useHazardReports';
import { useToast } from '@/hooks/use-toast';
import type { CreateHazardReportPayload } from '../types/hazard.types';
import { addHazardEvidence } from '../services/hazardApi';
import { useHazardCatalogSync } from '../hooks/useHazardCatalogSync';

export default function HazardCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreateHazardReport();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: hierarchy = [], isLoading: hierarchyLoading } = useHazardHierarchy();
  const { data: risks = [], isLoading: risksLoading } = useHazardCriticalRisks();
  const { data: responsibles = [], isLoading: responsiblesLoading } = useHazardResponsibles();

  const { isSyncing, syncCatalogs } = useHazardCatalogSync();
  const autoSyncOnceRef = useRef(false);

  useEffect(() => {
    const doneLoading = !hierarchyLoading && !risksLoading && !responsiblesLoading;
    const hasCatalogs = hierarchy.length > 0 && risks.length > 0 && responsibles.length > 0;
    if (!doneLoading || hasCatalogs || isSyncing || autoSyncOnceRef.current) return;

    autoSyncOnceRef.current = true;
    (async () => {
      const result = await syncCatalogs(true);
      await queryClient.invalidateQueries({ queryKey: hazardKeys.catalogs() });
      await queryClient.invalidateQueries({ queryKey: hazardKeys.lists() });

      if (!result.success) {
        toast({
          title: 'No se pudieron sincronizar catálogos',
          description: result.errors?.[0] || 'Revisa que el Sheet esté publicado como CSV',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Catálogos sincronizados',
          description: `Jerarquía: ${result.hierarchyImported} · Riesgos: ${result.risksImported} · Responsables: ${result.responsiblesImported}`,
        });
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
  ]);

  const handleSubmit = async (params: { payload: CreateHazardReportPayload; evidences: File[] }) => {
    try {
      const report = await createMutation.mutateAsync(params.payload);
      
      toast({
        title: 'Reporte creado',
        description: 'El reporte de peligro se ha creado correctamente',
      });

      // Evidencias (foto primero, archivos después)
      if (params.evidences.length > 0) {
        toast({
          title: 'Subiendo evidencias…',
          description: `Subiendo ${params.evidences.length} archivo(s)`,
        });
        for (const file of params.evidences) {
          await addHazardEvidence({
            reportId: report.id,
            file,
            evidenceType: 'FINDING',
          });
        }
      }

      navigate(`/admin/pls/hazard-report/${report.id}`);
    } catch (error: any) {
      toast({
        title: 'Error al crear reporte',
        description: error.message || 'No se pudo crear el reporte',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Nuevo Reporte de Peligro"
        description="Complete el formulario para reportar un peligro o condición insegura"
        action={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSyncing}
              onClick={async () => {
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
            <Button variant="outline" onClick={() => navigate('/admin/pls/hazard-report')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </div>
        }
      />

      <Card className="p-6">
        <HazardForm onSubmit={handleSubmit} isSubmitting={createMutation.isPending} />
      </Card>
    </div>
  );
}
