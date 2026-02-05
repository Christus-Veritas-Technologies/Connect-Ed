import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, Plan, Role } from "@repo/db";
import { requireAuth, requirePlan, requireRole } from "../middleware/auth";
import { hashPassword, generateRandomPassword } from "../lib/password";
import { successResponse, errors } from "../lib/response";
import { z } from "zod";

const createTeacherSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  role: z.literal("TEACHER"),
});

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
teachers.post("/", zValidator("json", createTeacherSchema), async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const data = c.req.valid("json");

    // Check for existing email
    const existingUser = await db.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      return errors.conflict(c, "A user with this email already exists");
    }

    // Generate random password
    const generatedPassword = generateRandomPassword();
    const hashedPassword = await hashPassword(generatedPassword);

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

    // Return teacher with generated password (for email notification)
    return successResponse(
      c,
      {
        teacher,
        password: generatedPassword,
      },
      201
    );
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
