import type { Tables } from "@/integrations/supabase/types";

export type WaterMeterReading = Tables<"water_meter_readings">;

export interface MeterKey {
  centro_trabajo: string;
  medidor: string;
}

export interface MeterRisk {
  centro_trabajo: string;
  medidor: string;
  period: string; // current period used for evaluation
  baseline_m3: number; // typical consumption
  current_m3: number; // latest consumption
  delta_pct: number; // (current - baseline) / baseline
  confidence: number; // 0..1 confidence score
  data_points: number; // number of historic points used
}

function parsePeriodToKey(period: string): number {
  // period: YYYY-MM
  const [y, m] = period.split("-").map((v) => parseInt(v, 10));
  return y * 12 + (m - 1);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function stdev(values: number[]): number {
  if (values.length <= 1) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance =
    values.reduce((s, v) => s + (v - mean) * (v - mean), 0) /
    (values.length - 1);
  return Math.sqrt(variance);
}

export interface ComputeRiskOptions {
  windowSize?: number; // number of historic periods for baseline
  minDeltaPct?: number; // minimum delta to consider risk
  minBaseline?: number; // small baseline guard
}

const DEFAULTS: Required<ComputeRiskOptions> = {
  windowSize: 6,
  minDeltaPct: 0.2,
  minBaseline: 1,
};

/**
 * Compute per-meter risk metrics with explainability.
 * Pure function, no side effects. Returns metrics for all meters regardless of risk threshold; UI can filter.
 */
export function computeWaterMeterRisk(
  readings: WaterMeterReading[],
  opts: ComputeRiskOptions = {}
): MeterRisk[] {
  const { windowSize, minDeltaPct, minBaseline } = { ...DEFAULTS, ...opts };

  // group by centro_trabajo + medidor
  const groups = new Map<string, WaterMeterReading[]>();
  for (const r of readings) {
    const key = `${r.centro_trabajo}__${r.medidor}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  const results: MeterRisk[] = [];
  for (const [, rows] of groups) {
    // order by period asc
    const ordered = [...rows].sort(
      (a, b) => parsePeriodToKey(a.period) - parsePeriodToKey(b.period)
    );
    if (ordered.length === 0) continue;

    const latest = ordered[ordered.length - 1];
    const history = ordered.slice(
      Math.max(0, ordered.length - (windowSize + 1)),
      ordered.length - 1
    );

    const historyValues = history
      .map((h) => Number(h.consumo_m3) || 0)
      .filter((v) => v >= 0);
    const baseline = historyValues.length > 0 ? median(historyValues) : 0;
    const current = Number(latest.consumo_m3) || 0;

    const deltaPct =
      baseline > minBaseline
        ? (current - baseline) / baseline
        : current > 0
        ? 1
        : 0;

    // confidence based on amount of data and stability (lower variability -> higher confidence)
    const n = historyValues.length;
    const variability =
      baseline > 0 ? stdev(historyValues) / (baseline || 1) : 1;
    const dataScore = Math.min(1, n / windowSize);
    const stabilityScore = Math.max(0, 1 - Math.min(1, variability));
    const confidence = Math.max(
      0,
      Math.min(1, 0.6 * dataScore + 0.4 * stabilityScore)
    );

    results.push({
      centro_trabajo: latest.centro_trabajo,
      medidor: latest.medidor,
      period: latest.period,
      baseline_m3: round(baseline),
      current_m3: round(current),
      delta_pct: round(deltaPct, 4),
      confidence: round(confidence, 3),
      data_points: n,
    });
  }

  // sort: highest delta first
  return results.sort((a, b) => b.delta_pct - a.delta_pct);
}

function round(v: number, digits = 2): number {
  const m = Math.pow(10, digits);
  return Math.round(v * m) / m;
}
