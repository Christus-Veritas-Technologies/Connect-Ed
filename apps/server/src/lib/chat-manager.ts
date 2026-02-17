/**
 * WebSocket chat manager for class-based chat rooms.
 * Manages rooms (classId → connections), handles message broadcasting,
 * and applies privacy filtering for targeted messages (e.g. exam results).
 */
import type { ServerWebSocket } from "bun";
import { db, ChatMessageType } from "@repo/db";

export interface WsData {
  classId: string;
  memberId: string;
  memberType: string; // "USER" | "STUDENT" | "PARENT"
  role: string;       // "ADMIN" | "TEACHER" | "STUDENT" | "PARENT"
  name: string;
  schoolId: string;
  // For parents: IDs of their children (for privacy filtering)
  childrenIds?: string[];
}

// Singleton room map: classId → Set<WebSocket>
const rooms = new Map<string, Set<ServerWebSocket<WsData>>>();

export function joinRoom(ws: ServerWebSocket<WsData>) {
  const { classId } = ws.data;
  if (!rooms.has(classId)) {
    rooms.set(classId, new Set());
  }
  rooms.get(classId)!.add(ws);

  // Announce join to room
  broadcastSystem(classId, `${ws.data.name} joined the chat`);
}

export function leaveRoom(ws: ServerWebSocket<WsData>) {
  const { classId } = ws.data;
  const room = rooms.get(classId);
  if (room) {
    room.delete(ws);
    if (room.size === 0) rooms.delete(classId);
    else broadcastSystem(classId, `${ws.data.name} left the chat`);
  }
}

function broadcastSystem(classId: string, message: string) {
  const room = rooms.get(classId);
  if (!room) return;
  const payload = JSON.stringify({ type: "system", message, timestamp: new Date().toISOString() });
  for (const client of room) {
    client.send(payload);
  }
}

/**
 * Broadcast a chat message to a room with privacy filtering.
 * - TEXT & SUBJECT_INFO → everyone in room
 * - EXAM_RESULT & GRADE with targetStudentId → only:
 *     sender, admins, target student, parents of target student, teachers
 */
export function broadcastMessage(
  classId: string,
  message: {
    id: string;
    senderType: string;
    senderId: string;
    senderRole: string;
    senderName: string;
    senderAvatar: string | null;
    type: string;
    content: string;
    metadata: unknown;
    targetStudentId: string | null;
    createdAt: string;
  }
) {
  const room = rooms.get(classId);
  if (!room) return;

  const isPrivate =
    message.targetStudentId &&
    (message.type === "EXAM_RESULT" || message.type === "GRADE");

  const payload = JSON.stringify({ type: "message", message });

  for (const client of room) {
    if (isPrivate) {
      // Privacy filter: only send to authorised viewers
      const canSee = canViewTargetedMessage(client.data, message.senderId, message.senderType, message.targetStudentId!);
      if (!canSee) continue;
    }
    client.send(payload);
  }
}

/**
 * Determines whether a connected user can see a targeted (private) message.
 */
function canViewTargetedMessage(
  viewer: WsData,
  senderId: string,
  senderType: string,
  targetStudentId: string
): boolean {
  // Sender can always see their own message
  if (viewer.memberId === senderId && viewer.memberType === senderType) return true;
  // Admins see everything
  if (viewer.role === "ADMIN") return true;
  // Teachers see everything in their class
  if (viewer.role === "TEACHER") return true;
  // The target student themselves
  if (viewer.memberType === "STUDENT" && viewer.memberId === targetStudentId) return true;
  // Parents of the target student
  if (viewer.memberType === "PARENT" && viewer.childrenIds?.includes(targetStudentId)) return true;

  return false;
}

/**
 * Handle an incoming WebSocket message from a client.
 * Validates membership, persists the message, and broadcasts.
 */
export async function handleIncomingMessage(
  ws: ServerWebSocket<WsData>,
  raw: string | Buffer
) {
  try {
    const data = JSON.parse(typeof raw === "string" ? raw : raw.toString());

    if (data.type === "ping") {
      ws.send(JSON.stringify({ type: "pong" }));
      return;
    }

    if (data.type !== "message") return;

    const content: string = (data.content || "").trim();
    if (!content && data.messageType === "TEXT") return; // no empty text messages

    const messageType: string = data.messageType || "TEXT";
    const metadata = data.metadata || null;
    const targetStudentId = data.targetStudentId || metadata?.studentId || null;

    // Validate message type permissions
    if (!isAllowedMessageType(ws.data.role, messageType)) {
      ws.send(JSON.stringify({ type: "error", message: "You cannot send this type of message" }));
      return;
    }

    // Persist the message
    const chatMessage = await db.chatMessage.create({
      data: {
        classId: ws.data.classId,
        senderType: ws.data.memberType,
        senderId: ws.data.memberId,
        senderRole: ws.data.role,
        senderName: ws.data.name,
        senderAvatar: null,
        type: messageType as (typeof ChatMessageType)[keyof typeof ChatMessageType],
        content,
        metadata: metadata || undefined,
        targetStudentId,
      },
    });

    // Broadcast to room
    broadcastMessage(ws.data.classId, {
      id: chatMessage.id,
      senderType: chatMessage.senderType,
      senderId: chatMessage.senderId,
      senderRole: chatMessage.senderRole,
      senderName: chatMessage.senderName,
      senderAvatar: chatMessage.senderAvatar,
      type: chatMessage.type,
      content: chatMessage.content,
      metadata: chatMessage.metadata,
      targetStudentId: chatMessage.targetStudentId,
      fileId: chatMessage.fileId,
      fileName: chatMessage.fileName,
      fileSize: chatMessage.fileSize,
      fileMimeType: chatMessage.fileMimeType,
      createdAt: chatMessage.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("[WS] Error handling message:", err);
    ws.send(JSON.stringify({ type: "error", message: "Failed to send message" }));
  }
}

/**
 * Role-based permission for message types.
 * - ADMIN/TEACHER can send TEXT, EXAM_RESULT, GRADE, SUBJECT_INFO
 * - STUDENT/PARENT can only send TEXT
 */
function isAllowedMessageType(role: string, messageType: string): boolean {
  const textOnly = ["TEXT", "FILE"];
  const all = ["TEXT", "EXAM_RESULT", "GRADE", "SUBJECT_INFO", "FILE"];

  switch (role) {
    case "ADMIN":
    case "TEACHER":
      return all.includes(messageType);
    case "STUDENT":
    case "PARENT":
      return textOnly.includes(messageType);
    default:
      return false;
  }
}

/**
 * Get count of connected clients in a room.
 */
export function getRoomSize(classId: string): number {
  return rooms.get(classId)?.size ?? 0;
}
