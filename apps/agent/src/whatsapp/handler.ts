// ============================================
// WhatsApp Message Handler
// Routes incoming messages through auth flow → AI agent
// Uses templates where possible to save OpenAI costs
// ============================================

import { db } from "@repo/db";
import bcrypt from "bcryptjs";
import { getSession, updateSession } from "../sessions.js";
import { generateAgentResponse, type ChatContext } from "../ai/agent.js";
import { enqueueMessage } from "../whatsapp/queue.js";
import {
  authRequestTemplate,
  authPasswordTemplate,
  authSuccessTemplate,
  authFailedTemplate,
  notVerifiedTemplate,
  errorTemplate,
  quotaExceededTemplate,
} from "../whatsapp/templates.js";

const MAX_AUTH_ATTEMPTS = 3;

/**
 * Handle an incoming WhatsApp message
 * @param phone — Sender's phone number (e.g. "263771234567")
 * @param body — Message text content
 * @param defaultSchoolId — Default school ID to use for quota tracking (resolved later if user verifies)
 */
export async function handleIncomingMessage(
  phone: string,
  body: string,
  defaultSchoolId?: string
): Promise<void> {
  const session = getSession(phone);
  const schoolId = session.userData?.schoolId ?? defaultSchoolId;

  // Check quota before responding (if we know the school)
  if (schoolId) {
    const school = await db.school.findUnique({
      where: { id: schoolId },
      select: { whatsappUsed: true, whatsappQuota: true },
    });
    if (school && school.whatsappUsed >= school.whatsappQuota) {
      await reply(phone, quotaExceededTemplate(), schoolId);
      return;
    }
  }

  try {
    // Route based on auth stage
    switch (session.authStage) {
      case "none":
        await handleNewConversation(phone, body);
        break;

      case "awaiting_email":
        await handleEmailInput(phone, body);
        break;

      case "awaiting_password":
        await handlePasswordInput(phone, body);
        break;

      case "verified":
        await handleVerifiedMessage(phone, body);
        break;

      default:
        await reply(phone, authRequestTemplate(), schoolId);
        updateSession(phone, { authStage: "awaiting_email" });
    }
  } catch (error: any) {
    console.error(`[Handler] Error processing message from ${phone}:`, error.message);
    await reply(phone, errorTemplate(), schoolId);
  }
}

// ============================================
// Auth flow handlers (template-based, no OpenAI costs)
// ============================================

async function handleNewConversation(phone: string, body: string): Promise<void> {
  // Check if the message looks like an email (they might have gotten straight to it)
  if (isLikelyEmail(body)) {
    await handleEmailInput(phone, body);
    return;
  }

  // Otherwise, ask them to verify
  await reply(phone, authRequestTemplate());
  updateSession(phone, { authStage: "awaiting_email" });
}

async function handleEmailInput(phone: string, body: string): Promise<void> {
  const email = body.trim().toLowerCase();

  // Basic email validation
  if (!email.includes("@") || !email.includes(".")) {
    await reply(phone, `That doesn't look like a valid email address. Please try again.\n\n${authRequestTemplate()}`);
    return;
  }

  // Check if account exists (without password)
  const exists = await findAccountByEmail(email);

  if (!exists) {
    await reply(
      phone,
      `No account found with *${email}*.\n\nPlease check the email and try again, or contact the school office for help.`
    );
    return;
  }

  updateSession(phone, { authStage: "awaiting_password", email });
  await reply(phone, authPasswordTemplate(email));
}

async function handlePasswordInput(phone: string, body: string): Promise<void> {
  const session = getSession(phone);
  const password = body.trim();

  if (!session.email) {
    updateSession(phone, { authStage: "awaiting_email" });
    await reply(phone, authRequestTemplate());
    return;
  }

  const result = await verifyAccount(session.email, password);

  if (result) {
    updateSession(phone, {
      authStage: "verified",
      isVerified: true,
      authAttempts: 0,
      userData: {
        userId: result.userId,
        userType: result.userType,
        name: result.name,
        schoolId: result.schoolId,
        schoolName: result.schoolName,
        role: result.role,
      },
    });
    await reply(phone, authSuccessTemplate(result.name), result.schoolId);
  } else {
    const attempts = session.authAttempts + 1;
    updateSession(phone, { authAttempts: attempts });

    if (attempts >= MAX_AUTH_ATTEMPTS) {
      await reply(
        phone,
        `*Too many failed attempts.* Your session has been reset for security.\n\nPlease start over by sharing your email address.`
      );
      updateSession(phone, {
        authStage: "awaiting_email",
        authAttempts: 0,
        email: undefined,
      });
    } else {
      await reply(
        phone,
        authFailedTemplate() +
          `\n\nAttempts remaining: *${MAX_AUTH_ATTEMPTS - attempts}*`
      );
    }
  }
}

// ============================================
// Verified message handler (uses AI agent)
// ============================================

async function handleVerifiedMessage(phone: string, body: string): Promise<void> {
  const session = getSession(phone);

  if (!session.userData) {
    updateSession(phone, { authStage: "awaiting_email", isVerified: false });
    await reply(phone, notVerifiedTemplate());
    return;
  }

  // Build context for the agent
  const context: ChatContext = {
    phoneNumber: phone,
    threadId: session.threadId,
    isVerified: true,
    userData: session.userData,
  };

  // Let the AI agent handle it
  const response = await generateAgentResponse(body, context);
  await reply(phone, response, session.userData.schoolId);
}

// ============================================
// Helpers
// ============================================

async function reply(
  phone: string,
  content: string,
  schoolId?: string
): Promise<void> {
  if (!schoolId) {
    // If no school ID, try to find one via the phone number
    // For now, just send without quota tracking
    const { enqueueMessage: enqueue } = await import("../whatsapp/queue.js");
    // Use a placeholder school ID — the queue will handle it
    await enqueue(phone, content, "system", false);
    return;
  }
  await enqueueMessage(phone, content, schoolId, false);
}

function isLikelyEmail(text: string): boolean {
  const trimmed = text.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

async function findAccountByEmail(
  email: string
): Promise<boolean> {
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (user) return true;

  const parent = await db.parent.findUnique({ where: { email }, select: { id: true } });
  if (parent) return true;

  const student = await db.student.findFirst({ where: { email }, select: { id: true } });
  if (student) return true;

  return false;
}

async function verifyAccount(
  email: string,
  password: string
): Promise<{
  userId: string;
  userType: string;
  name: string;
  schoolId: string;
  schoolName: string;
  role: string;
} | null> {
  // Try User
  const user = await db.user.findUnique({
    where: { email },
    include: { school: { select: { id: true, name: true } } },
  });
  if (user) {
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return null;
    return {
      userId: user.id,
      userType: "staff",
      name: user.name,
      schoolId: user.school.id,
      schoolName: user.school.name ?? "Unknown School",
      role: user.role,
    };
  }

  // Try Parent
  const parent = await db.parent.findUnique({
    where: { email },
    include: { school: { select: { id: true, name: true } } },
  });
  if (parent) {
    const valid = await bcrypt.compare(password, parent.password);
    if (!valid) return null;
    return {
      userId: parent.id,
      userType: "parent",
      name: parent.name,
      schoolId: parent.school.id,
      schoolName: parent.school.name ?? "Unknown School",
      role: "PARENT",
    };
  }

  // Try Student
  const student = await db.student.findFirst({
    where: { email },
    include: { school: { select: { id: true, name: true } } },
  });
  if (student && student.password) {
    const valid = await bcrypt.compare(password, student.password);
    if (!valid) return null;
    return {
      userId: student.id,
      userType: "student",
      name: `${student.firstName} ${student.lastName}`,
      schoolId: student.school.id,
      schoolName: student.school.name ?? "Unknown School",
      role: "STUDENT",
    };
  }

  return null;
}
