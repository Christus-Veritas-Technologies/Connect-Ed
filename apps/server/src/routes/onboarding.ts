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
  const userId = c.get("userId");
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
          country: data.country || null,
          currency: data.country === "ZA" ? "ZAR" : "USD",
          teacherCount: data.teacherCount,
          studentCount: data.studentCount,
          onboardingComplete: true,
          isActive: true,
          termlyFee: data.termlyFee || null,
          currentTermNumber: data.currentTermNumber || null,
          currentTermYear: data.currentTermYear || null,
          termStartDate: data.currentTermYear && data.termStartMonth && data.termStartDay
            ? new Date(data.currentTermYear, data.termStartMonth - 1, data.termStartDay)
            : null,
          currentPeriodType: "TERM",
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

      // Create grades per subject if provided
      let createdGrades: any[] = [];
      if (data.grades && data.grades.length > 0) {
        console.log(`[POST /onboarding] Creating grades for ${data.grades.length} subjects...`);
        for (const subjectGrades of data.grades) {
          const subject = createdSubjects.find(s => s.name === subjectGrades.subjectName);
          if (subject) {
            for (const grade of subjectGrades.grades) {
              const created = await tx.grade.create({
                data: {
                  name: grade.name,
                  minMark: grade.minMark,
                  maxMark: grade.maxMark,
                  isPass: grade.isPass,
                  subjectId: subject.id,
                  schoolId,
                },
              });
              createdGrades.push(created);
            }
          }
        }
        console.log(`[POST /onboarding] Created ${createdGrades.length} grade definitions`);
      }

      // Also mark the admin user's onboarding as complete
      await tx.user.update({
        where: { id: userId },
        data: { onboardingComplete: true },
      });

      return {
        school: updatedSchool,
        subjects: createdSubjects,
        classes: createdClasses,
        grades: createdGrades,
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
      grades: result.grades,
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

// POST /onboarding/user-complete - Mark current user's onboarding as complete (non-admin users)
onboarding.post("/user-complete", async (c) => {
  const userId = c.get("userId");
  const role = c.get("role");
  const schoolId = c.get("schoolId");

  try {
    // For staff users (TEACHER, RECEPTIONIST)
    if (role === "ADMIN" || role === "TEACHER" || role === "RECEPTIONIST") {
      await db.user.update({
        where: { id: userId },
        data: { onboardingComplete: true },
      });
      return successResponse(c, { message: "Onboarding completed" });
    }

    // For parent users
    if (role === "PARENT") {
      await db.parent.update({
        where: { id: userId },
        data: { onboardingComplete: true },
      });
      return successResponse(c, { message: "Onboarding completed" });
    }

    // For student users
    if (role === "STUDENT") {
      await db.student.update({
        where: { id: userId },
        data: { onboardingComplete: true },
      });
      return successResponse(c, { message: "Onboarding completed" });
    }

    return errors.badRequest(c, "Unknown role");
  } catch (error) {
    console.error("User onboarding complete error:", error);
    return errors.internalError(c);
  }
});

export default onboarding;
