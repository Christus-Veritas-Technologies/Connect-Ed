import { Hono } from "hono";
import { z } from "zod";
import { db } from "@repo/db";
import { requireAuth, requireParentAuth, requireStudentAuth } from "../middleware/auth";
import { successResponse, errors } from "../lib/response";

const announcements = new Hono();

// ============================================
// Schemas
// ============================================

const createAnnouncementSchema = z.object({
  heading: z.string().min(1).max(32),
  subheading: z.string().min(1),
  length: z.enum(["ONE_DAY", "ONE_WEEK", "ONE_MONTH"]),
});

const createCommentSchema = z.object({
  content: z.string().min(1).max(500),
});

// ============================================
// Helpers
// ============================================

const announcementInclude = {
  createdBy: { select: { id: true, name: true, email: true, role: true } },
  comments: {
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      parent: { select: { id: true, name: true, email: true } },
      student: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
  _count: { select: { comments: true } },
};

function isAnnouncementActive(createdAt: Date, length: string): boolean {
  const now = new Date();
  const created = new Date(createdAt);
  switch (length) {
    case "ONE_DAY":
      return now.getTime() - created.getTime() < 24 * 60 * 60 * 1000;
    case "ONE_WEEK":
      return now.getTime() - created.getTime() < 7 * 24 * 60 * 60 * 1000;
    case "ONE_MONTH":
      return now.getTime() - created.getTime() < 30 * 24 * 60 * 60 * 1000;
    default:
      return false;
  }
}

// ============================================
// ADMIN Routes (require staff auth)
// ============================================

// POST /announcements - Create announcement (Admin only)
announcements.post("/", requireAuth, async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const userId = c.get("userId");
    const role = c.get("role");

    if (role !== "ADMIN") {
      return errors.forbidden(c);
    }

    const body = await c.req.json();
    const parsed = createAnnouncementSchema.safeParse(body);
    if (!parsed.success) {
      return errors.badRequest(c, parsed.error.errors[0]?.message || "Invalid input");
    }

    const announcement = await db.announcement.create({
      data: {
        heading: parsed.data.heading,
        subheading: parsed.data.subheading,
        length: parsed.data.length,
        schoolId,
        createdById: userId,
      },
      include: announcementInclude,
    });

    return successResponse(c, { announcement }, 201);
  } catch (error) {
    console.error("Create announcement error:", error);
    return errors.internalError(c);
  }
});

// GET /announcements - List active announcements (staff)
announcements.get("/", requireAuth, async (c) => {
  try {
    const schoolId = c.get("schoolId");

    const allAnnouncements = await db.announcement.findMany({
      where: { schoolId },
      include: announcementInclude,
      orderBy: { createdAt: "desc" },
    });

    // Filter to only active announcements
    const active = allAnnouncements.filter((a) =>
      isAnnouncementActive(a.createdAt, a.length)
    );

    return successResponse(c, { announcements: active });
  } catch (error) {
    console.error("List announcements error:", error);
    return errors.internalError(c);
  }
});

// GET /announcements/all - List ALL announcements including expired (admin)
announcements.get("/all", requireAuth, async (c) => {
  try {
    const schoolId = c.get("schoolId");

    const allAnnouncements = await db.announcement.findMany({
      where: { schoolId },
      include: announcementInclude,
      orderBy: { createdAt: "desc" },
    });

    return successResponse(c, { announcements: allAnnouncements });
  } catch (error) {
    console.error("List all announcements error:", error);
    return errors.internalError(c);
  }
});

// DELETE /announcements/:id - Delete announcement (Admin only)
announcements.delete("/:id", requireAuth, async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const role = c.get("role");
    const id = c.req.param("id");

    if (role !== "ADMIN") {
      return errors.forbidden(c);
    }

    const announcement = await db.announcement.findFirst({
      where: { id, schoolId },
    });

    if (!announcement) {
      return errors.notFound(c, "Announcement not found");
    }

    await db.announcement.delete({ where: { id } });

    return successResponse(c, { message: "Announcement deleted" });
  } catch (error) {
    console.error("Delete announcement error:", error);
    return errors.internalError(c);
  }
});

// POST /announcements/:id/comments - Add comment (staff and students)
announcements.post("/:id/comments", requireAuth, async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const userId = c.get("userId");
    const role = c.get("role");
    const id = c.req.param("id");

    const body = await c.req.json();
    const parsed = createCommentSchema.safeParse(body);
    if (!parsed.success) {
      return errors.badRequest(c, parsed.error.errors[0]?.message || "Invalid input");
    }

    const announcement = await db.announcement.findFirst({
      where: { id, schoolId },
    });
    if (!announcement) {
      return errors.notFound(c, "Announcement not found");
    }

    // Build comment data based on user role
    const commentData: any = {
      content: parsed.data.content,
      announcementId: id,
    };

    // Set the appropriate commenter field based on role
    if (role === ("STUDENT" as any)) {
      commentData.studentId = userId;
    } else if (role === "PARENT") {
      commentData.parentId = userId;
    } else {
      // Admin, Teacher, Receptionist
      commentData.userId = userId;
    }

    const comment = await db.announcementComment.create({
      data: commentData,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        parent: { select: { id: true, name: true, email: true } },
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return successResponse(c, { comment }, 201);
  } catch (error) {
    console.error("Create comment error:", error);
    return errors.internalError(c);
  }
});

// ============================================
// PARENT Routes
// ============================================

// GET /announcements/parent - List active announcements for parents
announcements.get("/parent", requireParentAuth, async (c) => {
  try {
    const schoolId = c.get("parent").schoolId;

    const allAnnouncements = await db.announcement.findMany({
      where: { schoolId },
      include: announcementInclude,
      orderBy: { createdAt: "desc" },
    });

    const active = allAnnouncements.filter((a) =>
      isAnnouncementActive(a.createdAt, a.length)
    );

    return successResponse(c, { announcements: active });
  } catch (error) {
    console.error("Parent list announcements error:", error);
    return errors.internalError(c);
  }
});

// POST /announcements/:id/comments/parent - Add comment (parent)
announcements.post("/:id/comments/parent", requireParentAuth, async (c) => {
  try {
    const parentPayload = c.get("parent");
    const id = c.req.param("id");

    const body = await c.req.json();
    const parsed = createCommentSchema.safeParse(body);
    if (!parsed.success) {
      return errors.badRequest(c, parsed.error.errors[0]?.message || "Invalid input");
    }

    const announcement = await db.announcement.findFirst({
      where: { id, schoolId: parentPayload.schoolId },
    });
    if (!announcement) {
      return errors.notFound(c, "Announcement not found");
    }

    const comment = await db.announcementComment.create({
      data: {
        content: parsed.data.content,
        announcementId: id,
        parentId: parentPayload.sub,
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        parent: { select: { id: true, name: true, email: true } },
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return successResponse(c, { comment }, 201);
  } catch (error) {
    console.error("Parent create comment error:", error);
    return errors.internalError(c);
  }
});

// ============================================
// STUDENT Routes
// ============================================

// GET /announcements/student - List active announcements for students
announcements.get("/student", requireStudentAuth, async (c) => {
  try {
    const schoolId = c.get("student").schoolId;

    const allAnnouncements = await db.announcement.findMany({
      where: { schoolId },
      include: announcementInclude,
      orderBy: { createdAt: "desc" },
    });

    const active = allAnnouncements.filter((a) =>
      isAnnouncementActive(a.createdAt, a.length)
    );

    return successResponse(c, { announcements: active });
  } catch (error) {
    console.error("Student list announcements error:", error);
    return errors.internalError(c);
  }
});

// POST /announcements/:id/comments/student - Add comment (student)
announcements.post("/:id/comments/student", requireStudentAuth, async (c) => {
  try {
    const studentPayload = c.get("student");
    const id = c.req.param("id");

    const body = await c.req.json();
    const parsed = createCommentSchema.safeParse(body);
    if (!parsed.success) {
      return errors.badRequest(c, parsed.error.errors[0]?.message || "Invalid input");
    }

    const announcement = await db.announcement.findFirst({
      where: { id, schoolId: studentPayload.schoolId },
    });
    if (!announcement) {
      return errors.notFound(c, "Announcement not found");
    }

    const comment = await db.announcementComment.create({
      data: {
        content: parsed.data.content,
        announcementId: id,
        studentId: studentPayload.sub,
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        parent: { select: { id: true, name: true, email: true } },
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return successResponse(c, { comment }, 201);
  } catch (error) {
    console.error("Student create comment error:", error);
    return errors.internalError(c);
  }
});

export default announcements;
