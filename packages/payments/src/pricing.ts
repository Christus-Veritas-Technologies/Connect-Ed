import type { PlanType, PlanAmounts, CurrencyCode } from "./types.js";

/** USD pricing (default) */
export const PRICING_USD: Record<PlanType, PlanAmounts> = {
  LITE: { signupFee: 400, perTermCost: 50, monthlyEstimate: 40 },
  GROWTH: { signupFee: 750, perTermCost: 90, monthlyEstimate: 75 },
  ENTERPRISE: { signupFee: 1200, perTermCost: 150, monthlyEstimate: 120 },
};

/** ZAR pricing (~20x conversion factor) */
export const PRICING_ZAR: Record<PlanType, PlanAmounts> = {
  LITE: { signupFee: 7500, perTermCost: 950, monthlyEstimate: 750 },
  GROWTH: { signupFee: 14000, perTermCost: 1700, monthlyEstimate: 1400 },
  ENTERPRISE: { signupFee: 22000, perTermCost: 2800, monthlyEstimate: 2200 },
};

/** ZiG pricing */
export const PRICING_ZIG: Record<PlanType, PlanAmounts> = {
  LITE: { signupFee: 5400, perTermCost: 675, monthlyEstimate: 540 },
  GROWTH: { signupFee: 10125, perTermCost: 1215, monthlyEstimate: 1012 },
  ENTERPRISE: { signupFee: 16200, perTermCost: 2025, monthlyEstimate: 1620 },
};

/** Get numeric pricing for a plan + currency */
export function getPlanAmounts(plan: PlanType, currency: CurrencyCode = "USD"): PlanAmounts {
  if (currency === "ZAR") return PRICING_ZAR[plan];
  if (currency === "ZIG") return PRICING_ZIG[plan];
  return PRICING_USD[plan];
}

/** Calculate the total due at signup (signup fee + first month) */
export function calculateSignupTotal(plan: PlanType, currency: CurrencyCode = "USD"): number {
  const amounts = getPlanAmounts(plan, currency);
  return amounts.signupFee + amounts.monthlyEstimate;
}

/** Calculate the recurring monthly payment */
export function calculateMonthlyPayment(plan: PlanType, currency: CurrencyCode = "USD"): number {
  return getPlanAmounts(plan, currency).monthlyEstimate;
}
