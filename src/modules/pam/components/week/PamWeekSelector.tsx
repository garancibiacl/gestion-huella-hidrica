import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PamWeekSelection } from "../../hooks/usePamWeekSelector";

interface PamWeekSelectorProps {
  week: PamWeekSelection;
  triggerClassName?: string;
}

const monthNames = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export function PamWeekSelector({ week, triggerClassName }: PamWeekSelectorProps) {
  const currentYear = week.weekYear;
  const weeksByMonth: Record<string, { value: string; label: string }[]> = {};

  for (let weekNum = 1; weekNum <= 52; weekNum += 1) {
    const date = new Date(currentYear, 0, 1 + (weekNum - 1) * 7);
    const monthName = monthNames[date.getMonth()];

    if (!weeksByMonth[monthName]) {
      weeksByMonth[monthName] = [];
    }

    weeksByMonth[monthName].push({
      value: `${currentYear}-${weekNum}`,
      label: `Semana W${String(weekNum).padStart(2, "0")}`,
    });
  }

  const currentWeekValue = `${week.weekYear}-${week.weekNumber}`;

  return (
    <Select
      value={currentWeekValue}
      onValueChange={(value) => {
        const [year, weekNum] = value.split("-").map(Number);
        week.setWeek(year, weekNum);
      }}
    >
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder="Seleccionar semana" />
      </SelectTrigger>
      <SelectContent className="max-h-[400px]">
        {monthNames.map((monthName) => {
          const monthWeeks = weeksByMonth[monthName];
          if (!monthWeeks || monthWeeks.length === 0) return null;

          return (
            <SelectGroup key={monthName}>
              <SelectLabel>
                {monthName} {currentYear}
              </SelectLabel>
              {monthWeeks.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          );
        })}
      </SelectContent>
    </Select>
  );
}
