import { Hono } from "hono";
import { db, Plan, Role, NotificationType, NotificationPriority } from "@repo/db";
import { requireAuth, requirePlan, requireRole } from "../middleware/auth";
import { hashPassword, generateRandomPassword } from "../lib/password";
import { sendEmail, generateWelcomeEmailWithCredentials } from "../lib/email";
import { successResponse, errors } from "../lib/response";
import { z } from "zod";

const createTeacherSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  level: z.enum(["primary", "secondary"]).optional(),
  classIds: z.array(z.string()).optional(),
  subjectIds: z.array(z.string()).optional(),
});

const updateTeacherSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  level: z.enum(["primary", "secondary"]).nullable().optional(),
  isActive: z.boolean().optional(),
  classIds: z.array(z.string()).optional(),
  subjectIds: z.array(z.string()).optional(),
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
        level: true,
        isActive: true,
        createdAt: true,
        classesTeaching: {
          select: {
            id: true,
            class: { select: { id: true, name: true, level: true } },
            subject: { select: { id: true, name: true } },
          },
        },
        teacherSubjects: {
          select: {
            id: true,
            subject: { select: { id: true, name: true, level: true } },
          },
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
teachers.post("/", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const body = await c.req.json();
    const parsed = createTeacherSchema.safeParse(body);

    if (!parsed.success) {
      return errors.badRequest(c, parsed.error.errors[0]?.message || "Invalid input");
    }

    const data = parsed.data;

    // Check for existing email globally
    const existingEmail = await db.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingEmail) {
      return errors.conflict(c, `Email "${data.email}" is already in use.`);
    }

    // Generate random password
    const generatedPassword = generateRandomPassword();
    const hashedPassword = await hashPassword(generatedPassword);

    const fullName = `${data.firstName} ${data.lastName}`;

    // Create teacher with class and subject assignments in a transaction
    const teacher = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email.toLowerCase(),
          password: hashedPassword,
          name: fullName,
          level: data.level || undefined,
          role: Role.TEACHER,
          schoolId,
        },
      });

      // Create teacher-class assignments
      if (data.classIds && data.classIds.length > 0) {
        await tx.teacherClass.createMany({
          data: data.classIds.map((classId) => ({
            teacherId: user.id,
            classId,
          })),
        });
      }

      // Create teacher-subject assignments
      if (data.subjectIds && data.subjectIds.length > 0) {
        await tx.teacherSubject.createMany({
          data: data.subjectIds.map((subjectId) => ({
            teacherId: user.id,
            subjectId,
          })),
        });
      }

      return tx.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          name: true,
          level: true,
          isActive: true,
          createdAt: true,
          classesTeaching: {
            select: {
              id: true,
              class: { select: { id: true, name: true, level: true } },
              subject: { select: { id: true, name: true } },
            },
          },
          teacherSubjects: {
            select: {
              id: true,
              subject: { select: { id: true, name: true, level: true } },
            },
          },
        },
      });
    });

    // Send notifications
    const admins = await db.user.findMany({
      where: { schoolId, role: Role.ADMIN, isActive: true },
      select: { id: true },
    });

    const notifications = admins.map((admin) =>
      db.notification.create({
        data: {
          type: NotificationType.TEACHER_ADDED,
          priority: NotificationPriority.MEDIUM,
          title: "New Teacher Added",
          message: `${fullName} has been added to the school.`,
          actionUrl: `/dashboard/teachers`,
          schoolId,
          userId: admin.id,
        },
      })
    );

    await Promise.all(notifications);

    // Send welcome email
    const school = await db.school.findFirst({
      where: { id: schoolId },
      select: { name: true },
    });

    await sendEmail({
      to: data.email.toLowerCase(),
      subject: "Welcome to Connect-Ed - Your Login Credentials",
      html: generateWelcomeEmailWithCredentials({
        name: fullName,
        email: data.email.toLowerCase(),
        password: generatedPassword,
        role: "TEACHER",
        schoolName: school?.name ?? undefined,
      }),
      schoolId,
      type: "KIN",
    });

    return successResponse(c, { teacher, password: generatedPassword }, 201);
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
        level: true,
        isActive: true,
        createdAt: true,
        classesTeaching: {
          select: {
            id: true,
            class: {
              select: {
                id: true,
                name: true,
                level: true,
                _count: { select: { students: true } },
              },
            },
            subject: { select: { id: true, name: true } },
          },
        },
        teacherSubjects: {
          select: {
            id: true,
            subject: { select: { id: true, name: true, level: true } },
          },
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
    const body = await c.req.json();
    const parsed = updateTeacherSchema.safeParse(body);

    if (!parsed.success) {
      return errors.badRequest(c, parsed.error.errors[0]?.message || "Invalid input");
    }

    const data = parsed.data;

    const existing = await db.user.findFirst({
      where: { id, schoolId, role: Role.TEACHER },
    });

    if (!existing) {
      return errors.notFound(c, "Teacher");
    }

    // If email is being changed, check for uniqueness
    if (data.email && data.email.toLowerCase() !== existing.email) {
      const emailTaken = await db.user.findUnique({
        where: { email: data.email.toLowerCase() },
      });
      if (emailTaken) {
        return errors.conflict(c, `Email "${data.email}" is already in use.`);
      }
    }

    const teacher = await db.$transaction(async (tx) => {
      const updateData: any = {};
      if (data.firstName || data.lastName) {
        const firstName = data.firstName || existing.name.split(" ")[0];
        const lastName = data.lastName || existing.name.split(" ").slice(1).join(" ");
        updateData.name = `${firstName} ${lastName}`;
      }
      if (data.email) updateData.email = data.email.toLowerCase();
      if (data.level !== undefined) updateData.level = data.level;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      if (Object.keys(updateData).length > 0) {
        await tx.user.update({ where: { id }, data: updateData });
      }

      // Replace class assignments if provided
      if (data.classIds !== undefined) {
        await tx.teacherClass.deleteMany({ where: { teacherId: id } });
        if (data.classIds.length > 0) {
          await tx.teacherClass.createMany({
            data: data.classIds.map((classId) => ({
              teacherId: id,
              classId,
            })),
          });
        }
      }

      // Replace subject assignments if provided
      if (data.subjectIds !== undefined) {
        await tx.teacherSubject.deleteMany({ where: { teacherId: id } });
        if (data.subjectIds.length > 0) {
          await tx.teacherSubject.createMany({
            data: data.subjectIds.map((subjectId) => ({
              teacherId: id,
              subjectId,
            })),
          });
        }
      }

      return tx.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          level: true,
          isActive: true,
          createdAt: true,
          classesTeaching: {
            select: {
              id: true,
              class: {
                select: {
                  id: true,
                  name: true,
                  level: true,
                  _count: { select: { students: true } },
                },
              },
              subject: { select: { id: true, name: true } },
            },
          },
          teacherSubjects: {
            select: {
              id: true,
              subject: { select: { id: true, name: true, level: true } },
            },
          },
        },
      });
    });

    return successResponse(c, { teacher });
  } catch (error) {
    console.error("Update teacher error:", error);
    return errors.internalError(c);
  }
});

// DELETE /teachers/:id - Delete teacher
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

    await db.user.delete({ where: { id } });

    return successResponse(c, { message: "Teacher deleted successfully" });
  } catch (error) {
    console.error("Delete teacher error:", error);
    return errors.internalError(c);
  }
});

export default teachers;
