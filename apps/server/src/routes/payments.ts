import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, Plan, PaymentType, PaymentStatus, PaymentMethod, Prisma } from "@repo/db";
import { requireAuth, requireRole } from "../middleware/auth";
import { createCheckoutSchema } from "../lib/validation";
import { successResponse, errors } from "../lib/response";
import { PLAN_FEATURES } from "../lib/auth";
import { Paynow } from "paynow";
import { sendEmail } from "../lib/email";

const payments = new Hono();

// Initialize PayNow (using environment variables)
const initializePaynow = () => {
  const integrationId = process.env.PAYNOW_INTEGRATION_ID;
  const integrationKey = process.env.PAYNOW_INTEGRATION_KEY;
  
  if (!integrationId || !integrationKey) {
    console.warn("PayNow credentials not configured - using mock mode");
    return null;
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

const isSignupPayment = (plan: keyof typeof PRICING, amount: number) => {
  const total = PRICING[plan].signupFee + PRICING[plan].monthlyEstimate;
  return Math.abs(amount - total) < 0.01;
};

async function finalizePayment(intermediatePaymentId: string) {
  const intermediatePayment = await db.intermediatePayment.findUnique({
    where: { id: intermediatePaymentId },
    include: { user: true, school: true },
  });

  if (!intermediatePayment || !intermediatePayment.paid) {
    return null;
  }

  const existingPayment = await db.schoolPayment.findFirst({
    where: {
      schoolId: intermediatePayment.schoolId,
      reference: intermediatePayment.id,
    },
  });

  if (existingPayment) {
    return existingPayment;
  }

  const planKey = intermediatePayment.plan as keyof typeof PRICING;
  const planPricing = PRICING[planKey];
  const amount = new Prisma.Decimal(intermediatePayment.amount).toNumber();
  const signupPayment = isSignupPayment(planKey, amount);
  const paymentType = signupPayment ? PaymentType.SIGNUP_FEE : PaymentType.TERM_PAYMENT;

  const result = await db.$transaction(async (tx) => {
    const payment = await tx.schoolPayment.create({
      data: {
        schoolId: intermediatePayment.schoolId,
        amount: new Prisma.Decimal(amount),
        type: paymentType,
        status: PaymentStatus.COMPLETED,
        paymentMethod: PaymentMethod.ONLINE,
        reference: intermediatePayment.id,
      },
    });

    await tx.planPayment.upsert({
      where: { schoolId: intermediatePayment.schoolId },
      update: signupPayment
        ? { onceOffPaymentPaid: true, monthlyPaymentPaid: true, paid: true }
        : { monthlyPaymentPaid: true },
      create: {
        schoolId: intermediatePayment.schoolId,
        onceOffPaymentPaid: signupPayment,
        monthlyPaymentPaid: true,
        paid: signupPayment,
      },
    });

    const updateData: Prisma.SchoolUpdateInput = signupPayment
      ? {
          signupFeePaid: true,
          plan: planKey,
          emailQuota: PLAN_FEATURES[planKey].emailQuota,
          whatsappQuota: PLAN_FEATURES[planKey].whatsappQuota,
          smsQuota: PLAN_FEATURES[planKey].smsQuota,
        }
      : {
          isActive: true,
          emailUsed: 0,
          whatsappUsed: 0,
          smsUsed: 0,
          quotaResetDate: new Date(),
        };

    await tx.school.update({
      where: { id: intermediatePayment.schoolId },
      data: updateData,
    });

    return payment;
  });

  try {
    await sendEmail({
      to: intermediatePayment.user.email,
      subject: "Payment received - Connect-Ed",
      html: `
        <p>Hi ${intermediatePayment.user.name},</p>
        <p>Your payment of <strong>$${amount.toFixed(2)}</strong> was received successfully.</p>
        <p>Reference: ${intermediatePayment.id}</p>
        <p>Thank you for choosing Connect-Ed.</p>
      `,
    });
  } catch (error) {
    console.warn("Payment confirmation email failed:", error);
  }

  return result;
}

async function tryPollPaynow(intermediatePaymentId: string) {
  const intermediatePayment = await db.intermediatePayment.findUnique({
    where: { id: intermediatePaymentId },
  });

  if (!intermediatePayment?.reference) {
    return intermediatePayment;
  }

  const paynow = initializePaynow();
  if (!paynow) return intermediatePayment;

  try {
    const response: any = await (paynow as any).poll(intermediatePayment.reference);
    const status = response?.status?.toString().toLowerCase();
    const paid = response?.paid === true || status === "paid" || status === "awaiting delivery";

    if (paid) {
      const updated = await db.intermediatePayment.update({
        where: { id: intermediatePaymentId },
        data: { paid: true },
      });
      await finalizePayment(intermediatePaymentId);
      return updated;
    }
  } catch (error) {
    console.warn("PayNow poll failed:", error);
  }

  return intermediatePayment;
}

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
    
    if (!paynow) {
      // Mock mode for development
      return successResponse(c, {
        checkoutUrl: `/payment/success?intermediatePaymentId=${intermediatePayment.id}`,
        intermediatePaymentId: intermediatePayment.id,
        isDevelopment: true,
      });
    }

    // Set PayNow URLs
    const baseUrl = process.env.APP_URL || "http://localhost:3000";
    paynow.resultUrl = `${baseUrl}/api/payments/callback`;
    paynow.returnUrl = `/payment/success?intermediatePaymentId=${intermediatePayment.id}`;

    // Create PayNow payment
    const payment = paynow.createPayment(`Invoice-${intermediatePayment.id}`, data.email);
    payment.add(`${data.planType} plan`, amount);

    try {
      const response = await paynow.send(payment);
      
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
      return errors.internalError(c);
    }
  } catch (error) {
    console.error("Create checkout error:", error);
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

    // Update intermediate payment
    if (paid) {
      await db.intermediatePayment.update({
        where: { id: intermediatePaymentId },
        data: { paid: true },
      });
      await finalizePayment(intermediatePaymentId);
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

    if (intermediatePayment && !intermediatePayment.paid) {
      const polled = await tryPollPaynow(intermediatePaymentId);
      if (polled) {
        intermediatePayment = await db.intermediatePayment.findUnique({
          where: { id: intermediatePaymentId },
          include: { user: true, school: true },
        });
      }
    }

    if (intermediatePayment?.paid) {
      await finalizePayment(intermediatePaymentId);
    }

    return successResponse(c, {
      payment: intermediatePayment,
      isPaid: !!intermediatePayment?.paid,
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

export default payments;
