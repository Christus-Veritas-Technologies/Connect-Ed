import { db, MessageType, MessageStatus } from "@repo/db";
import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  schoolId: string;
}

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const { to, subject, html, schoolId } = options;

  try {
    console.log("📧 Sending email:", {
      to,
      subject,
      preview: html.substring(0, 100) + "...",
    });

    // Create transporter
    const transporter = createTransporter();

    // Send email
    const info = await transporter.sendMail({
      from: process.env.FROM_EMAIL || "Connect-Ed <noreply@connect-ed.com>",
      to,
      subject,
      html,
    });

    console.log("✅ Email sent successfully:", info.messageId);

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
    console.error("❌ Email sending failed:", error);

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
          </div>
          <div class="footer">
            <p>Connect-Ed School Management System</p>
            <p>If you have any questions, please contact our support team.</p>
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
          </div>
          <div class="footer">
            <p>Connect-Ed School Management System</p>
            <p>Need help? Contact our support team for assistance.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
