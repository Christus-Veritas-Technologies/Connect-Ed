import { createMiddleware } from "hono/factory";
import type { Plan, Role } from "@repo/db";
import { verifyAccessToken, verifyParentAccessToken, verifyStudentAccessToken, type AccessTokenPayload, type ParentAccessTokenPayload, type StudentAccessTokenPayload } from "../lib/auth";
import { errors } from "../lib/response";

// Extend Hono context with user info
declare module "hono" {
  interface ContextVariableMap {
    user: AccessTokenPayload;
    userId: string;
    schoolId: string;
    role: Role;
    plan: Plan;
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

// Role-based access middleware
export const requireRole = (...allowedRoles: Role[]) =>
  createMiddleware(async (c, next) => {
    const role = c.get("role");

    if (!allowedRoles.includes(role)) {
      return errors.forbidden(c);
    }

    await next();
  });

// Plan-based access middleware
export const requirePlan = (...allowedPlans: Plan[]) =>
  createMiddleware(async (c, next) => {
    const plan = c.get("plan");

    if (!allowedPlans.includes(plan)) {
      return errors.planUpgradeRequired(c);
    }

    await next();
  });
