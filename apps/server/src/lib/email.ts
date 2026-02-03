export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

const isDev = process.env.NODE_ENV !== "production";

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "no-reply@connect-ed.com";

  if (!apiKey) {
    if (isDev) {
      console.log(`[EMAIL] To: ${to}, Subject: ${subject}`);
      console.log(`[EMAIL] Content: ${html}`);
      return;
    }
    throw new Error("Email provider not configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message || "Failed to send email");
  }
}
