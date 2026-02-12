import type { PlanType, PlanAmounts, CurrencyCode } from "./types.js";

/** USD pricing (default) - monthly recurring */
export const PRICING_USD: Record<PlanType, PlanAmounts> = {
  LITE: { signupFee: 400, perTermCost: 240, monthlyEstimate: 40 },
  GROWTH: { signupFee: 750, perTermCost: 225, monthlyEstimate: 75 },
  ENTERPRISE: { signupFee: 1200, perTermCost: 360, monthlyEstimate: 120 },
};

/** ZAR pricing (~20x conversion factor) - monthly recurring */
export const PRICING_ZAR: Record<PlanType, PlanAmounts> = {
  LITE: { signupFee: 4000, perTermCost: 2400, monthlyEstimate: 800 },
  GROWTH: { signupFee: 15000, perTermCost: 4500, monthlyEstimate: 1500 },
  ENTERPRISE: { signupFee: 24000, perTermCost: 7200, monthlyEstimate: 2400 },
};

/** ZiG pricing (~13.5x conversion factor) - monthly recurring */
export const PRICING_ZIG: Record<PlanType, PlanAmounts> = {
  LITE: { signupFee: 2700, perTermCost: 1620, monthlyEstimate: 540 },
  GROWTH: { signupFee: 10125, perTermCost: 3037, monthlyEstimate: 1012 },
  ENTERPRISE: { signupFee: 16200, perTermCost: 4860, monthlyEstimate: 1620 },
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
