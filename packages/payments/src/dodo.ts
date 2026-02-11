import DodoPayments from "dodopayments";
import type { DodoPaymentLinkResult } from "./types.js";

export interface DodoPaymentLinkParams {
  apiKey: string;
  productId: string;
  /** Payment amount in the currency's main unit (e.g. 8250 ZAR). Converted to cents internally. */
  amount: number;
  /** Customer email */
  email: string;
  /** Arbitrary metadata passed through to webhooks */
  metadata: Record<string, string>;
  /** Client-side redirect after payment */
  returnUrl: string;
  /** ISO 3166-1 alpha-2 billing country (default "ZA") */
  billingCountry?: string;
}

/**
 * Create a DodoPayments dynamic payment link.
 * Uses `payments.create` with `payment_link: true` and a single generic
 * product whose amount is overridden dynamically (pay-what-you-want).
 */
export async function createDodoPaymentLink(
  params: DodoPaymentLinkParams,
): Promise<DodoPaymentLinkResult> {
  const dodo = new DodoPayments({ bearerToken: params.apiKey });

  const payment = await dodo.payments.create({
    payment_link: true,
    product_cart: [
      {
        product_id: params.productId,
        quantity: 1,
        amount: params.amount * 100, // convert to smallest currency unit (cents)
      },
    ],
    billing: {
      country: (params.billingCountry || "ZA") as any,
    },
    customer: {
      email: params.email,
      name: params.email,
    },
    metadata: params.metadata,
    return_url: params.returnUrl,
  });

  if (!payment.payment_link) {
    throw new Error("DodoPayments did not return a payment link");
  }

  return {
    paymentLink: payment.payment_link,
    paymentId: payment.payment_id,
  };
}
