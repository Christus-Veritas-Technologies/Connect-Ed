import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, MessageType, MessageStatus, FeeStatus } from "@repo/db";
import { requireAuth } from "../middleware/auth";
import { sendRemindersSchema } from "../lib/validation";
import { successResponse, errors } from "../lib/response";
import { fmtServer, type CurrencyCode } from "../lib/currency";

const messages = new Hono();

// Apply auth middleware to all routes
messages.use("*", requireAuth);

// GET /messages/quota - Get messaging quota status
messages.get("/quota", async (c) => {
  try {
    const schoolId = c.get("schoolId");

    const school = await db.school.findUnique({
      where: { id: schoolId },
      select: {
        emailQuota: true,
        whatsappQuota: true,
        smsQuota: true,
        emailUsed: true,
        whatsappUsed: true,
        smsUsed: true,
        quotaResetDate: true,
      },
    });

    if (!school) {
      return errors.notFound(c, "School");
    }

    return successResponse(c, {
      email: {
        used: school.emailUsed,
        limit: school.emailQuota,
        remaining: school.emailQuota - school.emailUsed,
      },
      whatsapp: {
        used: school.whatsappUsed,
        limit: school.whatsappQuota,
        remaining: school.whatsappQuota - school.whatsappUsed,
      },
      sms: {
        used: school.smsUsed,
        limit: school.smsQuota,
        remaining: school.smsQuota - school.smsUsed,
      },
      quotaResetDate: school.quotaResetDate,
    });
  } catch (error) {
    console.error("Get quota error:", error);
    return errors.internalError(c);
  }
});

// POST /messages/send-reminders - Send fee reminders
messages.post("/send-reminders", zValidator("json", sendRemindersSchema), async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const { feeIds, channels } = c.req.valid("json");

    // Get school quota
    const school = await db.school.findUnique({
      where: { id: schoolId },
      select: {
        currency: true,
        emailQuota: true,
        whatsappQuota: true,
        smsQuota: true,
        emailUsed: true,
        whatsappUsed: true,
        smsUsed: true,
      },
    });

    if (!school) {
      return errors.notFound(c, "School");
    }

    // Get fees with student and parent info
    const fees = await db.fee.findMany({
      where: {
        id: { in: feeIds },
        schoolId,
        status: { not: FeeStatus.PAID },
      },
      include: {
        student: {
          include: {
            parent: { select: { email: true, phone: true } },
          },
        },
      },
    });

    const results: { feeId: string; channel: string; status: string; error?: string }[] = [];
    const quotaUpdates: { email: number; whatsapp: number; sms: number } = {
      email: 0,
      whatsapp: 0,
      sms: 0,
    };

    for (const fee of fees) {
      const studentName = `${fee.student.firstName} ${fee.student.lastName}`;
      const amountDue = Number(fee.amount) - Number(fee.paidAmount || 0);

      for (const channel of channels) {
        // Check quota
        const quotaKey = channel as keyof typeof quotaUpdates;
        const used = school[`${quotaKey}Used` as keyof typeof school] as number;
        const limit = school[`${quotaKey}Quota` as keyof typeof school] as number;

        if (used + quotaUpdates[quotaKey] >= limit) {
          results.push({
            feeId: fee.id,
            channel,
            status: "QUOTA_EXCEEDED",
            error: `${channel} quota exceeded`,
          });
          continue;
        }

        // Get recipient
        let recipient: string | null = null;
        if (channel === "email") {
          recipient = fee.student.parent?.email || fee.student.email;
        } else {
          recipient = fee.student.parent?.phone || fee.student.phone;
        }

        if (!recipient) {
          results.push({
            feeId: fee.id,
            channel,
            status: "SKIPPED",
            error: "No contact info",
          });
          continue;
        }

        // Log the message (in production, would actually send)
        await db.messageLog.create({
          data: {
            schoolId,
            type: channel.toUpperCase() as (typeof MessageType)[keyof typeof MessageType],
            recipient,
            subject: `Fee Reminder for ${studentName}`,
            content: `Dear Parent/Guardian,\n\nThis is a reminder that ${studentName} has an outstanding fee of ${fmtServer(amountDue, (school.currency || "USD") as CurrencyCode)} due on ${fee.dueDate.toLocaleDateString()}.\n\nPlease make the payment at your earliest convenience.`,
            status: MessageStatus.SENT, // Would be PENDING until confirmed
          },
        });

        quotaUpdates[quotaKey]++;
        results.push({
          feeId: fee.id,
          channel,
          status: "SENT",
        });
      }
    }

    // Update quota usage
    await db.school.update({
      where: { id: schoolId },
      data: {
        emailUsed: { increment: quotaUpdates.email },
        whatsappUsed: { increment: quotaUpdates.whatsapp },
        smsUsed: { increment: quotaUpdates.sms },
      },
    });

    return successResponse(c, {
      sent: results.filter((r) => r.status === "SENT").length,
      failed: results.filter((r) => r.status !== "SENT").length,
      results,
    });
  } catch (error) {
    console.error("Send reminders error:", error);
    return errors.internalError(c);
  }
});

export default messages;
