import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, Role } from "@repo/db";
import { requireAuth, requireRole } from "../middleware/auth";
import { updateSchoolSchema } from "../lib/validation";
import { successResponse, errors } from "../lib/response";

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

export default settings;
