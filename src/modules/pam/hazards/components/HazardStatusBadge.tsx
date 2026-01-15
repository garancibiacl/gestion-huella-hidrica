import { Badge } from '@/components/ui/badge';
import type { HazardStatus } from '../types/hazard.types';

interface HazardStatusBadgeProps {
  status: HazardStatus;
  className?: string;
}

export function HazardStatusBadge({ status, className }: HazardStatusBadgeProps) {
  const statusConfig = {
    OPEN: {
      label: 'Abierto',
      variant: 'destructive' as const,
    },
    CLOSED: {
      label: 'Cerrado',
      variant: 'default' as const,
    },
    CANCELLED: {
      label: 'Cancelado',
      variant: 'secondary' as const,
    },
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
