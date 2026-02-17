import { db } from "@repo/db";

// ============================================
// WhatsApp Notification — hits the agent app
// ============================================

const AGENT_URL = process.env.AGENT_URL || "http://localhost:5000";

interface SendWhatsAppOptions {
  phone: string;
  content: string;
  schoolId: string;
  isBulk?: boolean;
}

/**
 * Send a WhatsApp message by hitting the agent app's /send endpoint.
 * Checks: 1) school has WhatsApp connected, 2) quota not exceeded.
 * Logs the message in the messageLog table.
 */
export async function sendWhatsApp(options: SendWhatsAppOptions): Promise<boolean> {
  const { phone, content, schoolId, isBulk = false } = options;

  try {
    // Check connection + quota
    const school = await db.school.findUnique({
      where: { id: schoolId },
      select: { whatsappQuota: true, whatsappUsed: true, whatsappConnected: true, name: true },
    });

    if (!school) {
      console.error("❌ [WhatsApp] School not found:", schoolId);
      return false;
    }

    // Skip if school hasn't connected WhatsApp
    if (!school.whatsappConnected) {
      console.log(`⏭️ [WhatsApp] Skipping — school "${school.name}" has no WhatsApp connected`);
      return false;
    }

    if (school.whatsappUsed >= school.whatsappQuota) {
      console.error(`❌ [WhatsApp] Quota exceeded for ${school.name}:`, {
        used: school.whatsappUsed,
        quota: school.whatsappQuota,
      });

      await db.messageLog.create({
        data: {
          type: "WHATSAPP",
          recipient: phone,
          content,
          status: "FAILED",
          errorMessage: `WhatsApp quota exceeded. Used ${school.whatsappUsed}/${school.whatsappQuota}.`,
          schoolId,
        },
      });

      return false;
    }

    console.log(`📱 [WhatsApp] Sending to ${phone} (${school.whatsappUsed + 1}/${school.whatsappQuota})`);

    // Hit the agent app
    const response = await fetch(`${AGENT_URL}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, content, schoolId, isBulk }),
    });

    const result = await response.json() as { success?: boolean; error?: string };

    if (!response.ok || !result.success) {
      console.error("❌ [WhatsApp] Agent returned error:", result.error);

      await db.messageLog.create({
        data: {
          type: "WHATSAPP",
          recipient: phone,
          content,
          status: "FAILED",
          errorMessage: result.error || "Agent error",
          schoolId,
        },
      });

      return false;
    }

    console.log(`✅ [WhatsApp] Message sent to ${phone}`);

    // Increment quota
    await db.school.update({
      where: { id: schoolId },
      data: { whatsappUsed: { increment: 1 } },
    });

    // Log success
    await db.messageLog.create({
      data: {
        type: "WHATSAPP",
        recipient: phone,
        content,
        status: "SENT",
        sentAt: new Date(),
        schoolId,
      },
    });

    return true;
  } catch (error) {
    console.error("❌ [WhatsApp] Send failed:", error);

    await db.messageLog.create({
      data: {
        type: "WHATSAPP",
        recipient: phone,
        content,
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        schoolId,
      },
    });

    return false;
  }
}

/**
 * Send a welcome WhatsApp message via the agent's /send/welcome endpoint.
 */
export async function sendWhatsAppWelcome(options: {
  phone: string;
  schoolId: string;
  name: string;
  schoolName: string;
  role: string;
}): Promise<boolean> {
  const { phone, schoolId, name, schoolName, role } = options;

  try {
    const school = await db.school.findUnique({
      where: { id: schoolId },
      select: { whatsappQuota: true, whatsappUsed: true, whatsappConnected: true },
    });

    if (!school || !school.whatsappConnected || school.whatsappUsed >= school.whatsappQuota) {
      console.log(`⏭️ [WhatsApp] Skipping welcome for ${phone} — not connected or quota exceeded`);
      return false;
    }

    const response = await fetch(`${AGENT_URL}/send/welcome`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone,
        schoolId,
        welcome: { name, schoolName, role },
      }),
    });

    const result = await response.json() as { success?: boolean; error?: string };

    if (response.ok && result.success) {
      await db.school.update({
        where: { id: schoolId },
        data: { whatsappUsed: { increment: 1 } },
      });
      console.log(`✅ [WhatsApp] Welcome sent to ${phone}`);
      return true;
    }

    console.error("❌ [WhatsApp] Welcome failed:", result.error);
    return false;
  } catch (error) {
    console.error("❌ [WhatsApp] Welcome send error:", error);
    return false;
  }
}
