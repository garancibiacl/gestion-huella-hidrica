import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface NextActionPanelProps {
  title?: string;
  description?: string;
  items: string[];
  icon?: ReactNode;
  className?: string;
}

export function NextActionPanel({
  title = "Siguiente acción",
  description = "Recomendaciones rápidas para actuar en el próximo ciclo.",
  items,
  icon,
  className,
}: NextActionPanelProps) {
  return (
    <div className={cn("stat-card", className)}>
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <div>
          <h4 className="text-base font-semibold">{title}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {items.map((item, index) => (
          <li key={`${item}-${index}`} className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
