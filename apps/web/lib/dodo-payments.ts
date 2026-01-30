import DodoPayments from "dodopayments";

// Initialize Dodo Payments client
const dodopayments = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY,
});

export { dodopayments };

// Plan product IDs - Create these in your Dodo Payments dashboard
export const PLAN_PRODUCTS = {
  LITE: {
    productId: process.env.DODO_PRODUCT_LITE || "prod_lite",
    signupProductId: process.env.DODO_SIGNUP_LITE || "prod_lite_signup",
  },
  GROWTH: {
    productId: process.env.DODO_PRODUCT_GROWTH || "prod_growth",
    signupProductId: process.env.DODO_SIGNUP_GROWTH || "prod_growth_signup",
  },
  ENTERPRISE: {
    productId: process.env.DODO_PRODUCT_ENTERPRISE || "prod_enterprise",
    signupProductId: process.env.DODO_SIGNUP_ENTERPRISE || "prod_enterprise_signup",
  },
} as const;

// Types
export interface CreateCheckoutOptions {
  schoolId: string;
  userId: string;
  email: string;
  planType: "LITE" | "GROWTH" | "ENTERPRISE";
  isSignup: boolean;
  returnUrl: string;
}

export interface SubscriptionInfo {
  subscriptionId: string;
  status: string;
  currentPeriodEnd: Date;
  planType: string;
}

// Create a checkout session for subscription
export async function createSubscriptionCheckout(options: CreateCheckoutOptions) {
  const { schoolId, userId, email, planType, isSignup, returnUrl } = options;
  
  const planConfig = PLAN_PRODUCTS[planType];
  const productId = isSignup ? planConfig.signupProductId : planConfig.productId;

  try {
    const session = await dodopayments.checkoutSessions.create({
      product_cart: [
        {
          product_id: productId,
          quantity: 1,
        },
      ],
      success_url: `${returnUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      customer: {
        email,
        name: email, // Will be updated after onboarding
      },
      custom_data: {
        school_id: schoolId,
        user_id: userId,
        plan_type: planType,
        is_signup: isSignup.toString(),
      },
      payment_link: true,
    });

    return {
      checkoutUrl: session.url,
      sessionId: session.checkout_session_id,
    };
  } catch (error) {
    console.error("Failed to create checkout session:", error);
    throw new Error("Failed to create payment session");
  }
}

// Get subscription details
export async function getSubscription(subscriptionId: string) {
  try {
    const subscription = await dodopayments.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    console.error("Failed to get subscription:", error);
    return null;
  }
}

// Cancel subscription at period end
export async function cancelSubscription(subscriptionId: string) {
  try {
    await dodopayments.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    return true;
  } catch (error) {
    console.error("Failed to cancel subscription:", error);
    return false;
  }
}

// Change subscription plan
export async function changeSubscriptionPlan(
  subscriptionId: string,
  newPlanType: "LITE" | "GROWTH" | "ENTERPRISE"
) {
  const planConfig = PLAN_PRODUCTS[newPlanType];

  try {
    await dodopayments.subscriptions.changePlan(subscriptionId, {
      product_id: planConfig.productId,
      quantity: 1,
      proration_billing_mode: "prorated_immediately",
    });
    return true;
  } catch (error) {
    console.error("Failed to change subscription plan:", error);
    return false;
  }
}

// Update payment method
export async function updatePaymentMethod(subscriptionId: string, returnUrl: string) {
  try {
    const response = await dodopayments.subscriptions.updatePaymentMethod(subscriptionId, {
      type: "new",
      return_url: returnUrl,
    });
    return response;
  } catch (error) {
    console.error("Failed to update payment method:", error);
    throw new Error("Failed to update payment method");
  }
}

// Webhook event types
export type DodoWebhookEvent = 
  | "subscription.created"
  | "subscription.active"
  | "subscription.renewed"
  | "subscription.on_hold"
  | "subscription.cancelled"
  | "subscription.expired"
  | "subscription.plan_changed"
  | "payment.succeeded"
  | "payment.failed";

export interface DodoWebhookPayload {
  event_type: DodoWebhookEvent;
  data: {
    subscription_id?: string;
    payment_id?: string;
    customer_id?: string;
    product_id?: string;
    status?: string;
    amount?: number;
    currency?: string;
    custom_data?: Record<string, string>;
    [key: string]: unknown;
  };
}
