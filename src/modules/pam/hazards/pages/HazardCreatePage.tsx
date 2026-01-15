import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { HazardForm } from '../components/HazardForm';
import { useCreateHazardReport } from '../hooks/useHazardReports';
import { useToast } from '@/hooks/use-toast';
import type { CreateHazardReportPayload } from '../types/hazard.types';
import { addHazardEvidence } from '../services/hazardApi';

export default function HazardCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreateHazardReport();
  const { toast } = useToast();

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
          <Button variant="outline" onClick={() => navigate('/admin/pls/hazard-report')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        }
      />

      <Card className="p-6">
        <HazardForm onSubmit={handleSubmit} isSubmitting={createMutation.isPending} />
      </Card>
    </div>
  );
}
