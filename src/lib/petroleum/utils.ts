import {
  PetroleumRowRaw,
  PetroleumReading,
  PetroleumPeriodAggregate,
  PetroleumCarbonImpact,
  PetroleumDashboardMetrics,
  PetroleumRecommendationsSummary,
  PetroleumSavingRecommendation,
  PetroleumCompanyAggregate,
  MitigationMeasure,
  MitigationAnalysis,
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

// --- Agregados por empresa ---

export function aggregatePetroleumByCompany(
  readings: PetroleumReading[],
  factorKgCO2ePerLiter: number,
): PetroleumCompanyAggregate[] {
  const map = new Map<string, PetroleumCompanyAggregate>();
  const periodsByCompany = new Map<string, Set<string>>();

  readings.forEach((r) => {
    // Normalizar nombre de empresa
    const companyRaw = r.company.trim();
    const companyKey = normalizeCompanyName(companyRaw);
    
    if (!companyKey) return;

    const existing = map.get(companyKey);
    const emissions = r.liters * factorKgCO2ePerLiter;

    if (!existing) {
      map.set(companyKey, {
        company: companyKey,
        totalLiters: r.liters,
        totalCost: r.totalCost,
        totalEmissionsKgCO2e: emissions,
        periodCount: 1,
      });
      periodsByCompany.set(companyKey, new Set([r.periodKey]));
    } else {
      existing.totalLiters += r.liters;
      existing.totalCost += r.totalCost;
      existing.totalEmissionsKgCO2e += emissions;
      periodsByCompany.get(companyKey)?.add(r.periodKey);
    }
  });

  // Actualizar periodCount
  map.forEach((agg, key) => {
    agg.periodCount = periodsByCompany.get(key)?.size ?? 1;
  });

  return Array.from(map.values()).sort((a, b) => b.totalLiters - a.totalLiters);
}

// Normaliza nombres de empresa a las 3 principales
function normalizeCompanyName(raw: string): string {
  const lower = raw.toLowerCase();
  
  if (lower.includes('buses jm') || lower.includes('bus jm') || lower.includes('busesjm')) {
    return 'Buses JM';
  }
  if (lower.includes('consorcio') || lower.includes('nuevo norte') || lower.includes('nuev')) {
    return 'Consorcio Nuevo Norte';
  }
  if (lower.includes('minardi') || lower.includes('servicios industriales')) {
    return 'Servicios Industriales Minardi';
  }
  
  // Si no coincide con ninguna, usar el nombre original limpio
  return raw || 'Sin empresa';
}

// --- Medidas de mitigación con análisis de inversión ---

// Precios de referencia (CLP)
const DIESEL_PRICE_PER_LITER = 950; // Precio promedio diésel CLP/L
const ELECTRIC_BUS_COST = 350_000_000; // Costo bus eléctrico (CLP)
const DIESEL_BUS_ANNUAL_FUEL = 25_000; // Litros anuales promedio por bus diésel
const ELECTRIC_BUS_ANNUAL_ENERGY_COST = 4_500_000; // Costo energía anual bus eléctrico (CLP)
const HYBRID_BUS_COST = 180_000_000; // Costo bus híbrido
const HYBRID_FUEL_REDUCTION = 0.35; // 35% reducción consumo

export function buildMitigationAnalysis(
  companyAggregates: PetroleumCompanyAggregate[],
  factorKgCO2ePerLiter: number,
): MitigationAnalysis[] {
  return companyAggregates.map((company) => {
    // Estimar consumo anual (si tenemos menos de 12 meses, proyectar)
    const monthsOfData = Math.max(1, company.periodCount);
    const annualMultiplier = 12 / monthsOfData;
    
    const currentAnnualLiters = company.totalLiters * annualMultiplier;
    const currentAnnualCost = company.totalCost * annualMultiplier;
    const currentAnnualEmissionsKgCO2e = company.totalEmissionsKgCO2e * annualMultiplier;

    // Estimar cantidad de buses basado en consumo
    const estimatedBuses = Math.max(1, Math.round(currentAnnualLiters / DIESEL_BUS_ANNUAL_FUEL));

    const measures: MitigationMeasure[] = [];

    // Medida 1: Buses eléctricos (reemplazo gradual - 20% de flota)
    const electricBusCount = Math.max(1, Math.round(estimatedBuses * 0.2));
    const electricFuelSavings = electricBusCount * DIESEL_BUS_ANNUAL_FUEL;
    const electricCostSavings = electricFuelSavings * DIESEL_PRICE_PER_LITER - (electricBusCount * ELECTRIC_BUS_ANNUAL_ENERGY_COST);
    const electricEmissionsSavings = electricFuelSavings * factorKgCO2ePerLiter;
    const electricInvestment = electricBusCount * ELECTRIC_BUS_COST;
    const electricPayback = electricCostSavings > 0 ? electricInvestment / electricCostSavings : 99;
    const electricROI = electricCostSavings > 0 ? ((electricCostSavings * 10 - electricInvestment) / electricInvestment) * 100 : 0;

    measures.push({
      id: `${company.company}-electric`,
      type: 'electric_bus',
      title: `Buses Eléctricos (${electricBusCount} unidades)`,
      description: `Reemplazar ${electricBusCount} buses diésel por eléctricos. Elimina completamente el consumo de combustible fósil en estas unidades.`,
      company: company.company,
      investmentCLP: electricInvestment,
      annualFuelSavingsLiters: electricFuelSavings,
      annualCostSavingsCLP: Math.max(0, electricCostSavings),
      annualEmissionsSavingsKgCO2e: electricEmissionsSavings,
      paybackYears: Math.min(99, Math.max(0, electricPayback)),
      roiPercent: Math.max(0, electricROI),
      additionalBenefits: [
        'Cero emisiones directas',
        'Menor costo de mantenimiento',
        'Incentivos tributarios disponibles',
        'Mejora imagen corporativa',
      ],
    });

    // Medida 2: Buses híbridos (30% de flota)
    const hybridBusCount = Math.max(1, Math.round(estimatedBuses * 0.3));
    const hybridFuelSavings = hybridBusCount * DIESEL_BUS_ANNUAL_FUEL * HYBRID_FUEL_REDUCTION;
    const hybridCostSavings = hybridFuelSavings * DIESEL_PRICE_PER_LITER;
    const hybridEmissionsSavings = hybridFuelSavings * factorKgCO2ePerLiter;
    const hybridInvestment = hybridBusCount * HYBRID_BUS_COST;
    const hybridPayback = hybridCostSavings > 0 ? hybridInvestment / hybridCostSavings : 99;
    const hybridROI = hybridCostSavings > 0 ? ((hybridCostSavings * 10 - hybridInvestment) / hybridInvestment) * 100 : 0;

    measures.push({
      id: `${company.company}-hybrid`,
      type: 'hybrid_bus',
      title: `Buses Híbridos (${hybridBusCount} unidades)`,
      description: `Incorporar ${hybridBusCount} buses híbridos que reducen el consumo de combustible en un 35%.`,
      company: company.company,
      investmentCLP: hybridInvestment,
      annualFuelSavingsLiters: hybridFuelSavings,
      annualCostSavingsCLP: hybridCostSavings,
      annualEmissionsSavingsKgCO2e: hybridEmissionsSavings,
      paybackYears: Math.min(99, Math.max(0, hybridPayback)),
      roiPercent: Math.max(0, hybridROI),
      additionalBenefits: [
        'Menor inversión inicial que eléctricos',
        'No requiere infraestructura de carga',
        'Reducción inmediata de emisiones',
      ],
    });

    // Medida 3: Optimización de rutas (sin inversión mayor)
    const routeOptimizationSavings = currentAnnualLiters * 0.08; // 8% ahorro
    const routeCostSavings = routeOptimizationSavings * DIESEL_PRICE_PER_LITER;
    const routeEmissionsSavings = routeOptimizationSavings * factorKgCO2ePerLiter;
    const routeInvestment = 15_000_000; // Software + capacitación

    measures.push({
      id: `${company.company}-routes`,
      type: 'route_optimization',
      title: 'Optimización de Rutas',
      description: 'Implementar software de optimización de rutas y capacitar conductores en conducción eficiente.',
      company: company.company,
      investmentCLP: routeInvestment,
      annualFuelSavingsLiters: routeOptimizationSavings,
      annualCostSavingsCLP: routeCostSavings,
      annualEmissionsSavingsKgCO2e: routeEmissionsSavings,
      paybackYears: routeCostSavings > 0 ? routeInvestment / routeCostSavings : 99,
      roiPercent: routeCostSavings > 0 ? ((routeCostSavings * 5 - routeInvestment) / routeInvestment) * 100 : 0,
      additionalBenefits: [
        'Implementación rápida',
        'Bajo riesgo',
        'Mejora tiempos de servicio',
      ],
    });

    // Medida 4: Mantenimiento preventivo mejorado
    const maintenanceSavings = currentAnnualLiters * 0.05; // 5% ahorro
    const maintenanceCostSavings = maintenanceSavings * DIESEL_PRICE_PER_LITER;
    const maintenanceEmissionsSavings = maintenanceSavings * factorKgCO2ePerLiter;
    const maintenanceInvestment = 8_000_000; // Programa de mantenimiento

    measures.push({
      id: `${company.company}-maintenance`,
      type: 'fleet_maintenance',
      title: 'Programa de Mantenimiento Preventivo',
      description: 'Implementar programa de mantenimiento preventivo con monitoreo de eficiencia de combustible.',
      company: company.company,
      investmentCLP: maintenanceInvestment,
      annualFuelSavingsLiters: maintenanceSavings,
      annualCostSavingsCLP: maintenanceCostSavings,
      annualEmissionsSavingsKgCO2e: maintenanceEmissionsSavings,
      paybackYears: maintenanceCostSavings > 0 ? maintenanceInvestment / maintenanceCostSavings : 99,
      roiPercent: maintenanceCostSavings > 0 ? ((maintenanceCostSavings * 5 - maintenanceInvestment) / maintenanceInvestment) * 100 : 0,
      additionalBenefits: [
        'Extiende vida útil de flota',
        'Reduce averías',
        'Mejora seguridad',
      ],
    });

    // Totales
    const totalPotentialSavingsLiters = measures.reduce((sum, m) => sum + m.annualFuelSavingsLiters, 0);
    const totalPotentialSavingsCLP = measures.reduce((sum, m) => sum + m.annualCostSavingsCLP, 0);
    const totalPotentialEmissionsReductionKgCO2e = measures.reduce((sum, m) => sum + m.annualEmissionsSavingsKgCO2e, 0);

    return {
      company: company.company,
      currentAnnualLiters,
      currentAnnualCost,
      currentAnnualEmissionsKgCO2e,
      measures,
      totalPotentialSavingsLiters,
      totalPotentialSavingsCLP,
      totalPotentialEmissionsReductionKgCO2e,
    };
  });
}
