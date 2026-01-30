import { NextRequest } from "next/server";
import { db } from "@repo/db";
import { randomBytes } from "crypto";
import { forgotPasswordSchema } from "../../../../lib/validation";
import { successResponse, errors } from "../../../../lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const result = forgotPasswordSchema.safeParse(body);
    if (!result.success) {
      return errors.validationError(result.error.flatten().fieldErrors);
    }

    const { email } = result.data;

    // Find user
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return successResponse({ message: "If an account exists, a reset link has been sent" });
    }

    // Generate reset token
    const resetToken = randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save reset token
    await db.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // TODO: Send email with reset link
    // For now, just log it (in production, integrate with email service)
    console.log(`Password reset link: ${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}`);

    return successResponse({ message: "If an account exists, a reset link has been sent" });
  } catch (error) {
    console.error("Forgot password error:", error);
    return errors.internalError();
  }
}
