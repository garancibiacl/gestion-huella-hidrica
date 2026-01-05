import type { ImpactMetrics } from "@/lib/impact";

export interface WaterReportHtmlData {
  periodLabel: string;
  monthLabel: string;
  yearLabel: string;
  totalM3: number;
  totalCost: number;
  variation: number;
  impact: ImpactMetrics;
}

// Generates a standalone HTML document for the Water Monthly Report.
// It uses Tailwind via CDN so it can be rendered by external HTML→PDF services.
export function buildWaterReportHtml(data: WaterReportHtmlData): string {
  const { periodLabel, monthLabel, yearLabel, totalM3, totalCost, variation, impact } = data;

  const kwhSaved = Math.round(impact.energySavedKwh).toLocaleString("es-CL");
  const litersSaved = Math.round(impact.litersSaved).toLocaleString("es-CL");
  const co2Kg = impact.emissionsAvoidedKg.toFixed(1);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Reporte Mensual – Consumo de Agua</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background: #f6f7f9; }
  </style>
</head>
<body class="bg-[#f6f7f9]">
  <div class="min-h-screen py-6 px-4">
    <div class="mx-auto w-full max-w-5xl rounded-2xl bg-white shadow-[0_18px_45px_rgba(15,23,42,0.12)] overflow-hidden">
      <!-- HEADER -->
      <section class="relative flex flex-col justify-between gap-6 bg-gradient-to-br from-[#8f2520] to-[#b7322c] px-8 py-7 text-white md:flex-row">
        <div class="max-w-xl">
          <h1 class="text-3xl font-bold leading-tight tracking-tight">Reporte Mensual</h1>
          <p class="mt-3 text-sm sm:text-base text-white/90">
            <span class="font-semibold">Buses JM · Gestión Medioambiental</span><br/>
            Control de Agua, Energía y Huella de Carbono para decisiones preventivas.
          </p>
        </div>
        <div class="flex flex-col items-end gap-4">
          <div class="rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-500 px-5 py-3 text-center shadow-[0_12px_26px_rgba(16,185,129,0.45)] min-w-[160px]">
            <div class="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">Período</div>
            <div class="mt-1 text-sm font-semibold tracking-wide">${monthLabel}</div>
            <div class="text-2xl font-bold leading-none">${yearLabel}</div>
          </div>
          <div class="flex items-center gap-3 text-xs text-white/90">
            <div class="flex h-11 w-11 items-center justify-center rounded-xl border border-white/25 bg-white/10">
              <img src="https://www.pasajesjm.cl/wp-content/uploads/2024/04/logo.png" alt="Buses JM" class="h-7 w-7 object-contain" />
            </div>
            <div class="text-right">
              <div class="font-semibold">Buses JM</div>
              <div class="text-[11px]">Reporte generado</div>
            </div>
          </div>
        </div>
      </section>

      <!-- CONTENT -->
      <main class="relative bg-[#f8fafc] px-5 py-5 sm:px-7 sm:py-7">
        <div class="absolute inset-0 pointer-events-none opacity-[0.06] flex items-center justify-center">
          <img src="https://www.pasajesjm.cl/wp-content/uploads/2024/04/logo.png" alt="Watermark JM" class="max-w-[70%] object-contain" />
        </div>

        <div class="relative grid gap-4 md:grid-cols-[1.15fr,0.85fr]">
          <!-- CARD 1: Resumen Agua -->
          <section class="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
            <div class="mb-3 flex items-center justify-between gap-3">
              <div class="inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-semibold text-[#b7322c]">
                <span class="flex h-6 w-6 items-center justify-center rounded-full bg-white text-lg">💧</span>
                <span>Resumen de Agua (Histórico)</span>
              </div>
              <div class="text-xs font-semibold text-slate-500">
                Período: <span class="font-medium text-slate-700">${periodLabel}</span>
              </div>
            </div>
            <p class="text-[13px] text-slate-600">Consumo consolidado y evolución mensual. Fuente: sistema JM.</p>
            <div class="mt-3 flex h-40 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-500">
              Gráfico histórico (vista resumida para PDF)
            </div>
            <p class="mt-3 text-[13px] text-slate-700">
              <span class="font-semibold">Consumo total:</span> ${totalM3.toLocaleString("es-CL")} m³ ·
              <span class="font-semibold"> Costo total:</span> $${totalCost.toLocaleString("es-CL")} ·
              <span class="font-semibold"> Variación:</span> ${variation.toFixed(1)}%
            </p>
          </section>

          <!-- CARD 2: Comparación año anterior (placeholder) -->
          <section class="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
            <div class="mb-3 flex items-center justify-between gap-3">
              <div class="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <span class="flex h-6 w-6 items-center justify-center rounded-full bg-white text-lg">📊</span>
                <span>Comparación año anterior</span>
              </div>
            </div>
            <p class="text-[13px] text-slate-600">Comparación del período actual versus el mismo período del año anterior.</p>
            <div class="mt-3 flex flex-1 items-center justify-center">
              <div class="relative flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-tr from-[#b7322c] to-[#e11d48] shadow-[0_12px_30px_rgba(190,24,93,0.35)]">
                <div class="absolute h-24 w-24 rounded-full border border-slate-200 bg-white"></div>
                <div class="relative z-10 text-center">
                  <div class="text-3xl font-bold text-[#b7322c]">–</div>
                  <div class="mt-1 text-[11px] text-slate-500">Donut (opcional)</div>
                </div>
              </div>
            </div>
            <p class="mt-3 text-[12px] text-slate-500">*Vista informativa. Puedes extender este bloque con comparación año a año cuando tengas esos datos.</p>
          </section>
        </div>

        <!-- ECOEQUIVALENCIA -->
        <section class="relative mt-5 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
          <div class="mb-4 flex flex-wrap items-center gap-3">
            <div class="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <span class="flex h-6 w-6 items-center justify-center rounded-full bg-white text-base">🌱</span>
              <span>Ecoequivalencia · Impacto Ambiental</span>
            </div>
            <p class="text-[12px] text-slate-500">Beneficios ambientales estimados del período ${periodLabel}.</p>
          </div>

          <div class="grid gap-3 md:grid-cols-3">
            <article class="flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_22px_rgba(15,23,42,0.05)]">
              <div class="mb-2 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-lg">💧</div>
              <div class="text-[12px] font-semibold text-slate-600">Ahorra agua</div>
              <div class="mt-1 text-2xl font-bold text-[#b7322c]">${litersSaved} <span class="text-sm font-semibold">L</span></div>
              <div class="mt-1 text-[11px] text-slate-500">Litros de agua estimados</div>
            </article>
            <article class="flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_22px_rgba(15,23,42,0.05)]">
              <div class="mb-2 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-lg">⚡</div>
              <div class="text-[12px] font-semibold text-slate-600">Ahorra energía</div>
              <div class="mt-1 text-2xl font-bold text-[#b7322c]">${kwhSaved} <span class="text-sm font-semibold">kWh</span></div>
              <div class="mt-1 text-[11px] text-slate-500">kWh electricidad</div>
            </article>
            <article class="flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_22px_rgba(15,23,42,0.05)]">
              <div class="mb-2 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-lg">🌍</div>
              <div class="text-[12px] font-semibold text-slate-600">Evita emisiones</div>
              <div class="mt-1 text-2xl font-bold text-[#b7322c]">${co2Kg} <span class="text-sm font-semibold">kg CO₂e</span></div>
              <div class="mt-1 text-[11px] text-slate-500">Emisiones evitadas</div>
            </article>
          </div>
        </section>

        <!-- FOOTER -->
        <footer class="mt-5 rounded-2xl bg-gradient-to-r from-[#8f2520] to-[#b7322c] px-4 py-3 text-xs text-white shadow-[0_12px_30px_rgba(148,27,12,0.35)] flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p class="max-w-xl leading-snug">
            “Agradecemos su valioso compromiso con las prácticas sostenibles y el cuidado del medio ambiente para las futuras generaciones.”
          </p>
          <p class="text-[11px] text-white/90 sm:text-right">
            https://www.pasajesjm.cl
          </p>
        </footer>
      </main>
    </div>
  </div>
</body>
</html>`;
}
