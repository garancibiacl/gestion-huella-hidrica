import { useMemo } from 'react';
import {
  computeRiskSignals,
  type RiskLevel,
  type MetricKey,
  type RiskRecord,
  type MetricConfig,
  type RiskSignal,
  type RiskSignalsResult,
  type UseRiskSignalsOptions,
} from '@/lib/risk-signals';

export function useRiskSignals(
  data: RiskRecord[],
  options: UseRiskSignalsOptions = {},
): RiskSignalsResult {
  return useMemo(() => computeRiskSignals(data, options), [data, options]);
}

export type {
  RiskLevel,
  MetricKey,
  RiskRecord,
  MetricConfig,
  RiskSignal,
  RiskSignalsResult,
  UseRiskSignalsOptions,
};
