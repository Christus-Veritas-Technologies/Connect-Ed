import { Paynow } from "paynow";
import type { PaynowCheckoutResult } from "./types.js";

export interface PaynowCheckoutParams {
  integrationId: string;
  integrationKey: string;
  /** Payment amount in the currency's main unit (e.g. 440 = $440 USD) */
  amount: number;
  /** Plan name used as the line-item label (e.g. "LITE") */
  planType: string;
  /** Customer email */
  email: string;
  /** Unique reference (e.g. "Invoice-<id>") */
  reference: string;
  /** Server-side callback URL for PayNow to post results */
  resultUrl: string;
  /** Client-side redirect after payment */
  returnUrl: string;
}

/**
 * Create a PayNow checkout and return the redirect URL + poll URL.
 * Throws on PayNow API errors.
 */
export async function createPaynowCheckout(
  params: PaynowCheckoutParams,
): Promise<PaynowCheckoutResult> {
  const paynow = new Paynow(params.integrationId, params.integrationKey);
  paynow.resultUrl = params.resultUrl;
  paynow.returnUrl = params.returnUrl;

  const payment = paynow.createPayment(params.reference, params.email);
  payment.add(params.planType, params.amount);

  const response = await paynow.send(payment);

  if (!response.success) {
    throw new Error(response.error || "PayNow payment failed");
  }

  return {
    success: true,
    redirectUrl: response.redirectUrl,
    pollUrl: response.pollUrl,
  };
}
