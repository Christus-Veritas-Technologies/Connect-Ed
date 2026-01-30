import { NextRequest } from "next/server";
import { db, Role } from "@repo/db";
import { hashPassword } from "../../../lib/password";
import { createUserSchema } from "../../../lib/validation";
import { successResponse, errors } from "../../../lib/api-response";

// GET /api/teachers - List teachers
export async function GET(request: NextRequest) {
  try {
    const schoolId = request.headers.get("x-school-id");
    const schoolPlan = request.headers.get("x-school-plan");

    if (!schoolId) {
      return errors.unauthorized();
    }

    if (schoolPlan === "LITE") {
      return errors.planUpgradeRequired();
    }

    const teachers = await db.user.findMany({
      where: {
        schoolId,
        role: Role.TEACHER,
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        classes: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    });

    return successResponse({ teachers });
  } catch (error) {
    console.error("List teachers error:", error);
    return errors.internalError();
  }
}

// POST /api/teachers - Create teacher
export async function POST(request: NextRequest) {
  try {
    const schoolId = request.headers.get("x-school-id");
    const schoolPlan = request.headers.get("x-school-plan");
    const userRole = request.headers.get("x-user-role");

    if (!schoolId) {
      return errors.unauthorized();
    }

    if (schoolPlan === "LITE") {
      return errors.planUpgradeRequired();
    }

    // Only admins can create teachers
    if (userRole !== "ADMIN") {
      return errors.forbidden();
    }

    const body = await request.json();

    const result = createUserSchema.safeParse({ ...body, role: "TEACHER" });
    if (!result.success) {
      return errors.validationError(result.error.flatten().fieldErrors);
    }

    const data = result.data;

    // Check if email already exists
    const existing = await db.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      return errors.conflict("A user with this email already exists");
    }

    const hashedPassword = await hashPassword(data.password);

    const teacher = await db.user.create({
      data: {
        email: data.email.toLowerCase(),
        password: hashedPassword,
        name: data.name,
        role: Role.TEACHER,
        schoolId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
      },
    });

    return successResponse({ teacher }, 201);
  } catch (error) {
    console.error("Create teacher error:", error);
    return errors.internalError();
  }
}
