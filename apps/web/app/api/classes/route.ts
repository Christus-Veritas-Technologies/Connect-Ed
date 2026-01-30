import { NextRequest } from "next/server";
import { db } from "@repo/db";
import { createClassSchema } from "../../../lib/validation";
import { successResponse, errors } from "../../../lib/api-response";

// GET /api/classes - List classes
export async function GET(request: NextRequest) {
  try {
    const schoolId = request.headers.get("x-school-id");
    const schoolPlan = request.headers.get("x-school-plan");

    if (!schoolId) {
      return errors.unauthorized();
    }

    // Check plan access
    if (schoolPlan === "LITE") {
      return errors.planUpgradeRequired();
    }

    const classes = await db.class.findMany({
      where: { schoolId },
      include: {
        classTeacher: { select: { id: true, name: true } },
        _count: { select: { students: true } },
      },
      orderBy: { name: "asc" },
    });

    return successResponse({ classes });
  } catch (error) {
    console.error("List classes error:", error);
    return errors.internalError();
  }
}

// POST /api/classes - Create class
export async function POST(request: NextRequest) {
  try {
    const schoolId = request.headers.get("x-school-id");
    const schoolPlan = request.headers.get("x-school-plan");

    if (!schoolId) {
      return errors.unauthorized();
    }

    if (schoolPlan === "LITE") {
      return errors.planUpgradeRequired();
    }

    const body = await request.json();

    const result = createClassSchema.safeParse(body);
    if (!result.success) {
      return errors.validationError(result.error.flatten().fieldErrors);
    }

    const data = result.data;

    // Check for duplicate class name
    const existing = await db.class.findFirst({
      where: { schoolId, name: data.name },
    });

    if (existing) {
      return errors.conflict("A class with this name already exists");
    }

    const newClass = await db.class.create({
      data: {
        name: data.name,
        classTeacherId: data.classTeacherId || undefined,
        schoolId,
      },
      include: {
        classTeacher: { select: { id: true, name: true } },
        _count: { select: { students: true } },
      },
    });

    return successResponse({ class: newClass }, 201);
  } catch (error) {
    console.error("Create class error:", error);
    return errors.internalError();
  }
}
