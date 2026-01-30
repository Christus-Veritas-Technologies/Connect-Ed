import { db } from "@repo/db";
import {
  verifyRefreshToken,
  getRefreshTokenCookie,
  generateAccessToken,
  generateRefreshToken,
  setRefreshTokenCookie,
} from "../../../../lib/auth";
import { successResponse, errors } from "../../../../lib/api-response";

export async function POST() {
  try {
    // Get refresh token from cookie
    const refreshToken = await getRefreshTokenCookie();

    if (!refreshToken) {
      return errors.unauthorized();
    }

    // Verify refresh token
    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) {
      return errors.unauthorized();
    }

    // Get user and verify token version
    const user = await db.user.findUnique({
      where: { id: payload.sub },
      include: { school: true },
    });

    if (!user || user.tokenVersion !== payload.version) {
      return errors.unauthorized();
    }

    // Check if user is active
    if (!user.isActive) {
      return errors.forbidden();
    }

    // Generate new tokens
    const newAccessToken = await generateAccessToken({
      userId: user.id,
      schoolId: user.schoolId,
      role: user.role,
      plan: user.school.plan,
    });

    const newRefreshToken = await generateRefreshToken({
      userId: user.id,
      tokenVersion: user.tokenVersion,
    });

    // Set new refresh token cookie
    await setRefreshTokenCookie(newRefreshToken);

    return successResponse({
      accessToken: newAccessToken,
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
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    return errors.internalError();
  }
}
