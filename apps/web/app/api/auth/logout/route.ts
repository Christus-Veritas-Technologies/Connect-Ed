import { db } from "@repo/db";
import {
  verifyRefreshToken,
  getRefreshTokenCookie,
  clearRefreshTokenCookie,
} from "../../../../lib/auth";
import { successResponse, errors } from "../../../../lib/api-response";

export async function POST() {
  try {
    // Get refresh token from cookie
    const refreshToken = await getRefreshTokenCookie();

    if (refreshToken) {
      // Verify and get user ID
      const payload = await verifyRefreshToken(refreshToken);

      if (payload) {
        // Increment token version to invalidate all refresh tokens
        await db.user.update({
          where: { id: payload.sub },
          data: { tokenVersion: { increment: 1 } },
        });
      }
    }

    // Clear refresh token cookie
    await clearRefreshTokenCookie();

    return successResponse({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    // Still clear cookie even if there's an error
    await clearRefreshTokenCookie();
    return errors.internalError();
  }
}
