import { cn } from '@/lib/utils';

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div className={cn("stat-card animate-pulse", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="h-3 bg-muted/80 rounded-md w-20" />
          <div className="h-8 bg-muted/60 rounded-lg w-28" />
          <div className="h-3 bg-muted/80 rounded-md w-24" />
        </div>
        <div className="w-11 h-11 rounded-xl bg-muted/60" />
      </div>
    </div>
  );
}

export function SkeletonChart({ className }: SkeletonCardProps) {
  return (
    <div className={cn("stat-card animate-pulse", className)}>
      <div className="h-5 bg-muted/60 rounded-lg w-48 mb-2" />
      <div className="h-3 bg-muted/80 rounded-md w-64 mb-8" />
      <div className="h-72 bg-muted/40 rounded-xl" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="stat-card animate-pulse">
      <div className="h-5 bg-muted/60 rounded-lg w-48 mb-6" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-14 bg-muted/40 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
