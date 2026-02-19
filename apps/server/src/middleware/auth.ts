import { createMiddleware } from "hono/factory";
import { Role, Plan, db } from "@repo/db";
import { verifyAccessToken, verifyParentAccessToken, verifyStudentAccessToken, type AccessTokenPayload, type ParentAccessTokenPayload, type StudentAccessTokenPayload } from "../lib/auth";
import { errors, errorResponse } from "../lib/response";

// Extend Hono context with user info
declare module "hono" {
  interface ContextVariableMap {
    user: AccessTokenPayload;
    userId: string;
    schoolId: string;
    role: (typeof Role)[keyof typeof Role];
    plan: (typeof Plan)[keyof typeof Plan];
    // Parent context
    parentId: string;
    parent: ParentAccessTokenPayload;
    // Student context
    studentId: string;
    student: StudentAccessTokenPayload;
  }
}

// Authentication middleware - requires valid access token (for staff users)
export const requireAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return errors.unauthorized(c);
  }

  const token = authHeader.slice(7);
  const payload = await verifyAccessToken(token);

  if (!payload) {
    return errors.unauthorized(c);
  }

  // Set user info in context
  c.set("user", payload);
  c.set("userId", payload.sub);
  c.set("schoolId", payload.schoolId);
  c.set("role", payload.role);
  c.set("plan", payload.plan);

  await next();
});

// Parent authentication middleware
export const requireParentAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return errors.unauthorized(c);
  }

  const token = authHeader.slice(7);
  const payload = await verifyParentAccessToken(token);

  if (!payload) {
    return errors.unauthorized(c);
  }

  // Set parent info in context
  c.set("parent", payload);
  c.set("parentId", payload.sub);
  c.set("schoolId", payload.schoolId);
  c.set("plan", payload.plan);

  await next();
});

// Student authentication middleware
export const requireStudentAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return errors.unauthorized(c);
  }

  const token = authHeader.slice(7);
  const payload = await verifyStudentAccessToken(token);

  if (!payload) {
    return errors.unauthorized(c);
  }

  // Set student info in context
  c.set("student", payload);
  c.set("studentId", payload.sub);
  c.set("schoolId", payload.schoolId);
  c.set("plan", payload.plan);

  await next();
});

// Universal authentication middleware - accepts staff, parent, or student tokens
export const requireAnyAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return errors.unauthorized(c);
  }

  const token = authHeader.slice(7);

  // Try staff token first
  let payload = await verifyAccessToken(token);
  if (payload) {
    c.set("user", payload);
    c.set("userId", payload.sub);
    c.set("schoolId", payload.schoolId);
    c.set("role", payload.role);
    c.set("plan", payload.plan);
    await next();
    return;
  }

  // Try parent token
  const parentPayload = await verifyParentAccessToken(token);
  if (parentPayload) {
    c.set("parent", parentPayload);
    c.set("parentId", parentPayload.sub);
    c.set("userId", parentPayload.sub); // Set userId for notifications
    c.set("schoolId", parentPayload.schoolId);
    c.set("plan", parentPayload.plan);
    await next();
    return;
  }

  // Try student token
  const studentPayload = await verifyStudentAccessToken(token);
  if (studentPayload) {
    c.set("student", studentPayload);
    c.set("studentId", studentPayload.sub);
    c.set("userId", studentPayload.sub); // Set userId for notifications
    c.set("schoolId", studentPayload.schoolId);
    c.set("plan", studentPayload.plan);
    await next();
    return;
  }

  return errors.unauthorized(c);
});

// Role-based access middleware
export const requireRole = (...allowedRoles: Array<(typeof Role)[keyof typeof Role]>) =>
  createMiddleware(async (c, next) => {
    const role = c.get("role");

    if (!allowedRoles.includes(role)) {
      return errors.forbidden(c);
    }

    await next();
  });

// Plan-based access middleware
export const requirePlan = (...allowedPlans: Array<(typeof Plan)[keyof typeof Plan]>) =>
  createMiddleware(async (c, next) => {
    const plan = c.get("plan");

    if (!allowedPlans.includes(plan)) {
      return errors.planUpgradeRequired(c);
    }

    await next();
  });
// Email verification middleware - requires email to be verified
export const requireEmailVerified = createMiddleware(async (c, next) => {
  const userId = c.get("userId");
  
  if (!userId) {
    return errors.unauthorized(c, "User ID not found");
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true },
  });

  if (!user?.emailVerified) {
    return errorResponse(
      c,
      "EMAIL_NOT_VERIFIED",
      "Please verify your email address to access this feature",
      403
    );
  }

  await next();
});