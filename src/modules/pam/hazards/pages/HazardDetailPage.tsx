import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertTriangle, Calendar, User, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { HazardStatusBadge } from '../components/HazardStatusBadge';
import { HazardEvidenceSection } from '../components/HazardEvidenceSection';
import { HazardTimeline } from '../components/HazardTimeline';
import { useHazardReport } from '../hooks/useHazardReports';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function HazardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: report, isLoading } = useHazardReport(id);

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <PageHeader title="Cargando..." description="Obteniendo detalles del reporte" />
        <div className="text-center py-12">
          <p className="text-muted-foreground">Cargando reporte...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <PageHeader title="Reporte no encontrado" description="El reporte solicitado no existe" />
        <Card className="p-12 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground opacity-20 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Reporte no encontrado</h3>
          <p className="text-muted-foreground mb-4">
            El reporte que buscas no existe o no tienes permisos para verlo
          </p>
          <Button onClick={() => navigate('/admin/pls/hazard-report')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a la lista
          </Button>
        </Card>
      </div>
    );
  }

  const isOverdue = report.status === 'OPEN' && new Date(report.due_date) < new Date();
  const canClose = report.status === 'OPEN';

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title={`Reporte de Peligro #${report.id.slice(0, 8)}`}
        description={report.gerencia}
        action={
          <div className="flex gap-2">
            {canClose && (
              <Button onClick={() => navigate(`/admin/pls/hazard-report/${report.id}/close`)}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Cerrar Reporte
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate('/admin/pls/hazard-report')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </div>
        }
      />

      {/* Encabezado del reporte */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <HazardStatusBadge status={report.status} />
            {isOverdue && (
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                VENCIDO
              </span>
            )}
            {report.critical_risk_name && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                {report.critical_risk_name}
              </span>
            )}
            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
              {report.deviation_type === 'ACCION' ? 'Acción insegura' : 'Condición insegura'}
            </span>
          </div>
          <div className="text-sm text-muted-foreground text-right">
            Creado: {format(new Date(report.created_at), 'PPp', { locale: es })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Descripción */}
          <div className="md:col-span-2 space-y-2">
            <h3 className="text-lg font-semibold">Descripción del Peligro</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">{report.description}</p>
            {report.root_cause && (
              <>
                <h4 className="text-sm font-medium mt-4">Causa Raíz</h4>
                <p className="text-muted-foreground whitespace-pre-wrap">{report.root_cause}</p>
              </>
            )}
          </div>

          {/* Evidencias (debajo de Descripción/Causa raíz) */}
          <div className="md:col-span-2">
            <Card className="p-6">
              <HazardEvidenceSection
                reportId={report.id}
                evidences={report.evidences || []}
                canAddEvidence={report.status === 'OPEN'}
              />
            </Card>
          </div>

          {/* Jerarquía */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Jerarquía Organizacional</h3>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span>
                  <strong>Gerencia:</strong> {report.gerencia}
                </span>
              </div>
              {report.proceso && (
                <div className="ml-6">
                  <strong>Proceso:</strong> {report.proceso}
                </div>
              )}
              {report.actividad && (
                <div className="ml-6">
                  <strong>Actividad:</strong> {report.actividad}
                </div>
              )}
              {report.tarea && (
                <div className="ml-6">
                  <strong>Tarea:</strong> {report.tarea}
                </div>
              )}
            </div>
          </div>

          {/* Ubicación */}
          {(report.faena || report.centro_trabajo) && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Ubicación</h3>
              <div className="space-y-1 text-sm">
                {report.faena && (
                  <div>
                    <strong>Faena:</strong> {report.faena}
                  </div>
                )}
                {report.centro_trabajo && (
                  <div>
                    <strong>Centro de trabajo:</strong> {report.centro_trabajo}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reportante */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Reportante</h3>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{report.reporter_name}</span>
              </div>
              {report.reporter_rut && <div className="ml-6">RUT: {report.reporter_rut}</div>}
              {report.reporter_email && <div className="ml-6">Email: {report.reporter_email}</div>}
              {report.reporter_company && (
                <div className="ml-6">Empresa: {report.reporter_company}</div>
              )}
            </div>
          </div>

          {/* Responsable y Plazo */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Responsable y Plazo</h3>
            <div className="space-y-1 text-sm">
              {report.closing_responsible_name && (
                <div>
                  <strong>Responsable de cierre:</strong> {report.closing_responsible_name}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  <strong>Plazo:</strong>{' '}
                  {format(new Date(report.due_date), 'PPP', { locale: es })}
                </span>
              </div>
            </div>
          </div>

          {/* Información de cierre (si está cerrado) */}
          {report.status === 'CLOSED' && (
            <div className="md:col-span-2 space-y-2 pt-4 border-t">
              <h3 className="text-sm font-semibold text-green-700">Información de Cierre</h3>
              <div className="space-y-2 text-sm">
                {report.closed_at && (
                  <div>
                    <strong>Fecha de cierre:</strong>{' '}
                    {format(new Date(report.closed_at), 'PPp', { locale: es })}
                  </div>
                )}
                {report.verification_responsible_name && (
                  <div>
                    <strong>Responsable de verificación:</strong>{' '}
                    {report.verification_responsible_name}
                  </div>
                )}
                {report.control_type_name && (
                  <div>
                    <strong>Tipo de control:</strong> {report.control_type_name}
                  </div>
                )}
                {report.closing_description && (
                  <>
                    <div className="mt-2">
                      <strong>Descripción del cierre:</strong>
                    </div>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {report.closing_description}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Timeline */}
      <Card className="p-6">
        <HazardTimeline events={report.events || []} />
      </Card>
    </div>
  );
}
