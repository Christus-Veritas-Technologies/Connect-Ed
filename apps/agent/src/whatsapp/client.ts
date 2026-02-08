// ============================================
// WhatsApp Client — wwebjs with QR auth, session persistence
// ============================================

import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import qrcode from "qrcode-terminal";

let client: InstanceType<typeof Client> | null = null;
let isReady = false;
let qrCodeData: string | null = null;

export function getWhatsAppClient() {
  return client;
}

export function isWhatsAppReady() {
  return isReady;
}

export function getQRCode() {
  return qrCodeData;
}

export async function initWhatsAppClient(): Promise<void> {
  if (client) return;

  client = new Client({
    authStrategy: new LocalAuth({
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

  client.on("qr", (qr: string) => {
    qrCodeData = qr;
    console.log("[WhatsApp] QR Code received — scan with your phone:");
    qrcode.generate(qr, { small: true });
  });

  client.on("ready", () => {
    isReady = true;
    qrCodeData = null;
    console.log("[WhatsApp] Client is ready!");
  });

  client.on("authenticated", () => {
    console.log("[WhatsApp] Authenticated successfully");
  });

  client.on("auth_failure", (msg: string) => {
    isReady = false;
    console.error("[WhatsApp] Authentication failed:", msg);
  });

  client.on("disconnected", (reason: string) => {
    isReady = false;
    console.log("[WhatsApp] Disconnected:", reason);
    // Attempt reconnection after 10s
    setTimeout(() => {
      console.log("[WhatsApp] Attempting reconnection...");
      client?.initialize().catch(console.error);
    }, 10_000);
  });

  console.log("[WhatsApp] Initializing client...");
  await client.initialize();
}
