import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CheckCircle2,
  FileText,
  Upload,
  AlertCircle,
  User,
  MessageSquare,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { HazardReportEvent } from '../types/hazard.types';

interface HazardTimelineProps {
  events: HazardReportEvent[];
}

export function HazardTimeline({ events }: HazardTimelineProps) {
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'CREATED':
        return <FileText className="h-4 w-4" />;
      case 'EVIDENCE_ADDED':
        return <Upload className="h-4 w-4" />;
      case 'CLOSED':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'REOPENED':
        return <AlertCircle className="h-4 w-4" />;
      case 'ASSIGNED':
        return <User className="h-4 w-4" />;
      case 'COMMENT_ADDED':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getEventLabel = (eventType: string) => {
    switch (eventType) {
      case 'CREATED':
        return 'Reporte creado';
      case 'UPDATED':
        return 'Reporte actualizado';
      case 'EVIDENCE_ADDED':
        return 'Evidencia agregada';
      case 'CLOSED':
        return 'Reporte cerrado';
      case 'REOPENED':
        return 'Reporte reabierto';
      case 'ASSIGNED':
        return 'Reporte asignado';
      case 'COMMENT_ADDED':
        return 'Comentario agregado';
      default:
        return 'Evento';
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'CREATED':
        return 'text-blue-500 bg-blue-500/10';
      case 'EVIDENCE_ADDED':
        return 'text-purple-500 bg-purple-500/10';
      case 'CLOSED':
        return 'text-green-500 bg-green-500/10';
      case 'REOPENED':
        return 'text-orange-500 bg-orange-500/10';
      case 'ASSIGNED':
        return 'text-indigo-500 bg-indigo-500/10';
      default:
        return 'text-gray-500 bg-gray-500/10';
    }
  };

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No hay eventos registrados</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Timeline</h3>
      <div className="relative space-y-4">
        {/* Línea vertical */}
        <div className="absolute left-[17px] top-2 bottom-2 w-px bg-border" />

        {events.map((event, index) => (
          <Card key={event.id} className="relative ml-10 p-4">
            {/* Ícono del evento */}
            <div
              className={`absolute -left-[57px] top-4 rounded-full p-2 ${getEventColor(
                event.event_type
              )}`}
            >
              {getEventIcon(event.event_type)}
            </div>

            {/* Contenido */}
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium">{getEventLabel(event.event_type)}</h4>
                  {event.created_by_name && (
                    <p className="text-sm text-muted-foreground">por {event.created_by_name}</p>
                  )}
                </div>
                <time className="text-xs text-muted-foreground">
                  {format(new Date(event.created_at), 'PPp', { locale: es })}
                </time>
              </div>

              {/* Payload (detalles adicionales) */}
              {event.payload && Object.keys(event.payload).length > 0 && (
                <div className="text-sm text-muted-foreground space-y-1">
                  {event.event_type === 'CREATED' && (
                    <>
                      {event.payload.gerencia && <p>Gerencia: {event.payload.gerencia}</p>}
                      {event.payload.critical_risk && (
                        <p>Riesgo crítico: {event.payload.critical_risk}</p>
                      )}
                      {event.payload.due_date && (
                        <p>
                          Plazo:{' '}
                          {format(new Date(event.payload.due_date), 'PP', { locale: es })}
                        </p>
                      )}
                    </>
                  )}

                  {event.event_type === 'EVIDENCE_ADDED' && (
                    <>
                      {event.payload.file_name && <p>Archivo: {event.payload.file_name}</p>}
                      {event.payload.evidence_type && (
                        <p>Tipo: {event.payload.evidence_type}</p>
                      )}
                    </>
                  )}

                  {event.event_type === 'CLOSED' && (
                    <>
                      {event.payload.control_type && (
                        <p>Tipo de control: {event.payload.control_type}</p>
                      )}
                      {event.payload.verification_responsible && (
                        <p>Verificado por: {event.payload.verification_responsible}</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
