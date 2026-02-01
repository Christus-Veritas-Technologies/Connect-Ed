"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken, type AccessTokenPayload } from "./auth";

/**
 * Server-side auth guard function
 * Verifies the user has a valid session and returns the token payload
 * If no valid session exists, redirects to the login page
 *
 * @throws Will redirect to /auth/login if no valid session
 * @returns The access token payload containing user and school info
 */
export async function authGuard(): Promise<AccessTokenPayload> {
  const cookieStore = await cookies();

  // Try to get the access token from the Authorization header
  // In Next.js server functions, we need to get it from cookies since it's typically stored there
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) {
    redirect("/(auth)/login");
  }

  // Verify the token
  const payload = await verifyAccessToken(accessToken);

  if (!payload) {
    redirect("/(auth)/login");
  }

  return payload;
}

/**
 * Optional guard - returns null if not authenticated instead of redirecting
 * Useful for components that handle their own unauthenticated state
 */
export async function authGuardOptional(): Promise<AccessTokenPayload | null> {
  try {
    return await authGuard();
  } catch {
    return null;
  }
}
