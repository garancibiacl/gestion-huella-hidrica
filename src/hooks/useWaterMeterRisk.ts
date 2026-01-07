import { useMemo } from "react";
import { useWaterMeters } from "@/hooks/useWaterMeters";
import { computeWaterMeterRisk, type MeterRisk } from "@/lib/water/risk";

interface UseWaterMeterRiskOptions {
  windowSize?: number;
  minDeltaPct?: number;
  minBaseline?: number;
  centro?: string | "all";
  medidor?: string | "all";
}

interface UseWaterMeterRiskResult {
  risks: MeterRisk[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useWaterMeterRisk(
  options: UseWaterMeterRiskOptions = {}
): UseWaterMeterRiskResult {
  const { data, loading, error, refetch } = useWaterMeters();

  const risks = useMemo(() => {
    const metrics = computeWaterMeterRisk(data, {
      windowSize: options.windowSize,
      minDeltaPct: options.minDeltaPct,
      minBaseline: options.minBaseline,
    });

    return metrics.filter((r) => {
      if (
        options.centro &&
        options.centro !== "all" &&
        r.centro_trabajo !== options.centro
      )
        return false;
      if (
        options.medidor &&
        options.medidor !== "all" &&
        r.medidor !== options.medidor
      )
        return false;
      return true;
    });
  }, [
    data,
    options.windowSize,
    options.minDeltaPct,
    options.minBaseline,
    options.centro,
    options.medidor,
  ]);

  return { risks, loading, error, refetch };
}
