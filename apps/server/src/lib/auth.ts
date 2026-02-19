import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { Role, Plan } from "@repo/db";
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
  role: (typeof Role)[keyof typeof Role];
  plan: (typeof Plan)[keyof typeof Plan];
  type: "access";
}

export interface RefreshTokenPayload extends JWTPayload {
  sub: string; // User ID
  version: number; // Token version for invalidation
  type: "refresh";
}

export interface ParentAccessTokenPayload extends JWTPayload {
  sub: string; // Parent ID
  schoolId: string;
  plan: (typeof Plan)[keyof typeof Plan];
  type: "parent_access";
}

export interface ParentRefreshTokenPayload extends JWTPayload {
  sub: string; // Parent ID
  version: number;
  type: "parent_refresh";
}

export interface StudentAccessTokenPayload extends JWTPayload {
  sub: string; // Student ID
  schoolId: string;
  plan: (typeof Plan)[keyof typeof Plan];
  type: "student_access";
}

export interface StudentRefreshTokenPayload extends JWTPayload {
  sub: string; // Student ID
  version: number;
  type: "student_refresh";
}

// Generate access token
export async function generateAccessToken(payload: {
  userId: string;
  schoolId: string;
  role: (typeof Role)[keyof typeof Role];
  plan: (typeof Plan)[keyof typeof Plan];
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

// ============================================
// PARENT AUTH FUNCTIONS
// ============================================

// Generate parent access token
export async function generateParentAccessToken(payload: {
  parentId: string;
  schoolId: string;
  plan: (typeof Plan)[keyof typeof Plan];
}): Promise<string> {
  return new SignJWT({
    sub: payload.parentId,
    schoolId: payload.schoolId,
    plan: payload.plan,
    type: "parent_access",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(ACCESS_SECRET);
}

// Generate parent refresh token
export async function generateParentRefreshToken(payload: {
  parentId: string;
  tokenVersion: number;
}): Promise<string> {
  return new SignJWT({
    sub: payload.parentId,
    version: payload.tokenVersion,
    type: "parent_refresh",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(REFRESH_SECRET);
}

// Verify parent access token
export async function verifyParentAccessToken(
  token: string
): Promise<ParentAccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET);
    if (payload.type !== "parent_access") return null;
    return payload as ParentAccessTokenPayload;
  } catch {
    return null;
  }
}

// Verify parent refresh token
export async function verifyParentRefreshToken(
  token: string
): Promise<ParentRefreshTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET);
    if (payload.type !== "parent_refresh") return null;
    return payload as ParentRefreshTokenPayload;
  } catch {
    return null;
  }
}

// ============================================
// STUDENT AUTH FUNCTIONS
// ============================================

// Generate student access token
export async function generateStudentAccessToken(payload: {
  studentId: string;
  schoolId: string;
  plan: (typeof Plan)[keyof typeof Plan];
}): Promise<string> {
  return new SignJWT({
    sub: payload.studentId,
    schoolId: payload.schoolId,
    plan: payload.plan,
    type: "student_access",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(ACCESS_SECRET);
}

// Generate student refresh token
export async function generateStudentRefreshToken(payload: {
  studentId: string;
  tokenVersion: number;
}): Promise<string> {
  return new SignJWT({
    sub: payload.studentId,
    version: payload.tokenVersion,
    type: "student_refresh",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(REFRESH_SECRET);
}

// Verify student access token
export async function verifyStudentAccessToken(
  token: string
): Promise<StudentAccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET);
    if (payload.type !== "student_access") return null;
    return payload as StudentAccessTokenPayload;
  } catch {
    return null;
  }
}

// Verify student refresh token
export async function verifyStudentRefreshToken(
  token: string
): Promise<StudentRefreshTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET);
    if (payload.type !== "student_refresh") return null;
    return payload as StudentRefreshTokenPayload;
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
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    path: "/",
    domain: process.env.NODE_ENV === "production" ? ".connect-ed.co.zw" : undefined,
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
    studentLimit: 300,
  },
  GROWTH: {
    hasTeachers: true,
    hasStudentPortal: false,
    hasParentPortal: false,
    emailQuota: 500,
    whatsappQuota: 500,
    studentLimit: 800,
  },
  ENTERPRISE: {
    hasTeachers: true,
    hasStudentPortal: true,
    hasParentPortal: true,
    emailQuota: 1500,
    whatsappQuota: 1500,
    studentLimit: 0, // unlimited / custom
  },
} as const;

// Check if plan has access to a feature
export function planHasFeature(
  plan: (typeof Plan)[keyof typeof Plan],
  feature: keyof (typeof PLAN_FEATURES)["LITE"]
): boolean {
  return !!PLAN_FEATURES[plan as keyof typeof PLAN_FEATURES][feature];
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
/**
 * Email verification guard middleware for Hono routes
 * Checks if the user has verified their email address
 * Should be used after authGuard
 *
 * Usage in routes:
 *   const payload = await authGuard(c);
 *   if (!payload) return c.json({ error: "Unauthorized" }, 401);
 *   
 *   const isVerified = await emailVerifiedGuard(c, payload.sub);
 *   if (!isVerified) return c.json({ error: "Email not verified" }, 403);
 *
 * @param c - Hono context
 * @param userId - The user ID from the JWT payload
 * @returns True if email is verified, false otherwise
 */
export async function emailVerifiedGuard(c: Context, userId: string): Promise<boolean> {
  // Import db here to avoid circular dependency
  const { db } = await import("@repo/db");
  
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true },
  });

  return user?.emailVerified ?? false;
}