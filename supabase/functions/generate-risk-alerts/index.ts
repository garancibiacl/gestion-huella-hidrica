import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { computeRiskSignals, type RiskRecord, type MetricKey } from "../_shared/risk-signals.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const periodToIndex = (period: string): number => {
  const [yearStr, monthStr] = period.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month) return 0;
  return year * 12 + month;
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
      const runStart = new Date().toISOString();
      let runId: string | null = null;
      let runErrors: string[] = [];
      let alertsUpserted = 0;

      const { data: runData, error: runStartError } = await supabase
        .from("risk_runs")
        .insert({ organization_id: organizationId, started_at: runStart })
        .select("id")
        .maybeSingle();

      if (runStartError || !runData?.id) {
        console.error("Risk run start error", runStartError);
        runErrors.push("No se pudo registrar el inicio del run.");
      } else {
        runId = runData.id;
      }

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
        runErrors.push("Error al cargar fuentes de datos.");
        if (runId) {
          await supabase
            .from("risk_runs")
            .update({ finished_at: new Date().toISOString(), status: "failed", errors: runErrors })
            .eq("id", runId);
        }
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
      const { signals } = computeRiskSignals(riskRecords);

      const { data: existingAlerts, error: existingError } = await supabase
        .from("risk_alerts")
        .select("center, metric, period, status")
        .eq("organization_id", organizationId);

      if (existingError) {
        console.error("Risk alerts fetch error", existingError);
        runErrors.push("Error al cargar alertas existentes.");
      }

      const existingStatusByKey = new Map<string, string>();
      (existingAlerts ?? []).forEach((row) => {
        const key = `${row.metric}::${row.center}::${row.period}`;
        existingStatusByKey.set(key, row.status);
      });

      const alerts = signals
        .filter((signal) => signal.level !== "low")
        .map((signal) => {
          const key = `${signal.metric}::${signal.center}`;
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
            // Explanatory fields from signal
            baseline_value: signal.baselineValue,
            prev_value: signal.prevValue,
            delta_pct: signal.deltaPct,
            seasonality_factor: signal.seasonalityFactor,
            confidence: signal.confidence,
            data_points: signal.dataPoints,
          };
        });

      const upsertableAlerts = alerts.filter((alert) => {
        const key = `${alert.metric}::${alert.center}::${alert.period}`;
        const status = existingStatusByKey.get(key);
        return status !== "acknowledged" && status !== "resolved";
      });

      if (upsertableAlerts.length === 0) {
        if (runId) {
          await supabase
            .from("risk_runs")
            .update({
              finished_at: new Date().toISOString(),
              status: runErrors.length > 0 ? "completed_with_errors" : "completed",
              errors: runErrors,
              alerts_upserted: alertsUpserted,
            })
            .eq("id", runId);
        }
        continue;
      }

      const { error: upsertError } = await supabase
        .from("risk_alerts")
        .upsert(upsertableAlerts, { onConflict: "organization_id,center,metric,period" });

      if (upsertError) {
        console.error("Upsert risk alerts error", upsertError);
        runErrors.push("Error al escribir alertas.");
        if (runId) {
          await supabase
            .from("risk_runs")
            .update({ finished_at: new Date().toISOString(), status: "failed", errors: runErrors })
            .eq("id", runId);
        }
        continue;
      }

      alertsUpserted += upsertableAlerts.length;
      totalAlerts += upsertableAlerts.length;

      if (runId) {
        await supabase
          .from("risk_runs")
          .update({
            finished_at: new Date().toISOString(),
            status: runErrors.length > 0 ? "completed_with_errors" : "completed",
            errors: runErrors,
            alerts_upserted: alertsUpserted,
          })
          .eq("id", runId);
      }
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
