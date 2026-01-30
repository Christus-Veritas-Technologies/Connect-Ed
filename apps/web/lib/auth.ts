import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { type Plan, type Role } from "@repo/db";

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

export async function setRefreshTokenCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function getRefreshTokenCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
}

export async function clearRefreshTokenCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
}

// Get current user from request
export async function getCurrentUser(
  request: Request
): Promise<AccessTokenPayload | null> {
  const authHeader = request.headers.get("authorization");
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

// Role-based route access
export const ROLE_ACCESS = {
  "/dashboard/settings": ["ADMIN"],
  "/dashboard/teachers": ["ADMIN"],
  "/dashboard/users": ["ADMIN"],
  "/dashboard/classes": ["ADMIN", "TEACHER"],
  "/dashboard/students": ["ADMIN", "RECEPTIONIST", "TEACHER"],
  "/dashboard/fees": ["ADMIN", "RECEPTIONIST"],
  "/dashboard/expenses": ["ADMIN", "RECEPTIONIST"],
  "/dashboard/reports": ["ADMIN", "RECEPTIONIST"],
} as const;

// Check if role has access to a route
export function roleHasAccess(role: Role, path: string): boolean {
  for (const [routePattern, allowedRoles] of Object.entries(ROLE_ACCESS)) {
    if (path.startsWith(routePattern)) {
      return (allowedRoles as readonly string[]).includes(role);
    }
  }
  // Default: allow access if no specific rule
  return true;
}
