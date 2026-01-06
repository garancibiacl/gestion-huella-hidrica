export interface PetroleumRowRaw {
  fechaEmision: unknown;
  fechaPago: unknown;
  centroTrabajo: unknown;
  consumoEnFaenaMinera: unknown;
  razonSocial: unknown;
  litros: unknown;
  proveedor: unknown;
  costoTotal: unknown;
}

export type PetroleumUnit = 'L';

export interface PetroleumReading {
  id: string;
  periodKey: string; // e.g. '2025-01'
  periodLabel: string; // e.g. 'Enero 2025'
  dateEmission: string | null; // ISO yyyy-mm-dd or null
  datePayment: string | null;
  center: string;
  company: string;
  supplier: string;
  liters: number;
  unit: PetroleumUnit;
  totalCost: number;
  miningUseRaw: string;
  isMiningUse: boolean;
}

export interface PetroleumPeriodAggregate {
  periodKey: string;
  periodLabel: string;
  totalLiters: number;
  totalCost: number;
  totalEmissionsKgCO2e: number;
}

export interface PetroleumCarbonImpact {
  totalEmissionsKgCO2e: number;
  totalEmissionsTonsCO2e: number;
}

export interface PetroleumDashboardMetrics {
  totalLiters: number;
  totalCost: number;
  totalEmissionsKgCO2e: number;
}

export interface PetroleumSavingRecommendation {
  center: string;
  message: string;
  potentialSavingVolume?: number;
  potentialSavingEmissionsKgCO2e?: number;
}

export interface PetroleumRecommendationsSummary {
  topConsumers: PetroleumPeriodAggregate[];
  recommendations: PetroleumSavingRecommendation[];
}

// --- Agregados por empresa ---

export interface PetroleumCompanyAggregate {
  company: string;
  totalLiters: number;
  totalCost: number;
  totalEmissionsKgCO2e: number;
  periodCount: number;
}

// --- Medidas de mitigación con análisis de inversión ---

export type MitigationType = 'electric_bus' | 'hybrid_bus' | 'route_optimization' | 'fleet_maintenance';

export interface MitigationMeasure {
  id: string;
  type: MitigationType;
  title: string;
  description: string;
  company: string;
  // Inversión
  investmentCLP: number;
  // Ahorros anuales estimados
  annualFuelSavingsLiters: number;
  annualCostSavingsCLP: number;
  annualEmissionsSavingsKgCO2e: number;
  // Retorno
  paybackYears: number;
  roiPercent: number;
  // Beneficios adicionales
  additionalBenefits: string[];
}

export interface MitigationAnalysis {
  company: string;
  currentAnnualLiters: number;
  currentAnnualCost: number;
  currentAnnualEmissionsKgCO2e: number;
  measures: MitigationMeasure[];
  totalPotentialSavingsLiters: number;
  totalPotentialSavingsCLP: number;
  totalPotentialEmissionsReductionKgCO2e: number;
}
