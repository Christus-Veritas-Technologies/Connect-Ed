// ============================================
// WhatsApp Multi-Client Manager
// Per-school wwebjs clients with separate sessions
// ============================================

import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import { db } from "@repo/db";
import { existsSync, rmSync } from "fs";
import { join } from "path";
import { handleIncomingMessage } from "./handler.js";

// ── Types ──────────────────────────────────────────────────

export interface SchoolClient {
  schoolId: string;
  client: InstanceType<typeof Client>;
  status: "initializing" | "qr" | "authenticated" | "ready" | "disconnected" | "destroyed";
  qrCode: string | null;
  phone: string | null; // Connected phone number (e.g. "263771234567")
  lastActivity: number;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
}

// ── State ──────────────────────────────────────────────────

const clients = new Map<string, SchoolClient>();

// ── Public Getters ─────────────────────────────────────────

export function getSchoolClient(schoolId: string): SchoolClient | undefined {
  return clients.get(schoolId);
}

export function getSchoolWhatsAppClient(schoolId: string): InstanceType<typeof Client> | null {
  const sc = clients.get(schoolId);
  return sc?.status === "ready" ? sc.client : null;
}

export function isSchoolWhatsAppReady(schoolId: string): boolean {
  return clients.get(schoolId)?.status === "ready";
}

export function getSchoolQRCode(schoolId: string): string | null {
  return clients.get(schoolId)?.qrCode ?? null;
}

export function getSchoolClientStatus(schoolId: string): {
  status: string;
  phone: string | null;
  qrCode: string | null;
} {
  const sc = clients.get(schoolId);
  if (!sc) {
    return { status: "not_initialized", phone: null, qrCode: null };
  }
  return {
    status: sc.status,
    phone: sc.phone,
    qrCode: sc.qrCode,
  };
}

export function getAllClientStatuses(): Array<{
  schoolId: string;
  status: string;
  phone: string | null;
}> {
  return Array.from(clients.entries()).map(([schoolId, sc]) => ({
    schoolId,
    status: sc.status,
    phone: sc.phone,
  }));
}

// ── Initialize a client for a school ───────────────────────

export async function initSchoolClient(schoolId: string): Promise<SchoolClient> {
  // If client already exists and is active, return it
  const existing = clients.get(schoolId);
  if (existing && existing.status !== "destroyed" && existing.status !== "disconnected") {
    console.log(`[WhatsApp:${schoolId}] Client already active (${existing.status})`);
    return existing;
  }

  // If there's a destroyed/disconnected client, clean up first
  if (existing) {
    await destroySchoolClient(schoolId);
  }

  // Clean up any stale lockfile from previous session
  const sessionPath = join(process.cwd(), ".wwebjs_auth", `session-${schoolId}`);
  const lockfilePath = join(sessionPath, "lockfile");
  if (existsSync(lockfilePath)) {
    try {
      rmSync(lockfilePath);
      console.log(`[WhatsApp:${schoolId}] Cleaned up stale lockfile`);
    } catch (err) {
      console.warn(`[WhatsApp:${schoolId}] Could not remove lockfile:`, err);
    }
  }

  console.log(`[WhatsApp:${schoolId}] Initializing client...`);

  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: schoolId, // Each school gets its own session folder
      dataPath: ".wwebjs_auth",
    }),
    puppeteer: {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--disable-gpu",
      ],
    },
  });

  const schoolClient: SchoolClient = {
    schoolId,
    client,
    status: "initializing",
    qrCode: null,
    phone: null,
    lastActivity: Date.now(),
    reconnectTimer: null,
  };

  clients.set(schoolId, schoolClient);

  // ── Event Handlers ────────────────────────────────────

  client.on("qr", (qr: string) => {
    schoolClient.qrCode = qr;
    schoolClient.status = "qr";
    schoolClient.lastActivity = Date.now();
    console.log(`[WhatsApp:${schoolId}] QR Code received — waiting for scan`);
  });

  client.on("authenticated", () => {
    schoolClient.status = "authenticated";
    schoolClient.qrCode = null;
    schoolClient.lastActivity = Date.now();
    console.log(`[WhatsApp:${schoolId}] Authenticated successfully`);
  });

  client.on("ready", async () => {
    schoolClient.status = "ready";
    schoolClient.qrCode = null;
    schoolClient.lastActivity = Date.now();

    // Get the connected phone number
    try {
      const info = client.info;
      if (info?.wid?.user) {
        schoolClient.phone = info.wid.user;
      }
    } catch {
      // phone will remain null if we can't get it
    }

    console.log(`[WhatsApp:${schoolId}] Client ready! Phone: ${schoolClient.phone}`);

    // Persist connection state to DB
    try {
      await db.school.update({
        where: { id: schoolId },
        data: {
          whatsappConnected: true,
          whatsappPhone: schoolClient.phone,
          whatsappSessionId: schoolId,
        },
      });
    } catch (err) {
      console.error(`[WhatsApp:${schoolId}] Failed to persist connection state:`, err);
    }
  });

  client.on("auth_failure", async (msg: string) => {
    schoolClient.status = "disconnected";
    schoolClient.qrCode = null;
    schoolClient.lastActivity = Date.now();
    console.error(`[WhatsApp:${schoolId}] Auth failed:`, msg);

    // Mark as disconnected in DB
    try {
      await db.school.update({
        where: { id: schoolId },
        data: { whatsappConnected: false },
      });
    } catch {
      // ignore
    }
  });

  client.on("disconnected", async (reason: string) => {
    schoolClient.status = "disconnected";
    schoolClient.lastActivity = Date.now();
    console.log(`[WhatsApp:${schoolId}] Disconnected:`, reason);

    // Mark as disconnected in DB
    try {
      await db.school.update({
        where: { id: schoolId },
        data: { whatsappConnected: false },
      });
    } catch {
      // ignore
    }

    // Attempt reconnection after 30s
    if (schoolClient.reconnectTimer) clearTimeout(schoolClient.reconnectTimer);
    schoolClient.reconnectTimer = setTimeout(async () => {
      console.log(`[WhatsApp:${schoolId}] Attempting reconnection...`);
      try {
        await client.initialize();
      } catch (err) {
        console.error(`[WhatsApp:${schoolId}] Reconnection failed:`, err);
      }
    }, 30_000);
  });

  // ── Incoming Message Handler ────────────────────────────
  client.on("message", async (msg: any) => {
    try {
      console.log(`[WhatsApp:${schoolId}] Received message from ${msg.from}: ${(msg.body || "").slice(0, 50)}...`);

      // Skip group messages and self-messages
      if (msg.isGroupMsg) {
        console.log(`[WhatsApp:${schoolId}] Skipping group message`);
        return;
      }

      if (msg.from === client.info?.wid?.user) {
        console.log(`[WhatsApp:${schoolId}] Skipping self-message`);
        return;
      }

      // Extract phone number (sender's WhatsApp ID)
      const phone = msg.from;
      const body = msg.body || "";

      if (!phone || !body.trim()) {
        console.log(`[WhatsApp:${schoolId}] Skipping: empty phone or body`);
        return;
      }

      // Route to handler with school ID
      schoolClient.lastActivity = Date.now();
      console.log(`[WhatsApp:${schoolId}] Routing message from ${phone} to handler`);
      await handleIncomingMessage(phone, body, schoolId);
    } catch (err) {
      console.error(`[WhatsApp:${schoolId}] Error handling message:`, err);
    }
  });

  // Start initialization (don't await — let QR flow happen asynchronously)
  client.initialize().catch((err: any) => {
    schoolClient.status = "disconnected";
    
    // Check if it's the "browser already running" error and try cleanup
    const errMsg = err?.message || String(err);
    if (errMsg.includes("The browser is already running")) {
      console.error(`[WhatsApp:${schoolId}] Browser still running from previous session. Cleaning up...`);
      
      // Try to clean up the session directory more aggressively
      try {
        const sessionPath = join(process.cwd(), ".wwebjs_auth", `session-${schoolId}`);
        if (existsSync(sessionPath)) {
          rmSync(sessionPath, { recursive: true, force: true });
          console.log(`[WhatsApp:${schoolId}] Cleaned up session directory`);
        }
      } catch (cleanupErr) {
        console.warn(`[WhatsApp:${schoolId}] Could not clean up session directory:`, cleanupErr);
      }
      
      // Retry initialization after a short delay
      setTimeout(async () => {
        console.log(`[WhatsApp:${schoolId}] Retrying initialization...`);
        try {
          await client.initialize();
        } catch (retryErr) {
          console.error(`[WhatsApp:${schoolId}] Retry failed:`, retryErr);
        }
      }, 2000);
    } else {
      console.error(`[WhatsApp:${schoolId}] Initialization failed:`, err);
    }
  });

  return schoolClient;
}

// ── Destroy a school's client ──────────────────────────────

export async function destroySchoolClient(schoolId: string): Promise<void> {
  const sc = clients.get(schoolId);
  if (!sc) return;

  console.log(`[WhatsApp:${schoolId}] Destroying client...`);

  // Clear reconnection timer
  if (sc.reconnectTimer) {
    clearTimeout(sc.reconnectTimer);
    sc.reconnectTimer = null;
  }

  // Destroy the wwebjs client
  try {
    await sc.client.destroy();
  } catch (err) {
    console.error(`[WhatsApp:${schoolId}] Error destroying client:`, err);
  }

  sc.status = "destroyed";
  clients.delete(schoolId);

  // Mark as disconnected in DB
  try {
    await db.school.update({
      where: { id: schoolId },
      data: {
        whatsappConnected: false,
        whatsappPhone: null,
        whatsappSessionId: null,
      },
    });
  } catch {
    // ignore
  }
}

// ── Boot: restore previously connected schools on startup ──

export async function restoreConnectedClients(): Promise<void> {
  console.log("[WhatsApp] Restoring previously connected school clients...");

  try {
    const connectedSchools = await db.school.findMany({
      where: {
        whatsappConnected: true,
        whatsappSessionId: { not: null },
      },
      select: { id: true, name: true },
    });

    if (connectedSchools.length === 0) {
      console.log("[WhatsApp] No previously connected schools found.");
      return;
    }

    console.log(`[WhatsApp] Restoring ${connectedSchools.length} client(s)...`);

    // Initialize clients sequentially to avoid resource spikes
    for (const school of connectedSchools) {
      try {
        console.log(`[WhatsApp] Restoring client for ${school.name || school.id}`);
        await initSchoolClient(school.id);
      } catch (err) {
        console.error(`[WhatsApp] Failed to restore client for ${school.id}:`, err);
        // Mark as disconnected so they can reconnect manually
        await db.school.update({
          where: { id: school.id },
          data: { whatsappConnected: false },
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.error("[WhatsApp] Failed to restore connected clients:", err);
  }
}

// ── Cleanup: destroy all clients on shutdown ───────────────

export async function destroyAllClients(): Promise<void> {
  console.log("[WhatsApp] Destroying all clients...");
  const schoolIds = Array.from(clients.keys());
  for (const schoolId of schoolIds) {
    await destroySchoolClient(schoolId);
  }
}
