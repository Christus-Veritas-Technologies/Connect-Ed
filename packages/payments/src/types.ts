/** Supported currency codes */
export type CurrencyCode = "USD" | "ZAR" | "ZIG";

/** Supported plan types */
export type PlanType = "LITE" | "GROWTH" | "ENTERPRISE";

/** Numeric pricing for a single plan */
export interface PlanAmounts {
  signupFee: number;
  perTermCost: number;
  monthlyEstimate: number;
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
