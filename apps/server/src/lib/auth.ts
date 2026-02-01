import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { Plan, Role } from "@repo/db";
import type { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";

// Environment variables
const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET || "development-access-secret-min-32-chars!!"
);
const REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || "development-refresh-secret-min-32-chars!"
);

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

// Token payload types
export interface AccessTokenPayload extends JWTPayload {
  sub: string; // User ID
  schoolId: string;
  role: Role;
  plan: Plan;
  type: "access";
}

export interface RefreshTokenPayload extends JWTPayload {
  sub: string; // User ID
  version: number; // Token version for invalidation
  type: "refresh";
}

// Generate access token
export async function generateAccessToken(payload: {
  userId: string;
  schoolId: string;
  role: Role;
  plan: Plan;
}): Promise<string> {
  return new SignJWT({
    sub: payload.userId,
    schoolId: payload.schoolId,
    role: payload.role,
    plan: payload.plan,
    type: "access",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(ACCESS_SECRET);
}

// Generate refresh token
export async function generateRefreshToken(payload: {
  userId: string;
  tokenVersion: number;
}): Promise<string> {
  return new SignJWT({
    sub: payload.userId,
    version: payload.tokenVersion,
    type: "refresh",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(REFRESH_SECRET);
}

// Verify access token
export async function verifyAccessToken(
  token: string
): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET);
    if (payload.type !== "access") return null;
    return payload as AccessTokenPayload;
  } catch {
    return null;
  }
}

// Verify refresh token
export async function verifyRefreshToken(
  token: string
): Promise<RefreshTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET);
    if (payload.type !== "refresh") return null;
    return payload as RefreshTokenPayload;
  } catch {
    return null;
  }
}

// Cookie management
const REFRESH_TOKEN_COOKIE = "refresh_token";

export function setRefreshTokenCookie(c: Context, token: string) {
  setCookie(c, REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export function getRefreshTokenCookie(c: Context): string | undefined {
  return getCookie(c, REFRESH_TOKEN_COOKIE);
}

export function clearRefreshTokenCookie(c: Context) {
  deleteCookie(c, REFRESH_TOKEN_COOKIE, { path: "/" });
}

// Get current user from request headers
export async function getCurrentUser(
  c: Context
): Promise<AccessTokenPayload | null> {
  const authHeader = c.req.header("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  return verifyAccessToken(token);
}

// Plan-based feature access
export const PLAN_FEATURES = {
  LITE: {
    hasTeachers: false,
    hasStudentPortal: false,
    hasParentPortal: false,
    emailQuota: 200,
    whatsappQuota: 200,
    smsQuota: 100,
  },
  GROWTH: {
    hasTeachers: true,
    hasStudentPortal: false,
    hasParentPortal: false,
    emailQuota: 500,
    whatsappQuota: 500,
    smsQuota: 300,
  },
  ENTERPRISE: {
    hasTeachers: true,
    hasStudentPortal: true,
    hasParentPortal: true,
    emailQuota: 1500,
    whatsappQuota: 1500,
    smsQuota: 750,
  },
} as const;

// Check if plan has access to a feature
export function planHasFeature(
  plan: Plan,
  feature: keyof (typeof PLAN_FEATURES)["LITE"]
): boolean {
  return !!PLAN_FEATURES[plan][feature];
}

/**
 * Auth guard middleware for Hono routes
 * Verifies the user has a valid session and returns the token payload
 * If no valid session exists, returns a 401 Unauthorized response
 *
 * Usage in routes:
 *   const payload = await authGuard(c);
 *   if (!payload) return c.json({ error: "Unauthorized" }, 401);
 *
 * @param c - Hono context
 * @returns The access token payload containing user and school info, or null if unauthorized
 */
export async function authGuard(c: Context): Promise<AccessTokenPayload | null> {
  // Try to get token from Authorization header
  const user = await getCurrentUser(c);

  if (!user) {
    return null;
  }

  return user;
}
