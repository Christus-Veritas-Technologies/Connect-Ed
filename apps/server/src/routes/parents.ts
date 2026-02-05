import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, NotificationType, NotificationPriority } from "@repo/db";
import { requireAuth } from "../middleware/auth";
import { successResponse, errors } from "../lib/response";
import { hashPassword, generateRandomPassword } from "../lib/password";
import { sendEmail, generateWelcomeEmailWithCredentials } from "../lib/email";
import { z } from "zod";

const parents = new Hono();

// Apply auth middleware to all routes
parents.use("*", requireAuth);

// Validation schemas
const createParentSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  studentIds: z.array(z.string()).min(1, "At least one student is required"),
});

const updateParentSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
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
    const fullName = `${data.firstName} ${data.lastName}`;
    
    console.log(`[POST /parents] Parent data:`, {
      name: fullName,
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
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (students.length !== data.studentIds.length) {
      return errors.badRequest(c, "One or more students not found");
    }

    // Separate students into two groups
    const studentsWithoutParent = students.filter(s => !s.parentId);
    const studentsWithParent = students.filter(s => s.parentId);

    console.log(`[POST /parents] Students without parent: ${studentsWithoutParent.length}, with parent: ${studentsWithParent.length}`);

    // Generate random password
    const generatedPassword = generateRandomPassword();
    const hashedPassword = await hashPassword(generatedPassword);

    // Create parent
    console.log(`[POST /parents] Inserting parent: ${fullName}`);
    const parent = await db.parent.create({
      data: {
        name: fullName,
        email: data.email,
        phone: data.phone || undefined,
        password: hashedPassword,
        schoolId,
      },
    });

    // Link students without parents directly
    if (studentsWithoutParent.length > 0) {
      await db.student.updateMany({
        where: {
          id: { in: studentsWithoutParent.map(s => s.id) },
        },
        data: {
          parentId: parent.id,
        },
      });
    }

    // Create parent requests for students who already have a parent
    const parentRequests = [];
    if (studentsWithParent.length > 0) {
      for (const student of studentsWithParent) {
        parentRequests.push(
          db.parentRequest.create({
            data: {
              requestingParentId: parent.id,
              existingParentId: student.parentId!,
              studentId: student.id,
              schoolId,
            },
          })
        );
      }
      await Promise.all(parentRequests);
    }

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

    // Send notifications
    const notifications = [];

    // 1. Notify admins about new parent
    const admins = await db.user.findMany({
      where: { schoolId, role: "ADMIN", isActive: true },
      select: { id: true },
    });

    const linkedChildrenNames = studentsWithoutParent.map((s) => `${s.firstName} ${s.lastName}`).join(", ");
    const requestedChildrenNames = studentsWithParent.map((s) => `${s.firstName} ${s.lastName}`).join(", ");
    
    let adminMessage = `${fullName} has been added`;
    if (studentsWithoutParent.length > 0) {
      adminMessage += ` and linked to: ${linkedChildrenNames}`;
    }
    if (studentsWithParent.length > 0) {
      adminMessage += studentsWithoutParent.length > 0 ? `. Requests sent for: ${requestedChildrenNames}` : ` with requests pending for: ${requestedChildrenNames}`;
    }
    adminMessage += ".";

    for (const admin of admins) {
      notifications.push(
        db.notification.create({
          data: {
            type: NotificationType.SYSTEM_ALERT,
            priority: NotificationPriority.MEDIUM,
            title: "New Parent Added",
            message: adminMessage,
            actionUrl: `/dashboard/parents`,
            schoolId,
            userId: admin.id,
          },
        })
      );
    }

    // 2. Welcome notification for new parent
    let parentMessage = "";
    if (studentsWithoutParent.length > 0 && studentsWithParent.length === 0) {
      parentMessage = `You've been linked to your ${studentsWithoutParent.length > 1 ? "children" : "child"}: ${linkedChildrenNames}. Check your email for login credentials.`;
    } else if (studentsWithoutParent.length === 0 && studentsWithParent.length > 0) {
      parentMessage = `Requests have been sent to existing parents for: ${requestedChildrenNames}. You'll be notified once they accept.`;
    } else {
      parentMessage = `You've been linked to: ${linkedChildrenNames}. Requests sent for: ${requestedChildrenNames}.`;
    }

    notifications.push(
      db.notification.create({
        data: {
          type: NotificationType.SYSTEM_ALERT,
          priority: NotificationPriority.HIGH,
          title: "Welcome to Connect-Ed!",
          message: parentMessage,
          actionUrl: `/login`,
          schoolId,
          metadata: { role: "PARENT" },
        },
      })
    );

    // 3. Notify existing parents about new parent requests
    for (const student of studentsWithParent) {
      notifications.push(
        db.notification.create({
          data: {
            type: NotificationType.SYSTEM_ALERT,
            priority: NotificationPriority.HIGH,
            title: "New Parent Request",
            message: `${fullName} has requested to be added as a parent for ${student.firstName} ${student.lastName}. Please review and respond.`,
            actionUrl: `/dashboard/parent-requests`,
            schoolId,
            userId: null, // We'll need to handle parent notifications differently since they're not Users
            metadata: { 
              role: "PARENT",
              parentId: student.parentId,
              requestingParentName: fullName,
              studentName: `${student.firstName} ${student.lastName}`,
            },
          },
        })
      );
    }

    // Execute all notifications
    await Promise.all(notifications);

    // Send welcome email with credentials
    const school = await db.school.findUnique({
      where: { id: schoolId },
      select: { name: true },
    });

    let emailAdditionalInfo = "";
    if (studentsWithoutParent.length > 0) {
      emailAdditionalInfo = `You have been linked to your ${studentsWithoutParent.length > 1 ? "children" : "child"}: ${linkedChildrenNames}.`;
    }
    if (studentsWithParent.length > 0) {
      emailAdditionalInfo += studentsWithoutParent.length > 0 ? ` Requests have been sent for: ${requestedChildrenNames}.` : `Requests have been sent to existing parents for: ${requestedChildrenNames}. You will be notified once they accept.`;
    }

    await sendEmail({
      to: parent.email,
      subject: "Welcome to Connect-Ed - Your Login Credentials",
      html: generateWelcomeEmailWithCredentials({
        name: fullName,
        email: parent.email,
        password: generatedPassword,
        role: "PARENT",
        schoolName: school?.name,
        additionalInfo: emailAdditionalInfo,
      }),
      schoolId,
    });

    console.log(`[POST /parents] ✅ Parent created successfully: ${fullName} (${parent.id})`);
    console.log(`[POST /parents] Direct links: ${studentsWithoutParent.length}, Requests: ${studentsWithParent.length}`);
    
    // Return parent with generated password and request info
    return successResponse(
      c,
      {
        parent: parentWithChildren,
        password: generatedPassword,
        linkedStudents: studentsWithoutParent.map(s => ({
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          admissionNumber: s.admissionNumber,
        })),
        requestedStudents: studentsWithParent.map(s => ({
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          admissionNumber: s.admissionNumber,
          existingParentName: s.parent?.name,
        })),
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

// GET /parents/requests - Get all parent requests for the authenticated parent
parents.get("/requests", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    // TODO: Get parent ID from authenticated parent session
    // For now, we'll need to accept it as a query parameter
    const parentId = c.req.query("parentId");

    if (!parentId) {
      return errors.badRequest(c, "Parent ID is required");
    }

    const requests = await db.parentRequest.findMany({
      where: {
        existingParentId: parentId,
        schoolId,
        status: "PENDING",
      },
      include: {
        requestingParent: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(c, { requests });
  } catch (error) {
    console.error("Get parent requests error:", error);
    return errors.internalError(c);
  }
});

// POST /parents/requests/:id/accept - Accept a parent request
parents.post("/requests/:id/accept", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const requestId = c.req.param("id");

    // Find the request
    const request = await db.parentRequest.findFirst({
      where: {
        id: requestId,
        schoolId,
        status: "PENDING",
      },
      include: {
        requestingParent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        existingParent: {
          select: {
            id: true,
            name: true,
          },
        },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!request) {
      return errors.notFound(c, "Parent request");
    }

    // Update request status
    await db.parentRequest.update({
      where: { id: requestId },
      data: {
        status: "ACCEPTED",
        respondedAt: new Date(),
      },
    });

    // Link the student to the requesting parent
    await db.student.update({
      where: { id: request.studentId },
      data: {
        parentId: request.requestingParentId,
      },
    });

    // Send notifications
    const notifications = [];

    // Notify admins
    const admins = await db.user.findMany({
      where: { schoolId, role: "ADMIN", isActive: true },
      select: { id: true },
    });

    for (const admin of admins) {
      notifications.push(
        db.notification.create({
          data: {
            type: NotificationType.SYSTEM_ALERT,
            priority: NotificationPriority.MEDIUM,
            title: "Parent Request Accepted",
            message: `${request.existingParent.name} accepted ${request.requestingParent.name} as a parent for ${request.student.firstName} ${request.student.lastName}.`,
            actionUrl: `/dashboard/parents`,
            schoolId,
            userId: admin.id,
          },
        })
      );
    }

    // Notify requesting parent
    notifications.push(
      db.notification.create({
        data: {
          type: NotificationType.SYSTEM_ALERT,
          priority: NotificationPriority.HIGH,
          title: "Parent Request Accepted",
          message: `Your request to be added as a parent for ${request.student.firstName} ${request.student.lastName} has been accepted!`,
          actionUrl: `/dashboard`,
          schoolId,
          metadata: { 
            role: "PARENT",
            parentId: request.requestingParentId,
          },
        },
      })
    );

    await Promise.all(notifications);

    // Send email to requesting parent
    const school = await db.school.findUnique({
      where: { id: schoolId },
      select: { name: true },
    });

    await sendEmail({
      to: request.requestingParent.email,
      subject: "Parent Request Accepted",
      html: `
        <h2>Great News!</h2>
        <p>Your request to be added as a parent for <strong>${request.student.firstName} ${request.student.lastName}</strong> has been accepted by ${request.existingParent.name}.</p>
        <p>You can now access their information in your parent dashboard.</p>
        <p>Best regards,<br>${school?.name || "Connect-Ed"}</p>
      `,
      schoolId,
    });

    return successResponse(c, { 
      message: "Parent request accepted successfully",
      request,
    });
  } catch (error) {
    console.error("Accept parent request error:", error);
    return errors.internalError(c);
  }
});

// POST /parents/requests/:id/decline - Decline a parent request
parents.post("/requests/:id/decline", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const requestId = c.req.param("id");

    // Find the request
    const request = await db.parentRequest.findFirst({
      where: {
        id: requestId,
        schoolId,
        status: "PENDING",
      },
      include: {
        requestingParent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        existingParent: {
          select: {
            id: true,
            name: true,
          },
        },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!request) {
      return errors.notFound(c, "Parent request");
    }

    // Update request status
    await db.parentRequest.update({
      where: { id: requestId },
      data: {
        status: "DECLINED",
        respondedAt: new Date(),
      },
    });

    // Send notifications
    const notifications = [];

    // Notify admins
    const admins = await db.user.findMany({
      where: { schoolId, role: "ADMIN", isActive: true },
      select: { id: true },
    });

    for (const admin of admins) {
      notifications.push(
        db.notification.create({
          data: {
            type: NotificationType.SYSTEM_ALERT,
            priority: NotificationPriority.MEDIUM,
            title: "Parent Request Declined",
            message: `${request.existingParent.name} declined ${request.requestingParent.name} as a parent for ${request.student.firstName} ${request.student.lastName}.`,
            actionUrl: `/dashboard/parents`,
            schoolId,
            userId: admin.id,
          },
        })
      );
    }

    // Notify requesting parent
    notifications.push(
      db.notification.create({
        data: {
          type: NotificationType.SYSTEM_ALERT,
          priority: NotificationPriority.MEDIUM,
          title: "Parent Request Declined",
          message: `Your request to be added as a parent for ${request.student.firstName} ${request.student.lastName} was declined.`,
          actionUrl: `/dashboard`,
          schoolId,
          metadata: { 
            role: "PARENT",
            parentId: request.requestingParentId,
          },
        },
      })
    );

    await Promise.all(notifications);

    // Send email to requesting parent
    const school = await db.school.findUnique({
      where: { id: schoolId },
      select: { name: true },
    });

    await sendEmail({
      to: request.requestingParent.email,
      subject: "Parent Request Update",
      html: `
        <h2>Request Update</h2>
        <p>Your request to be added as a parent for <strong>${request.student.firstName} ${request.student.lastName}</strong> was declined by ${request.existingParent.name}.</p>
        <p>If you believe this is an error, please contact the school administration.</p>
        <p>Best regards,<br>${school?.name || "Connect-Ed"}</p>
      `,
      schoolId,
    });

    return successResponse(c, { 
      message: "Parent request declined successfully",
      request,
    });
  } catch (error) {
    console.error("Decline parent request error:", error);
    return errors.internalError(c);
  }
});

export default parents;
