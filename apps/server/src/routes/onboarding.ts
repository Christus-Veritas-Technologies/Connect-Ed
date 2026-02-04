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
  const schoolId = c.get("schoolId");
  console.log(`[POST /onboarding] Starting onboarding for school: ${schoolId}`);
  
  try {
    const data = c.req.valid("json");
    console.log(`[POST /onboarding] Validated data:`, {
      schoolName: data.schoolName,
      address: data.address,
      email: data.email,
      subjectsCount: data.subjects.length,
      classesCount: data.classes.length,
      teacherCount: data.teacherCount,
      studentCount: data.studentCount,
    });

    // Get school
    const school = await db.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      console.log(`[POST /onboarding] School not found: ${schoolId}`);
      return errors.notFound(c, "School");
    }

    console.log(`[POST /onboarding] Found school: ${school.name} (${school.id})`);

    // Verify payment has been made
    if (!school.signupFeePaid) {
      console.log(`[POST /onboarding] Payment not completed for school: ${schoolId}`);
      return errors.paymentRequired(c);
    }

    console.log(`[POST /onboarding] Payment verified, starting transaction...`);

    // Update school and create related records in a transaction
    const result = await db.$transaction(async (tx) => {
      // Update school with onboarding data
      console.log(`[POST /onboarding] Updating school with onboarding data...`);
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
      console.log(`[POST /onboarding] School updated: ${updatedSchool.name}`);

      // Create subjects
      console.log(`[POST /onboarding] Creating ${data.subjects.length} subjects...`);
      const createdSubjects = await Promise.all(
        data.subjects.map((subject, idx) => {
          console.log(`[POST /onboarding] Creating subject ${idx + 1}: ${subject.name}`);
          return tx.subject.create({
            data: {
              name: subject.name,
              code: subject.name.substring(0, 3).toUpperCase(),
              schoolId,
            },
          });
        })
      );
      console.log(`[POST /onboarding] Created ${createdSubjects.length} subjects`);

      // Create classes
      console.log(`[POST /onboarding] Creating ${data.classes.length} classes...`);
      const createdClasses = await Promise.all(
        data.classes.map((cls, idx) => {
          console.log(`[POST /onboarding] Creating class ${idx + 1}: ${cls.name} (capacity: ${cls.capacity})`);
          return tx.class.create({
            data: {
              name: cls.name,
              capacity: parseInt(cls.capacity),
              schoolId,
            },
          });
        })
      );
      console.log(`[POST /onboarding] Created ${createdClasses.length} classes`);

      return {
        school: updatedSchool,
        subjects: createdSubjects,
        classes: createdClasses,
      };
    });

    console.log(`[POST /onboarding] ✅ Onboarding completed successfully for school: ${schoolId}`);
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
    console.error(`[POST /onboarding] ❌ Error during onboarding:`, error);
    if (error instanceof Error) {
      console.error(`[POST /onboarding] Error message:`, error.message);
      console.error(`[POST /onboarding] Error stack:`, error.stack);
    }
    return errors.internalError(c);
  }
});

export default onboarding;
