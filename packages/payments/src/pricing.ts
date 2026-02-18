import type { PlanType, PlanAmounts, CurrencyCode } from "./types.js";

/** USD pricing (default) - monthly recurring */
export const PRICING_USD: Record<PlanType, PlanAmounts> = {
  LITE: { perTermCost: 240, monthlyEstimate: 40 },
  GROWTH: { perTermCost: 225, monthlyEstimate: 75 },
  ENTERPRISE: { perTermCost: 360, monthlyEstimate: 120 },
};

/** ZAR pricing (~20x conversion factor) - monthly recurring */
export const PRICING_ZAR: Record<PlanType, PlanAmounts> = {
  LITE: { perTermCost: 2400, monthlyEstimate: 800 },
  GROWTH: { perTermCost: 4500, monthlyEstimate: 1500 },
  ENTERPRISE: { perTermCost: 7200, monthlyEstimate: 2400 },
};

/** ZiG pricing (~13.5x conversion factor) - monthly recurring */
export const PRICING_ZIG: Record<PlanType, PlanAmounts> = {
  LITE: { perTermCost: 1620, monthlyEstimate: 540 },
  GROWTH: { perTermCost: 3037, monthlyEstimate: 1012 },
  ENTERPRISE: { perTermCost: 4860, monthlyEstimate: 1620 },
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
