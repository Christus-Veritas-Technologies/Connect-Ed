import { NextRequest } from "next/server";
import { db } from "@repo/db";
import { verifyPassword } from "../../../../lib/password";
import {
  generateAccessToken,
  generateRefreshToken,
  setRefreshTokenCookie,
} from "../../../../lib/auth";
import { loginSchema } from "../../../../lib/validation";
import { successResponse, errors } from "../../../../lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return errors.validationError(result.error.flatten().fieldErrors);
    }

    const { email, password } = result.data;

    // Find user with school
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { school: true },
    });

    if (!user) {
      return errors.unauthorized();
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return errors.unauthorized();
    }

    // Check if user is active
    if (!user.isActive) {
      return errors.forbidden();
    }

    // Generate tokens
    const accessToken = await generateAccessToken({
      userId: user.id,
      schoolId: user.schoolId,
      role: user.role,
      plan: user.school.plan,
    });

    const refreshToken = await generateRefreshToken({
      userId: user.id,
      tokenVersion: user.tokenVersion,
    });

    // Set refresh token cookie
    await setRefreshTokenCookie(refreshToken);

    return successResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      school: {
        id: user.school.id,
        name: user.school.name,
        plan: user.school.plan,
        isActive: user.school.isActive,
        signupFeePaid: user.school.signupFeePaid,
        onboardingComplete: user.school.onboardingComplete,
      },
      accessToken,
    });
  } catch (error) {
    console.error("Login error:", error);
    return errors.internalError();
  }
}
