import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessToken, roleHasAccess, PLAN_FEATURES } from "./lib/auth";
import type { Plan } from "@repo/db";

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  "/auth/login",
  "/auth/signup",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/refresh",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/webhooks",
];

// Routes that require auth but allow unpaid schools
const GATED_ROUTES = ["/payment", "/onboarding"];

// Routes that require Growth+ plan
const GROWTH_ROUTES = ["/dashboard/classes", "/dashboard/teachers"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Get token from Authorization header
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  // For API routes, validate token
  if (pathname.startsWith("/api/")) {
    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Invalid or expired token" } },
        { status: 401 }
      );
    }

    // Check role-based access
    if (!roleHasAccess(payload.role, pathname)) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    // Check plan-based access for certain routes
    if (pathname.startsWith("/api/classes") || pathname.startsWith("/api/teachers")) {
      if (!PLAN_FEATURES[payload.plan as Plan].hasTeachers) {
        return NextResponse.json(
          { success: false, error: { code: "PLAN_UPGRADE_REQUIRED", message: "This feature requires Growth plan or higher" } },
          { status: 403 }
        );
      }
    }

    // Add user info to request headers for API routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", payload.sub);
    requestHeaders.set("x-school-id", payload.schoolId);
    requestHeaders.set("x-user-role", payload.role);
    requestHeaders.set("x-school-plan", payload.plan);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // For page routes, check for auth cookie (client handles token)
  const refreshToken = request.cookies.get("refresh_token");

  // If no auth, redirect to login
  if (!refreshToken && !GATED_ROUTES.some((route) => pathname.startsWith(route))) {
    if (!pathname.startsWith("/auth")) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // If authenticated and trying to access auth pages, redirect to dashboard
  if (refreshToken && pathname.startsWith("/auth")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
