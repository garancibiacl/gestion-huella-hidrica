export type RiskLevel = 'low' | 'medium' | 'high';
export type MetricKey = 'water_human' | 'water_meter' | 'energy';

export interface RiskRecord {
  period: string;
  center: string;
  metric: MetricKey;
  value: number;
  cost?: number | null;
  bottles?: number | null;
  bidons?: number | null;
}

export interface MetricConfig {
  key: MetricKey;
  label: string;
  unit: string;
  thresholds: {
    increasePct: number;
    flatTolerancePct: number;
    mixShiftPct: number;
    changeDetectionPct: number;
    outlierMadMultiplier: number;
  };
}

export interface RiskSignal {
  center: string;
  metric: MetricKey;
  label: string;
  unit: string;
  level: RiskLevel;
  reasons: string[];
  actions: string[];
  forecast30d: number;
  forecastCost30d: number;
  forecastRange: { min: number; max: number };
  forecastCostRange: { min: number; max: number };
  outlier: boolean;
  changeDetected: boolean;
  mixShiftPct: number | null;
  mixCurrentPct: number | null;
  mixAvgPct: number | null;
  latestValue: number;
  score: number;
  scoreRaw: number;
}

export interface RiskSignalsResult {
  signals: RiskSignal[];
  topRisks: RiskSignal[];
}

export interface UseRiskSignalsOptions {
  metricConfigs?: Partial<Record<MetricKey, Partial<MetricConfig>>>;
  topRiskCount?: number;
}

const DEFAULT_METRIC_CONFIGS: Record<MetricKey, MetricConfig> = {
  water_human: {
    key: 'water_human',
    label: 'Agua humana',
    unit: 'L',
    thresholds: {
      increasePct: 15,
      flatTolerancePct: 5,
      mixShiftPct: 20,
      changeDetectionPct: 18,
      outlierMadMultiplier: 3,
    },
  },
  water_meter: {
    key: 'water_meter',
    label: 'Agua medidor',
    unit: 'm³',
    thresholds: {
      increasePct: 12,
      flatTolerancePct: 4,
      mixShiftPct: 0,
      changeDetectionPct: 15,
      outlierMadMultiplier: 3,
    },
  },
  energy: {
    key: 'energy',
    label: 'Energia',
    unit: 'kWh',
    thresholds: {
      increasePct: 10,
      flatTolerancePct: 4,
      mixShiftPct: 0,
      changeDetectionPct: 12,
      outlierMadMultiplier: 2.8,
    },
  },
};

const ACTION_TEMPLATES: Record<MetricKey, string[]> = {
  water_human: [
    'Inspeccion preventiva de dispensadores',
    'Revisar abastecimiento / contratos',
    'Campana interna en centro',
  ],
  water_meter: [
    'Inspeccion de fugas en red interna',
    'Revisar lectura y presion del sistema',
    'Priorizar mantencion de medidores',
  ],
  energy: [
    'Revisar cargas base y horarios',
    'Auditoria de equipos criticos',
    'Optimizar turnos y climatizacion',
  ],
};

const periodToIndex = (period: string): number => {
  const [yearStr, monthStr] = period.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month) return 0;
  return year * 12 + month;
};

const periodToMonth = (period: string): number => {
  const [, monthStr] = period.split('-');
  return Number(monthStr);
};

const weightedMovingAverage = (values: number[]): number => {
  if (values.length === 0) return 0;
  const weights = [0.5, 0.3, 0.2];
  const recent = values.slice(-3).reverse();
  const applied = recent.map((value, idx) => value * (weights[idx] ?? 0.2));
  const totalWeight = weights.slice(0, recent.length).reduce((sum, w) => sum + w, 0);
  return totalWeight > 0 ? applied.reduce((sum, value) => sum + value, 0) / totalWeight : 0;
};

const calcStdDev = (values: number[]): number => {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

const calcMedian = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
};

const calcMad = (values: number[], median: number): number => {
  if (values.length === 0) return 0;
  const deviations = values.map((value) => Math.abs(value - median));
  return calcMedian(deviations);
};

const buildSeasonalityFactor = (
  values: number[],
  periods: string[],
  targetMonth: number,
): number => {
  if (values.length < 6) return 1;
  const buckets: Record<number, { sum: number; count: number }> = {};
  values.forEach((value, idx) => {
    const month = periodToMonth(periods[idx] ?? '');
    if (!month) return;
    if (!buckets[month]) buckets[month] = { sum: 0, count: 0 };
    buckets[month].sum += value;
    buckets[month].count += 1;
  });
  const overall = values.reduce((sum, value) => sum + value, 0) / values.length;
  const monthBucket = buckets[targetMonth];
  if (!overall || !monthBucket || monthBucket.count < 2) return 1;
  const monthAvg = monthBucket.sum / monthBucket.count;
  return monthAvg > 0 ? monthAvg / overall : 1;
};

const mergeMetricConfig = (
  base: MetricConfig,
  override?: Partial<MetricConfig>,
): MetricConfig => ({
  ...base,
  ...override,
  thresholds: {
    ...base.thresholds,
    ...(override?.thresholds ?? {}),
  },
});

export const computeRiskSignals = (
  data: RiskRecord[],
  options: UseRiskSignalsOptions = {},
): RiskSignalsResult => {
  const metricConfigs: Record<MetricKey, MetricConfig> = {
    water_human: mergeMetricConfig(DEFAULT_METRIC_CONFIGS.water_human, options.metricConfigs?.water_human),
    water_meter: mergeMetricConfig(DEFAULT_METRIC_CONFIGS.water_meter, options.metricConfigs?.water_meter),
    energy: mergeMetricConfig(DEFAULT_METRIC_CONFIGS.energy, options.metricConfigs?.energy),
  };
  const topRiskCount = options.topRiskCount ?? 3;

  if (!data || data.length === 0) return { signals: [], topRisks: [] };

  const grouped = data.reduce<Record<string, RiskRecord[]>>((acc, record) => {
    if (!record.center) return acc;
    const key = `${record.metric}::${record.center}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(record);
    return acc;
  }, {});

  const signals = Object.entries(grouped).map(([groupKey, records]) => {
    const [metric, center] = groupKey.split('::') as [MetricKey, string];
    const config = metricConfigs[metric];
    const aggregated = records.reduce<Record<string, RiskRecord>>((acc, record) => {
      if (!acc[record.period]) {
        acc[record.period] = {
          period: record.period,
          center,
          metric,
          value: 0,
          cost: 0,
          bottles: 0,
          bidons: 0,
        };
      }
      acc[record.period].value += Number(record.value ?? 0);
      acc[record.period].cost = Number(acc[record.period].cost ?? 0) + Number(record.cost ?? 0);
      acc[record.period].bottles = Number(acc[record.period].bottles ?? 0) + Number(record.bottles ?? 0);
      acc[record.period].bidons = Number(acc[record.period].bidons ?? 0) + Number(record.bidons ?? 0);
      return acc;
    }, {});

    const ordered = Object.values(aggregated).sort(
      (a, b) => periodToIndex(a.period) - periodToIndex(b.period),
    );
    const valueSeries = ordered.map((item) => item.value);
    const costSeries = ordered.map((item) => Number(item.cost ?? 0));
    const periods = ordered.map((item) => item.period);
    const lastThree = ordered.slice(-3);
    const reasons: string[] = [];
    let scoreRaw = 0;
    let mixCurrentPct: number | null = null;
    let mixAvgPct: number | null = null;

    if (lastThree.length === 3) {
      const [first, second, third] = lastThree;
      const value1 = first.value;
      const value2 = second.value;
      const value3 = third.value;
      const cost1 = Number(first.cost ?? 0);
      const cost3 = Number(third.cost ?? 0);

      const consecutiveIncrease = value1 > 0 && value2 > value1 && value3 > value2;
      if (consecutiveIncrease) {
        reasons.push('Consumo sube en 3 periodos consecutivos');
        scoreRaw += 3;
      }

      if (value1 > 0) {
        const accumulatedPct = ((value3 - value1) / value1) * 100;
        if (accumulatedPct >= config.thresholds.increasePct) {
          reasons.push(`Subida acumulada ${accumulatedPct.toFixed(1)}%`);
          scoreRaw += 1;
        }
      }

      const valueDeltaPct = value1 > 0 ? ((value3 - value1) / value1) * 100 : 0;
      const costPerUnit1 = value1 > 0 ? cost1 / value1 : 0;
      const costPerUnit3 = value3 > 0 ? cost3 / value3 : 0;
      const costPerUnitDeltaPct = costPerUnit1 > 0
        ? ((costPerUnit3 - costPerUnit1) / costPerUnit1) * 100
        : 0;
      const valueFlat = Math.abs(valueDeltaPct) <= config.thresholds.flatTolerancePct;

      if (valueFlat && costPerUnitDeltaPct > config.thresholds.increasePct) {
        reasons.push('Costo por unidad sube mientras el consumo se mantiene');
        scoreRaw += 4;
      }

      if (metric === 'water_human') {
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
        if (mixShift >= config.thresholds.mixShiftPct) {
          reasons.push(`Cambio de mix ${mixShift.toFixed(1)} pp (vs promedio 3 periodos)`);
          scoreRaw += 2;
        }
        if (avgTotal > 0 && lastTotal > 0) {
          mixCurrentPct = lastShare;
          mixAvgPct = avgShare;
        }
      }
    }

    const latestValue = valueSeries[valueSeries.length - 1] ?? 0;
    const prevValue = valueSeries[valueSeries.length - 2];
    let changeDetected = false;
    if (prevValue !== undefined && prevValue > 0) {
      const changePct = ((latestValue - prevValue) / prevValue) * 100;
      if (Math.abs(changePct) >= config.thresholds.changeDetectionPct) {
        reasons.push(`Cambio brusco ${changePct.toFixed(1)}% vs periodo anterior`);
        scoreRaw += 3;
        changeDetected = true;
      }
    }

    const median = calcMedian(valueSeries);
    const mad = calcMad(valueSeries, median);
    const robustSigma = mad * 1.4826;
    const outlier = robustSigma > 0
      && Math.abs(latestValue - median) > robustSigma * config.thresholds.outlierMadMultiplier;
    if (outlier) {
      reasons.push('Consumo fuera de rango historico (outlier robusto)');
      scoreRaw += 4;
    }

    const targetMonth = periodToMonth(periods[periods.length - 1] ?? '');
    const seasonalityFactor = buildSeasonalityFactor(valueSeries, periods, targetMonth);
    const forecastBase = weightedMovingAverage(valueSeries);
    const forecast30d = forecastBase * seasonalityFactor;
    const forecastCost30d = weightedMovingAverage(costSeries);

    const stdDev = calcStdDev(valueSeries);
    const rangeSpread = Math.max(robustSigma, stdDev);
    const forecastRange = {
      min: Math.max(0, forecast30d - rangeSpread),
      max: forecast30d + rangeSpread,
    };
    const costStdDev = calcStdDev(costSeries);
    const costMedian = calcMedian(costSeries);
    const costMad = calcMad(costSeries, costMedian);
    const costRobustSigma = costMad * 1.4826;
    const costRangeSpread = Math.max(costRobustSigma, costStdDev);
    const forecastCostRange = {
      min: Math.max(0, forecastCost30d - costRangeSpread),
      max: forecastCost30d + costRangeSpread,
    };

    const maxScore = 14;
    const score = Math.round((Math.min(scoreRaw, maxScore) / maxScore) * 10);

    let level: RiskLevel = 'low';
    if (score >= 7) level = 'high';
    else if (score >= 4) level = 'medium';

    const mixShiftPctValue = reasons.some((reason) => reason.includes('Cambio de mix'))
      ? Number(reasons.find((reason) => reason.includes('Cambio de mix'))?.match(/[\d.]+/)?.[0] ?? 0)
      : null;

    return {
      center,
      metric,
      label: config.label,
      unit: config.unit,
      level,
      reasons,
      actions: reasons.length ? ACTION_TEMPLATES[metric] : [],
      forecast30d,
      forecastCost30d,
      forecastRange,
      forecastCostRange,
      outlier,
      changeDetected,
      mixShiftPct: mixShiftPctValue,
      mixCurrentPct,
      mixAvgPct,
      latestValue,
      score,
      scoreRaw,
    };
  });

  const topRisks = [...signals]
    .filter((signal) => signal.level !== 'low')
    .sort((a, b) => b.score - a.score)
    .slice(0, topRiskCount);

  return { signals, topRisks };
};
