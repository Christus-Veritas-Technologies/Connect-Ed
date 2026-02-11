import { db, MessageType, MessageStatus } from "@repo/db";
import nodemailer from "nodemailer";
import { fmtServer, type CurrencyCode } from "./currency";

export type EmailType = "KIN" | "NOREPLY" | "SALES";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  schoolId: string;
  type?: EmailType; // Defaults to KIN for friendly emails
}

// Create transporter for Kin's emails (welcome emails, friendly communication)
const createKinTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.KIN_SMTP_HOST,
    port: parseInt(process.env.KIN_SMTP_PORT || "587"),
    secure: process.env.KIN_SMTP_SECURE === "true",
    auth: {
      user: process.env.KIN_SMTP_USER,
      pass: process.env.KIN_SMTP_PASS,
    },
  });
};

// Create transporter for no-reply emails (one-sided notifications)
const createNoReplyTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.NOREPLY_SMTP_HOST,
    port: parseInt(process.env.NOREPLY_SMTP_PORT || "587"),
    secure: process.env.NOREPLY_SMTP_SECURE === "true",
    auth: {
      user: process.env.NOREPLY_SMTP_USER,
      pass: process.env.NOREPLY_SMTP_PASS,
    },
  });
};

// Create transporter for sales emails (plan purchases, sales)
const createSalesTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SALES_SMTP_HOST,
    port: parseInt(process.env.SALES_SMTP_PORT || "587"),
    secure: process.env.SALES_SMTP_SECURE === "true",
    auth: {
      user: process.env.SALES_SMTP_USER,
      pass: process.env.SALES_SMTP_PASS,
    },
  });
};

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const { to, subject, html, schoolId, type = "KIN" } = options;

  try {
    // Check if school has email quota remaining
    const school = await db.school.findUnique({
      where: { id: schoolId },
      select: {
        emailQuota: true,
        emailUsed: true,
        plan: true,
        name: true,
      },
    });

    if (!school) {
      console.error("❌ School not found:", schoolId);
      return false;
    }

    // Check if quota exceeded
    if (school.emailUsed >= school.emailQuota) {
      console.error(`❌ Email quota exceeded for ${school.name}:`, {
        used: school.emailUsed,
        quota: school.emailQuota,
        plan: school.plan,
      });
      
      // Log the failure
      await db.messageLog.create({
        data: {
          type: "EMAIL" as any,
          recipient: to,
          subject,
          content: html,
          status: "FAILED" as any,
          errorMessage: `Email quota exceeded. Used ${school.emailUsed}/${school.emailQuota} emails. Please upgrade your plan or wait for quota reset.`,
          schoolId,
        },
      });

      return false;
    }

    console.log(`📧 Sending ${type} email (${school.emailUsed + 1}/${school.emailQuota}):`, {
      to,
      subject,
      preview: html.substring(0, 100) + "...",
    });

    // Create appropriate transporter based on email type
    let transporter;
    let fromEmail;
    
    switch (type) {
      case "NOREPLY":
        transporter = createNoReplyTransporter();
        fromEmail = process.env.NOREPLY_FROM_EMAIL || "Connect-Ed <no-reply@connect-ed.co.zw>";
        break;
      case "SALES":
        transporter = createSalesTransporter();
        fromEmail = process.env.SALES_FROM_EMAIL || "Connect-Ed Sales <sales@connect-ed.co.zw>";
        break;
      case "KIN":
      default:
        transporter = createKinTransporter();
        fromEmail = process.env.KIN_FROM_EMAIL || "Kin - Connect-Ed <kin@connect-ed.co.zw>";
        break;
    }

    // Send email
    const info = await transporter.sendMail({
      from: fromEmail,
      to,
      subject,
      html,
    });

    console.log(`✅ ${type} email sent successfully:`, info.messageId);

    // Increment email quota usage
    await db.school.update({
      where: { id: schoolId },
      data: {
        emailUsed: {
          increment: 1,
        },
      },
    });

    console.log(`📊 Email quota updated: ${school.emailUsed + 1}/${school.emailQuota}`);

    // Log the successful email in the database
    await db.messageLog.create({
      data: {
        type: "EMAIL" as any,
        recipient: to,
        subject,
        content: html,
        status: "SENT" as any,
        sentAt: new Date(),
        schoolId,
      },
    });

    return true;
  } catch (error) {
    console.error(`❌ ${type} email sending failed:`, error);

    // Log the failure
    await db.messageLog.create({
      data: {
        type: "EMAIL" as any,
        recipient: to,
        subject,
        content: html,
        status: "FAILED" as any,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        schoolId,
      },
    });

    return false;
  }
}

export function generatePaymentSuccessEmail(params: {
  name: string;
  amount: number;
  plan: string;
  transactionId: string;
  currency?: CurrencyCode;
}): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
          .success-badge { background: #10b981; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; margin: 20px 0; }
          .details { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          .button { background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Successful!</h1>
            <p>Thank you for choosing Connect-Ed</p>
          </div>
          <div class="content">
            <div class="success-badge">✓ Payment Confirmed</div>
            <p>Hi ${params.name},</p>
            <p>Your payment has been successfully processed. Here are the details:</p>
            <div class="details">
              <div class="detail-row">
                <strong>Amount Paid:</strong>
                <span>${fmtServer(params.amount, params.currency)}</span>
              </div>
              <div class="detail-row">
                <strong>Plan:</strong>
                <span>${params.plan}</span>
              </div>
              <div class="detail-row">
                <strong>Transaction ID:</strong>
                <span>${params.transactionId}</span>
              </div>
              <div class="detail-row">
                <strong>Date:</strong>
                <span>${new Date().toLocaleDateString()}</span>
              </div>
            </div>
            <p>Your school's plan has been activated and all services are now available.</p>
            <a href="${process.env.APP_URL}/dashboard" class="button">Go to Dashboard</a>
            <p style="margin-top: 20px; color: #6b7280;">Thank you for choosing Connect-Ed to power your school management!</p>
          </div>
          <div class="footer">
            <p>Connect-Ed School Management System</p>
            <p>Questions about your plan? Contact us at <a href="mailto:sales@connect-ed.co.zw" style="color: #3b82f6;">sales@connect-ed.co.zw</a></p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function generatePaymentFailedEmail(params: {
  name: string;
  amount: number;
  plan: string;
  reason?: string;
  currency?: CurrencyCode;
}): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
          .error-badge { background: #ef4444; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; margin: 20px 0; }
          .details { background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          .button { background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Failed</h1>
            <p>There was an issue processing your payment</p>
          </div>
          <div class="content">
            <div class="error-badge">✗ Payment Not Processed</div>
            <p>Hi ${params.name},</p>
            <p>Unfortunately, we were unable to process your payment for the ${params.plan} plan.</p>
            <div class="details">
              <p><strong>Amount:</strong> ${fmtServer(params.amount, params.currency)}</p>
              ${params.reason ? `<p><strong>Reason:</strong> ${params.reason}</p>` : ""}
              <p>Please try again or contact your bank if the issue persists.</p>
            </div>
            <a href="${process.env.APP_URL}/payment" class="button">Retry Payment</a>
            <p style="margin-top: 20px; color: #6b7280;">Need help with your payment? Our sales team is here to assist you.</p>
          </div>
          <div class="footer">
            <p>Connect-Ed School Management System</p>
            <p>Need help? Contact our sales team at <a href="mailto:sales@connect-ed.co.zw" style="color: #3b82f6;">sales@connect-ed.co.zw</a></p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function generateWelcomeEmailWithCredentials(params: {
  name: string;
  email: string;
  password: string;
  role: "STUDENT" | "PARENT" | "TEACHER";
  schoolName?: string;
  additionalInfo?: string;
}): string {
  const roleTitle = params.role === "STUDENT" ? "Student" : params.role === "PARENT" ? "Parent" : "Teacher";
  const portalUrl = `${process.env.APP_URL || "http://localhost:3000"}/login`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
          .welcome-badge { background: #10b981; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; margin: 20px 0; }
          .credentials { background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
          .credential-item { padding: 10px 0; }
          .credential-label { font-weight: bold; color: #1e40af; }
          .credential-value { font-family: monospace; background: white; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 5px; }
          .warning { background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          .button { background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to Connect-Ed!</h1>
            <p>Your ${roleTitle} Account Has Been Created</p>
          </div>
          <div class="content">
            <div class="welcome-badge">✓ Account Active</div>
            <p>Hi ${params.name},</p>
            <p>Welcome to Connect-Ed${params.schoolName ? ` at ${params.schoolName}` : ""}! Your ${roleTitle.toLowerCase()} account has been successfully created.</p>
            ${params.additionalInfo ? `<p>${params.additionalInfo}</p>` : ""}
            
            <div class="credentials">
              <h3 style="margin-top: 0;">🔐 Your Login Credentials</h3>
              <div class="credential-item">
                <div class="credential-label">Email Address:</div>
                <div class="credential-value">${params.email}</div>
              </div>
              <div class="credential-item">
                <div class="credential-label">Temporary Password:</div>
                <div class="credential-value">${params.password}</div>
              </div>
            </div>

            <div class="warning">
              <strong>⚠️ Important Security Notice:</strong>
              <p style="margin: 10px 0 0 0;">This is a temporary password. Please change it immediately after your first login to keep your account secure.</p>
            </div>

            <div style="text-align: center;">
              <a href="${portalUrl}" class="button">Login to Your Account</a>
            </div>

            <div style="margin-top: 30px; padding: 20px; background: #f0f9ff; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <p style="margin: 0 0 10px 0; font-weight: bold; color: #1e40af;">💬 Need Help or Have Questions?</p>
              <p style="margin: 0; color: #1e40af;">I'm Kin, and I'm here to help! Feel free to reach out to me directly at <a href="mailto:kin@connect-ed.co.zw" style="color: #3b82f6; text-decoration: none; font-weight: bold;">kin@connect-ed.co.zw</a> if you have any questions, need assistance getting started, or just want to share feedback. I'd love to hear from you!</p>
            </div>

            <p style="margin-top: 20px; color: #6b7280;">If you have any questions or need assistance, please don't hesitate to reach out.</p>
          </div>
          <div class="footer">
            <p><strong>Connect-Ed School Management System</strong></p>
            <p>Streamlining education for a better tomorrow</p>
            <p style="margin-top: 15px; font-size: 12px;">If you did not expect this email, please contact your school administration immediately.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// ─── Billing / Grace Period Email Templates ──────────────────

const billingEmailStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background: #f3f4f6; }
  .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
  .header { color: white; padding: 40px 30px; text-align: center; }
  .header h1 { margin: 0; font-size: 24px; }
  .content { padding: 30px; }
  .cta { display: inline-block; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; }
  .detail-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
  .footer { background: #f9fafb; padding: 20px 30px; text-align: center; color: #6b7280; font-size: 13px; }
`;

/**
 * Grace-period reminder (sent during the 3 grace days).
 */
export function generateGraceReminderEmail(params: {
  name: string;
  schoolName: string;
  graceDay: number;
  dueDate: Date;
  plan: string;
}): string {
  const daysLeft = 3 - params.graceDay;
  const paymentUrl = `${process.env.APP_URL || "http://localhost:3000"}/payment`;

  return `<!DOCTYPE html><html><head><style>${billingEmailStyles}</style></head><body>
<div style="padding:20px;">
<div class="container">
  <div class="header" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
    <div style="font-size:48px; margin-bottom:12px;">⏰</div>
    <h1>Payment Reminder – Day ${params.graceDay} of 3</h1>
  </div>
  <div class="content">
    <p>Hi ${params.name},</p>
    <p>This is a friendly reminder that the monthly payment for <strong>${params.schoolName}</strong> was due on <strong>${params.dueDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</strong>.</p>

    <div class="detail-box">
      <p style="margin:0;"><strong>Plan:</strong> ${params.plan}</p>
      <p style="margin:8px 0 0;"><strong>Grace days remaining:</strong> ${daysLeft}</p>
    </div>

    ${daysLeft > 0
      ? `<p>You have <strong>${daysLeft} day${daysLeft > 1 ? "s" : ""}</strong> left before access is suspended for all users at your school. Please make your payment as soon as possible.</p>`
      : `<p style="color:#dc2626;"><strong>This is your last grace day.</strong> If payment is not received by tomorrow, access will be suspended for all users at your school.</p>`
    }

    <div style="text-align:center; margin:28px 0;">
      <a href="${paymentUrl}" class="cta" style="background:#f59e0b; color:white;">Make Payment Now</a>
    </div>

    <p style="color:#6b7280; font-size:14px;">If you've already made a payment, please allow a few minutes for it to be processed. You can ignore this email.</p>
  </div>
  <div class="footer">
    <p>Connect-Ed School Management System</p>
    <p>Questions? Contact <a href="mailto:sales@connect-ed.co.zw" style="color:#3b82f6;">sales@connect-ed.co.zw</a></p>
  </div>
</div>
</div></body></html>`;
}

/**
 * Lockdown email — sent on day 4 when access is suspended.
 */
export function generateLockdownEmail(params: {
  name: string;
  schoolName: string;
  plan: string;
}): string {
  const paymentUrl = `${process.env.APP_URL || "http://localhost:3000"}/payment`;

  return `<!DOCTYPE html><html><head><style>${billingEmailStyles}</style></head><body>
<div style="padding:20px;">
<div class="container">
  <div class="header" style="background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);">
    <div style="font-size:48px; margin-bottom:12px;">🔒</div>
    <h1>Access Suspended</h1>
  </div>
  <div class="content">
    <p>Hi ${params.name},</p>
    <p>The 3-day grace period for <strong>${params.schoolName}</strong> has ended and your monthly payment has not been received.</p>

    <div class="detail-box" style="border-left: 4px solid #ef4444;">
      <p style="margin:0; color:#dc2626; font-weight:600;">All users (admins, teachers, students, and parents) have been locked out of the platform.</p>
    </div>

    <p>To restore access immediately, simply complete your payment. Access will be restored automatically once the payment is confirmed.</p>

    <div style="text-align:center; margin:28px 0;">
      <a href="${paymentUrl}" class="cta" style="background:#ef4444; color:white;">Pay Now to Restore Access</a>
    </div>

    <p style="color:#6b7280; font-size:14px;">If you're experiencing payment difficulties, please reach out to our sales team – we're happy to help find a solution.</p>
  </div>
  <div class="footer">
    <p>Connect-Ed School Management System</p>
    <p>Contact <a href="mailto:sales@connect-ed.co.zw" style="color:#3b82f6;">sales@connect-ed.co.zw</a></p>
  </div>
</div>
</div></body></html>`;
}

/**
 * Final warning email — sent ~7 days after due date. Warns about school removal.
 */
export function generateFinalWarningEmail(params: {
  name: string;
  schoolName: string;
  plan: string;
}): string {
  const paymentUrl = `${process.env.APP_URL || "http://localhost:3000"}/payment`;

  return `<!DOCTYPE html><html><head><style>${billingEmailStyles}</style></head><body>
<div style="padding:20px;">
<div class="container">
  <div class="header" style="background: linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%);">
    <div style="font-size:48px; margin-bottom:12px;">🚨</div>
    <h1>Final Notice – School Removal</h1>
  </div>
  <div class="content">
    <p>Hi ${params.name},</p>
    <p>This is a <strong>final notice</strong> regarding the overdue payment for <strong>${params.schoolName}</strong>.</p>

    <div class="detail-box" style="border-left: 4px solid #7f1d1d; background: #fef2f2;">
      <p style="margin:0; color:#7f1d1d; font-weight:600;">Your school's data will be scheduled for removal from the Connect-Ed platform if payment is not received within the next few days.</p>
      <p style="margin:12px 0 0; color:#991b1b;">This action is irreversible. All school data, student records, and configurations will be permanently deleted.</p>
    </div>

    <p>To prevent this, please make your payment immediately:</p>

    <div style="text-align:center; margin:28px 0;">
      <a href="${paymentUrl}" class="cta" style="background:#7f1d1d; color:white;">Make Payment Immediately</a>
    </div>

    <p>If you no longer wish to use Connect-Ed, no action is required. Your data will be removed as scheduled.</p>
    <p style="color:#6b7280; font-size:14px;">If you believe this is an error or need assistance, please contact us urgently at <a href="mailto:sales@connect-ed.co.zw" style="color:#3b82f6;">sales@connect-ed.co.zw</a>.</p>
  </div>
  <div class="footer">
    <p>Connect-Ed School Management System</p>
  </div>
</div>
</div></body></html>`;
}

// Generate period change email (term start/end, holiday start)
export function generatePeriodChangeEmail(params: {
  name: string;
  schoolName: string;
  action: "started" | "ended";
  termNumber: number;
  termYear: number;
  newPeriod: "term" | "holiday";
}): string {
  const isTermStart = params.newPeriod === "term" && params.action === "started";
  const isTermEnd = params.newPeriod === "holiday" && params.action === "ended";

  const emoji = isTermStart ? "🎓" : "🌴";
  const color = isTermStart ? "#3b82f6" : "#f59e0b";
  const title = isTermStart
    ? `Term ${params.termNumber} Has Started!`
    : `Term ${params.termNumber} Has Ended - Holiday Time!`;
  const message = isTermStart
    ? `Welcome back! Term ${params.termNumber} of ${params.termYear} has officially begun. We're excited to have everyone back and ready for a productive term ahead.`
    : `Term ${params.termNumber} of ${params.termYear} has come to an end. It's time to relax and recharge during the holiday period. See you next term!`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            margin: 0;
            padding: 0;
            background: #f3f4f6;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, ${color} 0%, ${isTermStart ? "#1e40af" : "#ea580c"} 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: bold;
          }
          .emoji {
            font-size: 60px;
            margin-bottom: 20px;
          }
          .content {
            padding: 40px 30px;
          }
          .greeting {
            font-size: 18px;
            color: #1f2937;
            margin-bottom: 20px;
          }
          .message {
            background: #f0f9ff;
            border-left: 4px solid ${color};
            padding: 20px;
            border-radius: 8px;
            margin: 25px 0;
          }
          .info-box {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .info-row:last-child {
            border-bottom: none;
          }
          .info-label {
            font-weight: 600;
            color: #6b7280;
          }
          .info-value {
            color: #1f2937;
            font-weight: 500;
          }
          .footer {
            background: #f9fafb;
            padding: 30px;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
          }
          .footer p {
            margin: 5px 0;
          }
        </style>
      </head>
      <body>
        <div style="padding: 20px;">
          <div class="container">
            <div class="header">
              <div class="emoji">${emoji}</div>
              <h1>${title}</h1>
            </div>
            <div class="content">
              <div class="greeting">Hello ${params.name},</div>
              
              <div class="message">
                <p style="margin: 0; color: #1e40af; font-size: 16px;">${message}</p>
              </div>

              <div class="info-box">
                <div class="info-row">
                  <span class="info-label">School:</span>
                  <span class="info-value">${params.schoolName}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Term:</span>
                  <span class="info-value">Term ${params.termNumber}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Year:</span>
                  <span class="info-value">${params.termYear}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Period Type:</span>
                  <span class="info-value">${isTermStart ? "School Term" : "Holiday"}</span>
                </div>
              </div>

              ${
                isTermStart
                  ? `
              <p style="margin-top: 20px; color: #6b7280;">
                <strong>Important Reminders:</strong><br>
                • Review your class schedule on the Connect-Ed portal<br>
                • Check for any pending fees or outstanding items<br>
                • Ensure all learning materials are ready<br>
                • Contact your teachers if you have any questions
              </p>
              `
                  : `
              <p style="margin-top: 20px; color: #6b7280;">
                <strong>Holiday Reminders:</strong><br>
                • Stay safe and healthy during the break<br>
                • Check the portal for any holiday assignments<br>
                • We'll notify you when the next term begins<br>
                • Have a wonderful holiday!
              </p>
              `
              }

              <p style="margin-top: 30px; color: #6b7280;">
                You can view more details and stay updated by logging into your Connect-Ed portal.
              </p>
            </div>
            <div class="footer">
              <p><strong>${params.schoolName}</strong></p>
              <p>Connect-Ed School Management System</p>
              <p style="margin-top: 15px; font-size: 12px;">
                This is an automated notification. Please do not reply to this email.
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

