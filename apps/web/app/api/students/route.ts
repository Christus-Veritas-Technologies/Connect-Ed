import { NextRequest } from "next/server";
import { db } from "@repo/db";
import { createStudentSchema } from "../../../lib/validation";
import { successResponse, errors } from "../../../lib/api-response";

// GET /api/students - List students
export async function GET(request: NextRequest) {
  try {
    const schoolId = request.headers.get("x-school-id");

    if (!schoolId) {
      return errors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const search = searchParams.get("search") || "";
    const classId = searchParams.get("classId");
    const status = searchParams.get("status");

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Parameters<typeof db.student.findMany>[0]["where"] = {
      schoolId,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { admissionNumber: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(classId && { classId }),
      ...(status === "active" && { isActive: true }),
      ...(status === "inactive" && { isActive: false }),
    };

    const [students, total] = await Promise.all([
      db.student.findMany({
        where,
        include: {
          class: { select: { id: true, name: true } },
          parent: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.student.count({ where }),
    ]);

    return successResponse({
      students,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("List students error:", error);
    return errors.internalError();
  }
}

// POST /api/students - Create student
export async function POST(request: NextRequest) {
  try {
    const schoolId = request.headers.get("x-school-id");

    if (!schoolId) {
      return errors.unauthorized();
    }

    const body = await request.json();

    // Validate input
    const result = createStudentSchema.safeParse(body);
    if (!result.success) {
      return errors.validationError(result.error.flatten().fieldErrors);
    }

    const data = result.data;

    // Check for duplicate admission number
    const existing = await db.student.findFirst({
      where: {
        schoolId,
        admissionNumber: data.admissionNumber,
      },
    });

    if (existing) {
      return errors.conflict("A student with this admission number already exists");
    }

    // Create student
    const student = await db.student.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        admissionNumber: data.admissionNumber,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        gender: data.gender as any,
        classId: data.classId || undefined,
        parentId: data.parentId || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        schoolId,
      },
      include: {
        class: { select: { id: true, name: true } },
        parent: { select: { id: true, name: true } },
      },
    });

    return successResponse({ student }, 201);
  } catch (error) {
    console.error("Create student error:", error);
    return errors.internalError();
  }
}
