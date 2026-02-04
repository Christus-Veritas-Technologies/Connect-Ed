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

    // Update school and create related records in a transaction
    const result = await db.$transaction(async (tx) => {
      // Update school with onboarding data
      const updatedSchool = await tx.school.update({
        where: { id: schoolId },
        data: {
          name: data.schoolName,
          teacherCount: data.teacherCount,
          studentCount: data.studentCount,
          onboardingComplete: true,
          isActive: true,
        },
      });

      // Create subjects
      const createdSubjects = await Promise.all(
        data.subjects.map((subject) =>
          tx.subject.create({
            data: {
              name: subject.name,
              code: subject.name.substring(0, 3).toUpperCase(),
              schoolId,
            },
          })
        )
      );

      // Create classes
      const createdClasses = await Promise.all(
        data.classes.map((cls) =>
          tx.class.create({
            data: {
              name: cls.name,
              capacity: parseInt(cls.capacity),
              schoolId,
            },
          })
        )
      );

      return {
        school: updatedSchool,
        subjects: createdSubjects,
        classes: createdClasses,
      };
    });

    return successResponse(c, {
      school: {
        id: result.school.id,
        name: result.school.name,
        plan: result.school.plan,
        isActive: result.school.isActive,
        onboardingComplete: result.school.onboardingComplete,
      },
      subjects: result.subjects,
      classes: result.classes,
    });
  } catch (error) {
    console.error("Onboarding error:", error);
    return errors.internalError(c);
  }
});

export default onboarding;
