import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, Plan } from "@repo/db";
import { requireAuth, requirePlan } from "../middleware/auth";
import { createClassSchema } from "../lib/validation";
import { successResponse, errors } from "../lib/response";

const classes = new Hono();

// Apply auth middleware to all routes
classes.use("*", requireAuth);
// Require Growth+ plan for class management
classes.use("*", requirePlan(Plan.GROWTH, Plan.ENTERPRISE));

// GET /classes - List classes
classes.get("/", async (c) => {
  try {
    const schoolId = c.get("schoolId");

    const classList = await db.class.findMany({
      where: { schoolId },
      include: {
        classTeacher: { select: { id: true, name: true, email: true } },
        _count: { select: { students: true } },
      },
      orderBy: { name: "asc" },
    });

    return successResponse(c, { classes: classList });
  } catch (error) {
    console.error("List classes error:", error);
    return errors.internalError(c);
  }
});

// POST /classes - Create class
classes.post("/", zValidator("json", createClassSchema), async (c) => {
  const schoolId = c.get("schoolId");
  console.log(`[POST /classes] Creating class for school: ${schoolId}`);
  
  try {
    const data = c.req.valid("json");
    console.log(`[POST /classes] Class data:`, {
      name: data.name,
      classTeacherId: data.classTeacherId,
    });

    // Check for duplicate class name
    const existing = await db.class.findFirst({
      where: { schoolId, name: data.name },
    });

    if (existing) {
      console.log(`[POST /classes] ❌ Duplicate class name: ${data.name}`);
      return errors.conflict(c, "A class with this name already exists");
    }

    // Verify teacher belongs to school if provided
    if (data.classTeacherId) {
      console.log(`[POST /classes] Verifying teacher: ${data.classTeacherId}`);
      const teacher = await db.user.findFirst({
        where: {
          id: data.classTeacherId,
          schoolId,
          role: "TEACHER",
        },
      });

      if (!teacher) {
        console.log(`[POST /classes] ❌ Teacher not found: ${data.classTeacherId}`);
        return errors.notFound(c, "Teacher");
      }
    }

    console.log(`[POST /classes] Creating class: ${data.name}`);
    const newClass = await db.class.create({
      data: {
        name: data.name,
        classTeacherId: data.classTeacherId || undefined,
        schoolId,
      },
      include: {
        classTeacher: { select: { id: true, name: true, email: true } },
      },
    });

    console.log(`[POST /classes] ✅ Class created successfully: ${newClass.name} (${newClass.id})`);
    return successResponse(c, { class: newClass }, 201);
  } catch (error) {
    console.error(`[POST /classes] ❌ Create class error:`, error);
    return errors.internalError(c);
  }
});

// GET /classes/:id - Get single class with students
classes.get("/:id", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const id = c.req.param("id");

    const classData = await db.class.findFirst({
      where: { id, schoolId },
      include: {
        classTeacher: { select: { id: true, name: true, email: true } },
        students: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
            isActive: true,
          },
          orderBy: { lastName: "asc" },
        },
        subjects: {
          include: {
            subject: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!classData) {
      return errors.notFound(c, "Class");
    }

    return successResponse(c, { class: classData });
  } catch (error) {
    console.error("Get class error:", error);
    return errors.internalError(c);
  }
});

// PATCH /classes/:id - Update class
classes.patch("/:id", zValidator("json", createClassSchema.partial()), async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const id = c.req.param("id");
    const data = c.req.valid("json");

    const existing = await db.class.findFirst({
      where: { id, schoolId },
    });

    if (!existing) {
      return errors.notFound(c, "Class");
    }

    // Check for duplicate name if updating
    if (data.name && data.name !== existing.name) {
      const duplicate = await db.class.findFirst({
        where: { schoolId, name: data.name, NOT: { id } },
      });

      if (duplicate) {
        return errors.conflict(c, "A class with this name already exists");
      }
    }

    const updatedClass = await db.class.update({
      where: { id },
      data: {
        name: data.name,
        classTeacherId: data.classTeacherId,
      },
      include: {
        classTeacher: { select: { id: true, name: true, email: true } },
      },
    });

    return successResponse(c, { class: updatedClass });
  } catch (error) {
    console.error("Update class error:", error);
    return errors.internalError(c);
  }
});

// DELETE /classes/:id - Delete class
classes.delete("/:id", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const id = c.req.param("id");

    const existing = await db.class.findFirst({
      where: { id, schoolId },
      include: { _count: { select: { students: true } } },
    });

    if (!existing) {
      return errors.notFound(c, "Class");
    }

    if (existing._count.students > 0) {
      return errors.conflict(c, "Cannot delete class with enrolled students");
    }

    await db.class.delete({
      where: { id },
    });

    return successResponse(c, { message: "Class deleted successfully" });
  } catch (error) {
    console.error("Delete class error:", error);
    return errors.internalError(c);
  }
});

export default classes;
