import { Hono } from "hono";
import { db } from "@repo/db";
import { requireAuth } from "../middleware/auth";
import { successResponse, errors, errorResponse } from "../lib/response";

const AGENT_URL = process.env.AGENT_URL || "http://localhost:5000";

const whatsappIntegration = new Hono();

// All routes require admin or receptionist auth
whatsappIntegration.use("*", requireAuth);

// Middleware: only ADMIN and RECEPTIONIST can manage WhatsApp integration
whatsappIntegration.use("*", async (c, next) => {
  const role = c.get("role");
  if (role !== "ADMIN" && role !== "RECEPTIONIST") {
    return errorResponse(c, "FORBIDDEN", "Only admins and receptionists can manage WhatsApp integration", 403);
  }
  await next();
});

// ============================================
// GET /whatsapp-integration/status
// Get the current WhatsApp connection status for the school
// ============================================
whatsappIntegration.get("/status", async (c) => {
  try {
    const schoolId = c.get("schoolId");

    // Get DB state
    const school = await db.school.findUnique({
      where: { id: schoolId },
      select: {
        whatsappConnected: true,
        whatsappPhone: true,
        whatsappSessionId: true,
        whatsappQuota: true,
        whatsappUsed: true,
        notifyWhatsapp: true,
      },
    });

    if (!school) {
      return errors.notFound(c);
    }

    // Also check live status from agent
    let liveStatus = { status: "unknown", phone: null as string | null, qrCode: null as string | null };
    try {
      const res = await fetch(`${AGENT_URL}/status/${schoolId}`);
      if (res.ok) {
        liveStatus = await res.json() as typeof liveStatus;
      }
    } catch {
      // Agent might be down
    }

    return successResponse(c, {
      connected: school.whatsappConnected,
      phone: school.whatsappPhone,
      liveStatus: liveStatus.status,
      qrCode: liveStatus.qrCode,
      quota: school.whatsappQuota,
      used: school.whatsappUsed,
      notificationsEnabled: school.notifyWhatsapp,
    });
  } catch (error) {
    console.error("[WhatsApp Integration] Status error:", error);
    return errors.internalError(c);
  }
});

// ============================================
// POST /whatsapp-integration/connect
// Start connection process — initializes the school's WhatsApp client
// ============================================
whatsappIntegration.post("/connect", async (c) => {
  try {
    const schoolId = c.get("schoolId");

    // Tell the agent to initialize a client for this school
    const res = await fetch(`${AGENT_URL}/connect/${schoolId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const result = await res.json() as {
      success?: boolean;
      error?: string;
      status?: string;
      qrCode?: string | null;
      phone?: string | null;
    };

    if (!res.ok) {
      return errorResponse(
        c,
        "AGENT_ERROR",
        result.error || "Failed to initialize WhatsApp client",
        502
      );
    }

    return successResponse(c, {
      status: result.status,
      qrCode: result.qrCode,
      phone: result.phone,
      message: "WhatsApp client initializing. Poll /qr for QR code.",
    });
  } catch (error) {
    console.error("[WhatsApp Integration] Connect error:", error);
    return errorResponse(
      c,
      "AGENT_UNREACHABLE",
      "Could not reach the WhatsApp agent. Make sure it is running.",
      503
    );
  }
});

// ============================================
// GET /whatsapp-integration/qr
// Get the current QR code for scanning
// ============================================
whatsappIntegration.get("/qr", async (c) => {
  try {
    const schoolId = c.get("schoolId");

    const res = await fetch(`${AGENT_URL}/qr/${schoolId}`);
    const result = await res.json() as {
      qrCode?: string | null;
      status?: string;
      phone?: string | null;
    };

    return successResponse(c, {
      qrCode: result.qrCode || null,
      status: result.status || "unknown",
      phone: result.phone || null,
    });
  } catch (error) {
    console.error("[WhatsApp Integration] QR error:", error);
    return errorResponse(
      c,
      "AGENT_UNREACHABLE",
      "Could not reach the WhatsApp agent.",
      503
    );
  }
});

// ============================================
// POST /whatsapp-integration/disconnect
// Disconnect the school's WhatsApp client
// ============================================
whatsappIntegration.post("/disconnect", async (c) => {
  try {
    const schoolId = c.get("schoolId");

    const res = await fetch(`${AGENT_URL}/disconnect/${schoolId}`, {
      method: "POST",
    });

    const result = await res.json() as { success?: boolean; error?: string };

    if (!res.ok) {
      return errorResponse(
        c,
        "AGENT_ERROR",
        result.error || "Failed to disconnect WhatsApp",
        502
      );
    }

    // Also update DB
    await db.school.update({
      where: { id: schoolId },
      data: {
        whatsappConnected: false,
        whatsappPhone: null,
        whatsappSessionId: null,
      },
    });

    return successResponse(c, { message: "WhatsApp disconnected successfully" });
  } catch (error) {
    console.error("[WhatsApp Integration] Disconnect error:", error);
    return errorResponse(
      c,
      "AGENT_UNREACHABLE",
      "Could not reach the WhatsApp agent.",
      503
    );
  }
});

export default whatsappIntegration;
