import { Hono } from "hono";
import { db, NotificationType, NotificationPriority } from "@repo/db";
import { requireAuth } from "../middleware/auth";
import { successResponse, errors } from "../lib/response";

const notifications = new Hono();

// GET /notifications - Get all notifications for current user/school
notifications.get("/", requireAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const schoolId = c.get("schoolId");
    const userRole = c.get("role");

    // Admins see all school notifications + their personal ones
    // Other users only see their personal notifications
    const where = userRole === "ADMIN"
      ? { schoolId }
      : { userId, schoolId };

    const notificationList = await db.notification.findMany({
      where,
      orderBy: [
        { isRead: "asc" },
        { createdAt: "desc" }
      ],
      take: 100, // Limit to last 100 notifications
    });

    const unreadCount = notificationList.filter(n => !n.isRead).length;

    return successResponse(c, {
      notifications: notificationList,
      unreadCount,
      total: notificationList.length,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return errors.internalError(c);
  }
});

// GET /notifications/unread-count - Get count of unread notifications
notifications.get("/unread-count", requireAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const schoolId = c.get("schoolId");
    const userRole = c.get("role");

    const where = userRole === "ADMIN"
      ? { schoolId, isRead: false }
      : { userId, schoolId, isRead: false };

    const count = await db.notification.count({ where });

    return successResponse(c, { count });
  } catch (error) {
    console.error("Get unread count error:", error);
    return errors.internalError(c);
  }
});

// POST /notifications/:id/read - Mark notification as read
notifications.post("/:id/read", requireAuth, async (c) => {
  try {
    const notificationId = c.req.param("id");
    const userId = c.get("userId");
    const schoolId = c.get("schoolId");

    // Verify ownership
    const notification = await db.notification.findFirst({
      where: {
        id: notificationId,
        OR: [
          { userId },
          { userId: null, schoolId } // School-wide notifications
        ]
      },
    });

    if (!notification) {
      return errors.notFound(c, { error: "Notification not found" });
    }

    const updated = await db.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return successResponse(c, { notification: updated });
  } catch (error) {
    console.error("Mark notification as read error:", error);
    return errors.internalError(c);
  }
});

// POST /notifications/read-all - Mark all notifications as read
notifications.post("/read-all", requireAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const schoolId = c.get("schoolId");
    const userRole = c.get("role");

    const where = userRole === "ADMIN"
      ? { schoolId, isRead: false }
      : { userId, schoolId, isRead: false };

    const result = await db.notification.updateMany({
      where,
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return successResponse(c, { updated: result.count });
  } catch (error) {
    console.error("Mark all as read error:", error);
    return errors.internalError(c);
  }
});

// DELETE /notifications/:id - Delete notification
notifications.delete("/:id", requireAuth, async (c) => {
  try {
    const notificationId = c.req.param("id");
    const userId = c.get("userId");
    const schoolId = c.get("schoolId");

    // Verify ownership
    const notification = await db.notification.findFirst({
      where: {
        id: notificationId,
        OR: [
          { userId },
          { userId: null, schoolId }
        ]
      },
    });

    if (!notification) {
      return errors.notFound(c, { error: "Notification not found" });
    }

    await db.notification.delete({
      where: { id: notificationId },
    });

    return successResponse(c, { message: "Notification deleted" });
  } catch (error) {
    console.error("Delete notification error:", error);
    return errors.internalError(c);
  }
});

// Helper function to create notification (can be called from other routes)
export async function createNotification(params: {
  schoolId: string;
  userId?: string;
  title: string;
  message: string;
  type: NotificationType;
  priority?: NotificationPriority;
  actionUrl?: string;
  metadata?: any;
}) {
  try {
    return await db.notification.create({
      data: {
        schoolId: params.schoolId,
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type,
        priority: params.priority || "MEDIUM",
        actionUrl: params.actionUrl,
        metadata: params.metadata,
      },
    });
  } catch (error) {
    console.error("Create notification error:", error);
    throw error;
  }
}

export default notifications;
