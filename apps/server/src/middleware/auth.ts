import { createMiddleware } from "hono/factory";
import type { Plan, Role } from "@repo/db";
import { verifyAccessToken, type AccessTokenPayload } from "../lib/auth";
import { errors } from "../lib/response";

// Extend Hono context with user info
declare module "hono" {
  interface ContextVariableMap {
    user: AccessTokenPayload;
    userId: string;
    schoolId: string;
    role: Role;
    plan: Plan;
  }
}

// Authentication middleware - requires valid access token
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
