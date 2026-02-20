// ============================================
// Rate-Limited Message Queue (Per-School)
// Prevents WhatsApp bans by spacing messages
// ============================================

import { getSchoolWhatsAppClient, isSchoolWhatsAppReady } from "./client.js";
import { db } from "@repo/db";

// Queue configuration
const MIN_DELAY_MS = 3_000; // 3 seconds between messages to same chat
const BULK_DELAY_MS = 60_000; // 60 seconds between bulk messages (reports, etc.)
const MAX_RETRIES = 3;

interface QueueItem {
  id: string;
  phone: string; // e.g. "263771234567" (no + prefix, no @c.us)
  content: string;
  schoolId: string;
  isBulk: boolean; // true = use longer delay (report dispatches)
  retries: number;
  resolve: (result: SendResult) => void;
  reject: (error: Error) => void;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Per-school queues for isolation
const queues = new Map<string, QueueItem[]>();
const processingFlags = new Map<string, boolean>();
const lastSendTimes = new Map<string, number>();

/**
 * Format phone number to WhatsApp Chat ID
 * Accepts: +263771234567, 263771234567, 0771234567, or 230567417233464@lid (Meta/Facebook user IDs)
 */
function toChatId(phone: string): string {
  // If already in @lid format (Facebook/Meta user), return as-is
  if (phone.includes("@lid")) {
    return phone;
  }

  let cleaned = phone.replace(/[\s\-\(\)\+]/g, "");

  // Handle local Zimbabwe numbers starting with 0
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    cleaned = "263" + cleaned.slice(1);
  }

  return `${cleaned}@c.us`;
}

/**
 * Enqueue a message to be sent via the school's WhatsApp client.
 * Returns a promise that resolves when the message is actually sent.
 */
export function enqueueMessage(
  phone: string,
  content: string,
  schoolId: string,
  isBulk = false
): Promise<SendResult> {
  return new Promise((resolve, reject) => {
    const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    if (!queues.has(schoolId)) {
      queues.set(schoolId, []);
    }

    queues.get(schoolId)!.push({
      id,
      phone,
      content,
      schoolId,
      isBulk,
      retries: 0,
      resolve,
      reject,
    });

    // Start processing this school's queue if not already running
    if (!processingFlags.get(schoolId)) {
      processSchoolQueue(schoolId);
    }
  });
}

/**
 * Process a school's queue sequentially with rate limiting
 */
async function processSchoolQueue(schoolId: string): Promise<void> {
  if (processingFlags.get(schoolId)) return;
  processingFlags.set(schoolId, true);

  const queue = queues.get(schoolId);
  if (!queue) {
    processingFlags.set(schoolId, false);
    return;
  }

  while (queue.length > 0) {
    const item = queue[0]!;

    // Calculate required delay
    const delay = item.isBulk ? BULK_DELAY_MS : MIN_DELAY_MS;
    const lastSend = lastSendTimes.get(schoolId) || 0;
    const elapsed = Date.now() - lastSend;
    const waitTime = Math.max(0, delay - elapsed);

    if (waitTime > 0) {
      await sleep(waitTime);
    }

    // Attempt to send
    const result = await sendMessage(item);
    lastSendTimes.set(schoolId, Date.now());

    if (result.success) {
      queue.shift();
      item.resolve(result);
    } else if (item.retries < MAX_RETRIES) {
      item.retries++;
      console.warn(
        `[Queue:${schoolId}] Retry ${item.retries}/${MAX_RETRIES} for ${item.phone}: ${result.error}`
      );
      // Exponential backoff
      await sleep(MIN_DELAY_MS * Math.pow(2, item.retries));
    } else {
      queue.shift();
      item.resolve(result); // Resolve with failure, don't reject
    }
  }

  processingFlags.set(schoolId, false);
}

/**
 * Actually send the message via the school's wwebjs client and track quota
 */
async function sendMessage(item: QueueItem): Promise<SendResult> {
  try {
    const client = getSchoolWhatsAppClient(item.schoolId);
    if (!client || !isSchoolWhatsAppReady(item.schoolId)) {
      return { success: false, error: `WhatsApp client not ready for school ${item.schoolId}` };
    }

    const chatId = toChatId(item.phone);
    console.log(`[Queue:${item.schoolId}] Attempting to send to ${chatId}: "${item.content.slice(0, 50)}..."`);
    
    const msg = await client.sendMessage(chatId, item.content);
    console.log(`[Queue:${item.schoolId}] Successfully sent to ${chatId}: ${msg.id?.id}`);

    // Increment school WhatsApp quota
    await db.school.update({
      where: { id: item.schoolId },
      data: { whatsappUsed: { increment: 1 } },
    });

    // Log the sent message
    await db.messageLog.create({
      data: {
        type: "WHATSAPP",
        recipient: item.phone,
        content: item.content.slice(0, 2000), // Truncate for DB
        status: "SENT",
        sentAt: new Date(),
        schoolId: item.schoolId,
      },
    });

    return { success: true, messageId: msg.id?.id };
  } catch (error: any) {
    // Extract error message properly, handling various error types
    let errorMsg = "Unknown error";
    if (error instanceof Error) {
      errorMsg = error.message;
    } else if (typeof error === "string") {
      errorMsg = error;
    } else if (error && typeof error === "object") {
      errorMsg = error.toString() || JSON.stringify(error);
    }

    console.error(`[Queue:${item.schoolId}] Send failed for ${item.phone}: ${errorMsg}`, error);

    // Log the failure
    try {
      await db.messageLog.create({
        data: {
          type: "WHATSAPP",
          recipient: item.phone,
          content: item.content.slice(0, 2000),
          status: "FAILED",
          errorMessage: errorMsg.slice(0, 500),
          schoolId: item.schoolId,
        },
      });
    } catch {
      // Don't fail the queue if logging fails
    }

    return { success: false, error: errorMsg };
  }
}

/**
 * Get current queue status (across all schools)
 */
export function getQueueStatus() {
  let totalPending = 0;
  let anyProcessing = false;

  for (const [schoolId, queue] of queues) {
    totalPending += queue.length;
    if (processingFlags.get(schoolId)) anyProcessing = true;
  }

  return {
    pending: totalPending,
    isProcessing: anyProcessing,
    schoolQueues: Array.from(queues.entries()).map(([schoolId, queue]) => ({
      schoolId,
      pending: queue.length,
      isProcessing: processingFlags.get(schoolId) || false,
      isClientReady: isSchoolWhatsAppReady(schoolId),
    })),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
