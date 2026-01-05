import React from "react";

// Static preview of the Water Monthly Report layout.
// Step 1: visual HTML/Tailwind design only, no live data wiring yet.

export default function WaterReportPreview() {
  // For now we use simple mock values so the layout is easy to review.
  const periodLabel = "Ene 2025";
  const month = "Enero";
  const year = "2025";

  const totalM3 = 1234;
  const totalCost = 4567890;
  const variation = -8.5;

  const kwhSaved = 3200;
  const litersSaved = 98765;
  const co2Kg = 540.3;

  return (
    <div className="min-h-screen bg-[#f6f7f9] py-6 px-4 sm:px-8">
      <div className="mx-auto w-full max-w-5xl rounded-2xl bg-white shadow-[0_18px_45px_rgba(15,23,42,0.12)] overflow-hidden">
        {/* HEADER */}
        <section className="relative flex flex-col justify-between gap-6 bg-gradient-to-br from-[#8f2520] to-[#b7322c] px-8 py-7 text-white md:flex-row">
          <div className="max-w-xl">
            <h1 className="text-3xl font-bold leading-tight tracking-tight">
              Reporte Mensual
            </h1>
            <p className="mt-3 text-sm sm:text-base text-white/90">
              <span className="font-semibold">Buses JM · Gestión Medioambiental</span>
              <br />
              Control de Agua, Energía y Huella de Carbono para decisiones preventivas.
            </p>
          </div>

          <div className="flex flex-col items-end gap-4">
            <div className="rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-500 px-5 py-3 text-center shadow-[0_12px_26px_rgba(16,185,129,0.45)] min-w-[160px]">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">
                Período
              </div>
              <div className="mt-1 text-sm font-semibold tracking-wide">
                {month}
              </div>
              <div className="text-2xl font-bold leading-none">{year}</div>
            </div>

            <div className="flex items-center gap-3 text-xs text-white/90">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/25 bg-white/10">
                <img
                  src="/images/logo.png"
                  alt="Buses JM"
                  className="h-7 w-7 object-contain"
                />
              </div>
              <div className="text-right">
                <div className="font-semibold">Buses JM</div>
                <div className="text-[11px]">Reporte generado (vista previa)</div>
              </div>
            </div>
          </div>
        </section>

        {/* CONTENT */}
        <main className="relative bg-[#f8fafc] px-5 py-5 sm:px-7 sm:py-7">
          <div className="absolute inset-0 pointer-events-none opacity-[0.06] flex items-center justify-center">
            <img
              src="/images/logo.png"
              alt="Watermark JM"
              className="max-w-[70%] object-contain"
            />
          </div>

          <div className="relative grid gap-4 md:grid-cols-[1.15fr,0.85fr]">
            {/* CARD 1: Resumen Agua */}
            <section className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-semibold text-[#b7322c]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-lg">
                    💧
                  </span>
                  <span>Resumen de Agua (Histórico)</span>
                </div>
                <div className="text-xs font-semibold text-slate-500">
                  Período: <span className="font-medium text-slate-700">{periodLabel}</span>
                </div>
              </div>

              <p className="text-[13px] text-slate-600">
                Consumo consolidado y evolución mensual. Fuente: sistema JM.
              </p>

              <div className="mt-3 flex h-40 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-500">
                Gráfico histórico (img/base64) – vista previa estática
              </div>

              <p className="mt-3 text-[13px] text-slate-700">
                <span className="font-semibold">Consumo total:</span> {totalM3.toLocaleString("es-CL")} m³ ·{" "}
                <span className="font-semibold">Costo total:</span> ${totalCost.toLocaleString("es-CL")} ·{" "}
                <span className="font-semibold">Variación:</span> {variation.toFixed(1)}%
              </p>
            </section>

            {/* CARD 2: Comparación año anterior (placeholder) */}
            <section className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-lg">
                    📊
                  </span>
                  <span>Comparación año anterior</span>
                </div>
              </div>

              <p className="text-[13px] text-slate-600">
                Comparación del período actual versus el mismo período del año anterior.
              </p>

              <div className="mt-3 flex flex-1 items-center justify-center">
                <div className="relative flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-tr from-[#b7322c] to-[#e11d48] shadow-[0_12px_30px_rgba(190,24,93,0.35)]">
                  <div className="absolute h-24 w-24 rounded-full border border-slate-200 bg-white" />
                  <div className="relative z-10 text-center">
                    <div className="text-3xl font-bold text-[#b7322c]">92%</div>
                    <div className="mt-1 text-[11px] text-slate-500">donut_value (preview)</div>
                  </div>
                </div>
              </div>

              <p className="mt-3 text-[12px] text-slate-500">
                *El porcentaje representa la relación entre el consumo actual y el mismo período del año anterior (ejemplo de vista previa).
              </p>
            </section>
          </div>

          {/* ECOEQUIVALENCIA */}
          <section className="relative mt-5 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-base">
                  🌱
                </span>
                <span>Ecoequivalencia · Impacto Ambiental</span>
              </div>
              <p className="text-[12px] text-slate-500">
                Beneficios ambientales estimados del período {periodLabel}.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <article className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_22px_rgba(15,23,42,0.05)]">
                <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-lg">
                  💧
                </div>
                <div className="text-[12px] font-semibold text-slate-600">Ahorra agua</div>
                <div className="mt-1 text-2xl font-bold text-[#b7322c]">
                  {litersSaved.toLocaleString("es-CL")} <span className="text-sm font-semibold">L</span>
                </div>
                <div className="mt-1 text-[11px] text-slate-500">Litros de agua estimados</div>
              </article>

              <article className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_22px_rgba(15,23,42,0.05)]">
                <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-lg">
                  ⚡
                </div>
                <div className="text-[12px] font-semibold text-slate-600">Ahorra energía</div>
                <div className="mt-1 text-2xl font-bold text-[#b7322c]">
                  {kwhSaved.toLocaleString("es-CL")} <span className="text-sm font-semibold">kWh</span>
                </div>
                <div className="mt-1 text-[11px] text-slate-500">kWh electricidad</div>
              </article>

              <article className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_22px_rgba(15,23,42,0.05)]">
                <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-lg">
                  🌍
                </div>
                <div className="text-[12px] font-semibold text-slate-600">Evita emisiones</div>
                <div className="mt-1 text-2xl font-bold text-[#b7322c]">
                  {co2Kg.toFixed(1)} <span className="text-sm font-semibold">kg CO₂e</span>
                </div>
                <div className="mt-1 text-[11px] text-slate-500">Emisiones evitadas</div>
              </article>
            </div>
          </section>

          {/* FOOTER */}
          <footer className="mt-5 rounded-2xl bg-gradient-to-r from-[#8f2520] to-[#b7322c] px-4 py-3 text-xs text-white shadow-[0_12px_30px_rgba(148,27,12,0.35)] flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl leading-snug">
              “Agradecemos su valioso compromiso con las prácticas sostenibles y el cuidado del medio ambiente para las futuras generaciones.”
            </p>
            <p className="text-[11px] text-white/90 sm:text-right">
              https://www.pasajesjm.cl
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
