import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createBunWebSocket } from "hono/bun";
import type { ServerWebSocket } from "bun";
import { db } from "@repo/db";

// WebSocket manager
import {
  joinRoom,
  leaveRoom,
  handleIncomingMessage,
  type WsData,
} from "./lib/chat-manager";
import {
  verifyAccessToken,
  verifyParentAccessToken,
  verifyStudentAccessToken,
} from "./lib/auth";

// Import routes
import auth from "./routes/auth";
import students from "./routes/students";
import parents from "./routes/parents";
import fees from "./routes/fees";
import classes from "./routes/classes";
import announcements from "./routes/announcements";
import teachers from "./routes/teachers";
import subjects from "./routes/subjects";
import reports from "./routes/reports";
import dashboard from "./routes/dashboard";
import onboarding from "./routes/onboarding";
import onboardingProgress from "./routes/onboarding-progress";
import settings from "./routes/settings";
import payments from "./routes/payments";
import messages from "./routes/messages";
import webhooks from "./routes/webhooks";
import notifications from "./routes/notifications";
import exams from "./routes/exams";
import studentReports from "./routes/student-reports";
import receptionists from "./routes/receptionists";
import chat from "./routes/chat";

// Bun WebSocket helper for Hono
const { upgradeWebSocket, websocket } = createBunWebSocket<WsData>();

const app = new Hono();

// Global middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 600,
  })
);

// Health check
app.get("/", (c) => {
  return c.json({
    name: "Connect-Ed API",
    version: "1.0.0",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

// Mount routes
app.route("/auth", auth);
app.route("/students", students);
app.route("/parents", parents);
app.route("/fees", fees);
app.route("/classes", classes);
app.route("/announcements", announcements);
app.route("/teachers", teachers);
app.route("/subjects", subjects);
app.route("/reports", reports);
app.route("/dashboard", dashboard);
app.route("/onboarding", onboarding);
app.route("/onboarding-progress", onboardingProgress);
app.route("/settings", settings);
app.route("/payments", payments);
app.route("/messages", messages);
app.route("/webhooks", webhooks);
app.route("/notifications", notifications);
app.route("/exams", exams);
app.route("/student-reports", studentReports);
app.route("/receptionists", receptionists);
app.route("/chat", chat);

// ─── WebSocket upgrade endpoint ─────────────────────────────
// URL: /ws/chat?token=<JWT>&classId=<classId>
app.get(
  "/ws/chat",
  upgradeWebSocket(async (c) => {
    const token = c.req.query("token") || "";
    const classId = c.req.query("classId") || "";

    // Authenticate the user by trying all 3 token types
    let wsData: WsData | null = null;

    // Try staff token
    const staffPayload = await verifyAccessToken(token);
    if (staffPayload) {
      const user = await db.user.findUnique({
        where: { id: staffPayload.sub },
        select: { id: true, name: true, role: true },
      });
      if (user) {
        wsData = {
          classId,
          memberId: user.id,
          memberType: "USER",
          role: user.role,
          name: user.name,
          schoolId: staffPayload.schoolId,
        };
      }
    }

    // Try parent token
    if (!wsData) {
      const parentPayload = await verifyParentAccessToken(token);
      if (parentPayload) {
        const parent = await db.parent.findUnique({
          where: { id: parentPayload.sub },
          select: { id: true, name: true, children: { select: { id: true } } },
        });
        if (parent) {
          wsData = {
            classId,
            memberId: parent.id,
            memberType: "PARENT",
            role: "PARENT",
            name: parent.name,
            schoolId: parentPayload.schoolId,
            childrenIds: parent.children.map((ch) => ch.id),
          };
        }
      }
    }

    // Try student token
    if (!wsData) {
      const studentPayload = await verifyStudentAccessToken(token);
      if (studentPayload) {
        const student = await db.student.findUnique({
          where: { id: studentPayload.sub },
          select: { id: true, firstName: true, lastName: true },
        });
        if (student) {
          wsData = {
            classId,
            memberId: student.id,
            memberType: "STUDENT",
            role: "STUDENT",
            name: `${student.firstName} ${student.lastName}`,
            schoolId: studentPayload.schoolId,
          };
        }
      }
    }

    return {
      onOpen(_event, ws) {
        const raw = ws.raw as ServerWebSocket<WsData> | undefined;
        if (!raw || !wsData) {
          ws.close(1008, "Unauthorized");
          return;
        }
        // Attach data to the underlying Bun WS
        Object.assign(raw.data, wsData);
        joinRoom(raw);
      },
      onMessage(event, ws) {
        const raw = ws.raw as ServerWebSocket<WsData> | undefined;
        if (!raw) return;
        handleIncomingMessage(raw, typeof event.data === "string" ? event.data : event.data.toString());
      },
      onClose(_event, ws) {
        const raw = ws.raw as ServerWebSocket<WsData> | undefined;
        if (raw) leaveRoom(raw);
      },
    };
  })
);

// Error handling
app.onError((err, c) => {
  // Log all errors with timestamp
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ❌ Unhandled error:`, err);
  
  // Enhanced logging for validation errors
  if (err instanceof Error && err.message.includes("Validation")) {
    console.error(`[${timestamp}] Validation error details:`, err.message);
  }
  
  return c.json(
    {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: process.env.NODE_ENV === "production"
          ? "An unexpected error occurred"
          : err.message,
      },
    },
    500
  );
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Route not found",
      },
    },
    404
  );
});

const port = parseInt(process.env.PORT || "3001");

console.log(`
🚀 Connect-Ed API Server
   Port: ${port}
   Environment: ${process.env.NODE_ENV || "development"}
   CORS: ${process.env.CORS_ORIGIN || "http://localhost:3000"}
`);

export default {
  port,
  fetch: app.fetch,
  websocket,
};
