import { db, MessageType, MessageStatus } from "@repo/db";
import nodemailer from "nodemailer";

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
    console.log(`📧 Sending ${type} email:`, {
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

    // Log the successful email in the database
    await db.messageLog.create({
      data: {
        type: MessageType.EMAIL,
        recipient: to,
        subject,
        content: html,
        status: MessageStatus.SENT,
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
        type: MessageType.EMAIL,
        recipient: to,
        subject,
        content: html,
        status: MessageStatus.FAILED,
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
                <span>$${params.amount}</span>
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
              <p><strong>Amount:</strong> $${params.amount}</p>
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

