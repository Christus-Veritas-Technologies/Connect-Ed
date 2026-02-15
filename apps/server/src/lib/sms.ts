import { db } from "@repo/db";

// ============================================
// SMS Notification — Dummy implementation
// ============================================

interface SendSmsOptions {
  phone: string;
  content: string;
  schoolId: string;
}

/**
 * Send an SMS message (dummy implementation).
 * Logs the SMS to the console and messageLog table.
 * Replace with actual SMS provider (e.g., Twilio, Africa's Talking) when ready.
 */
export async function sendSms(options: SendSmsOptions): Promise<boolean> {
  const { phone, content, schoolId } = options;

  try {
    // Check quota
    const school = await db.school.findUnique({
      where: { id: schoolId },
      select: { smsQuota: true, smsUsed: true, name: true },
    });

    if (!school) {
      console.error("❌ [SMS] School not found:", schoolId);
      return false;
    }

    if (school.smsUsed >= school.smsQuota) {
      console.error(`❌ [SMS] Quota exceeded for ${school.name}:`, {
        used: school.smsUsed,
        quota: school.smsQuota,
      });

      await db.messageLog.create({
        data: {
          type: "SMS" as any,
          recipient: phone,
          content,
          status: "FAILED",
          errorMessage: `SMS quota exceeded. Used ${school.smsUsed}/${school.smsQuota}.`,
          schoolId,
        },
      });

      return false;
    }

    // ─── DUMMY IMPLEMENTATION ───
    // TODO: Replace with actual SMS API (Twilio, Africa's Talking, etc.)
    console.log(`\n📲 ═══════════════════════════════════════`);
    console.log(`📲 [SMS] SEND SMS (DUMMY)`);
    console.log(`📲 [SMS] To: ${phone}`);
    console.log(`📲 [SMS] School: ${school.name}`);
    console.log(`📲 [SMS] Content: ${content.substring(0, 160)}`);
    console.log(`📲 [SMS] Quota: ${school.smsUsed + 1}/${school.smsQuota}`);
    console.log(`📲 ═══════════════════════════════════════\n`);

    // Increment quota
    await db.school.update({
      where: { id: schoolId },
      data: { smsUsed: { increment: 1 } },
    });

    // Log as sent (since it's a dummy, we log it for tracking)
    await db.messageLog.create({
      data: {
        type: "SMS" as any,
        recipient: phone,
        content,
        status: "SENT",
        sentAt: new Date(),
        schoolId,
      },
    });

    return true;
  } catch (error) {
    console.error("❌ [SMS] Send failed:", error);

    await db.messageLog.create({
      data: {
        type: "SMS" as any,
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
