import { NextRequest } from "next/server";
import { db, Plan, Role } from "@repo/db";
import { hashPassword } from "../../../../lib/password";
import {
  generateAccessToken,
  generateRefreshToken,
  setRefreshTokenCookie,
  PLAN_FEATURES,
} from "../../../../lib/auth";
import { signupSchema } from "../../../../lib/validation";
import { successResponse, errors } from "../../../../lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const result = signupSchema.safeParse(body);
    if (!result.success) {
      return errors.validationError(result.error.flatten().fieldErrors);
    }

    const { email, password, name } = result.data;

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return errors.conflict("An account with this email already exists");
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
    await setRefreshTokenCookie(refreshToken);

    return successResponse(
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
    return errors.internalError();
  }
}
