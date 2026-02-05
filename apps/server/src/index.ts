import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

// Import routes
import auth from "./routes/auth";
import students from "./routes/students";
import parents from "./routes/parents";
import fees from "./routes/fees";
import expenses from "./routes/expenses";
import classes from "./routes/classes";
import teachers from "./routes/teachers";
import reports from "./routes/reports";
import dashboard from "./routes/dashboard";
import onboarding from "./routes/onboarding";
import settings from "./routes/settings";
import payments from "./routes/payments";
import messages from "./routes/messages";
import webhooks from "./routes/webhooks";
import notifications from "./routes/notifications";

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
app.route("/expenses", expenses);
app.route("/classes", classes);
app.route("/teachers", teachers);
app.route("/reports", reports);
app.route("/dashboard", dashboard);
app.route("/onboarding", onboarding);
app.route("/settings", settings);
app.route("/payments", payments);
app.route("/messages", messages);
app.route("/webhooks", webhooks);
app.route("/notifications", notifications);

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
};
