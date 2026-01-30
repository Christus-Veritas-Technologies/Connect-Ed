import { NextRequest } from "next/server";
import { db, Plan } from "@repo/db";
import { createSubscriptionCheckout } from "@/lib/dodo-payments";
import { createCheckoutSchema } from "@/lib/validation";
import { successResponse, errors } from "@/lib/api-response";
import { calculateSignupTotal, calculateMonthlyPayment } from "@/lib/pricing";

export async function POST(request: NextRequest) {
  try {
    // Get user info from middleware headers
    const userId = request.headers.get("x-user-id");
    const schoolId = request.headers.get("x-school-id");

    if (!userId || !schoolId) {
      return errors.unauthorized();
    }

    const body = await request.json();

    // Validate input
    const result = createCheckoutSchema.safeParse(body);
    if (!result.success) {
      return errors.validationError(result.error.flatten().fieldErrors);
    }

    const { planType, paymentType } = result.data;

    // Get school and user
    const [school, user] = await Promise.all([
      db.school.findUnique({ where: { id: schoolId } }),
      db.user.findUnique({ where: { id: userId } }),
    ]);

    if (!school || !user) {
      return errors.notFound("School or User");
    }

    // Calculate amount based on payment type
    const plan = planType as Plan;
    const amount = paymentType === "SIGNUP" 
      ? calculateSignupTotal(plan)
      : calculateMonthlyPayment(plan);

    // Check if Dodo API key is configured
    if (!process.env.DODO_PAYMENTS_API_KEY) {
      console.log("[DEV] Mock checkout created:", { amount, plan, paymentType });
      
      // Create pending payment record for development
      await db.schoolPayment.create({
        data: {
          schoolId,
          amount,
          type: paymentType === "SIGNUP" ? "SIGNUP_FEE" : "TERM_PAYMENT",
          status: "PENDING",
          paymentMethod: "ONLINE",
          reference: `dev_${Date.now()}`,
        },
      });

      return successResponse({
        checkoutUrl: `/payment/mock-checkout?amount=${amount}&plan=${plan}&type=${paymentType}&schoolId=${schoolId}`,
        sessionId: `dev_session_${Date.now()}`,
        isDevelopment: true,
      });
    }

    // Create Dodo Payments checkout session
    const checkout = await createSubscriptionCheckout({
      schoolId,
      userId,
      email: user.email,
      planType: plan,
      isSignup: paymentType === "SIGNUP",
      returnUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    });

    // Create pending payment record
    await db.schoolPayment.create({
      data: {
        schoolId,
        amount,
        type: paymentType === "SIGNUP" ? "SIGNUP_FEE" : "TERM_PAYMENT",
        status: "PENDING",
        paymentMethod: "ONLINE",
        reference: checkout.sessionId,
      },
    });

    return successResponse({
      checkoutUrl: checkout.checkoutUrl,
      sessionId: checkout.sessionId,
    });
  } catch (error) {
    console.error("Create checkout error:", error);
    return errors.internalError();
  }
}
