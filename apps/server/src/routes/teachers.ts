import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, Plan, Role } from "@repo/db";
import { requireAuth, requirePlan, requireRole } from "../middleware/auth";
import { createUserSchema } from "../lib/validation";
import { hashPassword } from "../lib/password";
import { successResponse, errors } from "../lib/response";

const teachers = new Hono();

// Apply auth middleware to all routes
teachers.use("*", requireAuth);
// Require admin role
teachers.use("*", requireRole(Role.ADMIN));
// Require Growth+ plan for teacher management
teachers.use("*", requirePlan(Plan.GROWTH, Plan.ENTERPRISE));

// GET /teachers - List teachers
teachers.get("/", async (c) => {
  try {
    const schoolId = c.get("schoolId");

    const teacherList = await db.user.findMany({
      where: { schoolId, role: Role.TEACHER },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
        classes: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return successResponse(c, { teachers: teacherList });
  } catch (error) {
    console.error("List teachers error:", error);
    return errors.internalError(c);
  }
});

// POST /teachers - Create teacher
teachers.post("/", zValidator("json", createUserSchema), async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const data = c.req.valid("json");

    // Force role to be TEACHER
    if (data.role !== "TEACHER") {
      return errors.validationError(c, { role: ["Role must be TEACHER"] });
    }

    // Check for existing email
    const existingUser = await db.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      return errors.conflict(c, "A user with this email already exists");
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Create teacher
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
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return successResponse(c, { teacher }, 201);
  } catch (error) {
    console.error("Create teacher error:", error);
    return errors.internalError(c);
  }
});

// GET /teachers/:id - Get single teacher
teachers.get("/:id", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const id = c.req.param("id");

    const teacher = await db.user.findFirst({
      where: { id, schoolId, role: Role.TEACHER },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
        classes: {
          select: { id: true, name: true },
        },
      },
    });

    if (!teacher) {
      return errors.notFound(c, "Teacher");
    }

    return successResponse(c, { teacher });
  } catch (error) {
    console.error("Get teacher error:", error);
    return errors.internalError(c);
  }
});

// PATCH /teachers/:id - Update teacher
teachers.patch("/:id", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const id = c.req.param("id");
    const data = await c.req.json();

    const existing = await db.user.findFirst({
      where: { id, schoolId, role: Role.TEACHER },
    });

    if (!existing) {
      return errors.notFound(c, "Teacher");
    }

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const teacher = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
      },
    });

    return successResponse(c, { teacher });
  } catch (error) {
    console.error("Update teacher error:", error);
    return errors.internalError(c);
  }
});

// DELETE /teachers/:id - Deactivate teacher
teachers.delete("/:id", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const id = c.req.param("id");

    const existing = await db.user.findFirst({
      where: { id, schoolId, role: Role.TEACHER },
    });

    if (!existing) {
      return errors.notFound(c, "Teacher");
    }

    // Soft delete by deactivating
    await db.user.update({
      where: { id },
      data: { isActive: false },
    });

    return successResponse(c, { message: "Teacher deactivated successfully" });
  } catch (error) {
    console.error("Delete teacher error:", error);
    return errors.internalError(c);
  }
});

export default teachers;
