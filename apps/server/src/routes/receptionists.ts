import { Hono } from "hono";
import { db, Role, NotificationType, NotificationPriority } from "@repo/db";
import { requireAuth, requireRole } from "../middleware/auth";
import { hashPassword, generateRandomPassword } from "../lib/password";
import { sendEmail, generateWelcomeEmailWithCredentials } from "../lib/email";
import { successResponse, errors } from "../lib/response";
import { z } from "zod";

const createReceptionistSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
});

const receptionists = new Hono();

// Apply auth middleware to all routes
receptionists.use("*", requireAuth);
// Require admin role
receptionists.use("*", requireRole(Role.ADMIN));

// GET /receptionists - List receptionists
receptionists.get("/", async (c) => {
  try {
    const schoolId = c.get("schoolId");

    const receptionistList = await db.user.findMany({
      where: { schoolId, role: Role.RECEPTIONIST },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });

    return successResponse(c, { receptionists: receptionistList });
  } catch (error) {
    console.error("List receptionists error:", error);
    return errors.internalError(c);
  }
});

// POST /receptionists - Create receptionist
receptionists.post("/", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const body = await c.req.json();
    const parsed = createReceptionistSchema.safeParse(body);

    if (!parsed.success) {
      return errors.validationError(c, parsed.error.errors[0]?.message || "Invalid input");
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

    // Create receptionist
    const receptionist = await db.user.create({
      data: {
        email: data.email.toLowerCase(),
        password: hashedPassword,
        name: fullName,
        role: Role.RECEPTIONIST,
        schoolId,
        onboardingComplete: true, // Receptionists skip onboarding
      },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Send notifications to admins
    const admins = await db.user.findMany({
      where: { schoolId, role: Role.ADMIN, isActive: true },
      select: { id: true },
    });

    const notifications = admins.map((admin: { id: string }) =>
      db.notification.create({
        data: {
          type: NotificationType.TEACHER_ADDED,
          priority: NotificationPriority.MEDIUM,
          title: "New Receptionist Added",
          message: `${fullName} has been added as a receptionist.`,
          actionUrl: `/dashboard/receptionists`,
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
        additionalInfo: "You have been added as a Receptionist. You can manage student records, fees, and reports.",
      }),
      schoolId,
      type: "KIN",
    });

    return successResponse(c, { receptionist }, 201);
  } catch (error) {
    console.error("Create receptionist error:", error);
    return errors.internalError(c);
  }
});

// DELETE /receptionists/:id - Remove receptionist
receptionists.delete("/:id", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const receptionistId = c.req.param("id");

    // Verify receptionist exists and belongs to this school
    const receptionist = await db.user.findFirst({
      where: {
        id: receptionistId,
        schoolId,
        role: Role.RECEPTIONIST,
      },
      select: { id: true, name: true },
    });

    if (!receptionist) {
      return errors.notFound(c, "Receptionist not found");
    }

    // Hard delete the receptionist user
    await db.user.delete({
      where: { id: receptionistId },
    });

    // Send notifications to admins
    const admins = await db.user.findMany({
      where: { schoolId, role: Role.ADMIN, isActive: true },
      select: { id: true },
    });

    const notifications = admins.map((admin: { id: string }) =>
      db.notification.create({
        data: {
          type: NotificationType.TEACHER_ADDED,
          priority: NotificationPriority.MEDIUM,
          title: "Receptionist Removed",
          message: `${receptionist.name} has been removed as a receptionist.`,
          actionUrl: `/dashboard/receptionists`,
          schoolId,
          userId: admin.id,
        },
      })
    );

    await Promise.all(notifications);

    return successResponse(c, { message: "Receptionist removed successfully" });
  } catch (error) {
    console.error("Delete receptionist error:", error);
    return errors.internalError(c);
  }
});

export default receptionists;
