import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, Role, SchoolPeriodType } from "@repo/db";
import { requireAuth, requireRole } from "../middleware/auth";
import { updateSchoolSchema, startTermSchema } from "../lib/validation";
import { successResponse, errors } from "../lib/response";
import { createNotification } from "./notifications";
import { sendEmail, generatePeriodChangeEmail } from "../lib/email";

const settings = new Hono();

// Apply auth middleware to all routes
settings.use("*", requireAuth);
settings.use("*", requireRole(Role.ADMIN));

// GET /settings/school - Get school settings
settings.get("/school", async (c) => {
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

// PATCH /settings/school - Update school settings
settings.patch("/school", zValidator("json", updateSchoolSchema), async (c) => {
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
      },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        email: true,
        plan: true,
      },
    });

    return successResponse(c, { school });
  } catch (error) {
    console.error("Update school settings error:", error);
    return errors.internalError(c);
  }
});

// GET /settings/users - List all users in school
settings.get("/users", async (c) => {
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
settings.post("/period/end", async (c) => {
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
        role: true,
      },
    });

    // Create notification and send email to each user
    const notificationPromises = users.map(async (user) => {
      // Create in-app notification
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
      });

      // Send email notification
      await sendEmail({
        to: user.email,
        subject: `Holiday Period - ${updatedSchool.name}`,
        html: generatePeriodChangeEmail({
          name: user.name,
          schoolName: updatedSchool.name,
          action: "ended",
          termNumber: school.currentTermNumber!,
          termYear: school.currentTermYear!,
          newPeriod: "holiday",
        }),
        schoolId,
        type: "NOREPLY",
      });
    });

    await Promise.all(notificationPromises);

    return successResponse(c, {
      message: `Term ${school.currentTermNumber} of ${school.currentTermYear} has ended. Holiday period has started.`,
      periodType: "HOLIDAY",
    });
  } catch (error) {
    console.error("End period error:", error);
    return errors.internalError(c);
  }
});

// POST /settings/period/start-term - Start a new term (holiday → term)
settings.post("/period/start-term", zValidator("json", startTermSchema), async (c) => {
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
        role: true,
      },
    });

    // Create notification and send email to each user
    const notificationPromises = users.map(async (user) => {
      // Create in-app notification
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
      });

      // Send email notification
      await sendEmail({
        to: user.email,
        subject: `Term ${data.termNumber} Has Started - ${updatedSchool.name}`,
        html: generatePeriodChangeEmail({
          name: user.name,
          schoolName: updatedSchool.name,
          action: "started",
          termNumber: data.termNumber,
          termYear: data.year,
          newPeriod: "term",
        }),
        schoolId,
        type: "NOREPLY",
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

export default settings;
