import { cn } from "@/lib/utils";

interface ProgressKpiProps {
  title: string;
  value: string;
  progress: number;
  helper?: string;
  tone?: "primary" | "success" | "warning";
}

const toneStyles: Record<NonNullable<ProgressKpiProps["tone"]>, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
};

export function ProgressKpi({
  title,
  value,
  progress,
  helper,
  tone = "primary",
}: ProgressKpiProps) {
  const safeProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className="rounded-xl border border-border bg-muted/10 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-semibold",
            toneStyles[tone]
          )}
        >
          {Math.round(safeProgress)}%
        </span>
      </div>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
      <div className="mt-3 h-2 w-full rounded-full bg-muted">
        <div
          className={cn(
            "h-2 rounded-full",
            tone === "success" && "bg-emerald-500",
            tone === "warning" && "bg-amber-500",
            tone === "primary" && "bg-primary"
          )}
          style={{ width: `${safeProgress}%` }}
        />
      </div>
      {helper && <p className="mt-2 text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}
