import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, Plan, PaymentType, PaymentStatus, PaymentMethod, Prisma } from "@repo/db";
import { requireAuth, requireRole } from "../middleware/auth";
import { createCheckoutSchema } from "../lib/validation";
import { successResponse, errors } from "../lib/response";
import { PLAN_FEATURES } from "../lib/auth";
import { Paynow } from "paynow";
import { createNotification } from "./notifications";
import { sendEmail, generatePaymentSuccessEmail, generatePaymentFailedEmail } from "../lib/email";

const payments = new Hono();

// Initialize PayNow (using environment variables)
const initializePaynow = () => {
  const integrationId = process.env.PAYNOW_INTEGRATION_ID;
  const integrationKey = process.env.PAYNOW_INTEGRATION_KEY;
  
  if (!integrationId || !integrationKey) {
    throw new Error("PayNow credentials not configured - set PAYNOW_INTEGRATION_ID and PAYNOW_INTEGRATION_KEY");
  }
  
  return new Paynow(integrationId, integrationKey);
};

// Pricing configuration
const PRICING = {
  LITE: {
    signupFee: 400,
    perTermCost: 50,
    monthlyEstimate: 40,
  },
  GROWTH: {
    signupFee: 750,
    perTermCost: 90,
    monthlyEstimate: 75,
  },
  ENTERPRISE: {
    signupFee: 1200,
    perTermCost: 150,
    monthlyEstimate: 120,
  },
} as const;

// POST /payments/create-checkout - Create PayNow checkout session with intermediate payment
payments.post("/create-checkout", requireAuth, zValidator("json", createCheckoutSchema), async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const userId = c.get("userId");
    const data = c.req.valid("json");

    const planPricing = PRICING[data.planType];
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

    // Get PayNow instance
    const paynow = initializePaynow();

    // Set PayNow URLs
    const baseUrl = process.env.APP_URL || "http://localhost:3000";
    paynow.resultUrl = `${baseUrl}/api/payments/callback`;
    paynow.returnUrl = `${baseUrl}/payment/success?intermediatePaymentId=${intermediatePayment.id}`;

    // Create PayNow payment
    const payment = paynow.createPayment(`Invoice-${intermediatePayment.id}`, data.email);
    payment.add(data.planType, amount);

    console.log("PayNow payment created:", {
      reference: `Invoice-${intermediatePayment.id}`,
      email: data.email,
      amount,
      plan: planPricing.name,
    });

    try {
      const response = await paynow.send(payment);
      
      console.log("PayNow response:", response);
      
      if (response.success) {
        // Save the poll URL for webhook verification
        await db.intermediatePayment.update({
          where: { id: intermediatePayment.id },
          data: { reference: response.pollUrl },
        });

        return successResponse(c, {
          checkoutUrl: response.redirectUrl,
          intermediatePaymentId: intermediatePayment.id,
          pollUrl: response.pollUrl,
        });
      } else {
        return errors.internalError(c, { error: response.error });
      }
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
        message: `Payment of $${intermediatePayment.amount} for ${intermediatePayment.plan} plan has been successfully processed.`,
        type: "PAYMENT_SUCCESS",
        priority: "HIGH",
        actionUrl: "/payments",
        metadata: {
          paymentId: intermediatePaymentId,
          amount: intermediatePayment.amount.toString(),
          plan: intermediatePayment.plan,
        },
      });

      // Send success email
      await sendEmail({
        to: intermediatePayment.user.email,
        subject: "Payment Successful - Connect-Ed",
        html: generatePaymentSuccessEmail({
          name: intermediatePayment.user.name,
          amount: Number(intermediatePayment.amount),
          plan: intermediatePayment.plan,
          transactionId: intermediatePaymentId,
        }),
        schoolId: intermediatePayment.schoolId,
      });
    } else {
      // Create failure notification for admin
      await createNotification({
        schoolId: intermediatePayment.schoolId,
        title: "Payment Failed",
        message: `Payment of $${intermediatePayment.amount} for ${intermediatePayment.plan} plan failed to process.`,
        type: "PAYMENT_FAILED",
        priority: "HIGH",
        actionUrl: "/payments",
        metadata: {
          paymentId: intermediatePaymentId,
          amount: intermediatePayment.amount.toString(),
          plan: intermediatePayment.plan,
        },
      });

      // Send failure email
      await sendEmail({
        to: intermediatePayment.user.email,
        subject: "Payment Failed - Connect-Ed",
        html: generatePaymentFailedEmail({
          name: intermediatePayment.user.name,
          amount: Number(intermediatePayment.amount),
          plan: intermediatePayment.plan,
        }),
        schoolId: intermediatePayment.schoolId,
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

    const intermediatePayment = await db.intermediatePayment.findUnique({
      where: { id: intermediatePaymentId },
      include: { user: true, school: true },
    });

    if (!intermediatePayment) {
      return errors.notFound(c, { error: "Payment not found" });
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

    const planPricing = PRICING[plan as keyof typeof PRICING];
    if (!planPricing) {
      return errors.validationError(c, { plan: ["Invalid plan"] });
    }

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

    const planPricing = PRICING[planType as keyof typeof PRICING];
    if (!planPricing) {
      return errors.validationError(c, { planType: ["Invalid plan type"] });
    }

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

      const updateData: any = {};
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

    const intermediatePayment = await db.intermediatePayment.update({
      where: { id: intermediatePaymentId },
      data: { paid: true },
    });

    return successResponse(c, { payment: intermediatePayment });
  } catch (error) {
    console.error("Test complete payment error:", error);
    return errors.internalError(c);
  }
});

export default payments;
