import { Hono } from "hono";
import { ZodError } from "zod";
import { db } from "@repo/db";
import { requireAuth } from "../middleware/auth";
import { onboardingSchema } from "../lib/validation";
import { successResponse, errors } from "../lib/response";

const onboarding = new Hono();

// Apply auth middleware to all routes
onboarding.use("*", requireAuth);

// POST /onboarding - Complete onboarding
onboarding.post("/", async (c) => {
  const schoolId = c.get("schoolId");
  console.log(`[POST /onboarding] Incoming request for school: ${schoolId}`);

  // Log raw incoming body (safely)
  let rawBody: unknown = undefined;
  try {
    rawBody = await c.req.json();
  } catch (e) {
    // could be empty or invalid JSON
    rawBody = undefined;
  }
  console.log(`[POST /onboarding] Raw body:`, rawBody);

  try {
    // Validate payload using zod schema (so we can log validation errors)
    const data = onboardingSchema.parse(rawBody);
    console.log(`[POST /onboarding] Validated data:`, {
      schoolName: data.schoolName,
      address: data.address,
      email: data.email,
      subjectsCount: Array.isArray(data.subjects) ? data.subjects.length : 0,
      classesCount: Array.isArray(data.classes) ? data.classes.length : 0,
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
          console.log(`[POST /onboarding] Creating class ${idx + 1}: ${cls.name} (capacity: ${cls.capacity}, level: ${cls.level || "N/A"})`);
          return tx.class.create({
            data: {
              name: cls.name,
              capacity: parseInt(cls.capacity),
              level: cls.level || null,
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
    console.error(`[POST /onboarding] ❌ Error during onboarding:`);
    console.error(error);

    // Zod validation errors -> return detailed validation error
    if (error instanceof ZodError) {
      console.error(`[POST /onboarding] Validation errors:`, error.errors);
      return errors.validationError(c, error.errors);
    }

    if (error instanceof Error) {
      console.error(`[POST /onboarding] Error message:`, error.message);
      console.error(`[POST /onboarding] Error stack:`, error.stack);
    }

    return errors.internalError(c);
  }
});

export default onboarding;
