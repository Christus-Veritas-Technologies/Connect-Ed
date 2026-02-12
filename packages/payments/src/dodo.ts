import DodoPayments from "dodopayments";
import type { DodoPaymentLinkResult } from "./types.js";

export interface DodoPaymentLinkParams {
  apiKey: string;
  /** Array of DodoPayments product IDs to add to cart */
  productIds: string[];
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
 * Create a DodoPayments payment link with one or more products.
 * Uses `payments.create` with `payment_link: true` and a product_cart.
 * Each product in the cart must be pre-configured with its price in the DodoPayments dashboard.
 */
export async function createDodoPaymentLink(
  params: DodoPaymentLinkParams,
): Promise<DodoPaymentLinkResult> {
  const dodo = new DodoPayments({ 
    bearerToken: params.apiKey
  });

  try {
    const checkoutSession = await dodo.checkoutSessions.create({
      product_cart: params.productIds.map((product_id) => ({
        product_id,
        quantity: 1,
      })),
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

    if (!checkoutSession.payment_link) {
      throw new Error("DodoPayments did not return a payment link");
    }

    return {
      paymentLink: checkoutSession.payment_link,
      paymentId: checkoutSession.payment_id,
    };
  } catch (error) {
    // Log more details about the error
    console.error("DodoPayments API Error:", {
      error,
      message: error instanceof Error ? error.message : String(error),
      apiKeyUsed: params.apiKey.substring(0, 10) + "..." + params.apiKey.substring(params.apiKey.length - 10),
    });
    throw error;
  }
}
