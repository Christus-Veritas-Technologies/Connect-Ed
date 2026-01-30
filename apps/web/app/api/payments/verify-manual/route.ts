import { NextRequest } from "next/server";
import { db, Plan } from "@repo/db";
import { successResponse, errors } from "../../../../lib/api-response";
import { PRICING } from "../../../../lib/pricing";
import { z } from "zod";

// Schema for manual payment verification (admin only)
const verifyManualPaymentSchema = z.object({
  schoolId: z.string().min(1),
  planType: z.enum(["LITE", "GROWTH", "ENTERPRISE"]),
  paymentType: z.enum(["SIGNUP", "RECURRING"]),
  reference: z.string().min(1, "Payment reference is required"),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // This endpoint would be protected by admin-only middleware in production
    // For now, we'll just check if the request has valid auth
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId) {
      return errors.unauthorized();
    }

    // Only system admin can verify payments (you would implement this)
    // For now, allow ADMIN role from any school to simulate
    if (userRole !== "ADMIN") {
      return errors.forbidden();
    }

    const body = await request.json();

    // Validate input
    const result = verifyManualPaymentSchema.safeParse(body);
    if (!result.success) {
      return errors.validationError(result.error.flatten().fieldErrors);
    }

    const { schoolId, planType, paymentType, reference, notes } = result.data;

    // Get school
    const school = await db.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      return errors.notFound("School");
    }

    const plan = planType as Plan;
    const planPricing = PRICING[plan];

    // Calculate amount
    const amount = paymentType === "SIGNUP"
      ? planPricing.signupFee + planPricing.monthlyEstimate
      : planPricing.monthlyEstimate;

    // Create payment record
    await db.schoolPayment.create({
      data: {
        schoolId,
        amount,
        type: paymentType === "SIGNUP" ? "SIGNUP_FEE" : "TERM_PAYMENT",
        status: "COMPLETED",
        paymentMethod: "CASH",
        reference: `CASH_${reference}`,
      },
    });

    // Update school
    if (paymentType === "SIGNUP") {
      await db.school.update({
        where: { id: schoolId },
        data: {
          plan,
          signupFeePaid: true,
          emailQuota: planPricing.quotas.email,
          whatsappQuota: planPricing.quotas.whatsapp,
          smsQuota: planPricing.quotas.sms,
        },
      });
    } else {
      await db.school.update({
        where: { id: schoolId },
        data: {
          isActive: true,
          emailUsed: 0,
          whatsappUsed: 0,
          smsUsed: 0,
          quotaResetDate: new Date(),
        },
      });
    }

    console.log(`Manual payment verified for school ${schoolId}: ${reference}${notes ? ` - ${notes}` : ""}`);

    return successResponse({
      message: "Payment verified successfully",
      schoolId,
      plan: planType,
      amount,
    });
  } catch (error) {
    console.error("Manual payment verification error:", error);
    return errors.internalError();
  }
}
