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
  const cleanApiKey = params.apiKey.trim().replace(/^["']|["']$/g, '');
  
  // Determine environment: test keys start with test_, production keys don't
  const isTestMode = cleanApiKey.includes('test') || cleanApiKey.startsWith('BlxVNSQUmaq') === false;
  
  console.log("DodoPayments Test Mode Debug:", {
    apiKeyLength: cleanApiKey.length,
    apiKeyStart: cleanApiKey.substring(0, 30),
    isTestKey: isTestMode,
    environment: isTestMode ? 'test_mode' : 'live_mode',
  });

  // Initialize with API key as bearer token and correct environment
  const dodo = new DodoPayments({ 
    bearerToken: cleanApiKey,
    environment: process.env.NODE_ENV === 'production' ? 'live_mode' : 'test_mode',
  });

  try {
    console.log("Creating checkout session with:", {
      productCount: params.productIds.length,
      products: params.productIds,
      email: params.email,
      returnUrl: params.returnUrl,
    });

    const checkoutSession = await dodo.checkoutSessions.create({
      product_cart: params.productIds.map((product_id) => ({
        product_id,
        quantity: 1,
      })),
      customer: {
        email: params.email,
        name: params.email,
      },
      metadata: params.metadata,
      return_url: params.returnUrl,
    });

    console.log("Checkout session created successfully:", {
      hasCheckoutUrl: !!checkoutSession.checkout_url,
      hasSessionId: !!checkoutSession.session_id,
      checkoutUrl: checkoutSession.checkout_url?.substring(0, 50),
    });

    if (!checkoutSession.checkout_url) {
      throw new Error("DodoPayments did not return a checkout_url");
    }

    return {
      paymentLink: checkoutSession.checkout_url,
      paymentId: checkoutSession.session_id,
    };
  } catch (error) {
    console.error("DodoPayments API Error in Test Mode:", {
      message: error instanceof Error ? error.message : String(error),
      status: (error as any)?.status,
      statusCode: (error as any)?.statusCode,
      response: (error as any)?.response,
    });
    throw error;
  }
}
