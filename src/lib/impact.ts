const WATER_SAVINGS_RATE = 0.08;
const KWH_PER_M3 = 0.4;
const KG_CO2_PER_KWH = 0.45;

export interface ImpactMetrics {
  litersSaved: number;
  energySavedKwh: number;
  emissionsAvoidedKg: number;
}

export const calculateImpactFromM3 = (m3: number): ImpactMetrics => {
  const liters = Math.max(0, m3) * 1000;
  const litersSaved = liters * WATER_SAVINGS_RATE;
  const energySavedKwh = Math.max(0, m3) * KWH_PER_M3 * WATER_SAVINGS_RATE;
  const emissionsAvoidedKg = energySavedKwh * KG_CO2_PER_KWH;
  return { litersSaved, energySavedKwh, emissionsAvoidedKg };
};

export const calculateImpactFromLiters = (liters: number): ImpactMetrics => {
  const safeLiters = Math.max(0, liters);
  const litersSaved = safeLiters * WATER_SAVINGS_RATE;
  const energySavedKwh = (safeLiters / 1000) * KWH_PER_M3 * WATER_SAVINGS_RATE;
  const emissionsAvoidedKg = energySavedKwh * KG_CO2_PER_KWH;
  return { litersSaved, energySavedKwh, emissionsAvoidedKg };
};
