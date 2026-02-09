/**
 * REST API routes for class chat.
 * Provides room listing, message history (with privacy filtering),
 * and message sending (fallback for non-WebSocket clients).
 */
import { Hono } from "hono";
import { db, ChatMessageType } from "@repo/db";
import { successResponse, errors } from "../lib/response";
import { syncChatMembers } from "../lib/chat-sync";
import {
  verifyAccessToken,
  verifyParentAccessToken,
  verifyStudentAccessToken,
} from "../lib/auth";
import { z } from "zod";

const chat = new Hono();

// ─── Universal auth helper for chat ──────────────────────────
// Unlike the standard middleware, chat endpoints must support all 3 token types.
interface ChatUser {
  memberId: string;
  memberType: string; // "USER" | "STUDENT" | "PARENT"
  role: string;       // "ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "RECEPTIONIST"
  schoolId: string;
  name?: string;
  childrenIds?: string[];
}

async function authenticateChatUser(authHeader: string | undefined): Promise<ChatUser | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);

  // Try staff token first
  const staffPayload = await verifyAccessToken(token);
  if (staffPayload) {
    const user = await db.user.findUnique({ where: { id: staffPayload.sub }, select: { id: true, name: true, role: true } });
    if (!user) return null;
    return {
      memberId: user.id,
      memberType: "USER",
      role: user.role,
      schoolId: staffPayload.schoolId,
      name: user.name,
    };
  }

  // Try parent token
  const parentPayload = await verifyParentAccessToken(token);
  if (parentPayload) {
    const parent = await db.parent.findUnique({
      where: { id: parentPayload.sub },
      select: { id: true, name: true, children: { select: { id: true } } },
    });
    if (!parent) return null;
    return {
      memberId: parent.id,
      memberType: "PARENT",
      role: "PARENT",
      schoolId: parentPayload.schoolId,
      name: parent.name,
      childrenIds: parent.children.map((c) => c.id),
    };
  }

  // Try student token
  const studentPayload = await verifyStudentAccessToken(token);
  if (studentPayload) {
    const student = await db.student.findUnique({
      where: { id: studentPayload.sub },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!student) return null;
    return {
      memberId: student.id,
      memberType: "STUDENT",
      role: "STUDENT",
      schoolId: studentPayload.schoolId,
      name: `${student.firstName} ${student.lastName}`,
    };
  }

  return null;
}

// ─── Middleware ──────────────────────────────────────────────
chat.use("*", async (c, next) => {
  const user = await authenticateChatUser(c.req.header("authorization"));
  if (!user) return errors.unauthorized(c);
  c.set("chatUser" as never, user);
  await next();
});

function getChatUser(c: { get: (key: string) => unknown }): ChatUser {
  return c.get("chatUser" as never) as ChatUser;
}

// ─── GET /chat/rooms — List chat rooms the user belongs to ───
chat.get("/rooms", async (c) => {
  try {
    const user = getChatUser(c);

    const memberships = await db.chatMember.findMany({
      where: { memberType: user.memberType, memberId: user.memberId },
      select: { classId: true },
    });
    const classIds = memberships.map((m) => m.classId);

    const classes = await db.class.findMany({
      where: { id: { in: classIds } },
      select: {
        id: true,
        name: true,
        level: true,
        _count: { select: { students: true, chatMembers: true } },
        chatMessages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: {
            content: true,
            senderName: true,
            type: true,
            createdAt: true,
            targetStudentId: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Filter last message visibility for privacy
    const rooms = classes.map((cls) => {
      let lastMessage = cls.chatMessages[0] || null;

      // Hide private message preview from non-authorised users
      if (lastMessage?.targetStudentId) {
        const canSee =
          user.role === "ADMIN" ||
          user.role === "TEACHER" ||
          (user.memberType === "STUDENT" && user.memberId === lastMessage.targetStudentId) ||
          (user.memberType === "PARENT" && user.childrenIds?.includes(lastMessage.targetStudentId));
        if (!canSee) lastMessage = null;
      }

      return {
        classId: cls.id,
        className: cls.name,
        level: cls.level,
        studentCount: cls._count.students,
        memberCount: cls._count.chatMembers,
        lastMessage: lastMessage
          ? {
              content: lastMessage.type === "TEXT" ? lastMessage.content : `Shared ${lastMessage.type.toLowerCase().replace("_", " ")}`,
              senderName: lastMessage.senderName,
              createdAt: lastMessage.createdAt.toISOString(),
            }
          : null,
      };
    });

    return successResponse(c, { rooms });
  } catch (error) {
    console.error("List chat rooms error:", error);
    return errors.internalError(c);
  }
});

// ─── GET /chat/rooms/:classId/messages — Paginated messages ──
chat.get("/rooms/:classId/messages", async (c) => {
  try {
    const user = getChatUser(c);
    const classId = c.req.param("classId");
    const cursor = c.req.query("cursor"); // message ID for pagination
    const limit = Math.min(parseInt(c.req.query("limit") || "50"), 100);

    // Verify membership
    const isMember = await db.chatMember.findFirst({
      where: { classId, memberType: user.memberType, memberId: user.memberId },
    });
    if (!isMember) return errors.forbidden(c);

    const messages = await db.chatMessage.findMany({
      where: { classId },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        senderType: true,
        senderId: true,
        senderRole: true,
        senderName: true,
        senderAvatar: true,
        type: true,
        content: true,
        metadata: true,
        targetStudentId: true,
        createdAt: true,
      },
    });

    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();

    // Apply privacy filtering
    const filtered = messages.filter((msg) => {
      if (!msg.targetStudentId) return true;
      if (msg.type !== "EXAM_RESULT" && msg.type !== "GRADE") return true;
      // Sender sees own messages
      if (msg.senderId === user.memberId && msg.senderType === user.memberType) return true;
      // Admin/Teacher see all
      if (user.role === "ADMIN" || user.role === "TEACHER") return true;
      // Target student
      if (user.memberType === "STUDENT" && user.memberId === msg.targetStudentId) return true;
      // Parent of target student
      if (user.memberType === "PARENT" && user.childrenIds?.includes(msg.targetStudentId)) return true;
      return false;
    });

    return successResponse(c, {
      messages: filtered.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
      nextCursor: hasMore ? messages[messages.length - 1]?.id : null,
    });
  } catch (error) {
    console.error("Get messages error:", error);
    return errors.internalError(c);
  }
});

// ─── GET /chat/rooms/:classId/members — List room members ────
chat.get("/rooms/:classId/members", async (c) => {
  try {
    const user = getChatUser(c);
    const classId = c.req.param("classId");

    // Verify membership
    const isMember = await db.chatMember.findFirst({
      where: { classId, memberType: user.memberType, memberId: user.memberId },
    });
    if (!isMember) return errors.forbidden(c);

    const members = await db.chatMember.findMany({
      where: { classId },
      select: {
        id: true,
        memberType: true,
        memberId: true,
        role: true,
        name: true,
        avatar: true,
        joinedAt: true,
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });

    return successResponse(c, { members });
  } catch (error) {
    console.error("List members error:", error);
    return errors.internalError(c);
  }
});

// ─── POST /chat/rooms/:classId/messages — Send message (REST) ─
const sendMessageSchema = z.object({
  content: z.string().min(1).max(5000),
  messageType: z.enum(["TEXT", "EXAM_RESULT", "GRADE", "SUBJECT_INFO"]).default("TEXT"),
  metadata: z.record(z.unknown()).optional(),
  targetStudentId: z.string().optional(),
});

chat.post("/rooms/:classId/messages", async (c) => {
  try {
    const user = getChatUser(c);
    const classId = c.req.param("classId");

    // Verify membership
    const isMember = await db.chatMember.findFirst({
      where: { classId, memberType: user.memberType, memberId: user.memberId },
    });
    if (!isMember) return errors.forbidden(c);

    const body = await c.req.json();
    const parsed = sendMessageSchema.safeParse(body);
    if (!parsed.success) {
      return errors.validationError(c, parsed.error.errors[0]?.message || "Invalid input");
    }

    const { content, messageType, metadata, targetStudentId } = parsed.data;

    // Role-based permission check
    const textOnly = ["TEXT"];
    const allowed = ["ADMIN", "TEACHER"].includes(user.role)
      ? ["TEXT", "EXAM_RESULT", "GRADE", "SUBJECT_INFO"]
      : textOnly;
    if (!allowed.includes(messageType)) {
      return errors.forbidden(c);
    }

    const chatMessage = await db.chatMessage.create({
      data: {
        classId,
        senderType: user.memberType,
        senderId: user.memberId,
        senderRole: user.role,
        senderName: user.name || "Unknown",
        senderAvatar: null,
        type: messageType as ChatMessageType,
        content,
        metadata: metadata ? (metadata as Record<string, string | number | boolean | null>) : undefined,
        targetStudentId: targetStudentId || metadata?.studentId as string || null,
      },
      select: {
        id: true,
        senderType: true,
        senderId: true,
        senderRole: true,
        senderName: true,
        senderAvatar: true,
        type: true,
        content: true,
        metadata: true,
        targetStudentId: true,
        createdAt: true,
      },
    });

    // Also broadcast via WebSocket if anyone is connected
    const { broadcastMessage } = await import("../lib/chat-manager");
    broadcastMessage(classId, {
      ...chatMessage,
      createdAt: chatMessage.createdAt.toISOString(),
    });

    return successResponse(c, { message: { ...chatMessage, createdAt: chatMessage.createdAt.toISOString() } }, 201);
  } catch (error) {
    console.error("Send message error:", error);
    return errors.internalError(c);
  }
});

// ─── POST /chat/rooms/:classId/sync — Force member sync (admin) ─
chat.post("/rooms/:classId/sync", async (c) => {
  try {
    const user = getChatUser(c);
    if (user.role !== "ADMIN") return errors.forbidden(c);

    const classId = c.req.param("classId");
    await syncChatMembers(classId);

    return successResponse(c, { message: "Chat members synced" });
  } catch (error) {
    console.error("Sync members error:", error);
    return errors.internalError(c);
  }
});

export default chat;
