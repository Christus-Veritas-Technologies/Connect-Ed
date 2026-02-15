import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, Role, SchoolPeriodType } from "@repo/db";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import { updateSchoolSchema, startTermSchema } from "../lib/validation";
import { successResponse, errors } from "../lib/response";
import { createNotification, getSchoolNotificationPrefs } from "./notifications";
import { sendEmail, generatePeriodChangeEmail } from "../lib/email";
import { notifyGeneric } from "../lib/notify";
import { sendAllReportsToParents } from "../lib/report-dispatch";

const settings = new Hono();

// Apply auth middleware to all routes
settings.use("*", requireAuth);

// =============================================
// School-level settings (Admin only)
// =============================================

// GET /settings/school - Get school settings
settings.get("/school", requireRole(Role.ADMIN), async (c) => {
  try {
    const schoolId = c.get("schoolId");

    const school = await db.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        email: true,
        website: true,
        plan: true,
        isActive: true,
        emailQuota: true,
        whatsappQuota: true,
        smsQuota: true,
        emailUsed: true,
        whatsappUsed: true,
        smsUsed: true,
        quotaResetDate: true,
        createdAt: true,
        termlyFee: true,
        currentTermNumber: true,
        currentTermYear: true,
        termStartDate: true,
        currentPeriodType: true,
        holidayStartDate: true,
        country: true,
        currency: true,
        notifyEmail: true,
        notifyWhatsapp: true,
        notifySms: true,
        notifyInApp: true,
      },
    });

    if (!school) {
      return errors.notFound(c, "School");
    }

    return successResponse(c, { school });
  } catch (error) {
    console.error("Get school settings error:", error);
    return errors.internalError(c);
  }
});

// PATCH /settings/school - Update school info
settings.patch("/school", requireRole(Role.ADMIN), zValidator("json", updateSchoolSchema), async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const data = c.req.valid("json");

    const school = await db.school.update({
      where: { id: schoolId },
      data: {
        name: data.name,
        address: data.address,
        phone: data.phone,
        email: data.email || undefined,
        website: data.website || undefined,
        currency: data.currency || undefined,
      },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        email: true,
        website: true,
        plan: true,
        country: true,
        currency: true,
      },
    });

    return successResponse(c, { school });
  } catch (error) {
    console.error("Update school settings error:", error);
    return errors.internalError(c);
  }
});

// Notification preferences validation
const notificationPrefsSchema = z.object({
  notifyEmail: z.boolean().optional(),
  notifyWhatsapp: z.boolean().optional(),
  notifySms: z.boolean().optional(),
  notifyInApp: z.boolean().optional(),
});

// GET /settings/notifications - Get notification preferences
settings.get("/notifications", requireRole(Role.ADMIN), async (c) => {
  try {
    const schoolId = c.get("schoolId");

    const school = await db.school.findUnique({
      where: { id: schoolId },
      select: {
        notifyEmail: true,
        notifyWhatsapp: true,
        notifySms: true,
        notifyInApp: true,
      },
    });

    if (!school) {
      return errors.notFound(c, "School");
    }

    return successResponse(c, { preferences: school });
  } catch (error) {
    console.error("Get notification prefs error:", error);
    return errors.internalError(c);
  }
});

// PATCH /settings/notifications - Update notification preferences
settings.patch("/notifications", requireRole(Role.ADMIN), zValidator("json", notificationPrefsSchema), async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const data = c.req.valid("json");

    const school = await db.school.update({
      where: { id: schoolId },
      data,
      select: {
        notifyEmail: true,
        notifyWhatsapp: true,
        notifySms: true,
        notifyInApp: true,
      },
    });

    return successResponse(c, { preferences: school });
  } catch (error) {
    console.error("Update notification prefs error:", error);
    return errors.internalError(c);
  }
});

// =============================================
// User-level preferences (any authenticated user)
// =============================================

const userPrefsSchema = z.object({
  notifyInApp: z.boolean().optional(),
  notifyEmail: z.boolean().optional(),
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
});

// GET /settings/profile - Get current user's profile + preferences
settings.get("/profile", async (c) => {
  try {
    const userId = c.get("userId");
    const role = c.get("role");

    // Students are stored in the Student table, not User
    if (role === ("STUDENT" as any)) {
      const student = await db.student.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          createdAt: true,
        },
      });

      if (!student) {
        return errors.notFound(c, "Student");
      }

      return successResponse(c, {
        user: {
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          email: student.email,
          phone: student.phone,
          role: "STUDENT",
          notifyInApp: true, // Default for students
          notifyEmail: true, // Default for students
          createdAt: student.createdAt,
        },
      });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        notifyInApp: true,
        notifyEmail: true,
        createdAt: true,
      },
    });

    if (!user) {
      return errors.notFound(c, "User");
    }

    return successResponse(c, { user });
  } catch (error) {
    console.error("Get profile error:", error);
    return errors.internalError(c);
  }
});

// PATCH /settings/profile - Update current user's profile + preferences
settings.patch("/profile", zValidator("json", userPrefsSchema), async (c) => {
  try {
    const userId = c.get("userId");
    const role = c.get("role");
    const data = c.req.valid("json");

    // Students are stored in the Student table
    if (role === ("STUDENT" as any)) {
      const updateData: any = {};
      if (data.notifyInApp !== undefined) updateData.notifyInApp = data.notifyInApp;
      if (data.notifyEmail !== undefined) updateData.notifyEmail = data.notifyEmail;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.name) {
        const parts = data.name.trim().split(/\s+/);
        updateData.firstName = parts[0];
        updateData.lastName = parts.slice(1).join(" ") || parts[0];
      }

      const student = await db.student.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      });

      return successResponse(c, {
        user: {
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          email: student.email,
          phone: student.phone,
          role: "STUDENT",
          notifyInApp: true, // Default for students
          notifyEmail: true, // Default for students
        },
      });
    }

    const user = await db.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        notifyInApp: true,
        notifyEmail: true,
      },
    });

    return successResponse(c, { user });
  } catch (error) {
    console.error("Update profile error:", error);
    return errors.internalError(c);
  }
});

// =============================================
// Admin-only routes
// =============================================

// GET /settings/users - List all users in school
settings.get("/users", requireRole(Role.ADMIN), async (c) => {
  try {
    const schoolId = c.get("schoolId");

    const users = await db.user.findMany({
      where: { schoolId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(c, { users });
  } catch (error) {
    console.error("List users error:", error);
    return errors.internalError(c);
  }
});

// POST /settings/period/end - End the current period (term → holiday)
settings.post("/period/end", requireRole(Role.ADMIN), async (c) => {
  try {
    const schoolId = c.get("schoolId");

    const school = await db.school.findUnique({
      where: { id: schoolId },
      select: {
        currentPeriodType: true,
        currentTermNumber: true,
        currentTermYear: true,
      },
    });

    if (!school) {
      return errors.notFound(c, "School");
    }

    if (school.currentPeriodType !== SchoolPeriodType.TERM) {
      return errors.badRequest(c, "School is not currently in a term period");
    }

    // Update school period
    const updatedSchool = await db.school.update({
      where: { id: schoolId },
      data: {
        currentPeriodType: SchoolPeriodType.HOLIDAY,
        holidayStartDate: new Date(),
      },
      select: {
        name: true,
        currentTermNumber: true,
        currentTermYear: true,
      },
    });

    // Get all active users for notifications and emails
    const users = await db.user.findMany({
      where: {
        schoolId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
      },
    });

    // Create notification and send email/whatsapp/sms to each user (respecting preferences)
    const notificationPromises = users.map(async (user) => {
      // Create in-app notification (createNotification already checks prefs)
      await createNotification({
        schoolId,
        userId: user.id,
        title: "Holiday Period Started",
        message: `Term ${school.currentTermNumber} has ended. We're now in the holiday period. Enjoy the break!`,
        type: "SYSTEM_ALERT",
        priority: "MEDIUM",
        metadata: {
          termNumber: school.currentTermNumber,
          termYear: school.currentTermYear,
          periodType: "HOLIDAY",
        },
        actorName: "Connect-Ed",
      });

      // Send multi-channel notification
      await notifyGeneric({
        schoolId,
        email: user.email,
        phone: user.phone || undefined,
        subject: `Holiday Period - ${updatedSchool.name}`,
        emailHtml: generatePeriodChangeEmail({
          name: user.name,
          schoolName: updatedSchool.name || "School",
          action: "ended",
          termNumber: school.currentTermNumber!,
          termYear: school.currentTermYear!,
          newPeriod: "holiday",
        }),
        whatsappContent: `🌴 *Holiday Period Started*\n\nHi ${user.name},\n\nTerm ${school.currentTermNumber} of ${school.currentTermYear} at *${updatedSchool.name}* has ended. Enjoy the holiday break!\n\n_Sent via Connect-Ed_`,
        smsContent: `Holiday Period: Term ${school.currentTermNumber} at ${updatedSchool.name} has ended. Enjoy the break!`,
        emailType: "NOREPLY",
      });
    });

    await Promise.all(notificationPromises);

    // Send all student academic reports to parents (end-of-term dispatch)
    // Fire-and-forget — don't block the response
    sendAllReportsToParents(schoolId).then((dispatches) => {
      const sent = dispatches.filter((d) => d.emailSent || d.whatsappSent).length;
      const total = dispatches.length;
      console.log(`📨 End-of-term report dispatch: ${sent}/${total} report(s) sent to parents for school ${schoolId}`);
    }).catch((err) => {
      console.error("End-of-term report dispatch error:", err);
    });

    return successResponse(c, {
      message: `Term ${school.currentTermNumber} of ${school.currentTermYear} has ended. Holiday period has started. Academic reports are being sent to parents.`,
      periodType: "HOLIDAY",
    });
  } catch (error) {
    console.error("End period error:", error);
    return errors.internalError(c);
  }
});

// POST /settings/period/start-term - Start a new term (holiday → term)
settings.post("/period/start-term", requireRole(Role.ADMIN), zValidator("json", startTermSchema), async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const data = c.req.valid("json");

    const school = await db.school.findUnique({
      where: { id: schoolId },
      select: { currentPeriodType: true },
    });

    if (!school) {
      return errors.notFound(c, "School");
    }

    if (school.currentPeriodType !== SchoolPeriodType.HOLIDAY) {
      return errors.badRequest(c, "School is not currently in a holiday period");
    }

    // Update school period
    const updatedSchool = await db.school.update({
      where: { id: schoolId },
      data: {
        currentPeriodType: SchoolPeriodType.TERM,
        currentTermNumber: data.termNumber,
        currentTermYear: data.year,
        termStartDate: new Date(data.year, data.month - 1, data.day),
        holidayStartDate: null,
      },
      select: {
        name: true,
      },
    });

    // Get all active users for notifications and emails
    const users = await db.user.findMany({
      where: {
        schoolId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
      },
    });

    // Create notification and send email/whatsapp/sms to each user (respecting preferences)
    const notificationPromises = users.map(async (user) => {
      // Create in-app notification (createNotification already checks prefs)
      await createNotification({
        schoolId,
        userId: user.id,
        title: `Term ${data.termNumber} Started`,
        message: `Welcome back! Term ${data.termNumber} of ${data.year} has officially begun. Let's have a great term!`,
        type: "SYSTEM_ALERT",
        priority: "HIGH",
        metadata: {
          termNumber: data.termNumber,
          termYear: data.year,
          periodType: "TERM",
        },
        actorName: "Connect-Ed",
      });

      // Send multi-channel notification
      await notifyGeneric({
        schoolId,
        email: user.email,
        phone: user.phone || undefined,
        subject: `Term ${data.termNumber} Has Started - ${updatedSchool.name}`,
        emailHtml: generatePeriodChangeEmail({
          name: user.name,
          schoolName: updatedSchool.name || "School",
          action: "started",
          termNumber: data.termNumber,
          termYear: data.year,
          newPeriod: "term",
        }),
        whatsappContent: `🎓 *Term ${data.termNumber} Has Started!*\n\nHi ${user.name},\n\nWelcome back! Term ${data.termNumber} of ${data.year} at *${updatedSchool.name}* has officially begun.\n\nLet's have a great term!\n\n_Sent via Connect-Ed_`,
        smsContent: `Welcome back! Term ${data.termNumber} of ${data.year} at ${updatedSchool.name} has started. Let's have a great term!`,
        emailType: "NOREPLY",
      });
    });

    await Promise.all(notificationPromises);

    return successResponse(c, {
      message: `Term ${data.termNumber} of ${data.year} has started.`,
      periodType: "TERM",
      termNumber: data.termNumber,
      year: data.year,
    });
  } catch (error) {
    console.error("Start term error:", error);
    return errors.internalError(c);
  }
});

// =============================================
// Report Settings (Admin only)
// =============================================

// GET /settings/report - Get report configuration settings
settings.get("/report", requireRole(Role.ADMIN), async (c) => {
  try {
    const schoolId = c.get("schoolId");

    const school = await db.school.findUnique({
      where: { id: schoolId },
      select: {
        reportShowSchoolBranding: true,
        reportShowTeacherDetails: true,
        reportShowGrades: true,
        reportShowPassRates: true,
        reportShowInsights: true,
        reportShowExamDetails: true,
        reportShowOverallAverage: true,
        reportSchoolLogo: true,
        reportSchoolMotto: true,
      },
    });

    if (!school) {
      return errors.notFound(c, "School");
    }

    return successResponse(c, { settings: school });
  } catch (error) {
    console.error("Get report settings error:", error);
    return errors.internalError(c);
  }
});

// PATCH /settings/report - Update report configuration settings
const updateReportSettingsSchema = z.object({
  reportShowSchoolBranding: z.boolean().optional(),
  reportShowTeacherDetails: z.boolean().optional(),
  reportShowGrades: z.boolean().optional(),
  reportShowPassRates: z.boolean().optional(),
  reportShowInsights: z.boolean().optional(),
  reportShowExamDetails: z.boolean().optional(),
  reportShowOverallAverage: z.boolean().optional(),
  reportSchoolLogo: z.string().optional().nullable(),
  reportSchoolMotto: z.string().optional().nullable(),
});

settings.patch("/report", requireRole(Role.ADMIN), zValidator("json", updateReportSettingsSchema), async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const data = c.req.valid("json");

    const school = await db.school.update({
      where: { id: schoolId },
      data: {
        ...data,
      },
      select: {
        reportShowSchoolBranding: true,
        reportShowTeacherDetails: true,
        reportShowGrades: true,
        reportShowPassRates: true,
        reportShowInsights: true,
        reportShowExamDetails: true,
        reportShowOverallAverage: true,
        reportSchoolLogo: true,
        reportSchoolMotto: true,
      },
    });

    return successResponse(c, { settings: school, message: "Report settings updated successfully" });
  } catch (error) {
    console.error("Update report settings error:", error);
    return errors.internalError(c);
  }
});

export default settings;
