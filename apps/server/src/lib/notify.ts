import { sendEmail, type EmailType } from "./email";
import { sendWhatsApp, sendWhatsAppWelcome } from "./whatsapp";
import { getSchoolNotificationPrefs } from "../routes/notifications";

// ============================================
// Multi-Channel Notification Helper
// ============================================

interface NotifyChannelsOptions {
  schoolId: string;

  // Email
  email?: {
    to: string;
    subject: string;
    html: string;
    type?: EmailType;
  };

  // WhatsApp
  whatsapp?: {
    phone: string;
    content: string;
    isBulk?: boolean;
  };
}

interface NotifyResult {
  emailSent: boolean;
  whatsappSent: boolean;
}

/**
 * Send notifications across all enabled channels (email, whatsapp)
 * based on the school's notification preferences.
 *
 * Usage:
 * ```ts
 * await notifyAllChannels({
 *   schoolId,
 *   email: { to: "user@example.com", subject: "Welcome", html: "<h1>Hi</h1>" },
 *   whatsapp: { phone: "+263771234567", content: "Welcome to our school!" },
 *   whatsapp: { phone: "+263771234567", content: "Welcome to our school!" },
 * });
 * ```
 */
export async function notifyAllChannels(options: NotifyChannelsOptions): Promise<NotifyResult> {
  const { schoolId } = options;
  const prefs = await getSchoolNotificationPrefs(schoolId);

  const result: NotifyResult = {
    emailSent: false,
    whatsappSent: false,
  };

  const promises: Promise<void>[] = [];

  // Email
  if (prefs.email && options.email) {
    promises.push(
      sendEmail({
        to: options.email.to,
        subject: options.email.subject,
        html: options.email.html,
        schoolId,
        type: options.email.type || "KIN",
      }).then((sent) => {
        result.emailSent = sent;
      })
    );
  }

  // WhatsApp
  if (prefs.whatsapp && options.whatsapp) {
    promises.push(
      sendWhatsApp({
        phone: options.whatsapp.phone,
        content: options.whatsapp.content,
        schoolId,
        isBulk: options.whatsapp.isBulk,
      }).then((sent) => {
        result.whatsappSent = sent;
      })
    );
  }

  await Promise.allSettled(promises);
  return result;
}

/**
 * Send a welcome notification to a newly created user across all channels.
 * Includes email with credentials and WhatsApp welcome messages.
 */
export async function notifyWelcome(options: {
  schoolId: string;
  schoolName: string;
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: "TEACHER" | "PARENT" | "STUDENT";
  emailHtml: string;
}): Promise<NotifyResult> {
  const { schoolId, schoolName, name, email, phone, password, role, emailHtml } = options;

  return notifyAllChannels({
    schoolId,
    email: {
      to: email,
      subject: "Welcome to Connect-Ed - Your Login Credentials",
      html: emailHtml,
      type: "KIN",
    },
    ...(phone && {
      whatsapp: {
        phone,
        content: `🎓 *Welcome to ${schoolName}!*\n\nHi ${name}, your Connect-Ed account has been created.\n\n🔐 *Login Credentials*\nEmail: ${email}\nPassword: ${password}\n\n⚠️ Please change your password after your first login.\n\n_Sent via Connect-Ed_`,
      },
    }),
  });
}

/**
 * Send a generic notification message across all channels.
 * Useful for system alerts, period changes, etc.
 */
export async function notifyGeneric(options: {
  schoolId: string;
  email?: string;
  phone?: string;
  subject: string;
  emailHtml: string;
  whatsappContent: string;
  emailType?: EmailType;
}): Promise<NotifyResult> {
  const { schoolId, email, phone, subject, emailHtml, whatsappContent, emailType } = options;

  return notifyAllChannels({
    schoolId,
    ...(email && {
      email: {
        to: email,
        subject,
        html: emailHtml,
        type: emailType || "NOREPLY",
      },
    }),
    ...(phone && {
      whatsapp: {
        phone,
        content: whatsappContent,
      },
    }),
  });
}
