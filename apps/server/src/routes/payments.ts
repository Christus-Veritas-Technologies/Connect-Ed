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

const payments = new Hono();

/** Set next payment due date to 31 days from now */
function getNextPaymentDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 31);
  return d;
}

// POST /payments/create-checkout - Create PayNow checkout session with intermediate payment
payments.post("/create-checkout", requireAuth, zValidator("json", createCheckoutSchema), async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const userId = c.get("userId");
    const data = c.req.valid("json");

    const planPricing = getPlanAmounts(data.planType as PlanType);
    const amount = data.paymentType === "SIGNUP"
      ? planPricing.signupFee + planPricing.monthlyEstimate
      : planPricing.monthlyEstimate;

    // Create intermediate payment record first
    const intermediatePayment = await db.intermediatePayment.create({
      data: {
        userId,
        schoolId,
        amount: new Prisma.Decimal(amount),
        plan: data.planType,
        paid: false,
      },
    });

    const baseUrl = process.env.APP_URL || "http://localhost:3000";

    try {
      const result = await createPaynowCheckout({
        integrationId: process.env.PAYNOW_INTEGRATION_ID || "",
        integrationKey: process.env.PAYNOW_INTEGRATION_KEY || "",
        amount,
        planType: data.planType,
        email: data.email || "",
        reference: `Invoice-${intermediatePayment.id}`,
        resultUrl: `${baseUrl}/api/payments/callback`,
        returnUrl: `${baseUrl}/payment/success?intermediatePaymentId=${intermediatePayment.id}`,
      });

      // Save the poll URL for webhook verification
      await db.intermediatePayment.update({
        where: { id: intermediatePayment.id },
        data: { reference: result.pollUrl },
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

    // Get school to check if one-time fee is already paid
    const school = await db.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      return errors.notFound(c, { error: "School not found" });
    }

    const planPricing = getPlanAmounts(data.planType as PlanType, "ZAR");
    const isSignup = data.paymentType === "SIGNUP";
    const hasOneTimeFee = !school.signupFeePaid;

    // Calculate total amount for intermediate payment record
    const amount = (hasOneTimeFee ? planPricing.signupFee : 0) + planPricing.monthlyEstimate;

    // Select appropriate product IDs based on plan type and whether one-time fee is needed
    const productIds: string[] = [];
    const planType = data.planType as PlanType;
    
    // Add one-time product if needed
    if (hasOneTimeFee) {
      const onetimeKey = `DODO_PRODUCT_${planType}_ONETIME`;
      const onetimeProductId = process.env[onetimeKey];
      if (onetimeProductId) {
        productIds.push(onetimeProductId);
      }
    }
    
    // Always add the monthly product
    const monthlyKey = `DODO_PRODUCT_${planType}_MONTHLY`;
    const monthlyProductId = process.env[monthlyKey];
    if (monthlyProductId) {
      productIds.push(monthlyProductId);
    }

    if (productIds.length === 0) {
      console.error("No product IDs found for plan:", planType);
      return errors.internalError(c);
    }

    // Create intermediate payment record
    const intermediatePayment = await db.intermediatePayment.create({
      data: {
        userId,
        schoolId,
        amount: new Prisma.Decimal(amount),
        plan: data.planType,
        paid: false,
      },
    });

    const baseUrl = process.env.APP_URL || "http://localhost:3000";

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
          is_signup: isSignup.toString(),
          has_onetime_fee: hasOneTimeFee.toString(),
          intermediate_payment_id: intermediatePayment.id,
        },
        returnUrl: `${baseUrl}/payment/success?intermediatePaymentId=${intermediatePayment.id}`,
        billingCountry: "ZA",
      });
    } catch (dodoError) {
      console.error("DodoPayments API call failed:", dodoError);
      throw new Error(`DodoPayments API Error: ${dodoError instanceof Error ? dodoError.message : String(dodoError)}`);
    }

    // Save the payment ID as the reference (used by webhook to find this record)
    await db.intermediatePayment.update({
      where: { id: intermediatePayment.id },
      data: { reference: result.paymentId },
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
      return errors.notFound(c, { error: "Payment not found" });
    }

    // Update intermediate payment and school in a transaction
    if (paid) {
      await db.$transaction(async (tx) => {
        // Update intermediate payment
        await tx.intermediatePayment.update({
          where: { id: intermediatePaymentId },
          data: { paid: true },
        });

        // Update school's payment status and plan details
        await tx.school.update({
          where: { id: intermediatePayment.schoolId },
          data: {
            signupFeePaid: true,
            plan: intermediatePayment.plan,
            nextPaymentDate: getNextPaymentDate(),
            emailQuota: PLAN_FEATURES[intermediatePayment.plan as keyof typeof PLAN_FEATURES].emailQuota,
            whatsappQuota: PLAN_FEATURES[intermediatePayment.plan as keyof typeof PLAN_FEATURES].whatsappQuota,
            smsQuota: PLAN_FEATURES[intermediatePayment.plan as keyof typeof PLAN_FEATURES].smsQuota,
          },
        });
      });

      // Create success notification for admin
      await createNotification({
        schoolId: intermediatePayment.schoolId,
        title: "Payment Received",
        message: `Payment of ${fmtServer(intermediatePayment.amount, (intermediatePayment.school?.currency || "USD") as CurrencyCode)} for ${intermediatePayment.plan} plan has been successfully processed.`,
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

      // Send success email (check preferences)
      const prefs = await getSchoolNotificationPrefs(intermediatePayment.schoolId);
      if (prefs.email) {
        await sendEmail({
          to: intermediatePayment.user.email,
          subject: "Payment Successful - Connect-Ed",
          html: generatePaymentSuccessEmail({
            name: intermediatePayment.user.name,
            amount: Number(intermediatePayment.amount),
            plan: intermediatePayment.plan,
            transactionId: intermediatePaymentId,
            currency: (intermediatePayment.school?.currency || "USD") as CurrencyCode,
          }),
          schoolId: intermediatePayment.schoolId,
          type: "SALES",
        });
      }
    } else {
      // Create failure notification for admin
      await createNotification({
        schoolId: intermediatePayment.schoolId,
        title: "Payment Failed",
        message: `Payment of ${fmtServer(intermediatePayment.amount, (intermediatePayment.school?.currency || "USD") as CurrencyCode)} for ${intermediatePayment.plan} plan failed to process.`,
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

      // Send failure email (check preferences)
      const failPrefs = await getSchoolNotificationPrefs(intermediatePayment.schoolId);
      if (failPrefs.email) {
        await sendEmail({
          to: intermediatePayment.user.email,
          subject: "Payment Failed - Connect-Ed",
          html: generatePaymentFailedEmail({
            name: intermediatePayment.user.name,
            amount: Number(intermediatePayment.amount),
            plan: intermediatePayment.plan,
            currency: (intermediatePayment.school?.currency || "USD") as CurrencyCode,
          }),
          schoolId: intermediatePayment.schoolId,
          type: "SALES",
        });
      }
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
      return errors.notFound(c, { error: "Payment not found" });
    }

    // If payment isn't marked as paid yet, update it now along with school
    if (!intermediatePayment.paid) {
      await db.$transaction(async (tx) => {
        // Mark payment as paid
        await tx.intermediatePayment.update({
          where: { id: intermediatePaymentId },
          data: { paid: true },
        });

        // Update school's payment status and plan details
        await tx.school.update({
          where: { id: intermediatePayment.schoolId },
          data: {
            signupFeePaid: true,
            plan: intermediatePayment.plan,
            nextPaymentDate: getNextPaymentDate(),
            emailQuota: PLAN_FEATURES[intermediatePayment.plan as keyof typeof PLAN_FEATURES].emailQuota,
            whatsappQuota: PLAN_FEATURES[intermediatePayment.plan as keyof typeof PLAN_FEATURES].whatsappQuota,
            smsQuota: PLAN_FEATURES[intermediatePayment.plan as keyof typeof PLAN_FEATURES].smsQuota,
          },
        });
      });

      // Fetch updated payment
      intermediatePayment = await db.intermediatePayment.findUnique({
        where: { id: intermediatePaymentId },
        include: { user: true, school: true },
      }) as any;
    }

    return successResponse(c, {
      payment: intermediatePayment,
      isPaid: intermediatePayment.paid,
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    return errors.internalError(c);
  }
});

// POST /payments/confirm-manual-payment - Handle manual once-off payment
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

    // Mark once-off payment as paid, only monthly remains
    const planPayment = await db.planPayment.upsert({
      where: { schoolId },
      update: { onceOffPaymentPaid: true },
      create: {
        schoolId,
        onceOffPaymentPaid: true,
        monthlyPaymentPaid: false,
        paid: false,
      },
    });

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
      planPayment,
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

    const amount = paymentType === "SIGNUP"
      ? planPricing.signupFee + planPricing.monthlyEstimate
      : planPricing.monthlyEstimate;

    // Create payment record and update school in transaction
    const result = await db.$transaction(async (tx) => {
      const payment = await tx.schoolPayment.create({
        data: {
          schoolId: targetSchoolId,
          amount,
          type: paymentType === "SIGNUP" ? PaymentType.SIGNUP_FEE : PaymentType.TERM_PAYMENT,
          status: PaymentStatus.COMPLETED,
          paymentMethod: PaymentMethod.CASH,
          reference: reference || `manual_${Date.now()}`,
          notes,
        },
      });

      const updateData: any = {
        nextPaymentDate: getNextPaymentDate(),
      };
      if (paymentType === "SIGNUP") {
        updateData.signupFeePaid = true;
        updateData.plan = planType;
        updateData.emailQuota = PLAN_FEATURES[planType as keyof typeof PLAN_FEATURES].emailQuota;
        updateData.whatsappQuota = PLAN_FEATURES[planType as keyof typeof PLAN_FEATURES].whatsappQuota;
        updateData.smsQuota = PLAN_FEATURES[planType as keyof typeof PLAN_FEATURES].smsQuota;
      } else {
        updateData.isActive = true;
        updateData.emailUsed = 0;
        updateData.whatsappUsed = 0;
        updateData.smsUsed = 0;
        updateData.quotaResetDate = new Date();
      }

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
    return errors.notFound(c, { error: "Not found" });
  }

  try {
    const intermediatePaymentId = c.req.param("intermediatePaymentId");

    // Get intermediate payment with relations
    const intermediatePayment = await db.intermediatePayment.findUnique({
      where: { id: intermediatePaymentId },
      include: { user: true, school: true },
    });

    if (!intermediatePayment) {
      return errors.notFound(c, { error: "Payment not found" });
    }

    // Update payment and school in transaction (same as callback)
    await db.$transaction(async (tx) => {
      // Update intermediate payment
      await tx.intermediatePayment.update({
        where: { id: intermediatePaymentId },
        data: { paid: true },
      });

      // Update school's payment status and plan details
      await tx.school.update({
        where: { id: intermediatePayment.schoolId },
        data: {
          signupFeePaid: true,
          plan: intermediatePayment.plan,
          nextPaymentDate: getNextPaymentDate(),
          emailQuota: PLAN_FEATURES[intermediatePayment.plan as keyof typeof PLAN_FEATURES].emailQuota,
          whatsappQuota: PLAN_FEATURES[intermediatePayment.plan as keyof typeof PLAN_FEATURES].whatsappQuota,
          smsQuota: PLAN_FEATURES[intermediatePayment.plan as keyof typeof PLAN_FEATURES].smsQuota,
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
