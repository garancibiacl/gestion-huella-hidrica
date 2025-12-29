import { Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface LastUpdatedIndicatorProps {
  lastUpdated: Date | null;
  isLoading?: boolean;
}

export function LastUpdatedIndicator({ lastUpdated, isLoading }: LastUpdatedIndicatorProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="w-4 h-4 animate-pulse" />
        <span>Cargando...</span>
      </div>
    );
  }

  if (!lastUpdated) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="w-4 h-4" />
        <span>Sin datos</span>
      </div>
    );
  }

  const timeAgo = formatDistanceToNow(lastUpdated, { addSuffix: true, locale: es });
  const fullDate = lastUpdated.toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-default">
            <Clock className="w-4 h-4" />
            <span>Última actualización: {timeAgo}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{fullDate}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
