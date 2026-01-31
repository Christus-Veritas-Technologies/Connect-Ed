import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "@repo/db";
import { requireAuth } from "../middleware/auth";
import { onboardingSchema } from "../lib/validation";
import { successResponse, errors } from "../lib/response";

const onboarding = new Hono();

// Apply auth middleware to all routes
onboarding.use("*", requireAuth);

// POST /onboarding - Complete onboarding
onboarding.post("/", zValidator("json", onboardingSchema), async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const data = c.req.valid("json");

    // Get school
    const school = await db.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      return errors.notFound(c, "School");
    }

    // Verify payment has been made
    if (!school.signupFeePaid) {
      return errors.paymentRequired(c);
    }

    // Update school with onboarding data
    const updatedSchool = await db.school.update({
      where: { id: schoolId },
      data: {
        name: data.schoolName,
        teacherCount: data.teacherCount,
        studentCount: data.studentCount,
        onboardingComplete: true,
        isActive: true,
      },
    });

    return successResponse(c, {
      school: {
        id: updatedSchool.id,
        name: updatedSchool.name,
        plan: updatedSchool.plan,
        isActive: updatedSchool.isActive,
        onboardingComplete: updatedSchool.onboardingComplete,
      },
    });
  } catch (error) {
    console.error("Onboarding error:", error);
    return errors.internalError(c);
  }
});

export default onboarding;
