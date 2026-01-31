import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, Plan, PaymentType, PaymentStatus, PaymentMethod } from "@repo/db";
import { requireAuth, requireRole } from "../middleware/auth";
import { createCheckoutSchema } from "../lib/validation";
import { successResponse, errors } from "../lib/response";
import { PLAN_FEATURES } from "../lib/auth";

const payments = new Hono();

// Pricing configuration
const PRICING = {
  LITE: {
    signupFee: 400,
    perTermCost: 50,
    monthlyEstimate: 17,
  },
  GROWTH: {
    signupFee: 750,
    perTermCost: 90,
    monthlyEstimate: 30,
  },
  ENTERPRISE: {
    signupFee: 1200,
    perTermCost: 150,
    monthlyEstimate: 50,
  },
} as const;

// POST /payments/create-checkout - Create checkout session
payments.post("/create-checkout", requireAuth, zValidator("json", createCheckoutSchema), async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const userId = c.get("userId");
    const data = c.req.valid("json");

    const planPricing = PRICING[data.planType];
    const amount = data.paymentType === "SIGNUP"
      ? planPricing.signupFee + planPricing.monthlyEstimate
      : planPricing.monthlyEstimate;

    // Create pending payment record
    const payment = await db.schoolPayment.create({
      data: {
        schoolId,
        amount,
        type: data.paymentType === "SIGNUP" ? PaymentType.SIGNUP_FEE : PaymentType.TERM_PAYMENT,
        status: PaymentStatus.PENDING,
        paymentMethod: PaymentMethod.ONLINE,
        reference: `checkout_${Date.now()}`,
      },
    });

    // In production, you would create a Dodo Payments checkout session here
    // For now, return a mock checkout URL
    const checkoutUrl = process.env.DODO_PAYMENTS_API_KEY
      ? `https://checkout.dodopayments.com/${payment.id}` // Would be real URL
      : `/payment/mock-checkout?amount=${amount}&plan=${data.planType}&type=${data.paymentType}&paymentId=${payment.id}`;

    return successResponse(c, {
      checkoutUrl,
      paymentId: payment.id,
      amount,
      isDevelopment: !process.env.DODO_PAYMENTS_API_KEY,
    });
  } catch (error) {
    console.error("Create checkout error:", error);
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
