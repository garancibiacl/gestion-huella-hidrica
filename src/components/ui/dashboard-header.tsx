import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusTone = "success" | "warning" | "muted";

interface DashboardHeaderProps {
  title: string;
  description?: string;
  narrative?: string;
  action?: ReactNode;
  statusLabel?: string;
  statusDetail?: string;
  statusTone?: StatusTone;
  className?: string;
}

const statusToneStyles: Record<StatusTone, string> = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-rose-50 text-[#C3161D] border-rose-200",
  muted: "bg-muted text-muted-foreground border-border",
};

export function DashboardHeader({
  title,
  description,
  narrative,
  action,
  statusLabel,
  statusDetail,
  statusTone = "muted",
  className,
}: DashboardHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-border bg-card/80 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="space-y-2">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {narrative && (
          <p className="text-sm text-foreground/80">{narrative}</p>
        )}
      </div>
      <div className="flex flex-col items-start gap-3 sm:items-end">
        {action && <div className="w-full sm:w-auto">{action}</div>}
        {(statusLabel || statusDetail) && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {statusLabel && (
              <Badge
                variant="outline"
                className={cn("border text-xs font-medium", statusToneStyles[statusTone])}
              >
                {statusLabel}
              </Badge>
            )}
            {statusDetail && <span>{statusDetail}</span>}
          </div>
        )}
      </div>
    </motion.div>
  );
}
