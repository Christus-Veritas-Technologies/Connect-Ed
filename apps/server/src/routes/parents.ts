import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "@repo/db";
import { requireAuth } from "../middleware/auth";
import { successResponse, errors } from "../lib/response";
import { hashPassword, generateRandomPassword } from "../lib/password";
import { z } from "zod";

const parents = new Hono();

// Apply auth middleware to all routes
parents.use("*", requireAuth);

// Validation schemas
const createParentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  studentIds: z.array(z.string()).min(1, "At least one student is required"),
});

const updateParentSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
});

// GET /parents - List parents
parents.get("/", async (c) => {
  try {
    const schoolId = c.get("schoolId");

    const page = parseInt(c.req.query("page") || "1");
    const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100);
    const search = c.req.query("search") || "";

    const skip = (page - 1) * limit;

    const where: Parameters<typeof db.parent.findMany>[0]["where"] = {
      schoolId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const [parents, total] = await Promise.all([
      db.parent.findMany({
        where,
        include: {
          children: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              admissionNumber: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.parent.count({ where }),
    ]);

    return successResponse(c, {
      parents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("List parents error:", error);
    return errors.internalError(c);
  }
});

// GET /parents/:id - Get single parent
parents.get("/:id", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const id = c.req.param("id");

    const parent = await db.parent.findFirst({
      where: { id, schoolId },
      include: {
        children: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
            isActive: true,
            class: { select: { name: true } },
          },
        },
      },
    });

    if (!parent) {
      return errors.notFound(c, "Parent");
    }

    return successResponse(c, { parent });
  } catch (error) {
    console.error("Get parent error:", error);
    return errors.internalError(c);
  }
});

// POST /parents - Create parent
parents.post("/", zValidator("json", createParentSchema), async (c) => {
  const schoolId = c.get("schoolId");
  console.log(`[POST /parents] Creating new parent for school: ${schoolId}`);
  
  try {
    const data = c.req.valid("json");
    console.log(`[POST /parents] Parent data:`, {
      name: data.name,
      email: data.email,
      studentIds: data.studentIds,
    });

    // Check for duplicate email
    const existing = await db.parent.findFirst({
      where: {
        email: data.email,
      },
    });

    if (existing) {
      console.log(`[POST /parents] ❌ Duplicate email: ${data.email}`);
      return errors.conflict(c, "A parent with this email already exists");
    }

    // Verify all students exist and belong to this school
    const students = await db.student.findMany({
      where: {
        id: { in: data.studentIds },
        schoolId,
      },
    });

    if (students.length !== data.studentIds.length) {
      return errors.badRequest(c, "One or more students not found");
    }

    // Generate random password
    const generatedPassword = generateRandomPassword();
    const hashedPassword = await hashPassword(generatedPassword);

    // Create parent
    console.log(`[POST /parents] Inserting parent: ${data.name}`);
    const parent = await db.parent.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        password: hashedPassword,
        schoolId,
      },
    });

    // Link students to parent
    await db.student.updateMany({
      where: {
        id: { in: data.studentIds },
      },
      data: {
        parentId: parent.id,
      },
    });

    // Fetch parent with children
    const parentWithChildren = await db.parent.findUnique({
      where: { id: parent.id },
      include: {
        children: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
      },
    });

    console.log(`[POST /parents] ✅ Parent created successfully: ${parent.name} (${parent.id})`);
    
    // Return parent with generated password (for email notification)
    return successResponse(
      c,
      {
        parent: parentWithChildren,
        password: generatedPassword,
      },
      201
    );
  } catch (error) {
    console.error(`[POST /parents] ❌ Create parent error:`, error);
    return errors.internalError(c);
  }
});

// PATCH /parents/:id - Update parent
parents.patch("/:id", zValidator("json", updateParentSchema), async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const id = c.req.param("id");
    const data = c.req.valid("json");

    // Check if parent exists
    const existing = await db.parent.findFirst({
      where: { id, schoolId },
    });

    if (!existing) {
      return errors.notFound(c, "Parent");
    }

    // Check for duplicate email if updating
    if (data.email && data.email !== existing.email) {
      const duplicate = await db.parent.findFirst({
        where: {
          email: data.email,
          NOT: { id },
        },
      });

      if (duplicate) {
        return errors.conflict(c, "A parent with this email already exists");
      }
    }

    // Update parent
    const parent = await db.parent.update({
      where: { id },
      data,
      include: {
        children: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
      },
    });

    return successResponse(c, { parent });
  } catch (error) {
    console.error("Update parent error:", error);
    return errors.internalError(c);
  }
});

// DELETE /parents/:id - Delete parent
parents.delete("/:id", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const id = c.req.param("id");

    // Check if parent exists
    const existing = await db.parent.findFirst({
      where: { id, schoolId },
    });

    if (!existing) {
      return errors.notFound(c, "Parent");
    }

    // Soft delete by setting isActive to false
    await db.parent.update({
      where: { id },
      data: { isActive: false },
    });

    // Optionally unlink children
    await db.student.updateMany({
      where: { parentId: id },
      data: { parentId: null },
    });

    return successResponse(c, { message: "Parent deleted successfully" });
  } catch (error) {
    console.error("Delete parent error:", error);
    return errors.internalError(c);
  }
});

export default parents;
