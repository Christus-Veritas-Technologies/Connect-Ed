// ============================================
// WhatsApp Message Handler
// AI-powered auth flow with intelligent email extraction
// Falls back to regex mode after AI failures
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
const MAX_AI_EMAIL_FAILURES = 1; // Switch to regex mode after 1 AI failure

/**
 * Handle an incoming WhatsApp message
 * @param phone — Sender's phone number (e.g. "263771234567" or "230567417233464@lid")
 * @param body — Message text content
 * @param defaultSchoolId — Default school ID to use for quota tracking
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
        await handleNewConversation(phone, body, schoolId);
        break;

      case "awaiting_email":
        await handleEmailInput(phone, body, schoolId);
        break;

      case "awaiting_password":
        await handlePasswordInput(phone, body, schoolId);
        break;

      case "verified":
        await handleVerifiedMessage(phone, body, schoolId);
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
// Auth flow handlers (AI-powered with regex fallback)
// ============================================

async function handleNewConversation(phone: string, body: string, schoolId?: string): Promise<void> {
  // Use AI to intelligently extract email from the first message
  const emailResult = await extractEmailFromMessage(body);
  
  if (emailResult.found && emailResult.email) {
    // AI found an email! Process it immediately
    await handleEmailInput(phone, emailResult.email, schoolId);
    return;
  }

  // No email found, ask for it
  await reply(phone, authRequestTemplate(), schoolId);
  updateSession(phone, { authStage: "awaiting_email" });
}

async function handleEmailInput(phone: string, body: string, schoolId?: string): Promise<void> {
  const session = getSession(phone);
  let extractedEmail: string | null = null;

  // Determine extraction mode based on session state
  if (session.emailExtractionMode === "ai") {
    // Try AI extraction
    const emailResult = await extractEmailFromMessage(body);
    
    if (emailResult.found && emailResult.email) {
      extractedEmail = emailResult.email;
    } else {
      // AI failed to extract email
      const failures = session.aiEmailFailures + 1;
      updateSession(phone, { aiEmailFailures: failures });

      if (failures >= MAX_AI_EMAIL_FAILURES) {
        // Switch to regex mode
        updateSession(phone, { emailExtractionMode: "regex" });
        await reply(
          phone,
          `I couldn't find an email address in your message.\n\nPlease send *ONLY your email address* in your next message (example: john@example.com)`,
          schoolId
        );
        return;
      }

      // Ask them to try again (still in AI mode)
      await reply(
        phone,
        `I couldn't find an email address in your message. Please share your email address so I can help you connect to your account.`,
        schoolId
      );
      return;
    }
  } else {
    // Regex mode - strict email-only extraction
    extractedEmail = extractEmailRegex(body);
    
    if (!extractedEmail) {
      await reply(
        phone,
        `That doesn't look like a valid email address.\n\nPlease send *ONLY your email address* (example: john@example.com)`,
        schoolId
      );
      return;
    }
  }

  // Verify the email exists in the system
  const exists = await findAccountByEmail(extractedEmail);

  if (!exists) {
    const failures = session.aiEmailFailures + 1;
    updateSession(phone, { aiEmailFailures: failures });

    if (failures >= MAX_AI_EMAIL_FAILURES && session.emailExtractionMode === "ai") {
      // Switch to regex mode after account not found
      updateSession(phone, { emailExtractionMode: "regex" });
      await reply(
        phone,
        `No account found with *${extractedEmail}*.\n\nPlease double-check your email and send *ONLY your email address* in your next message (no other text).`,
        schoolId
      );
      return;
    }

    await reply(
      phone,
      `No account found with *${extractedEmail}*.\n\nPlease check your email and try again, or contact the school office for help.`,
      schoolId
    );
    return;
  }

  // Email found! Ask for password
  updateSession(phone, { authStage: "awaiting_password", email: extractedEmail });
  await reply(phone, authPasswordTemplate(extractedEmail), schoolId);
}

async function handlePasswordInput(phone: string, body: string, schoolId?: string): Promise<void> {
  const session = getSession(phone);
  const password = body.trim();

  if (!session.email) {
    updateSession(phone, { authStage: "awaiting_email" });
    await reply(phone, authRequestTemplate(), schoolId);
    return;
  }

  const result = await verifyAccount(session.email, password);

  if (result) {
    updateSession(phone, {
      authStage: "verified",
      isVerified: true,
      authAttempts: 0,
      aiEmailFailures: 0, // Reset failures on success
      emailExtractionMode: "ai", // Reset to AI mode for next time
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
        `*Too many failed attempts.* Your session has been reset for security.\n\nPlease start over by sharing your email address.`,
        schoolId
      );
      updateSession(phone, {
        authStage: "awaiting_email",
        authAttempts: 0,
        aiEmailFailures: 0,
        emailExtractionMode: "ai",
        email: undefined,
      });
    } else {
      await reply(
        phone,
        authFailedTemplate() +
          `\n\nAttempts remaining: *${MAX_AUTH_ATTEMPTS - attempts}*`,
        schoolId
      );
    }
  }
}

// ============================================
// Verified message handler (uses AI agent)
// ============================================

async function handleVerifiedMessage(phone: string, body: string, schoolId?: string): Promise<void> {
  const session = getSession(phone);

  if (!session.userData) {
    updateSession(phone, { authStage: "awaiting_email", isVerified: false });
    await reply(phone, notVerifiedTemplate(), schoolId);
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
    console.warn(`[Handler] Cannot reply to ${phone}: no schoolId provided. Message: ${content.slice(0, 50)}...`);
    return;
  }
  console.log(`[Handler] Sending reply to ${phone}: "${content.slice(0, 50)}..."`);
  await enqueueMessage(phone, content, schoolId, false);
}

/**
 * AI-powered email extraction
 * Uses Mastra agent tools for intelligent extraction
 */
async function extractEmailFromMessage(message: string): Promise<{ found: boolean; email?: string }> {
  // Simple regex-based extraction for now
  // In production, this could call the AI agent's extractEmail tool
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = message.match(emailRegex);
  
  if (matches && matches.length > 0) {
    return { found: true, email: matches[0].toLowerCase() };
  }
  
  return { found: false };
}

/**
 * Strict regex-only email extraction (fallback mode)
 */
function extractEmailRegex(text: string): string | null {
  const trimmed = text.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (emailRegex.test(trimmed)) {
    return trimmed;
  }
  
  return null;
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
