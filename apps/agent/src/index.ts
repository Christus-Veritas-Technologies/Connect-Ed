// ============================================
// Connect-Ed WhatsApp Agent — Entry Point
// HTTP server (Hono) + WhatsApp client (wwebjs)
// ============================================

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { db } from "@repo/db";
import {
  initWhatsAppClient,
  isWhatsAppReady,
  getQRCode,
  getWhatsAppClient,
} from "./whatsapp/client.js";
import { enqueueMessage, getQueueStatus } from "./whatsapp/queue.js";
import { handleIncomingMessage } from "./whatsapp/handler.js";
import {
  academicReportTemplate,
  feeReminderTemplate,
  welcomeTemplate,
  type ReportData,
  type FeeReminderData,
  type WelcomeData,
} from "./whatsapp/templates.js";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  })
);

// ============================================
// Health & Status
// ============================================

app.get("/", (c) => {
  return c.json({
    service: "connect-ed-agent",
    whatsapp: isWhatsAppReady() ? "connected" : "disconnected",
    queue: getQueueStatus(),
  });
});

app.get("/health", (c) => c.json({ ok: true }));

app.get("/status", (c) => {
  const qr = getQRCode();
  return c.json({
    whatsapp: {
      ready: isWhatsAppReady(),
      qrCode: qr ? "available (scan in terminal)" : null,
    },
    queue: getQueueStatus(),
  });
});

// ============================================
// Send Message Endpoint (called by server app)
// ============================================

/**
 * POST /send
 * Send a plain WhatsApp message
 * Body: { phone, content, schoolId, isBulk? }
 */
app.post("/send", async (c) => {
  try {
    const { phone, content, schoolId, isBulk } = await c.req.json();

    if (!phone || !content || !schoolId) {
      return c.json({ error: "phone, content, and schoolId are required" }, 400);
    }

    // Check quota
    const school = await db.school.findUnique({
      where: { id: schoolId },
      select: { whatsappUsed: true, whatsappQuota: true },
    });
    if (!school) {
      return c.json({ error: "School not found" }, 404);
    }
    if (school.whatsappUsed >= school.whatsappQuota) {
      return c.json({ error: "WhatsApp quota exceeded" }, 429);
    }

    const result = await enqueueMessage(phone, content, schoolId, isBulk ?? false);
    return c.json({ ...result });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// Template-Based Endpoints (save OpenAI costs)
// ============================================

/**
 * POST /send/report
 * Send an academic report using the pre-built template
 * Body: { phone, schoolId, report: ReportData }
 */
app.post("/send/report", async (c) => {
  try {
    const { phone, schoolId, report } = (await c.req.json()) as {
      phone: string;
      schoolId: string;
      report: ReportData;
    };

    if (!phone || !schoolId || !report) {
      return c.json({ error: "phone, schoolId, and report are required" }, 400);
    }

    const content = academicReportTemplate(report);
    const result = await enqueueMessage(phone, content, schoolId, true);
    return c.json({ ...result });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /send/fee-reminder
 * Send a fee reminder using the pre-built template
 * Body: { phone, schoolId, reminder: FeeReminderData }
 */
app.post("/send/fee-reminder", async (c) => {
  try {
    const { phone, schoolId, reminder } = (await c.req.json()) as {
      phone: string;
      schoolId: string;
      reminder: FeeReminderData;
    };

    if (!phone || !schoolId || !reminder) {
      return c.json({ error: "phone, schoolId, and reminder are required" }, 400);
    }

    const content = feeReminderTemplate(reminder);
    const result = await enqueueMessage(phone, content, schoolId, true);
    return c.json({ ...result });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /send/welcome
 * Send a welcome message using the pre-built template
 * Body: { phone, schoolId, welcome: WelcomeData }
 */
app.post("/send/welcome", async (c) => {
  try {
    const { phone, schoolId, welcome } = (await c.req.json()) as {
      phone: string;
      schoolId: string;
      welcome: WelcomeData;
    };

    if (!phone || !schoolId || !welcome) {
      return c.json({ error: "phone, schoolId, and welcome are required" }, 400);
    }

    const content = welcomeTemplate(welcome);
    const result = await enqueueMessage(phone, content, schoolId, false);
    return c.json({ ...result });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /send/bulk
 * Send messages to multiple recipients (rate-limited with 60s gaps)
 * Body: { messages: Array<{ phone, content, schoolId }> }
 */
app.post("/send/bulk", async (c) => {
  try {
    const { messages } = (await c.req.json()) as {
      messages: Array<{ phone: string; content: string; schoolId: string }>;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return c.json({ error: "messages array is required" }, 400);
    }

    // Enqueue all as bulk (60s gaps)
    const results = await Promise.allSettled(
      messages.map((msg) =>
        enqueueMessage(msg.phone, msg.content, msg.schoolId, true)
      )
    );

    const sent = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;
    const failed = results.length - sent;

    return c.json({ sent, failed, total: messages.length });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// Process PENDING WhatsApp messages from server
// (Picks up messages created by report-dispatch)
// ============================================

app.post("/process-pending", async (c) => {
  try {
    const pending = await db.messageLog.findMany({
      where: { type: "WHATSAPP", status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 50,
    });

    if (pending.length === 0) {
      return c.json({ processed: 0 });
    }

    let sent = 0;
    let failed = 0;

    for (const msg of pending) {
      const result = await enqueueMessage(
        msg.recipient,
        msg.content ?? "",
        msg.schoolId,
        true
      );

      // Update the original MessageLog status
      await db.messageLog.update({
        where: { id: msg.id },
        data: {
          status: result.success ? "SENT" : "FAILED",
          sentAt: result.success ? new Date() : undefined,
          errorMessage: result.error,
        },
      });

      if (result.success) sent++;
      else failed++;
    }

    return c.json({ processed: pending.length, sent, failed });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// Initialize WhatsApp + wire incoming messages
// ============================================

async function start() {
  // Initialize WhatsApp client
  try {
    await initWhatsAppClient();

    // Wire incoming messages to the handler
    const client = getWhatsAppClient();
    if (client) {
      client.on("message", async (msg: any) => {
        // Ignore group messages, status broadcasts, and our own messages
        if (msg.from.includes("@g.us") || msg.from === "status@broadcast" || msg.fromMe) {
          return;
        }

        // Extract phone number from chat ID (remove @c.us)
        const phone = msg.from.replace("@c.us", "");
        const body = msg.body?.trim();

        if (!body) return;

        console.log(`[WhatsApp] Incoming from ${phone}: ${body.slice(0, 100)}`);
        await handleIncomingMessage(phone, body);
      });
    }
  } catch (error: any) {
    console.error("[WhatsApp] Failed to initialize:", error.message);
    console.log("[WhatsApp] Agent will run in API-only mode (no incoming messages)");
  }

  // Start periodic processing of pending messages (every 5 minutes)
  setInterval(async () => {
    try {
      const pending = await db.messageLog.findMany({
        where: { type: "WHATSAPP", status: "PENDING" },
        select: { id: true },
        take: 1,
      });
      if (pending.length > 0) {
        console.log("[Agent] Found pending WhatsApp messages, processing...");
        const response = await fetch(`http://localhost:${port}/process-pending`, {
          method: "POST",
        });
        const result = await response.json();
        console.log("[Agent] Pending processing result:", result);
      }
    } catch {
      // Silently ignore periodic check errors
    }
  }, 5 * 60 * 1000);
}

// Start WhatsApp in background (don't block HTTP server)
start().catch(console.error);

// ============================================
// Export Hono server for Bun
// ============================================

const port = Number(process.env.AGENT_PORT) || 5000;
console.log(`[Agent] HTTP server starting on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};

