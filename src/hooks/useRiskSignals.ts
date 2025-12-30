import { useMemo } from 'react';

type RiskLevel = 'low' | 'medium' | 'high';

interface RiskRecord {
  period: string;
  center: string;
  liters?: number | null;
  consumo_m3?: number | null;
  cost?: number | null;
  bottles?: number | null;
  bidons?: number | null;
}

interface RiskSignal {
  center: string;
  level: RiskLevel;
  reasons: string[];
  actions: string[];
  forecast30d: number;
  forecastCost30d: number;
  forecastRange: { min: number; max: number };
  forecastCostRange: { min: number; max: number };
  outlier: boolean;
  mixShiftPct: number | null;
  mixCurrentPct: number | null;
  mixAvgPct: number | null;
  score: number;
  scoreRaw: number;
}

interface RiskSignalsResult {
  signals: RiskSignal[];
  topRisks: RiskSignal[];
}

interface UseRiskSignalsOptions {
  thresholdIncreasePct?: number;
  flatLitersTolerancePct?: number;
  mixShiftPct?: number;
}

const DEFAULT_THRESHOLD_PCT = 15;
const DEFAULT_FLAT_TOLERANCE_PCT = 5;
const DEFAULT_MIX_SHIFT_PCT = 20;

const actionTemplates = [
  'Inspección preventiva',
  'Revisión de fugas / puntos críticos',
  'Revisión de abastecimiento / contratos',
  'Campaña interna focalizada en ese centro',
];

const periodToIndex = (period: string): number => {
  const [yearStr, monthStr] = period.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month) return 0;
  return year * 12 + month;
};

const getLiters = (record: RiskRecord): number => {
  if (record.liters !== undefined && record.liters !== null) return Number(record.liters);
  if (record.consumo_m3 !== undefined && record.consumo_m3 !== null) {
    return Number(record.consumo_m3) * 1000;
  }
  const bottles = Number(record.bottles ?? 0);
  const bidons = Number(record.bidons ?? 0);
  return (bottles * 0.5) + (bidons * 20);
};

const getCost = (record: RiskRecord): number => Number(record.cost ?? 0);

const weightedMovingAverage = (values: number[]): number => {
  if (values.length === 0) return 0;
  const weights = [0.5, 0.3, 0.2];
  const recent = values.slice(-3).reverse();
  const applied = recent.map((v, idx) => v * (weights[idx] ?? 0.2));
  const totalWeight = weights.slice(0, recent.length).reduce((sum, w) => sum + w, 0);
  return totalWeight > 0 ? applied.reduce((sum, v) => sum + v, 0) / totalWeight : 0;
};

const calcStdDev = (values: number[]): number => {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

export function useRiskSignals(
  data: RiskRecord[],
  options: UseRiskSignalsOptions = {}
): RiskSignalsResult {
  const thresholdIncreasePct = options.thresholdIncreasePct ?? DEFAULT_THRESHOLD_PCT;
  const flatLitersTolerancePct = options.flatLitersTolerancePct ?? DEFAULT_FLAT_TOLERANCE_PCT;
  const mixShiftPct = options.mixShiftPct ?? DEFAULT_MIX_SHIFT_PCT;

  return useMemo(() => {
    if (!data || data.length === 0) return { signals: [], topRisks: [] };

    const grouped = data.reduce<Record<string, RiskRecord[]>>((acc, record) => {
      if (!record.center) return acc;
      if (!acc[record.center]) acc[record.center] = [];
      acc[record.center].push(record);
      return acc;
    }, {});

    const signals = Object.entries(grouped).map(([center, records]) => {
      const aggregated = records.reduce<Record<string, RiskRecord>>((acc, record) => {
        if (!acc[record.period]) {
          acc[record.period] = { period: record.period, center };
        }
        acc[record.period].liters = (acc[record.period].liters ?? 0) + getLiters(record);
        acc[record.period].cost = (acc[record.period].cost ?? 0) + getCost(record);
        acc[record.period].bottles = (acc[record.period].bottles ?? 0) + Number(record.bottles ?? 0);
        acc[record.period].bidons = (acc[record.period].bidons ?? 0) + Number(record.bidons ?? 0);
        return acc;
      }, {});

      const ordered = Object.values(aggregated).sort(
        (a, b) => periodToIndex(a.period) - periodToIndex(b.period),
      );
      const litersSeries = ordered.map((r) => getLiters(r));
      const costSeries = ordered.map((r) => getCost(r));
      const lastThree = ordered.slice(-3);
      const reasons: string[] = [];
      let scoreRaw = 0;

      let mixCurrentPct: number | null = null;
      let mixAvgPct: number | null = null;

      if (lastThree.length === 3) {
        const [first, second, third] = lastThree;
        const liters1 = getLiters(first);
        const liters2 = getLiters(second);
        const liters3 = getLiters(third);
        const cost1 = getCost(first);
        const cost3 = getCost(third);

        const consecutiveIncrease = liters1 > 0 && liters2 > liters1 && liters3 > liters2;
        if (consecutiveIncrease) {
          reasons.push('Consumo sube en 3 períodos consecutivos');
          scoreRaw += 3;
        }

        if (liters1 > 0) {
          const accumulatedPct = ((liters3 - liters1) / liters1) * 100;
          if (accumulatedPct >= thresholdIncreasePct) {
            reasons.push(`Subida acumulada ${accumulatedPct.toFixed(1)}%`);
            scoreRaw += 1;
          }
        }

        const litersDeltaPct = liters1 > 0 ? ((liters3 - liters1) / liters1) * 100 : 0;
        const costPerLiter1 = liters1 > 0 ? cost1 / liters1 : 0;
        const costPerLiter3 = liters3 > 0 ? cost3 / liters3 : 0;
        const costPerLiterDeltaPct = costPerLiter1 > 0
          ? ((costPerLiter3 - costPerLiter1) / costPerLiter1) * 100
          : 0;
        const litersFlat = Math.abs(litersDeltaPct) <= flatLitersTolerancePct;

        if (litersFlat && costPerLiterDeltaPct > thresholdIncreasePct) {
          reasons.push('Costo/L sube mientras el consumo se mantiene');
          scoreRaw += 4;
        }

        const lastMix = {
          bottles: Number(third.bottles ?? 0),
          bidons: Number(third.bidons ?? 0),
        };
        const lastTotal = lastMix.bottles + lastMix.bidons;
        let avgBottleShare = 0;
        let avgTotal = 0;
        lastThree.forEach((item) => {
          const bottles = Number(item.bottles ?? 0);
          const bidons = Number(item.bidons ?? 0);
          const total = bottles + bidons;
          if (total > 0) {
            avgBottleShare += (bottles / total) * 100;
            avgTotal += 1;
          }
        });
        const avgShare = avgTotal > 0 ? avgBottleShare / avgTotal : 0;
        const lastShare = lastTotal > 0 ? (lastMix.bottles / lastTotal) * 100 : 0;
        const mixShift = avgTotal > 0 && lastTotal > 0 ? Math.abs(lastShare - avgShare) : 0;
        if (mixShift >= mixShiftPct) {
          reasons.push(`Cambio de mix ${mixShift.toFixed(1)} pp (vs promedio 3 períodos)`);
          scoreRaw += 2;
        }
        if (avgTotal > 0 && lastTotal > 0) {
          mixCurrentPct = lastShare;
          mixAvgPct = avgShare;
        }
      }

      const mean = litersSeries.reduce((sum, v) => sum + v, 0) / (litersSeries.length || 1);
      const stdDev = calcStdDev(litersSeries);
      const latestValue = litersSeries[litersSeries.length - 1] ?? 0;
      const outlier = stdDev > 0 && Math.abs(latestValue - mean) > stdDev * 2;
      if (outlier) {
        reasons.push('Consumo fuera de rango histórico (outlier)');
        scoreRaw += 4;
      }

      const forecast30d = weightedMovingAverage(litersSeries);
      const forecastCost30d = weightedMovingAverage(costSeries);
      const forecastRange = {
        min: Math.max(0, forecast30d - stdDev),
        max: forecast30d + stdDev,
      };
      const costStdDev = calcStdDev(costSeries);
      const forecastCostRange = {
        min: Math.max(0, forecastCost30d - costStdDev),
        max: forecastCost30d + costStdDev,
      };

      const maxScore = 13;
      const score = Math.round((Math.min(scoreRaw, maxScore) / maxScore) * 10);

      let level: RiskLevel = 'low';
      if (score >= 7) level = 'high';
      else if (score >= 4) level = 'medium';

      const mixShiftPctValue = reasons.some((r) => r.includes('Cambio de mix'))
        ? Number(reasons.find((r) => r.includes('Cambio de mix'))?.match(/[\d.]+/)?.[0] ?? 0)
        : null;

      return {
        center,
        level,
        reasons,
        actions: reasons.length ? actionTemplates : [],
        forecast30d,
        forecastCost30d,
        forecastRange,
        forecastCostRange,
        outlier,
        mixShiftPct: mixShiftPctValue,
        mixCurrentPct,
        mixAvgPct,
        score,
        scoreRaw,
      };
    });

    const topRisks = [...signals]
      .filter((signal) => signal.level !== 'low')
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return { signals, topRisks };
  }, [data, thresholdIncreasePct, flatLitersTolerancePct, mixShiftPct]);
}
