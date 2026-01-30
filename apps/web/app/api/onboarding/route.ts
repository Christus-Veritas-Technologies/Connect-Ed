import { NextRequest } from "next/server";
import { db } from "@repo/db";
import { onboardingSchema } from "../../../lib/validation";
import { successResponse, errors } from "../../../lib/api-response";

export async function POST(request: NextRequest) {
  try {
    // Get user info from middleware headers
    const userId = request.headers.get("x-user-id");
    const schoolId = request.headers.get("x-school-id");

    if (!userId || !schoolId) {
      return errors.unauthorized();
    }

    const body = await request.json();

    // Validate input
    const result = onboardingSchema.safeParse(body);
    if (!result.success) {
      return errors.validationError(result.error.flatten().fieldErrors);
    }

    const { schoolName, teacherCount, studentCount } = result.data;

    // Get school to verify it's paid
    const school = await db.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      return errors.notFound("School");
    }

    if (!school.signupFeePaid) {
      return errors.paymentRequired();
    }

    // Update school with onboarding info
    const updatedSchool = await db.school.update({
      where: { id: schoolId },
      data: {
        name: schoolName,
        teacherCount,
        studentCount,
        onboardingComplete: true,
        isActive: true, // Activate the school
      },
    });

    return successResponse({
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
    return errors.internalError();
  }
}
