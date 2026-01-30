import { NextRequest } from "next/server";
import { db } from "@repo/db";
import { successResponse, errors } from "../../../../lib/api-response";
import { z } from "zod";

const updateSchoolSchema = z.object({
  name: z.string().min(2).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const schoolId = request.headers.get("x-school-id");
    const userRole = request.headers.get("x-user-role");

    if (!schoolId) {
      return errors.unauthorized();
    }

    // Only admins can update school settings
    if (userRole !== "ADMIN") {
      return errors.forbidden();
    }

    const body = await request.json();

    const result = updateSchoolSchema.safeParse(body);
    if (!result.success) {
      return errors.validationError(result.error.flatten().fieldErrors);
    }

    const school = await db.school.update({
      where: { id: schoolId },
      data: result.data,
    });

    return successResponse({
      school: {
        id: school.id,
        name: school.name,
        plan: school.plan,
      },
    });
  } catch (error) {
    console.error("Update school error:", error);
    return errors.internalError();
  }
}
