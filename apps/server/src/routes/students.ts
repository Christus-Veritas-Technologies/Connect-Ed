import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, NotificationType, NotificationPriority } from "@repo/db";
import { requireAuth } from "../middleware/auth";
import { createStudentSchema, updateStudentSchema } from "../lib/validation";
import { successResponse, errors } from "../lib/response";
import { hashPassword, generateRandomPassword } from "../lib/password";
import { sendEmail, generateWelcomeEmailWithCredentials } from "../lib/email";

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
  const userId = c.get("userId");
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

    // Check for duplicate email (if provided and school-specific)
    if (data.email) {
      const existingEmail = await db.student.findFirst({
        where: {
          schoolId,
          email: data.email.toLowerCase(),
        },
      });

      if (existingEmail) {
        console.log(`[POST /students] ❌ Duplicate email: ${data.email}`);
        return errors.conflict(c, `A student with email "${data.email}" already exists in your school`);
      }
    }

    // Check for duplicate phone (if provided and school-specific)
    if (data.phone) {
      const existingPhone = await db.student.findFirst({
        where: {
          schoolId,
          phone: data.phone,
        },
      });

      if (existingPhone) {
        console.log(`[POST /students] ❌ Duplicate phone: ${data.phone}`);
        return errors.conflict(c, `A student with phone number "${data.phone}" already exists in your school`);
      }
    }

    // Generate password for student if email provided
    let generatedPassword: string | undefined;
    let hashedPassword: string | undefined;
    if (data.email) {
      generatedPassword = generateRandomPassword();
      hashedPassword = await hashPassword(generatedPassword);
    }

    // Create student
    console.log(`[POST /students] Inserting student: ${data.firstName} ${data.lastName}`);
    const result = await db.$transaction(async (tx) => {
      // Create student
      const student = await tx.student.create({
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
          password: hashedPassword,
          onboardingComplete: data.email ? false : true,
          schoolId,
        },
        include: {
          class: { 
            select: { 
              id: true, 
              name: true,
              classTeacherId: true,
            } 
          },
          parent: { select: { id: true, name: true } },
        },
      });

      // Create student-subject relationships if subjects provided
      if (data.subjectIds && data.subjectIds.length > 0) {
        await tx.studentSubject.createMany({
          data: data.subjectIds.map(subjectId => ({
            studentId: student.id,
            subjectId,
          })),
          skipDuplicates: true,
        });
      }

      return student;
    });

    const student = result;

    // Send notifications
    const notifications = [];

    // 1. Notify admins about new student
    const admins = await db.user.findMany({
      where: { schoolId, role: "ADMIN", isActive: true },
      select: { id: true },
    });

    for (const admin of admins) {
      notifications.push(
        db.notification.create({
          data: {
            type: NotificationType.STUDENT_ADDED,
            priority: NotificationPriority.MEDIUM,
            title: "New Student Added",
            message: `${student.firstName} ${student.lastName} has been added${student.class ? ` to ${student.class.name}` : ""}.`,
            actionUrl: `/dashboard/students`,
            schoolId,
            userId: admin.id,
          },
        })
      );
    }

    // 2. Notify class teacher about new student
    if (student.class?.classTeacherId) {
      notifications.push(
        db.notification.create({
          data: {
            type: NotificationType.STUDENT_ADDED,
            priority: NotificationPriority.HIGH,
            title: "New Student in Your Class",
            message: `${student.firstName} ${student.lastName} has been added to ${student.class.name}.`,
            actionUrl: `/dashboard/classes/${student.class.id}`,
            schoolId,
            userId: student.class.classTeacherId,
          },
        })
      );
    }

    // 3. Welcome notification for student (if email provided)
    if (student.email) {
      notifications.push(
        db.notification.create({
          data: {
            type: NotificationType.SYSTEM_ALERT,
            priority: NotificationPriority.HIGH,
            title: "Welcome to Connect-Ed!",
            message: "Your account has been created. Check your email for login credentials.",
            actionUrl: `/login`,
            schoolId,
            metadata: { role: "STUDENT" },
          },
        })
      );
    }

    // Execute all notifications
    await Promise.all(notifications);

    // Send welcome email with credentials if email provided
    if (student.email && generatedPassword) {
      const school = await db.school.findUnique({
        where: { id: schoolId },
        select: { name: true },
      });

      await sendEmail({
        to: student.email,
        subject: "Welcome to Connect-Ed - Your Login Credentials",
        html: generateWelcomeEmailWithCredentials({
          name: `${student.firstName} ${student.lastName}`,
          email: student.email,
          password: generatedPassword,
          role: "STUDENT",
          schoolName: school?.name,
        }),
        schoolId,
        type: "KIN",
      });
    }

    console.log(`[POST /students] ✅ Student created successfully: ${student.firstName} ${student.lastName} (${student.id})`);
    
    // Return student with generated password (for email notification)
    return successResponse(
      c,
      {
        student,
        ...(generatedPassword && { password: generatedPassword }),
      },
      201
    );
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
