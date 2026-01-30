import { NextRequest } from "next/server";
import { db } from "@repo/db";
import { hashPassword } from "../../../../lib/password";
import { resetPasswordSchema } from "../../../../lib/validation";
import { successResponse, errors } from "../../../../lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const result = resetPasswordSchema.safeParse(body);
    if (!result.success) {
      return errors.validationError(result.error.flatten().fieldErrors);
    }

    const { token, password } = result.data;

    // Find user with valid reset token
    const user = await db.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return errors.validationError({ token: ["Invalid or expired reset token"] });
    }

    // Hash new password
    const hashedPassword = await hashPassword(password);

    // Update password and clear reset token
    await db.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
        tokenVersion: { increment: 1 }, // Invalidate all sessions
      },
    });

    return successResponse({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    return errors.internalError();
  }
}
