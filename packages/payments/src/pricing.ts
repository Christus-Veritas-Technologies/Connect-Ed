import type { PlanType, PlanAmounts, CurrencyCode } from "./types.js";

/** USD pricing (default) - monthly recurring */
export const PRICING_USD: Record<PlanType, PlanAmounts> = {
  LITE:       { perTermCost: 240, monthlyEstimate: 40,  annualPrice: 480,  foundingAnnualPrice: 360,  firstMonthlyPrice: 34,  studentLimit: 300 },
  GROWTH:     { perTermCost: 225, monthlyEstimate: 75,  annualPrice: 900,  foundingAnnualPrice: 675,  firstMonthlyPrice: 64,  studentLimit: 800 },
  ENTERPRISE: { perTermCost: 360, monthlyEstimate: 120, annualPrice: 1440, foundingAnnualPrice: 1080, firstMonthlyPrice: 102, studentLimit: 0 },
};

/** ZAR pricing (~20x conversion factor) - monthly recurring */
export const PRICING_ZAR: Record<PlanType, PlanAmounts> = {
  LITE:       { perTermCost: 2400, monthlyEstimate: 800,  annualPrice: 9600,  foundingAnnualPrice: 7200,  firstMonthlyPrice: 680,  studentLimit: 300 },
  GROWTH:     { perTermCost: 4500, monthlyEstimate: 1500, annualPrice: 18000, foundingAnnualPrice: 13500, firstMonthlyPrice: 1275, studentLimit: 800 },
  ENTERPRISE: { perTermCost: 7200, monthlyEstimate: 2400, annualPrice: 28800, foundingAnnualPrice: 21600, firstMonthlyPrice: 2040, studentLimit: 0 },
};

/** ZiG pricing (~13.5x conversion factor) - monthly recurring */
export const PRICING_ZIG: Record<PlanType, PlanAmounts> = {
  LITE:       { perTermCost: 1620, monthlyEstimate: 540,  annualPrice: 6480,  foundingAnnualPrice: 4860,  firstMonthlyPrice: 459,  studentLimit: 300 },
  GROWTH:     { perTermCost: 3037, monthlyEstimate: 1012, annualPrice: 12150, foundingAnnualPrice: 9112,  firstMonthlyPrice: 860,  studentLimit: 800 },
  ENTERPRISE: { perTermCost: 4860, monthlyEstimate: 1620, annualPrice: 19440, foundingAnnualPrice: 14580, firstMonthlyPrice: 1377, studentLimit: 0 },
};

/** Get numeric pricing for a plan + currency */
export function getPlanAmounts(plan: PlanType, currency: CurrencyCode = "USD"): PlanAmounts {
  if (currency === "ZAR") return PRICING_ZAR[plan];
  if (currency === "ZIG") return PRICING_ZIG[plan];
  return PRICING_USD[plan];
}

/** Calculate the total due at signup (first month payment) */
export function calculateSignupTotal(plan: PlanType, currency: CurrencyCode = "USD"): number {
  const amounts = getPlanAmounts(plan, currency);
  return amounts.monthlyEstimate;
}

/** Calculate the recurring monthly payment */
export function calculateMonthlyPayment(plan: PlanType, currency: CurrencyCode = "USD"): number {
  return getPlanAmounts(plan, currency).monthlyEstimate;
}
