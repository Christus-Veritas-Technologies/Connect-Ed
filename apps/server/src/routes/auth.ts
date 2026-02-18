import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, Plan, Role } from "@repo/db";
import { hashPassword, verifyPassword } from "../lib/password";
import {
  generateAccessToken,
  generateRefreshToken,
  generateParentAccessToken,
  generateParentRefreshToken,
  setRefreshTokenCookie,
  getRefreshTokenCookie,
  clearRefreshTokenCookie,
  verifyRefreshToken,
  verifyParentRefreshToken,
  PLAN_FEATURES,
} from "../lib/auth";
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../lib/validation";
import { successResponse, errors, errorResponse } from "../lib/response";
import { sendEmail, generatePasswordResetEmail } from "../lib/email";
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

// POST /auth/login - Unified login for all user types
auth.post("/login", zValidator("json", loginSchema), async (c) => {
  try {
    const { email, password } = c.req.valid("json");
    const emailLower = email.toLowerCase();

    // Try to find user in User model (Admin, Receptionist, Teacher)
    const staffUser = await db.user.findUnique({
      where: { email: emailLower },
      include: { school: true },
    }) as any;

    if (staffUser) {
      // Verify password
      const isValid = await verifyPassword(password, staffUser.password);
      if (!isValid) {
        console.log(`[Login] Invalid password for staff: ${emailLower}`);
        return errorResponse(c, "INVALID_CREDENTIALS", "Invalid email or password", 401);
      }

      // Check if user is active
      if (!staffUser.isActive) {
        console.log(`[Login] Staff user is inactive: ${emailLower}`);
        return errorResponse(c, "ACCOUNT_INACTIVE", "This account has been deactivated", 403);
      }

      // Generate tokens
      const accessToken = await generateAccessToken({
        userId: staffUser.id,
        schoolId: staffUser.schoolId,
        role: staffUser.role,
        plan: staffUser.school.plan,
      });

      const refreshToken = await generateRefreshToken({
        userId: staffUser.id,
        tokenVersion: staffUser.tokenVersion,
      });

      setRefreshTokenCookie(c, refreshToken);
      console.log(`[Login] Successful staff login: ${emailLower}, role: ${staffUser.role}`);

      return successResponse(c, {
        user: {
          id: staffUser.id,
          email: staffUser.email,
          name: staffUser.name,
          role: staffUser.role,
          onboardingComplete: staffUser.onboardingComplete,
        },
        school: {
          id: staffUser.school.id,
          name: staffUser.school.name,
          plan: staffUser.school.plan,
          isActive: staffUser.school.isActive,
          signupFeePaid: staffUser.school.signupFeePaid,
          onboardingComplete: staffUser.school.onboardingComplete,
          country: staffUser.school.country,
          currency: staffUser.school.currency,
          termlyFee: staffUser.school.termlyFee,
          currentTermNumber: staffUser.school.currentTermNumber,
          currentTermYear: staffUser.school.currentTermYear,
          termStartDate: staffUser.school.termStartDate,
          currentPeriodType: staffUser.school.currentPeriodType,
          holidayStartDate: staffUser.school.holidayStartDate,
          nextPaymentDate: staffUser.school.nextPaymentDate,
        },
        userType: "STAFF",
        accessToken,
      });
    }

    // Try to find parent
    const parent = await db.parent.findUnique({
      where: { email: emailLower },
      include: { 
        school: true,
        children: {
          include: {
            class: true,
          }
        }
      },
    }) as any;

    if (parent) {
      // Verify password
      const isValid = await verifyPassword(password, parent.password);
      if (!isValid) {
        console.log(`[Login] Invalid password for parent: ${emailLower}`);
        return errorResponse(c, "INVALID_CREDENTIALS", "Invalid email or password", 401);
      }

      // Check if parent is active
      if (!parent.isActive) {
        console.log(`[Login] Parent is inactive: ${emailLower}`);
        return errorResponse(c, "ACCOUNT_INACTIVE", "This account has been deactivated", 403);
      }

      // Generate tokens with PARENT role
      const accessToken = await generateParentAccessToken({
        parentId: parent.id,
        schoolId: parent.schoolId,
        plan: parent.school.plan,
      });

      const refreshToken = await generateParentRefreshToken({
        parentId: parent.id,
        tokenVersion: parent.tokenVersion,
      });

      setRefreshTokenCookie(c, refreshToken);
      console.log(`[Login] Successful parent login: ${emailLower}`);

      return successResponse(c, {
        user: {
          id: parent.id,
          email: parent.email,
          name: parent.name,
          role: "PARENT",
          onboardingComplete: parent.onboardingComplete,
          children: parent.children.map((s: any) => ({
            id: s.id,
            name: `${s.firstName} ${s.lastName}`,
            class: s.class?.name,
          })),
        },
        school: {
          id: parent.school.id,
          name: parent.school.name,
          plan: parent.school.plan,
          isActive: parent.school.isActive,
          signupFeePaid: parent.school.signupFeePaid,
          onboardingComplete: parent.school.onboardingComplete,
          country: parent.school.country,
          currency: parent.school.currency,
          termlyFee: parent.school.termlyFee,
          currentTermNumber: parent.school.currentTermNumber,
          currentTermYear: parent.school.currentTermYear,
          termStartDate: parent.school.termStartDate,
          currentPeriodType: parent.school.currentPeriodType,
          holidayStartDate: parent.school.holidayStartDate,
          nextPaymentDate: parent.school.nextPaymentDate,
        },
        userType: "PARENT",
        accessToken,
      });
    }

    // Try to find student
    const student = await db.student.findFirst({
      where: { email: emailLower },
      include: { 
        school: true,
        class: true,
        parent: true,
      },
    }) as any;

    if (student) {
      // Check if student has password (some students might not have accounts)
      if (!student.password) {
        console.log(`[Login] Student has no password set: ${emailLower}`);
        return errorResponse(c, "ACCOUNT_SETUP_REQUIRED", "Please contact your school administrator to set up your account", 403);
      }

      // Verify password
      const isValid = await verifyPassword(password, student.password);
      if (!isValid) {
        console.log(`[Login] Invalid password for student: ${emailLower}`);
        return errorResponse(c, "INVALID_CREDENTIALS", "Invalid email or password", 401);
      }

      // Check if student is active
      if (!student.isActive) {
        console.log(`[Login] Student is inactive: ${emailLower}`);
        return errorResponse(c, "ACCOUNT_INACTIVE", "This account has been deactivated", 403);
      }

      // Generate tokens with STUDENT role
      const accessToken = await generateAccessToken({
        userId: student.id,
        schoolId: student.schoolId,
        role: "STUDENT" as any,
        plan: student.school.plan,
      });

      const refreshToken = await generateRefreshToken({
        userId: student.id,
        tokenVersion: student.tokenVersion || 0,
      });

      setRefreshTokenCookie(c, refreshToken);
      console.log(`[Login] Successful student login: ${emailLower}`);

      return successResponse(c, {
        user: {
          id: student.id,
          email: student.email,
          name: `${student.firstName} ${student.lastName}`,
          role: "STUDENT",
          onboardingComplete: student.onboardingComplete,
          admissionNumber: student.admissionNumber,
          class: student.class?.name,
        },
        school: {
          id: student.school.id,
          name: student.school.name,
          plan: student.school.plan,
          isActive: student.school.isActive,
          signupFeePaid: student.school.signupFeePaid,
          onboardingComplete: student.school.onboardingComplete,
          country: student.school.country,
          currency: student.school.currency,
          termlyFee: student.school.termlyFee,
          currentTermNumber: student.school.currentTermNumber,
          currentTermYear: student.school.currentTermYear,
          termStartDate: student.school.termStartDate,
          currentPeriodType: student.school.currentPeriodType,
          holidayStartDate: student.school.holidayStartDate,
          nextPaymentDate: student.school.nextPaymentDate,
        },
        userType: "STUDENT",
        accessToken,
      });
    }

    // No user found in any model
    console.log(`[Login] No account found: ${emailLower}`);
    return errorResponse(c, "INVALID_CREDENTIALS", "Invalid email or password", 401);
  } catch (error) {
    console.error("Login error:", error);
    return errors.internalError(c);
  }
});

// POST /auth/refresh - Unified refresh for all user types
auth.post("/refresh", async (c) => {
  try {
    // Get refresh token from cookie
    const refreshToken = getRefreshTokenCookie(c);

    if (!refreshToken) {
      return errors.unauthorized(c);
    }

    // Try staff/student refresh token first
    let payload = await verifyRefreshToken(refreshToken);
    let isParent = false;

    // If staff token didn't work, try parent token
    if (!payload) {
      const parentPayload = await verifyParentRefreshToken(refreshToken);
      if (parentPayload) {
        payload = parentPayload as any;
        isParent = true;
      }
    }

    if (!payload) {
      return errors.unauthorized(c);
    }

    // If it's a parent token, handle parent refresh
    if (isParent) {
      const parent = await db.parent.findUnique({
        where: { id: payload.sub },
        include: {
          school: true,
          children: { include: { class: true } },
        },
      }) as any;

      if (parent && parent.tokenVersion === payload.version) {
        if (!parent.isActive) {
          return errors.forbidden(c);
        }

        console.log("[AUTH REFRESH] Parent found:", {
          parentId: parent.id,
          parentName: parent.name,
          childrenCount: parent.children?.length || 0,
          children: parent.children?.map((s: any) => ({
            id: s.id,
            name: `${s.firstName} ${s.lastName}`,
          })) || [],
        });

        const newAccessToken = await generateParentAccessToken({
          parentId: parent.id,
          schoolId: parent.schoolId,
          plan: parent.school.plan,
        });

        const newRefreshToken = await generateParentRefreshToken({
          parentId: parent.id,
          tokenVersion: parent.tokenVersion,
        });

        setRefreshTokenCookie(c, newRefreshToken);

        return successResponse(c, {
          user: {
            id: parent.id,
            email: parent.email,
            name: parent.name,
            role: "PARENT",
            onboardingComplete: parent.onboardingComplete,
            children: parent.children.map((s: any) => ({
              id: s.id,
              name: `${s.firstName} ${s.lastName}`,
              class: s.class?.name,
            })),
          },
          school: {
            id: parent.school.id,
            name: parent.school.name,
            plan: parent.school.plan,
            isActive: parent.school.isActive,
            signupFeePaid: parent.school.signupFeePaid,
            onboardingComplete: parent.school.onboardingComplete,
            country: parent.school.country,
            currency: parent.school.currency,
            termlyFee: parent.school.termlyFee,
            currentTermNumber: parent.school.currentTermNumber,
            currentTermYear: parent.school.currentTermYear,
            termStartDate: parent.school.termStartDate,
            currentPeriodType: parent.school.currentPeriodType,
            holidayStartDate: parent.school.holidayStartDate,
            nextPaymentDate: parent.school.nextPaymentDate,
          },
          userType: "PARENT",
          accessToken: newAccessToken,
        });
      }

      return errors.unauthorized(c);
    }

    // Handle staff/student refresh
    // Try to find staff user first
    const staffUser = await db.user.findUnique({
      where: { id: payload.sub },
      include: { school: true },
    }) as any;

    if (staffUser && staffUser.tokenVersion === payload.version) {
      // Check if user is active
      if (!staffUser.isActive) {
        return errors.forbidden(c);
      }

      // Generate new tokens
      const newAccessToken = await generateAccessToken({
        userId: staffUser.id,
        schoolId: staffUser.schoolId,
        role: staffUser.role,
        plan: staffUser.school.plan,
      });

      const newRefreshToken = await generateRefreshToken({
        userId: staffUser.id,
        tokenVersion: staffUser.tokenVersion,
      });

      setRefreshTokenCookie(c, newRefreshToken);

      return successResponse(c, {
        user: {
          id: staffUser.id,
          email: staffUser.email,
          name: staffUser.name,
          role: staffUser.role,
          onboardingComplete: staffUser.onboardingComplete,
        },
        school: {
          id: staffUser.school.id,
          name: staffUser.school.name,
          plan: staffUser.school.plan,
          isActive: staffUser.school.isActive,
          signupFeePaid: staffUser.school.signupFeePaid,
          onboardingComplete: staffUser.school.onboardingComplete,
          country: staffUser.school.country,
          currency: staffUser.school.currency,
          termlyFee: staffUser.school.termlyFee,
          currentTermNumber: staffUser.school.currentTermNumber,
          currentTermYear: staffUser.school.currentTermYear,
          termStartDate: staffUser.school.termStartDate,
          currentPeriodType: staffUser.school.currentPeriodType,
          holidayStartDate: staffUser.school.holidayStartDate,
          nextPaymentDate: staffUser.school.nextPaymentDate,
        },
        userType: "STAFF",
        accessToken: newAccessToken,
      });
    }

    // Try to find student
    const student = await db.student.findUnique({
      where: { id: payload.sub },
      include: {
        school: true,
        class: true,
      },
    }) as any;

    if (student && (student.tokenVersion || 0) === payload.version) {
      if (!student.isActive) {
        return errors.forbidden(c);
      }

      const newAccessToken = await generateAccessToken({
        userId: student.id,
        schoolId: student.schoolId,
        role: "STUDENT" as any,
        plan: student.school.plan,
      });

      const newRefreshToken = await generateRefreshToken({
        userId: student.id,
        tokenVersion: student.tokenVersion || 0,
      });

      setRefreshTokenCookie(c, newRefreshToken);

      return successResponse(c, {
        user: {
          id: student.id,
          email: student.email,
          name: `${student.firstName} ${student.lastName}`,
          role: "STUDENT",
          onboardingComplete: student.onboardingComplete,
          admissionNumber: student.admissionNumber,
          class: student.class?.name,
        },
        school: {
          id: student.school.id,
          name: student.school.name,
          plan: student.school.plan,
          isActive: student.school.isActive,
          signupFeePaid: student.school.signupFeePaid,
          onboardingComplete: student.school.onboardingComplete,
          country: student.school.country,
          currency: student.school.currency,
          termlyFee: student.school.termlyFee,
          currentTermNumber: student.school.currentTermNumber,
          currentTermYear: student.school.currentTermYear,
          termStartDate: student.school.termStartDate,
          currentPeriodType: student.school.currentPeriodType,
          holidayStartDate: student.school.holidayStartDate,
          nextPaymentDate: student.school.nextPaymentDate,
        },
        userType: "STUDENT",
        accessToken: newAccessToken,
      });
    }

    // No valid user found or token version mismatch
    // User was deleted from database or token is invalid - treat as unauthorized
    console.log(`Invalid refresh attempt: user ${payload.sub} not found or token mismatch`);
    return errors.unauthorized(c);
  } catch (error) {
    console.error("Refresh token error:", error);
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

    // Find user with schoolId
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        name: true,
        email: true,
        schoolId: true,
      },
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

    // Send password reset email
    const emailHtml = generatePasswordResetEmail({
      name: user.name,
      resetToken,
    });

    const emailSent = await sendEmail({
      to: user.email,
      subject: "Reset Your Connect-Ed Password",
      html: emailHtml,
      schoolId: user.schoolId,
      type: "NOREPLY",
    });

    if (emailSent) {
      console.log(`✅ Password reset email sent to ${user.email}`);
    } else {
      console.error(`❌ Failed to send password reset email to ${user.email}`);
    }

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
