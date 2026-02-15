import { Hono } from "hono";
import { db, Role, NotificationType, NotificationPriority } from "@repo/db";
import { requireAuth, requireRole } from "../middleware/auth";
import { hashPassword, generateRandomPassword } from "../lib/password";
import { generateWelcomeEmailWithCredentials } from "../lib/email";
import { createNotification, getSchoolNotificationPrefs } from "./notifications";
import { notifyWelcome } from "../lib/notify";
import { successResponse, errors } from "../lib/response";
import { z } from "zod";

const createAdminSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
});

const admins = new Hono();

// Apply auth middleware to all routes
admins.use("*", requireAuth);
// Require admin role
admins.use("*", requireRole(Role.ADMIN));

// GET /admins - List admins
admins.get("/", async (c) => {
  try {
    const schoolId = c.get("schoolId");

    const adminList = await db.user.findMany({
      where: { schoolId, role: Role.ADMIN },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return successResponse(c, { admins: adminList });
  } catch (error) {
    console.error("List admins error:", error);
    return errors.internalError(c);
  }
});

// POST /admins - Create a new admin
admins.post("/", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const currentUserId = c.get("userId");
    const body = await c.req.json();
    const parsed = createAdminSchema.safeParse(body);

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

    // Create admin user
    const admin = await db.user.create({
      data: {
        email: data.email.toLowerCase(),
        password: hashedPassword,
        name: fullName,
        phone: data.phone || null,
        role: Role.ADMIN,
        schoolId,
        onboardingComplete: true, // New admins skip onboarding
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Send notifications to existing admins
    const existingAdmins = await db.user.findMany({
      where: { schoolId, role: Role.ADMIN, isActive: true, id: { not: admin.id } },
      select: { id: true },
    });

    const notifications = existingAdmins.map((a) =>
      createNotification({
        type: NotificationType.SYSTEM_ALERT,
        priority: NotificationPriority.HIGH,
        title: "New Admin Added",
        message: `${fullName} has been added as an administrator.`,
        actionUrl: `/dashboard/admins`,
        schoolId,
        userId: a.id,
        actorName: fullName,
      })
    );

    await Promise.all(notifications);

    // Send welcome email + WhatsApp + SMS (based on school preferences)
    const school = await db.school.findUnique({
      where: { id: schoolId },
      select: { name: true },
    });

    await notifyWelcome({
      schoolId,
      schoolName: school?.name || "Your School",
      name: fullName,
      email: data.email.toLowerCase(),
      phone: data.phone,
      password: generatedPassword,
      role: "TEACHER", // Email template uses TEACHER for staff-like roles
      emailHtml: generateWelcomeEmailWithCredentials({
        name: fullName,
        email: data.email.toLowerCase(),
        password: generatedPassword,
        role: "TEACHER",
        schoolName: school?.name ?? undefined,
        additionalInfo: "You have been added as an Administrator. You have full access to manage the school.",
      }),
    });

    return successResponse(c, { admin, password: generatedPassword }, 201);
  } catch (error) {
    console.error("Create admin error:", error);
    return errors.internalError(c);
  }
});

// DELETE /admins/:id - Remove an admin
admins.delete("/:id", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const currentUserId = c.get("userId");
    const adminId = c.req.param("id");

    // Prevent self-deletion
    if (adminId === currentUserId) {
      return errors.badRequest(c, "You cannot remove yourself as an admin.");
    }

    // Verify admin exists and belongs to this school
    const admin = await db.user.findFirst({
      where: {
        id: adminId,
        schoolId,
        role: Role.ADMIN,
      },
      select: { id: true, name: true },
    });

    if (!admin) {
      return errors.notFound(c, "Admin not found");
    }

    // Ensure at least one admin remains
    const adminCount = await db.user.count({
      where: { schoolId, role: Role.ADMIN, isActive: true },
    });

    if (adminCount <= 1) {
      return errors.badRequest(c, "Cannot remove the last admin. At least one admin must remain.");
    }

    // Hard delete the admin user
    await db.user.delete({
      where: { id: adminId },
    });

    // Notify remaining admins
    const remainingAdmins = await db.user.findMany({
      where: { schoolId, role: Role.ADMIN, isActive: true },
      select: { id: true },
    });

    const notifications = remainingAdmins.map((a) =>
      createNotification({
        type: NotificationType.SYSTEM_ALERT,
        priority: NotificationPriority.MEDIUM,
        title: "Admin Removed",
        message: `${admin.name} has been removed as an administrator.`,
        actionUrl: `/dashboard/admins`,
        schoolId,
        userId: a.id,
        actorName: admin.name,
      })
    );

    await Promise.all(notifications);

    return successResponse(c, { message: "Admin removed successfully" });
  } catch (error) {
    console.error("Delete admin error:", error);
    return errors.internalError(c);
  }
});

export default admins;
