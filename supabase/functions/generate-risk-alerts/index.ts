import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { computeRiskSignals, type RiskRecord, type MetricKey } from "../_shared/risk-signals.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const buildLatestPeriodMap = (records: RiskRecord[]): Record<string, string> => {
  return records.reduce<Record<string, string>>((acc, record) => {
    const key = `${record.metric}::${record.center}`;
    const current = acc[key];
    if (!current || periodToIndex(record.period) > periodToIndex(current)) {
      acc[key] = record.period;
    }
    return acc;
  }, {});
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

const calcConfidence = (dataPoints: number): number => {
  if (dataPoints <= 0) return 0;
  return Math.min(1, dataPoints / 12);
};

const periodToIndex = (period: string): number => {
  const [yearStr, monthStr] = period.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month) return 0;
  return year * 12 + month;
};

const buildSeriesByKey = (records: RiskRecord[]) => {
  return records.reduce<Record<string, { period: string; value: number }[]>>((acc, record) => {
    const key = `${record.metric}::${record.center}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push({ period: record.period, value: Number(record.value ?? 0) });
    return acc;
  }, {});
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: orgs, error: orgError } = await supabase
      .from("organizations")
      .select("id");

    if (orgError) throw orgError;

    let totalAlerts = 0;

    for (const org of orgs ?? []) {
      const organizationId = org.id as string;

      const [humanRes, electricRes, waterRes] = await Promise.all([
        supabase
          .from("human_water_consumption")
          .select("period, centro_trabajo, formato, cantidad, total_costo")
          .eq("organization_id", organizationId),
        supabase
          .from("electric_meter_readings")
          .select("period, centro_trabajo, consumo_kwh, costo_total")
          .eq("organization_id", organizationId),
        supabase
          .from("water_readings")
          .select("period, consumo_m3, costo")
          .eq("organization_id", organizationId),
      ]);

      if (humanRes.error || electricRes.error || waterRes.error) {
        console.error("Fetch error", { humanRes: humanRes.error, electricRes: electricRes.error, waterRes: waterRes.error });
        continue;
      }

      const riskRecords: RiskRecord[] = [];

      (humanRes.data ?? []).forEach((row) => {
        const bottles = row.formato === "botella" ? Number(row.cantidad ?? 0) : 0;
        const bidons = row.formato === "bidon_20l" ? Number(row.cantidad ?? 0) : 0;
        const liters = (bottles * 0.5) + (bidons * 20);
        riskRecords.push({
          period: row.period,
          center: `Agua humana · ${row.centro_trabajo}`,
          metric: "water_human",
          value: liters,
          cost: Number(row.total_costo ?? 0),
          bottles,
          bidons,
        });
      });

      (electricRes.data ?? []).forEach((row) => {
        riskRecords.push({
          period: row.period,
          center: `Energia · ${row.centro_trabajo}`,
          metric: "energy",
          value: Number(row.consumo_kwh ?? 0),
          cost: Number(row.costo_total ?? 0),
        });
      });

      (waterRes.data ?? []).forEach((row) => {
        riskRecords.push({
          period: row.period,
          center: "Agua medidor · General",
          metric: "water_meter",
          value: Number(row.consumo_m3 ?? 0),
          cost: Number(row.costo ?? 0),
        });
      });

      const latestPeriodBySignal = buildLatestPeriodMap(riskRecords);
      const seriesBySignal = buildSeriesByKey(riskRecords);
      const { signals } = computeRiskSignals(riskRecords);

      const alerts = signals
        .filter((signal) => signal.level !== "low")
        .map((signal) => {
          const key = `${signal.metric}::${signal.center}`;
          const series = (seriesBySignal[key] ?? [])
            .sort((a, b) => periodToIndex(a.period) - periodToIndex(b.period));
          const values = series.map((item) => item.value);
          const dataPoints = values.length;
          const latestValue = values[values.length - 1] ?? 0;
          const prevValue = values[values.length - 2];
          const baselineValue = calcMedian(values);
          const deltaPct = prevValue && prevValue > 0
            ? ((latestValue - prevValue) / prevValue) * 100
            : null;
          const seasonalityFactor = signal.forecast30d > 0
            ? Number((signal.forecast30d / Math.max(signal.latestValue || 1, 1)).toFixed(4))
            : null;
          const confidence = calcConfidence(dataPoints);
          return {
            organization_id: organizationId,
            center: signal.center,
            metric: signal.metric as MetricKey,
            period: latestPeriodBySignal[key],
            latest_value: signal.latestValue,
            forecast_value: signal.forecast30d,
            forecast_cost: signal.forecastCost30d,
            range_min: signal.forecastRange.min,
            range_max: signal.forecastRange.max,
            range_cost_min: signal.forecastCostRange.min,
            range_cost_max: signal.forecastCostRange.max,
            score: signal.score,
            level: signal.level,
            reasons: signal.reasons,
            actions: signal.actions,
            change_detected: signal.changeDetected,
            outlier: signal.outlier,
            mix_current_pct: signal.mixCurrentPct,
            mix_avg_pct: signal.mixAvgPct,
            mix_shift_pct: signal.mixShiftPct,
            baseline_value: baselineValue,
            prev_value: prevValue ?? null,
            delta_pct: deltaPct,
            seasonality_factor: seasonalityFactor,
            confidence,
            data_points: dataPoints,
          };
        });

      if (alerts.length === 0) continue;

      const { error: upsertError } = await supabase
        .from("risk_alerts")
        .upsert(alerts, { onConflict: "organization_id,center,metric,period" });

      if (upsertError) {
        console.error("Upsert risk alerts error", upsertError);
        continue;
      }

      totalAlerts += alerts.length;
    }

    return new Response(JSON.stringify({ ok: true, totalAlerts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
