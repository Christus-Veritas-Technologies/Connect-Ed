import { db, MessageType, MessageStatus } from "@repo/db";

// Message service interfaces
export interface SendMessageOptions {
  schoolId: string;
  type: MessageType;
  recipient: string;
  subject?: string;
  content: string;
}

export interface MessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Check if school has quota available
export async function checkQuota(
  schoolId: string,
  type: MessageType
): Promise<{ available: boolean; used: number; limit: number }> {
  const school = await db.school.findUnique({
    where: { id: schoolId },
    select: {
      emailQuota: true,
      emailUsed: true,
      whatsappQuota: true,
      whatsappUsed: true,
      smsQuota: true,
      smsUsed: true,
    },
  });

  if (!school) {
    return { available: false, used: 0, limit: 0 };
  }

  switch (type) {
    case "EMAIL":
      return {
        available: school.emailUsed < school.emailQuota,
        used: school.emailUsed,
        limit: school.emailQuota,
      };
    case "WHATSAPP":
      return {
        available: school.whatsappUsed < school.whatsappQuota,
        used: school.whatsappUsed,
        limit: school.whatsappQuota,
      };
    case "SMS":
      return {
        available: school.smsUsed < school.smsQuota,
        used: school.smsUsed,
        limit: school.smsQuota,
      };
    default:
      return { available: false, used: 0, limit: 0 };
  }
}

// Increment quota usage
async function incrementQuota(schoolId: string, type: MessageType) {
  switch (type) {
    case "EMAIL":
      await db.school.update({
        where: { id: schoolId },
        data: { emailUsed: { increment: 1 } },
      });
      break;
    case "WHATSAPP":
      await db.school.update({
        where: { id: schoolId },
        data: { whatsappUsed: { increment: 1 } },
      });
      break;
    case "SMS":
      await db.school.update({
        where: { id: schoolId },
        data: { smsUsed: { increment: 1 } },
      });
      break;
  }
}

const isDev = process.env.NODE_ENV !== "production";

function normalizePhoneNumber(recipient: string): string {
  if (!recipient) return recipient;
  if (recipient.startsWith("+")) return recipient;
  return `+${recipient}`;
}

// Send email via Resend
async function sendEmail(
  recipient: string,
  subject: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "no-reply@connect-ed.com";

  if (!apiKey) {
    if (isDev) {
      console.log(`[EMAIL] To: ${recipient}, Subject: ${subject}`);
      console.log(`[EMAIL] Content: ${content}`);
      return { success: true };
    }
    return { success: false, error: "Email provider not configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        subject,
        html: content,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return {
        success: false,
        error: errorData?.message || "Failed to send email",
      };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function sendTwilioMessage(options: {
  to: string;
  from: string;
  body: string;
}): Promise<{ success: boolean; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    if (isDev) {
      console.log(`[TWILIO] To: ${options.to}`);
      console.log(`[TWILIO] Content: ${options.body}`);
      return { success: true };
    }
    return { success: false, error: "Twilio not configured" };
  }

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const body = new URLSearchParams({
    To: options.to,
    From: options.from,
    Body: options.body,
  });

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return {
        success: false,
        error: errorData?.message || "Failed to send message",
      };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Send WhatsApp message via Twilio
async function sendWhatsApp(
  recipient: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!from) {
    if (isDev) {
      console.log(`[WHATSAPP] To: ${recipient}`);
      console.log(`[WHATSAPP] Content: ${content}`);
      return { success: true };
    }
    return { success: false, error: "WhatsApp sender not configured" };
  }

  const to = `whatsapp:${normalizePhoneNumber(recipient)}`;
  const fromValue = from.startsWith("whatsapp:") ? from : `whatsapp:${from}`;

  return sendTwilioMessage({ to, from: fromValue, body: content });
}

// Send SMS via Twilio
async function sendSMS(
  recipient: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  const from = process.env.TWILIO_SMS_FROM;
  if (!from) {
    if (isDev) {
      console.log(`[SMS] To: ${recipient}`);
      console.log(`[SMS] Content: ${content}`);
      return { success: true };
    }
    return { success: false, error: "SMS sender not configured" };
  }

  const to = normalizePhoneNumber(recipient);
  return sendTwilioMessage({ to, from, body: content });
}

// Main send message function
export async function sendMessage(options: SendMessageOptions): Promise<MessageResult> {
  const { schoolId, type, recipient, subject, content } = options;

  // Check quota
  const quota = await checkQuota(schoolId, type);
  if (!quota.available) {
    return {
      success: false,
      error: `${type} quota exceeded. Used ${quota.used} of ${quota.limit}.`,
    };
  }

  // Create message log entry
  const messageLog = await db.messageLog.create({
    data: {
      schoolId,
      type,
      recipient,
      subject,
      content,
      status: "PENDING",
    },
  });

  try {
    // Send message based on type
    let result: { success: boolean; error?: string };

    switch (type) {
      case "EMAIL":
        result = await sendEmail(recipient, subject || "No Subject", content);
        break;
      case "WHATSAPP":
        result = await sendWhatsApp(recipient, content);
        break;
      case "SMS":
        result = await sendSMS(recipient, content);
        break;
      default:
        result = { success: false, error: "Invalid message type" };
    }

    if (result.success) {
      // Update message log and increment quota
      await db.messageLog.update({
        where: { id: messageLog.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
        },
      });
      await incrementQuota(schoolId, type);

      return { success: true, messageId: messageLog.id };
    } else {
      // Update message log with error
      await db.messageLog.update({
        where: { id: messageLog.id },
        data: {
          status: "FAILED",
          errorMessage: result.error,
        },
      });

      return { success: false, error: result.error };
    }
  } catch (error) {
    // Update message log with error
    await db.messageLog.update({
      where: { id: messageLog.id },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send message",
    };
  }
}

// Send fee reminder
export async function sendFeeReminder(
  schoolId: string,
  feeId: string,
  channels: MessageType[]
): Promise<{ results: Record<string, MessageResult> }> {
  // Get fee with student and parent info
  const fee = await db.fee.findFirst({
    where: { id: feeId, schoolId },
    include: {
      student: {
        include: { parent: true },
      },
    },
  });

  if (!fee) {
    return {
      results: {
        error: { success: false, error: "Fee not found" },
      },
    };
  }

  const outstanding = Number(fee.amount) - Number(fee.paidAmount);
  const studentName = `${fee.student.firstName} ${fee.student.lastName}`;
  const dueDate = new Date(fee.dueDate).toLocaleDateString();

  const content = `Dear Parent/Guardian,

This is a reminder that the fee for ${studentName} is due.

Fee: ${fee.description}
Amount Due: $${outstanding.toLocaleString()}
Due Date: ${dueDate}

Please make the payment at your earliest convenience.

Thank you,
School Administration`;

  const results: Record<string, MessageResult> = {};

  for (const channel of channels) {
    let recipient: string | null = null;

    switch (channel) {
      case "EMAIL":
        recipient = fee.student.parent?.email || fee.student.email;
        break;
      case "WHATSAPP":
      case "SMS":
        recipient = fee.student.parent?.phone || fee.student.phone;
        break;
    }

    if (!recipient) {
      results[channel] = {
        success: false,
        error: `No ${channel.toLowerCase()} contact available`,
      };
      continue;
    }

    results[channel] = await sendMessage({
      schoolId,
      type: channel,
      recipient,
      subject: `Fee Reminder: ${fee.description}`,
      content,
    });
  }

  return { results };
}
