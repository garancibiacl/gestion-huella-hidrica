import type { HazardReport } from "../types/hazard.types";

export type CountByKey = { key: string; label: string; value: number };

const UNKNOWN_LABEL = "Sin dato";

function normalizeKey(value: string | null | undefined): string {
  return value?.trim() || UNKNOWN_LABEL;
}

export function countByKey(
  reports: HazardReport[],
  keySelector: (report: HazardReport) => string | null | undefined,
  limit = 8
): CountByKey[] {
  const map = new Map<string, number>();

  reports.forEach((report) => {
    const key = normalizeKey(keySelector(report));
    map.set(key, (map.get(key) ?? 0) + 1);
  });

  return Array.from(map.entries())
    .map(([key, value]) => ({ key, label: key, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export function buildMonthlySeries(
  reports: HazardReport[],
  year: number,
  getDate: (report: HazardReport) => string
) {
  const base = Array.from({ length: 12 }, (_, i) => ({
    monthIndex: i,
    label: new Date(year, i, 1).toLocaleDateString("es-CL", {
      month: "short",
    }),
    value: 0,
  }));

  reports.forEach((report) => {
    const date = new Date(getDate(report));
    if (Number.isNaN(date.getTime())) return;
    if (date.getFullYear() !== year) return;
    const monthIndex = date.getMonth();
    const entry = base[monthIndex];
    if (entry) {
      entry.value += 1;
    }
  });

  return base;
}

export function splitOpenProgress(reports: HazardReport[]) {
  const openReports = reports.filter((report) => report.status === "OPEN");
  const inProgress = openReports.filter((report) => !!report.closing_responsible_id);

  return {
    open: openReports.length,
    inProgress: inProgress.length,
  };
}
