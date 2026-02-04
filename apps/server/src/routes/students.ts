import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "@repo/db";
import { requireAuth } from "../middleware/auth";
import { createStudentSchema, updateStudentSchema } from "../lib/validation";
import { successResponse, errors } from "../lib/response";

const students = new Hono();

// Apply auth middleware to all routes
students.use("*", requireAuth);

// GET /students - List students
students.get("/", async (c) => {
  try {
    const schoolId = c.get("schoolId");

    const page = parseInt(c.req.query("page") || "1");
    const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100);
    const search = c.req.query("search") || "";
    const classId = c.req.query("classId");
    const status = c.req.query("status");

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

    return successResponse(c, {
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
    return errors.internalError(c);
  }
});

// GET /students/:id - Get single student
students.get("/:id", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const id = c.req.param("id");

    const student = await db.student.findFirst({
      where: { id, schoolId },
      include: {
        class: { select: { id: true, name: true } },
        parent: { select: { id: true, name: true, email: true, phone: true } },
        fees: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { payments: true },
        },
      },
    });

    if (!student) {
      return errors.notFound(c, "Student");
    }

    return successResponse(c, { student });
  } catch (error) {
    console.error("Get student error:", error);
    return errors.internalError(c);
  }
});

// POST /students - Create student
students.post("/", zValidator("json", createStudentSchema), async (c) => {
  const schoolId = c.get("schoolId");
  console.log(`[POST /students] Creating new student for school: ${schoolId}`);
  
  try {
    const data = c.req.valid("json");
    console.log(`[POST /students] Student data:`, {
      firstName: data.firstName,
      lastName: data.lastName,
      admissionNumber: data.admissionNumber,
      classId: data.classId,
    });

    // Check for duplicate admission number
    const existing = await db.student.findFirst({
      where: {
        schoolId,
        admissionNumber: data.admissionNumber,
      },
    });

    if (existing) {
      console.log(`[POST /students] ❌ Duplicate admission number: ${data.admissionNumber}`);
      return errors.conflict(c, "A student with this admission number already exists");
    }

    // Create student
    console.log(`[POST /students] Inserting student: ${data.firstName} ${data.lastName}`);
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

    console.log(`[POST /students] ✅ Student created successfully: ${student.firstName} ${student.lastName} (${student.id})`);
    return successResponse(c, { student }, 201);
  } catch (error) {
    console.error(`[POST /students] ❌ Create student error:`, error);
    return errors.internalError(c);
  }
});

// PATCH /students/:id - Update student
students.patch("/:id", zValidator("json", updateStudentSchema), async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const id = c.req.param("id");
    const data = c.req.valid("json");

    // Check if student exists
    const existing = await db.student.findFirst({
      where: { id, schoolId },
    });

    if (!existing) {
      return errors.notFound(c, "Student");
    }

    // Check for duplicate admission number if updating
    if (data.admissionNumber && data.admissionNumber !== existing.admissionNumber) {
      const duplicate = await db.student.findFirst({
        where: {
          schoolId,
          admissionNumber: data.admissionNumber,
          NOT: { id },
        },
      });

      if (duplicate) {
        return errors.conflict(c, "A student with this admission number already exists");
      }
    }

    // Update student
    const student = await db.student.update({
      where: { id },
      data: {
        ...data,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      },
      include: {
        class: { select: { id: true, name: true } },
        parent: { select: { id: true, name: true } },
      },
    });

    return successResponse(c, { student });
  } catch (error) {
    console.error("Update student error:", error);
    return errors.internalError(c);
  }
});

// DELETE /students/:id - Delete student
students.delete("/:id", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const id = c.req.param("id");

    // Check if student exists
    const existing = await db.student.findFirst({
      where: { id, schoolId },
    });

    if (!existing) {
      return errors.notFound(c, "Student");
    }

    // Soft delete by setting isActive to false
    await db.student.update({
      where: { id },
      data: { isActive: false },
    });

    return successResponse(c, { message: "Student deleted successfully" });
  } catch (error) {
    console.error("Delete student error:", error);
    return errors.internalError(c);
  }
});

export default students;
