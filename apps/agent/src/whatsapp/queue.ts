// ============================================
// Rate-Limited Message Queue
// Prevents WhatsApp bans by spacing messages
// ============================================

import { getWhatsAppClient, isWhatsAppReady } from "./client.js";
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

const queue: QueueItem[] = [];
let isProcessing = false;
let lastSendTime = 0;

/**
 * Format phone number to WhatsApp Chat ID
 * Accepts: +263771234567, 263771234567, 0771234567
 */
function toChatId(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)\+]/g, "");

  // Handle local Zimbabwe numbers starting with 0
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    cleaned = "263" + cleaned.slice(1);
  }

  return `${cleaned}@c.us`;
}

/**
 * Enqueue a message to be sent via WhatsApp.
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
    queue.push({
      id,
      phone,
      content,
      schoolId,
      isBulk,
      retries: 0,
      resolve,
      reject,
    });

    // Start processing if not already running
    if (!isProcessing) {
      processQueue();
    }
  });
}

/**
 * Process the queue sequentially with rate limiting
 */
async function processQueue(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  while (queue.length > 0) {
    const item = queue[0]!;

    // Calculate required delay
    const delay = item.isBulk ? BULK_DELAY_MS : MIN_DELAY_MS;
    const elapsed = Date.now() - lastSendTime;
    const waitTime = Math.max(0, delay - elapsed);

    if (waitTime > 0) {
      await sleep(waitTime);
    }

    // Attempt to send
    const result = await sendMessage(item);
    lastSendTime = Date.now();

    if (result.success) {
      queue.shift();
      item.resolve(result);
    } else if (item.retries < MAX_RETRIES) {
      item.retries++;
      console.warn(
        `[Queue] Retry ${item.retries}/${MAX_RETRIES} for ${item.phone}: ${result.error}`
      );
      // Exponential backoff
      await sleep(MIN_DELAY_MS * Math.pow(2, item.retries));
    } else {
      queue.shift();
      item.resolve(result); // Resolve with failure, don't reject
    }
  }

  isProcessing = false;
}

/**
 * Actually send the message via wwebjs and track quota
 */
async function sendMessage(item: QueueItem): Promise<SendResult> {
  try {
    const client = getWhatsAppClient();
    if (!client || !isWhatsAppReady()) {
      return { success: false, error: "WhatsApp client not ready" };
    }

    const chatId = toChatId(item.phone);
    const msg = await client.sendMessage(chatId, item.content);

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
    console.error(`[Queue] Send failed for ${item.phone}:`, error.message);

    // Log the failure
    try {
      await db.messageLog.create({
        data: {
          type: "WHATSAPP",
          recipient: item.phone,
          content: item.content.slice(0, 2000),
          status: "FAILED",
          errorMessage: error.message?.slice(0, 500),
          schoolId: item.schoolId,
        },
      });
    } catch {
      // Don't fail the queue if logging fails
    }

    return { success: false, error: error.message };
  }
}

/**
 * Get current queue status
 */
export function getQueueStatus() {
  return {
    pending: queue.length,
    isProcessing,
    isClientReady: isWhatsAppReady(),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
