import {
  PetroleumRowRaw,
  PetroleumReading,
  PetroleumPeriodAggregate,
  PetroleumCarbonImpact,
  PetroleumDashboardMetrics,
  PetroleumRecommendationsSummary,
  PetroleumSavingRecommendation,
} from './types';

// --- Helpers internos ---

// Parse fecha desde Excel serial o string a 'YYYY-MM-DD'
function parseDateValue(raw: unknown): string | null {
  if (typeof raw === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + raw * 24 * 60 * 60 * 1000);
    return date.toISOString().split('T')[0];
  }

  const str = String(raw || '').trim();
  if (!str) return null;

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return null;
}

// Deriva periodKey 'YYYY-MM' a partir de una fecha (ISO o dd/mm/yyyy)
export function derivePeriodKeyFromDate(raw: string | null): string | null {
  if (!raw) return null;

  // Si ya viene en ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month] = raw.split('-');
    return `${year}-${month}`;
  }

  const parts = raw.split(/[/\-\.]/);
  if (parts.length >= 3) {
    let day = parts[0];
    let month = parts[1];
    let year = parts[2];

    if (year.length === 2) {
      const numYear = parseInt(year, 10);
      year = numYear < 50 ? `20${year}` : `19${year}`;
    }

    if (year.length === 4) {
      month = month.padStart(2, '0');
      return `${year}-${month}`;
    }
  }

  // Fallback: intentar parsear como Date
  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  return null;
}

// Devuelve un label legible para el período
export function formatPeriodLabel(periodKey: string): string {
  const [year, month] = periodKey.split('-');
  const monthNames: Record<string, string> = {
    '01': 'Enero',
    '02': 'Febrero',
    '03': 'Marzo',
    '04': 'Abril',
    '05': 'Mayo',
    '06': 'Junio',
    '07': 'Julio',
    '08': 'Agosto',
    '09': 'Septiembre',
    '10': 'Octubre',
    '11': 'Noviembre',
    '12': 'Diciembre',
  };

  const monthLabel = monthNames[month] ?? month;
  return `${monthLabel} ${year}`;
}

// Parsea moneda chilena tipo "$ 13.913.483" a number
function parseChileanCurrencyGeneric(value: unknown): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;

  const str = String(value).trim();
  const cleaned = str.replace(/[$\s]/g, '').replace(/\./g, '').replace(/,/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

// Parsea cantidad de litros con miles y coma decimal
function parseQuantityGeneric(value: unknown): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;

  const str = String(value).trim();
  const cleaned = str.replace(/\./g, '').replace(/,/g, '.').replace(/\s/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// --- Mapeo desde la fila cruda ---

export function mapRowToPetroleumReading(row: PetroleumRowRaw): PetroleumReading {
  const dateEmission = parseDateValue(row.fechaEmision);
  const datePayment = parseDateValue(row.fechaPago);

  const periodKey =
    derivePeriodKeyFromDate(dateEmission) ||
    derivePeriodKeyFromDate(datePayment) ||
    '1970-01';

  const periodLabel = formatPeriodLabel(periodKey);

  const center = String(row.centroTrabajo ?? '').trim();
  const company = String(row.razonSocial ?? '').trim();
  const supplier = String(row.proveedor ?? '').trim();
  const miningUseRaw = String(row.consumoEnFaenaMinera ?? '').trim();

  const liters = parseQuantityGeneric(row.litros);
  const totalCost = parseChileanCurrencyGeneric(row.costoTotal);

  const isMiningUse =
    miningUseRaw !== '' && miningUseRaw.toUpperCase() !== 'N/A' && miningUseRaw.toUpperCase() !== 'NA';

  return {
    id: `${dateEmission ?? 'na'}-${center}-${supplier}-${liters}-${totalCost}`,
    periodKey,
    periodLabel,
    dateEmission,
    datePayment,
    center,
    company,
    supplier,
    liters,
    unit: 'L',
    totalCost,
    miningUseRaw,
    isMiningUse,
  };
}

// --- Agregados y métricas ---

export function aggregatePetroleumByPeriod(
  readings: PetroleumReading[],
  factorKgCO2ePerLiter: number,
): PetroleumPeriodAggregate[] {
  const map = new Map<string, PetroleumPeriodAggregate>();

  readings.forEach((r) => {
    const key = r.periodKey;
    const existing = map.get(key);
    const emissions = r.liters * factorKgCO2ePerLiter;

    if (!existing) {
      map.set(key, {
        periodKey: key,
        periodLabel: r.periodLabel,
        totalLiters: r.liters,
        totalCost: r.totalCost,
        totalEmissionsKgCO2e: emissions,
      });
    } else {
      existing.totalLiters += r.liters;
      existing.totalCost += r.totalCost;
      existing.totalEmissionsKgCO2e += emissions;
    }
  });

  return Array.from(map.values()).sort((a, b) => a.periodKey.localeCompare(b.periodKey));
}

export function calculatePetroleumImpact(
  readings: PetroleumReading[],
  factorKgCO2ePerLiter: number,
): PetroleumCarbonImpact {
  const totalLiters = readings.reduce((sum, r) => sum + r.liters, 0);
  const totalEmissionsKgCO2e = Math.max(0, totalLiters) * Math.max(0, factorKgCO2ePerLiter);

  return {
    totalEmissionsKgCO2e,
    totalEmissionsTonsCO2e: totalEmissionsKgCO2e / 1000,
  };
}

export function calculatePetroleumDashboardMetrics(
  readings: PetroleumReading[],
  factorKgCO2ePerLiter: number,
): PetroleumDashboardMetrics {
  const totalLiters = readings.reduce((sum, r) => sum + r.liters, 0);
  const totalCost = readings.reduce((sum, r) => sum + r.totalCost, 0);
  const impact = calculatePetroleumImpact(readings, factorKgCO2ePerLiter);

  return {
    totalLiters,
    totalCost,
    totalEmissionsKgCO2e: impact.totalEmissionsKgCO2e,
  };
}

// --- Recomendaciones básicas de ahorro ---

export function buildPetroleumRecommendations(
  aggregates: PetroleumPeriodAggregate[],
  topN = 3,
): PetroleumRecommendationsSummary {
  // Tomamos los períodos con más litros como "top consumers"
  const sorted = [...aggregates].sort((a, b) => b.totalLiters - a.totalLiters);
  const topConsumers = sorted.slice(0, topN);

  const recommendations: PetroleumSavingRecommendation[] = topConsumers.map((agg) => {
    const potentialSavingVolume = agg.totalLiters * 0.1; // 10% como objetivo genérico
    const potentialSavingEmissionsKgCO2e = agg.totalEmissionsKgCO2e * 0.1;

    const message = `En el período ${agg.periodLabel} el consumo de petróleo es alto. ` +
      'Estudia oportunidades como optimizar rutas, mejorar mantenimiento de flota y evaluar alternativas de menor intensidad en carbono para reducir al menos un 10% el consumo.';

    return {
      center: agg.periodLabel,
      message,
      potentialSavingVolume,
      potentialSavingEmissionsKgCO2e,
    };
  });

  return {
    topConsumers,
    recommendations,
  };
}
