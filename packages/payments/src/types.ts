/** Supported currency codes */
export type CurrencyCode = "USD" | "ZAR" | "ZIG";

/** Supported plan types */
export type PlanType = "LITE" | "GROWTH" | "ENTERPRISE";

/** Numeric pricing for a single plan */
export interface PlanAmounts {
  perTermCost: number;
  monthlyEstimate: number;
  annualPrice: number;        // Standard annual (12 × monthly)
  foundingAnnualPrice: number; // 25% off annual (first payment only)
  firstMonthlyPrice: number;   // 15% off monthly (first payment only)
  studentLimit: number;       // Max students (0 = custom/unlimited)
}

/** Result from a PayNow checkout */
export interface PaynowCheckoutResult {
  success: true;
  redirectUrl: string;
  pollUrl: string;
}

/** Result from a DodoPayments payment link */
export interface DodoPaymentLinkResult {
  paymentLink: string;
  paymentId: string;
}
