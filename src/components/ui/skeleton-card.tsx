import { cn } from '@/lib/utils';

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div className={cn("stat-card animate-pulse", className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <div className="h-4 bg-muted rounded w-24" />
          <div className="h-8 bg-muted rounded w-20" />
          <div className="h-4 bg-muted rounded w-32" />
        </div>
        <div className="w-10 h-10 rounded-lg bg-muted" />
      </div>
    </div>
  );
}

export function SkeletonChart({ className }: SkeletonCardProps) {
  return (
    <div className={cn("stat-card animate-pulse", className)}>
      <div className="h-4 bg-muted rounded w-48 mb-2" />
      <div className="h-3 bg-muted rounded w-64 mb-6" />
      <div className="h-64 bg-muted rounded" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="stat-card animate-pulse">
      <div className="h-4 bg-muted rounded w-48 mb-4" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-12 bg-muted rounded" />
        ))}
      </div>
    </div>
  );
}
