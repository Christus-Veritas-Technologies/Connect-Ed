import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, Plan, Role } from "@repo/db";
import { hashPassword, verifyPassword } from "../lib/password";
import {
  generateAccessToken,
  generateRefreshToken,
  setRefreshTokenCookie,
  getRefreshTokenCookie,
  clearRefreshTokenCookie,
  verifyRefreshToken,
  PLAN_FEATURES,
} from "../lib/auth";
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../lib/validation";
import { successResponse, errors, errorResponse } from "../lib/response";
import { randomBytes } from "crypto";

const auth = new Hono();

// POST /auth/signup
auth.post("/signup", zValidator("json", signupSchema), async (c) => {
  try {
    const { email, password, name } = c.req.valid("json");

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return errors.conflict(c, "An account with this email already exists");
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create school and admin user in a transaction
    const { user, school } = await db.$transaction(async (tx) => {
      // Create school with default Lite plan
      const school = await tx.school.create({
        data: {
          plan: Plan.LITE,
          isActive: false,
          signupFeePaid: false,
          onboardingComplete: false,
          emailQuota: PLAN_FEATURES.LITE.emailQuota,
          whatsappQuota: PLAN_FEATURES.LITE.whatsappQuota,
          smsQuota: PLAN_FEATURES.LITE.smsQuota,
        },
      });

      // Create admin user
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          name,
          role: Role.ADMIN,
          schoolId: school.id,
        },
      });

      return { user, school };
    });

    // Generate tokens
    const accessToken = await generateAccessToken({
      userId: user.id,
      schoolId: school.id,
      role: user.role,
      plan: school.plan,
    });

    const refreshToken = await generateRefreshToken({
      userId: user.id,
      tokenVersion: user.tokenVersion,
    });

    // Set refresh token cookie
    setRefreshTokenCookie(c, refreshToken);

    return successResponse(
      c,
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        school: {
          id: school.id,
          plan: school.plan,
          isActive: school.isActive,
          signupFeePaid: school.signupFeePaid,
        },
        accessToken,
      },
      201
    );
  } catch (error) {
    console.error("Signup error:", error);
    return errors.internalError(c);
  }
});

// POST /auth/login
auth.post("/login", zValidator("json", loginSchema), async (c) => {
  try {
    const { email, password } = c.req.valid("json");

    // Find user with school
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { school: true },
    });

    if (!user) {
      console.log(`[Login] User not found: ${email}`);
      return errorResponse(c, "INVALID_CREDENTIALS", "Invalid email or password", 401);
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      console.log(`[Login] Invalid password for user: ${email}`);
      return errorResponse(c, "INVALID_CREDENTIALS", "Invalid email or password", 401);
    }

    // Check if user is active
    if (!user.isActive) {
      console.log(`[Login] User is inactive: ${email}`);
      return errorResponse(c, "ACCOUNT_INACTIVE", "This account has been deactivated", 403);
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
    setRefreshTokenCookie(c, refreshToken);

    console.log(`[Login] Successful login for user: ${email}`);

    return successResponse(c, {
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
    return errors.internalError(c);
  }
});

// POST /auth/refresh
auth.post("/refresh", async (c) => {
  try {
    // Get refresh token from cookie
    const refreshToken = getRefreshTokenCookie(c);

    if (!refreshToken) {
      return errors.unauthorized(c);
    }

    // Verify refresh token
    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) {
      return errors.unauthorized(c);
    }

    // Get user and verify token version
    const user = await db.user.findUnique({
      where: { id: payload.sub },
      include: { school: true },
    });

    if (!user || user.tokenVersion !== payload.version) {
      return errors.unauthorized(c);
    }

    // Check if user is active
    if (!user.isActive) {
      return errors.forbidden(c);
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
    setRefreshTokenCookie(c, newRefreshToken);

    return successResponse(c, {
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
    return errors.internalError(c);
  }
});

// POST /auth/logout
auth.post("/logout", async (c) => {
  try {
    const refreshToken = getRefreshTokenCookie(c);

    if (refreshToken) {
      const payload = await verifyRefreshToken(refreshToken);

      if (payload) {
        // Increment token version to invalidate all refresh tokens
        await db.user.update({
          where: { id: payload.sub },
          data: { tokenVersion: { increment: 1 } },
        });
      }
    }

    // Clear the cookie
    clearRefreshTokenCookie(c);

    return successResponse(c, { message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    return errors.internalError(c);
  }
});

// POST /auth/forgot-password
auth.post("/forgot-password", zValidator("json", forgotPasswordSchema), async (c) => {
  try {
    const { email } = c.req.valid("json");

    // Find user
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return successResponse(c, {
        message: "If an account exists, a password reset link will be sent",
      });
    }

    // Generate reset token
    const resetToken = randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token
    await db.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // TODO: Send email with reset link
    console.log(
      `Password reset token for ${email}: ${resetToken}`
    );

    return successResponse(c, {
      message: "If an account exists, a password reset link will be sent",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return errors.internalError(c);
  }
});

// POST /auth/reset-password
auth.post("/reset-password", zValidator("json", resetPasswordSchema), async (c) => {
  try {
    const { token, password } = c.req.valid("json");

    // Find user with valid reset token
    const user = await db.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return errors.validationError(c, { token: ["Invalid or expired reset token"] });
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

    return successResponse(c, { message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    return errors.internalError(c);
  }
});

export default auth;
