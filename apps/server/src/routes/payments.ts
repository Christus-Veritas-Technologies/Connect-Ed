import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, Plan, PaymentType, PaymentStatus, PaymentMethod, Prisma } from "@repo/db";
import {
  getPlanAmounts,
  createPaynowCheckout,
  createDodoPaymentLink,
  type PlanType,
} from "@repo/payments";
import { requireAuth, requireRole } from "../middleware/auth";
import { createCheckoutSchema, createDodoCheckoutSchema } from "../lib/validation";
import { successResponse, errors } from "../lib/response";
import { fmtServer, type CurrencyCode } from "../lib/currency";
import { PLAN_FEATURES } from "../lib/auth";
import { createNotification, getSchoolNotificationPrefs } from "./notifications";
import { sendEmail, generatePaymentSuccessEmail, generatePaymentFailedEmail } from "../lib/email";
import { notifyGeneric } from "../lib/notify";

const payments = new Hono();

/** Set next payment due date to 31 days from now */
function getNextPaymentDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 31);
  return d;
}

/**
 * Determine payment amount — now always monthly-only.
 */
function resolvePaymentAmount(
  planPricing: { monthlyEstimate: number },
  paymentType: string,
  planPayment: { monthlyPaymentPaid: boolean } | null
): { amount: number; effectiveType: "MONTHLY_ONLY" } {
  return { amount: planPricing.monthlyEstimate, effectiveType: "MONTHLY_ONLY" };
}

/**
 * Upsert a PlanPayment record (findFirst + create/update to avoid
 * @unique constraint issues until the migration is run).
 */
async function upsertPlanPayment(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  schoolId: string,
  data: Record<string, boolean>,
) {
  const existing = await tx.planPayment.findFirst({ where: { schoolId } });
  if (existing) {
    await tx.planPayment.update({ where: { id: existing.id }, data });
  } else {
    await tx.planPayment.create({ data: { schoolId, ...data } });
  }
}

// GET /payments/plan-status - Get the school's plan payment status
payments.get("/plan-status", requireAuth, async (c) => {
  try {
    const schoolId = c.get("schoolId");

    const planPayment = await db.planPayment.findFirst({
      where: { schoolId },
    });

    // Get the last paid intermediate payment to determine which plan the user selected
    const lastPaidPayment = await db.intermediatePayment.findFirst({
      where: { schoolId, paid: true },
      orderBy: { createdAt: "desc" },
      select: { plan: true },
    });

    return successResponse(c, {
      monthlyPaymentPaid: planPayment?.monthlyPaymentPaid ?? false,
      paid: planPayment?.paid ?? false,
      selectedPlan: lastPaidPayment?.plan ?? null,
    });
  } catch (error) {
    console.error("Plan status error:", error);
    return errors.internalError(c);
  }
});

// POST /payments/create-checkout - Create PayNow checkout session with intermediate payment
payments.post("/create-checkout", requireAuth, zValidator("json", createCheckoutSchema), async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const userId = c.get("userId");
    const data = c.req.valid("json");

    // Get school's current plan payment status
    const planPayment = await db.planPayment.findFirst({
      where: { schoolId },
    });

    const planPricing = getPlanAmounts(data.planType as PlanType);
    const { amount, effectiveType } = resolvePaymentAmount(planPricing, data.paymentType, planPayment);

    // Create intermediate payment record first
    const intermediatePayment = await db.intermediatePayment.create({
      data: {
        userId,
        schoolId,
        amount: new Prisma.Decimal(amount),
        plan: data.planType,
        paid: false,
        reference: `type:${effectiveType}`, // Store the payment type for callback
      },
    });

    const baseUrl = process.env.APP_URL || "http://localhost:3000";

    // BYPASS: Check if this is the test email
    if (data.email === "kinzinzombe07@gmail.com") {
      console.log("[BYPASS] Test email detected, skipping PayNow gateway for:", data.email);
      
      // Mark payment as paid and complete the flow
      await db.$transaction(async (tx) => {
        await tx.intermediatePayment.update({
          where: { id: intermediatePayment.id },
          data: { paid: true },
        });

        const planPaymentData: any = {};
        planPaymentData.monthlyPaymentPaid = true;
        planPaymentData.paid = true;

        await upsertPlanPayment(tx, schoolId, planPaymentData);

        await tx.school.update({
          where: { id: schoolId },
          data: {
            signupFeePaid: true,
            plan: data.planType,
            nextPaymentDate: getNextPaymentDate(),
            emailQuota: PLAN_FEATURES[data.planType as keyof typeof PLAN_FEATURES].emailQuota,
            whatsappQuota: PLAN_FEATURES[data.planType as keyof typeof PLAN_FEATURES].whatsappQuota,
          },
        });
      });

      // Return success redirect URL
      let returnUrl;
      if (data.returnUrl) {
        const separator = data.returnUrl.includes('?') ? '&' : '?';
        returnUrl = `${data.returnUrl}${separator}intermediatePaymentId=${intermediatePayment.id}&type=${effectiveType}`;
      } else {
        returnUrl = `${baseUrl}/payment/success?intermediatePaymentId=${intermediatePayment.id}&type=${effectiveType}`;
      }
      return successResponse(c, {
        checkoutUrl: returnUrl,
        intermediatePaymentId: intermediatePayment.id,
        pollUrl: "bypass",
      });
    }

    try {
      const baseUrl = process.env.APP_URL || "http://localhost:3000";
      
      // Build return URL - if custom returnUrl provided (e.g. deep link), append query params
      let returnUrl;
      if (data.returnUrl) {
        const separator = data.returnUrl.includes('?') ? '&' : '?';
        returnUrl = `${data.returnUrl}${separator}intermediatePaymentId=${intermediatePayment.id}&type=${effectiveType}`;
      } else {
        returnUrl = `${baseUrl}/payment/success?intermediatePaymentId=${intermediatePayment.id}&type=${effectiveType}`;
      }

      const result = await createPaynowCheckout({
        integrationId: process.env.PAYNOW_INTEGRATION_ID || "",
        integrationKey: process.env.PAYNOW_INTEGRATION_KEY || "",
        amount,
        planType: data.planType,
        email: data.email || "",
        reference: `Invoice-${intermediatePayment.id}`,
        resultUrl: `${baseUrl}/api/payments/callback`,
        returnUrl,
      });

      // Save the poll URL for webhook verification (append to existing reference)
      await db.intermediatePayment.update({
        where: { id: intermediatePayment.id },
        data: { reference: `type:${effectiveType}|poll:${result.pollUrl}` },
      });

      return successResponse(c, {
        checkoutUrl: result.redirectUrl,
        intermediatePaymentId: intermediatePayment.id,
        pollUrl: result.pollUrl,
      });
    } catch (paynowError) {
      console.error("PayNow error:", paynowError);
      console.error("PayNow error details:", {
        message: paynowError instanceof Error ? paynowError.message : String(paynowError),
        stack: paynowError instanceof Error ? paynowError.stack : undefined,
      });
      return errors.internalError(c);
    }
  } catch (error) {
    console.error("Create checkout error:", error);
    console.error("Full error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error,
    });
    return errors.internalError(c);
  }
});

// POST /payments/create-dodo-checkout - Create DodoPayments checkout session (ZAR)
payments.post("/create-dodo-checkout", requireAuth, zValidator("json", createDodoCheckoutSchema), async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const userId = c.get("userId");
    const data = c.req.valid("json");

    // Get school to check plan payment status
    const school = await db.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      return errors.notFound(c, "School not found");
    }

    // Get plan payment status
    const planPayment = await db.planPayment.findFirst({
      where: { schoolId },
    });

    const planPricing = getPlanAmounts(data.planType as PlanType, "ZAR");
    const { amount, effectiveType } = resolvePaymentAmount(planPricing, data.paymentType, planPayment);

    // Select the monthly product
    const planType = data.planType as PlanType;
    const monthlyKey = `DODO_PRODUCT_${planType}_MONTHLY`;
    const monthlyProductId = process.env[monthlyKey];
    if (!monthlyProductId) {
      console.error("No monthly product ID found for plan:", planType);
      return errors.internalError(c);
    }
    const productIds = [monthlyProductId];

    // Create intermediate payment record
    const intermediatePayment = await db.intermediatePayment.create({
      data: {
        userId,
        schoolId,
        amount: new Prisma.Decimal(amount),
        plan: data.planType,
        paid: false,
        reference: `type:${effectiveType}`,
      },
    });

    const baseUrl = process.env.APP_URL || "http://localhost:3000";

    // BYPASS: Check if this is the test email
    if (data.email === "kinzinzombe07@gmail.com") {
      console.log("[BYPASS] Test email detected, skipping DodoPayments gateway for:", data.email);
      
      // Mark payment as paid and complete the flow
      await db.$transaction(async (tx) => {
        await tx.intermediatePayment.update({
          where: { id: intermediatePayment.id },
          data: { paid: true },
        });

        const planPaymentData: any = {};
        planPaymentData.monthlyPaymentPaid = true;
        planPaymentData.paid = true;

        await upsertPlanPayment(tx, schoolId, planPaymentData);

        await tx.school.update({
          where: { id: schoolId },
          data: {
            signupFeePaid: true,
            plan: data.planType,
            nextPaymentDate: getNextPaymentDate(),
            emailQuota: PLAN_FEATURES[data.planType as keyof typeof PLAN_FEATURES].emailQuota,
            whatsappQuota: PLAN_FEATURES[data.planType as keyof typeof PLAN_FEATURES].whatsappQuota,
          },
        });
      });

      // Return success redirect URL
      let returnUrl;
      if (data.returnUrl) {
        const separator = data.returnUrl.includes('?') ? '&' : '?';
        returnUrl = `${data.returnUrl}${separator}intermediatePaymentId=${intermediatePayment.id}&type=${effectiveType}`;
      } else {
        returnUrl = `${baseUrl}/payment/success?intermediatePaymentId=${intermediatePayment.id}&type=${effectiveType}`;
      }
      return successResponse(c, {
        checkoutUrl: returnUrl,
        paymentId: "bypass",
      });
    }

    // Validate API key exists
    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    if (!apiKey) {
      console.error("DODO_PAYMENTS_API_KEY is not configured");
      return errors.internalError(c);
    }

    console.log("Creating Dodo checkout with:", {
      apiKey: apiKey.substring(0, 10) + "..." + apiKey.substring(apiKey.length - 10),
      productIds,
      email: data.email,
      plan: data.planType,
      schoolId,
      userId,
    });

    let result;
    try {
      result = await createDodoPaymentLink({
        apiKey,
        productIds,
        email: data.email || "",
        metadata: {
          school_id: schoolId,
          user_id: userId,
          plan_type: data.planType,
          payment_type: effectiveType,
          intermediate_payment_id: intermediatePayment.id,
        },
        returnUrl: `${baseUrl}/payment/success?intermediatePaymentId=${intermediatePayment.id}&type=${effectiveType}`,
        billingCountry: "ZA",
      });
    } catch (dodoError) {
      console.error("DodoPayments API call failed:", dodoError);
      throw new Error(`DodoPayments API Error: ${dodoError instanceof Error ? dodoError.message : String(dodoError)}`);
    }

    // Save the payment ID as the reference (used by webhook to find this record)
    await db.intermediatePayment.update({
      where: { id: intermediatePayment.id },
      data: { reference: `type:${effectiveType}|dodo:${result.paymentId}` },
    });

    return successResponse(c, {
      checkoutUrl: result.paymentLink,
      paymentId: result.paymentId,
    });
  } catch (error) {
    console.error("Create Dodo checkout error:", error);
    console.error("Full error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error,
      isDodoError: error instanceof Error && error.message.includes("status code"),
    });
    return errors.internalError(c);
  }
});

// POST /payments/callback - PayNow webhook callback
payments.post("/callback", async (c) => {
  try {
    const data = await c.req.json();
    const { intermediatePaymentId, paid } = data;

    if (!intermediatePaymentId) {
      return errors.validationError(c, { intermediatePaymentId: ["Missing intermediate payment ID"] });
    }

    // Get intermediate payment with user and school info
    const intermediatePayment = await db.intermediatePayment.findUnique({
      where: { id: intermediatePaymentId },
      include: { user: true, school: true },
    });

    if (!intermediatePayment) {
        return errors.notFound(c, "Payment not found");
    }

    // Update intermediate payment and school in a transaction
    if (paid) {
      // Determine payment type from the stored reference
      const refString = intermediatePayment.reference || "";
      const typeMatch = refString.match(/type:(\w+)/);
      const effectiveType = typeMatch ? typeMatch[1] : "FULL";

      await db.$transaction(async (tx) => {
        // Update intermediate payment
        await tx.intermediatePayment.update({
          where: { id: intermediatePaymentId },
          data: { paid: true },
        });

        // Update PlanPayment
        const planPaymentData: any = {};
        planPaymentData.monthlyPaymentPaid = true;
        planPaymentData.paid = true;

        await upsertPlanPayment(tx, intermediatePayment.schoolId, planPaymentData);

        // Update school's payment status and plan details
        await tx.school.update({
          where: { id: intermediatePayment.schoolId },
          data: {
            signupFeePaid: true,
            plan: intermediatePayment.plan,
            nextPaymentDate: getNextPaymentDate(),
            emailQuota: PLAN_FEATURES[intermediatePayment.plan as keyof typeof PLAN_FEATURES].emailQuota,
            whatsappQuota: PLAN_FEATURES[intermediatePayment.plan as keyof typeof PLAN_FEATURES].whatsappQuota,
          },
        });
      });

      // Create success notification for admin
      await createNotification({
        schoolId: intermediatePayment.schoolId,
        title: "Payment Received",
        message: `Payment of ${fmtServer(Number(intermediatePayment.amount), (intermediatePayment.school?.currency || "USD") as CurrencyCode)} for ${intermediatePayment.plan} plan has been successfully processed.`,
        type: "PAYMENT_SUCCESS",
        priority: "HIGH",
        actionUrl: "/payments",
        metadata: {
          paymentId: intermediatePaymentId,
          amount: intermediatePayment.amount.toString(),
          plan: intermediatePayment.plan,
        },
        actorName: intermediatePayment.user.name,
      });

      // Send success email + WhatsApp + SMS (check preferences)
      const prefs = await getSchoolNotificationPrefs(intermediatePayment.schoolId);
      const paymentAmount = fmtServer(Number(intermediatePayment.amount), (intermediatePayment.school?.currency || "USD") as CurrencyCode);

      await notifyGeneric({
        schoolId: intermediatePayment.schoolId,
        email: intermediatePayment.user.email,
        phone: intermediatePayment.user.phone || undefined,
        subject: "Payment Successful - Connect-Ed",
        emailHtml: generatePaymentSuccessEmail({
          name: intermediatePayment.user.name,
          amount: Number(intermediatePayment.amount),
          plan: intermediatePayment.plan,
          transactionId: intermediatePaymentId,
          currency: (intermediatePayment.school?.currency || "USD") as CurrencyCode,
        }),
        whatsappContent: `✅ *Payment Successful!*\n\nHi ${intermediatePayment.user.name},\n\nYour payment of *${paymentAmount}* for the *${intermediatePayment.plan}* plan has been processed successfully.\n\nTransaction ID: ${intermediatePaymentId}\n\nYour school's plan is now active!\n\n_Connect-Ed_`,
        emailType: "SALES",
      });
    } else {
      // Create failure notification for admin
      await createNotification({
        schoolId: intermediatePayment.schoolId,
        title: "Payment Failed",
        message: `Payment of ${fmtServer(Number(intermediatePayment.amount), (intermediatePayment.school?.currency || "USD") as CurrencyCode)} for ${intermediatePayment.plan} plan failed to process.`,
        type: "PAYMENT_FAILED",
        priority: "HIGH",
        actionUrl: "/payments",
        metadata: {
          paymentId: intermediatePaymentId,
          amount: intermediatePayment.amount.toString(),
          plan: intermediatePayment.plan,
        },
        actorName: intermediatePayment.user.name,
      });

      // Send failure email + WhatsApp + SMS (check preferences)
      const failPaymentAmount = fmtServer(Number(intermediatePayment.amount), (intermediatePayment.school?.currency || "USD") as CurrencyCode);

      await notifyGeneric({
        schoolId: intermediatePayment.schoolId,
        email: intermediatePayment.user.email,
        phone: intermediatePayment.user.phone || undefined,
        subject: "Payment Failed - Connect-Ed",
        emailHtml: generatePaymentFailedEmail({
          name: intermediatePayment.user.name,
          amount: Number(intermediatePayment.amount),
          plan: intermediatePayment.plan,
          currency: (intermediatePayment.school?.currency || "USD") as CurrencyCode,
        }),
        whatsappContent: `❌ *Payment Failed*\n\nHi ${intermediatePayment.user.name},\n\nYour payment of *${failPaymentAmount}* for the *${intermediatePayment.plan}* plan could not be processed.\n\nPlease try again or contact your bank.\n\n_Connect-Ed_`,
        emailType: "SALES",
      });
    }

    return successResponse(c, { status: "processed" });
  } catch (error) {
    console.error("Callback error:", error);
    return errors.internalError(c);
  }
});

// GET /payments/verify/:intermediatePaymentId - Verify intermediate payment
payments.get("/verify/:intermediatePaymentId", async (c) => {
  try {
    const intermediatePaymentId = c.req.param("intermediatePaymentId");

    let intermediatePayment = await db.intermediatePayment.findUnique({
      where: { id: intermediatePaymentId },
      include: { user: true, school: true },
    });

    if (!intermediatePayment) {
      return errors.notFound(c, "Payment not found");
    }

    // If payment is already marked as paid, return success
    if (intermediatePayment.paid) {
      return successResponse(c, { verified: true, paid: true });
    }

    // Extract payment method from reference
    const refString = intermediatePayment.reference || "";
    console.log(`[VERIFY] Checking payment ${intermediatePaymentId}, reference: "${refString}"`);
    
    const isDodoPayment = refString.includes("dodo:");
    const isPaynowPayment = refString.includes("poll:");

    console.log(`[VERIFY] isDodoPayment: ${isDodoPayment}, isPaynowPayment: ${isPaynowPayment}`);

    // For DoDo payments, check payment status via DoDo API
    if (isDodoPayment) {
      console.log(`[VERIFY] DoDo payment detected for ${intermediatePaymentId}, checking DoDo API...`);
      
      // Extract DoDo session/payment ID from reference
      const dodoMatch = refString.match(/dodo:([^|]+)/);
      const dodoPaymentId = dodoMatch ? dodoMatch[1] : null;
      
      if (!dodoPaymentId) {
        console.error(`[VERIFY] Could not extract DoDo payment ID from reference: ${refString}`);
        return errors.badRequest(c, "Invalid payment reference format for DoDo payment.");
      }

      try {
        // Import DoDo SDK to check payment status
        const DodoPayments = require("dodopayments").default;
        const apiKey = process.env.DODO_PAYMENTS_API_KEY;
        
        if (!apiKey) {
          console.error("[VERIFY] DODO_PAYMENTS_API_KEY not configured");
          return errors.internalError(c);
        }

        const environment = process.env.NODE_ENV === 'production' ? 'live_mode' : 'test_mode';
        console.log(`[VERIFY] Using DoDo environment: ${environment}`);

        const dodo = new DodoPayments({ 
          bearerToken: apiKey.trim().replace(/^["']|["']$/g, ''),
          environment,
        });

        // Retrieve the checkout session to check payment status
        console.log(`[VERIFY] Querying DoDo for session ${dodoPaymentId}...`);
        const session = await dodo.checkoutSessions.retrieve(dodoPaymentId);
        
        console.log(`[VERIFY] DoDo session status:`, {
          sessionId: session.session_id,
          isPaid: session.is_paid,
          paymentStatus: session.payment_status,
        });

        // Check if payment was successful
        if (!session.is_paid && session.payment_status !== "succeeded") {
          console.warn(`[VERIFY] DoDo payment not marked as paid. Status: ${session.payment_status}`);
          return errors.badRequest(c, `Payment status: ${session.payment_status}. Please try again if payment was taken from your account.`);
        }

        // Payment is confirmed via DoDo API - mark it as paid
        console.log(`[VERIFY] DoDo payment confirmed via API, marking as paid...`);
        
        const typeMatch = refString.match(/type:(\w+)/);
        const effectiveType = typeMatch ? typeMatch[1] : "FULL";

        if (!intermediatePayment) {
          return errors.notFound(c, "Payment not found");
        }

        await db.$transaction(async (tx) => {
          // Mark payment as paid
          await tx.intermediatePayment.update({
            where: { id: intermediatePaymentId },
            data: { paid: true },
          });

          // Update PlanPayment
          const planPaymentData: any = {};
          planPaymentData.monthlyPaymentPaid = true;
          planPaymentData.paid = true;

          const existing = await tx.planPayment.findFirst({ where: { schoolId: intermediatePayment!.schoolId } });
          if (existing) {
            await tx.planPayment.update({ where: { id: existing.id }, data: planPaymentData });
          } else {
            await tx.planPayment.create({ data: { schoolId: intermediatePayment!.schoolId, ...planPaymentData } });
          }

          await tx.school.update({
            where: { id: intermediatePayment!.schoolId },
            data: {
              signupFeePaid: true,
              plan: intermediatePayment!.plan,
              nextPaymentDate: getNextPaymentDate(),
              emailQuota: PLAN_FEATURES[intermediatePayment!.plan as keyof typeof PLAN_FEATURES].emailQuota,
              whatsappQuota: PLAN_FEATURES[intermediatePayment!.plan as keyof typeof PLAN_FEATURES].whatsappQuota,
            },
          });
        });

        // Fetch updated payment
        intermediatePayment = await db.intermediatePayment.findUnique({
          where: { id: intermediatePaymentId },
          include: { user: true, school: true },
        }) as any;

        return successResponse(c, {
          verified: true,
          paid: true,
          method: "dodo_api",
          payment: intermediatePayment,
        });
      } catch (dodoError) {
        console.error("[VERIFY] DoDo API error:", dodoError);
        const errorMsg = dodoError instanceof Error ? dodoError.message : String(dodoError);
        
        // If it's a 404 or not found error, the session might not exist yet
        if (errorMsg.includes("404") || errorMsg.includes("not found")) {
          return errors.badRequest(c, "Payment session not found in DoDo system. Please try again.");
        }
        
        return errors.badRequest(c, `Failed to verify payment with DoDo: ${errorMsg}`);
      }
    }

    // Extract poll URL from reference (PayNow)
    const pollMatch = refString.match(/poll:([^|]+)/);
    const pollUrl = pollMatch ? pollMatch[1] : null;

    if (!pollUrl && !isDodoPayment) {
      console.error(`[VERIFY] No poll URL and not DoDo payment. Reference: "${refString}"`);
      return errors.badRequest(c, `Payment verification failed. Reference format: "${refString.substring(0, 50)}...". This may indicate the payment was not properly initialized.`);
    }

    // Poll PayNow to check actual payment status
    if (!pollUrl) {
      return errors.badRequest(c, "Payment poll URL not found. Payment may have been initiated incorrectly.");
    }

    try {
      const pollResponse = await fetch(pollUrl);
      const pollData = await pollResponse.text();
      
      // PayNow returns status in format: "status=Paid" or "status=Cancelled" etc
      const statusMatch = pollData.match(/status=(\w+)/i);
      const paymentStatus = statusMatch ? statusMatch[1]?.toLowerCase() : "";

      // Only proceed if payment was actually successful
      if (paymentStatus !== "paid") {
        return errors.badRequest(c, `Payment was not successful. Status: ${paymentStatus || "unknown"}`);
      }

      // Payment is confirmed - update database
      const typeMatch = refString.match(/type:(\w+)/);
      const effectiveType = typeMatch ? typeMatch[1] : "FULL";

      await db.$transaction(async (tx) => {
        // Mark payment as paid
        await tx.intermediatePayment.update({
          where: { id: intermediatePaymentId },
          data: { paid: true },
        });

        // Update PlanPayment
        const planPaymentData: any = {};
        planPaymentData.monthlyPaymentPaid = true;
        planPaymentData.paid = true;

        await upsertPlanPayment(tx, intermediatePayment!.schoolId, planPaymentData);

        // Update school's payment status and plan details
        await tx.school.update({
          where: { id: intermediatePayment!.schoolId },
          data: {
            signupFeePaid: true,
            plan: intermediatePayment!.plan,
            nextPaymentDate: getNextPaymentDate(),
            emailQuota: PLAN_FEATURES[intermediatePayment!.plan as keyof typeof PLAN_FEATURES].emailQuota,
            whatsappQuota: PLAN_FEATURES[intermediatePayment!.plan as keyof typeof PLAN_FEATURES].whatsappQuota,
          },
        });
      });

      // Fetch updated payment
      intermediatePayment = await db.intermediatePayment.findUnique({
        where: { id: intermediatePaymentId },
        include: { user: true, school: true },
      }) as any;

      return successResponse(c, {
        payment: intermediatePayment,
        isPaid: intermediatePayment!.paid,
        paymentType: intermediatePayment!.reference?.match(/type:(\w+)/)?.[1] || "FULL",
      });
    } catch (pollError) {
      console.error("PayNow poll error:", pollError);
      return errors.internalError(c);
    }
  } catch (error) {
    console.error("Verify payment error:", error);
    return errors.internalError(c);
  }
});

// POST /payments/confirm-manual-payment - Handle manual payment confirmation
payments.post("/confirm-manual-payment", requireAuth, async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const userId = c.get("userId");
    const data = await c.req.json();
    const { plan, paymentType } = data;

    if (!plan) {
      return errors.validationError(c, { plan: ["Plan is required"] });
    }

    const validPlans = ["LITE", "GROWTH", "ENTERPRISE"];
    if (!validPlans.includes(plan)) {
      return errors.validationError(c, { plan: ["Invalid plan"] });
    }

    const planPricing = getPlanAmounts(plan as PlanType);

    // Mark payment as paid
    const existing = await db.planPayment.findFirst({ where: { schoolId } });
    let planPaymentRecord;
    if (existing) {
      planPaymentRecord = await db.planPayment.update({
        where: { id: existing.id },
        data: { monthlyPaymentPaid: true, paid: true },
      });
    } else {
      planPaymentRecord = await db.planPayment.create({
        data: {
          schoolId,
          monthlyPaymentPaid: true,
          paid: true,
        },
      });
    }

    // Create intermediate payment for monthly only
    const intermediatePayment = await db.intermediatePayment.create({
      data: {
        userId,
        schoolId,
        amount: new Prisma.Decimal(planPricing.monthlyEstimate),
        plan,
        paid: false,
      },
    });

    return successResponse(c, {
      planPayment: planPaymentRecord,
      intermediatePayment,
      nextPaymentAmount: planPricing.monthlyEstimate,
    });
  } catch (error) {
    console.error("Confirm manual payment error:", error);
    return errors.internalError(c);
  }
});

// POST /payments/verify-manual - Verify manual/cash payment (admin only)
payments.post("/verify-manual", requireAuth, requireRole("ADMIN" as any), async (c) => {
  try {
    const data = await c.req.json();
    const { schoolId: targetSchoolId, planType, paymentType, reference, notes } = data;

    if (!targetSchoolId || !planType || !paymentType) {
      return errors.validationError(c, {
        schoolId: ["School ID is required"],
        planType: ["Plan type is required"],
        paymentType: ["Payment type is required"],
      });
    }

    const validPlans = ["LITE", "GROWTH", "ENTERPRISE"];
    if (!validPlans.includes(planType)) {
      return errors.validationError(c, { planType: ["Invalid plan type"] });
    }

    const planPricing = getPlanAmounts(planType as PlanType);

    const amount = planPricing.monthlyEstimate;

    // Create payment record and update school in transaction
    const result = await db.$transaction(async (tx) => {
      const payment = await tx.schoolPayment.create({
        data: {
          schoolId: targetSchoolId,
          amount,
          type: PaymentType.TERM_PAYMENT,
          status: PaymentStatus.COMPLETED,
          paymentMethod: PaymentMethod.CASH,
          reference: reference || `manual_${Date.now()}`,
        },
      });

      const updateData: any = {
        signupFeePaid: true,
        plan: planType,
        nextPaymentDate: getNextPaymentDate(),
        emailQuota: PLAN_FEATURES[planType as keyof typeof PLAN_FEATURES].emailQuota,
        whatsappQuota: PLAN_FEATURES[planType as keyof typeof PLAN_FEATURES].whatsappQuota,
        isActive: true,
        emailUsed: 0,
        whatsappUsed: 0,
        quotaResetDate: new Date(),
      };

      const school = await tx.school.update({
        where: { id: targetSchoolId },
        data: updateData,
      });

      return { payment, school };
    });

    return successResponse(c, {
      payment: result.payment,
      school: {
        id: result.school.id,
        plan: result.school.plan,
        isActive: result.school.isActive,
        signupFeePaid: result.school.signupFeePaid,
      },
    });
  } catch (error) {
    console.error("Verify manual payment error:", error);
    return errors.internalError(c);
  }
});

// GET /payments - List school payments
payments.get("/", requireAuth, async (c) => {
  try {
    const schoolId = c.get("schoolId");

    const paymentList = await db.schoolPayment.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(c, { payments: paymentList });
  } catch (error) {
    console.error("List payments error:", error);
    return errors.internalError(c);
  }
});

// POST /payments/test-complete/:intermediatePaymentId - Mark payment as paid (development only)
payments.post("/test-complete/:intermediatePaymentId", async (c) => {
  if (process.env.NODE_ENV === "production") {
    return errors.notFound(c, "Not found");
  }

  try {
    const intermediatePaymentId = c.req.param("intermediatePaymentId");

    // Get intermediate payment with relations
    const intermediatePayment = await db.intermediatePayment.findUnique({
      where: { id: intermediatePaymentId },
      include: { user: true, school: true },
    });

    if (!intermediatePayment) {
      return errors.notFound(c, "Payment not found");
    }

    // Update payment and school in transaction (same as callback)
    await db.$transaction(async (tx) => {
      // Determine payment type from reference
      const refString = intermediatePayment.reference || "";
      const typeMatch = refString.match(/type:(\w+)/);
      const effectiveType = typeMatch ? typeMatch[1] : "FULL";

      // Update intermediate payment
      await tx.intermediatePayment.update({
        where: { id: intermediatePaymentId },
        data: { paid: true },
      });

      // Update PlanPayment
      const planPaymentData: any = {};
      planPaymentData.monthlyPaymentPaid = true;
      planPaymentData.paid = true;

      await upsertPlanPayment(tx, intermediatePayment.schoolId, planPaymentData);

      // Update school's payment status and plan details
      await tx.school.update({
        where: { id: intermediatePayment.schoolId },
        data: {
          signupFeePaid: true,
          plan: intermediatePayment.plan,
          nextPaymentDate: getNextPaymentDate(),
          emailQuota: PLAN_FEATURES[intermediatePayment.plan as keyof typeof PLAN_FEATURES].emailQuota,
          whatsappQuota: PLAN_FEATURES[intermediatePayment.plan as keyof typeof PLAN_FEATURES].whatsappQuota,
        },
      });
    });

    return successResponse(c, { 
      payment: intermediatePayment,
      message: "Payment marked as complete and school updated"
    });
  } catch (error) {
    console.error("Test complete payment error:", error);
    return errors.internalError(c);
  }
});

export default payments;
