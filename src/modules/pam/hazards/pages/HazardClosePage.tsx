import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { HazardStatusBadge } from '../components/HazardStatusBadge';
import {
  useHazardReport,
  useHazardResponsibles,
  useHazardControlTypes,
  useCloseHazardReport,
} from '../hooks/useHazardReports';
import { useToast } from '@/hooks/use-toast';
import type { CloseHazardReportPayload } from '../types/hazard.types';

const closeHazardSchema = z.object({
  verification_responsible_id: z.string().min(1, 'Responsable de verificación es requerido'),
  control_type_id: z.string().min(1, 'Tipo de control es requerido'),
  closing_description: z.string().min(20, 'La descripción debe tener al menos 20 caracteres'),
});

type CloseHazardFormValues = z.infer<typeof closeHazardSchema>;

export default function HazardClosePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: report, isLoading } = useHazardReport(id);
  const { data: responsibles = [] } = useHazardResponsibles();
  const { data: controlTypes = [] } = useHazardControlTypes();
  const closeMutation = useCloseHazardReport();

  const form = useForm<CloseHazardFormValues>({
    resolver: zodResolver(closeHazardSchema),
    defaultValues: {
      verification_responsible_id: '',
      control_type_id: '',
      closing_description: '',
    },
  });

  const handleSubmit = async (values: CloseHazardFormValues) => {
    if (!id) return;

    try {
      await closeMutation.mutateAsync({
        reportId: id,
        payload: values,
      });

      toast({
        title: 'Reporte cerrado',
        description: 'El reporte se ha cerrado correctamente',
      });

      navigate(`/admin/pls/hazard-report/${id}`);
    } catch (error: any) {
      toast({
        title: 'Error al cerrar reporte',
        description: error.message || 'No se pudo cerrar el reporte',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Cargando..." description="Obteniendo detalles del reporte" />
        <div className="text-center py-12">
          <p className="text-muted-foreground">Cargando reporte...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="space-y-6">
        <PageHeader title="Reporte no encontrado" description="El reporte solicitado no existe" />
        <Card className="p-12 text-center">
          <h3 className="text-lg font-semibold mb-2">Reporte no encontrado</h3>
          <Button onClick={() => navigate('/admin/pls/hazard-report')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a la lista
          </Button>
        </Card>
      </div>
    );
  }

  if (report.status !== 'OPEN') {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Reporte ya cerrado"
          description="Este reporte ya ha sido procesado"
        />
        <Card className="p-12 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Este reporte ya está cerrado</h3>
          <Button onClick={() => navigate(`/admin/pls/hazard-report/${id}`)}>
            Ver Detalles
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Cerrar Reporte #${report.id.slice(0, 8)}`}
        description="Complete la información de cierre del reporte"
      >
        <Button variant="outline" onClick={() => navigate(`/admin/pls/hazard-report/${id}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </PageHeader>

      {/* Resumen del reporte */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <HazardStatusBadge status={report.status} />
            {report.critical_risk_name && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                {report.critical_risk_name}
              </span>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-1">Descripción del Peligro</h3>
            <p className="text-sm text-muted-foreground">{report.description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-semibold">Gerencia:</span> {report.gerencia}
            </div>
            {report.closing_responsible_name && (
              <div>
                <span className="font-semibold">Responsable:</span>{' '}
                {report.closing_responsible_name}
              </div>
            )}
            <div>
              <span className="font-semibold">Reportante:</span> {report.reporter_name}
            </div>
          </div>
        </div>
      </Card>

      {/* Formulario de cierre */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-6">Información de Cierre</h3>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Responsable de verificación */}
            <FormField
              control={form.control}
              name="verification_responsible_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Responsable de Verificación <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione responsable" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {responsibles
                        .filter((r) => r.can_verify)
                        .map((resp) => (
                          <SelectItem key={resp.id} value={resp.id}>
                            {resp.name}
                            {resp.company && ` - ${resp.company}`}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Persona que verifica que las acciones correctivas fueron efectivas
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tipo de control aplicado */}
            <FormField
              control={form.control}
              name="control_type_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Tipo de Control Aplicado <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione tipo de control" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {controlTypes.map((control) => (
                        <SelectItem key={control.id} value={control.id}>
                          {control.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Tipo de control según la jerarquía de controles
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descripción del cierre */}
            <FormField
              control={form.control}
              name="closing_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Descripción del Cierre <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describa las acciones tomadas para cerrar el reporte..."
                      className="min-h-[150px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Detalle las acciones correctivas implementadas, controles aplicados y
                    verificaciones realizadas
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Botones */}
            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/admin/pls/hazard-report/${id}`)}
                disabled={closeMutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={closeMutation.isPending}>
                {closeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Cerrar Reporte
              </Button>
            </div>
          </form>
        </Form>
      </Card>

      {/* Nota sobre evidencias */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-700">
          <strong>Nota:</strong> Asegúrese de haber subido las evidencias de cierre antes de
          cerrar el reporte. Puede agregar evidencias desde la página de detalle del reporte.
        </p>
      </Card>
    </div>
  );
}
