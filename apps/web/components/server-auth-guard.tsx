"use client";

import { type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

interface ServerAuthGuardProps {
  children: ReactNode;
  fallbackPath?: string;
}

/**
 * Server-side auth guard component
 * Wraps components that should only be visible to authenticated users
 * Redirects to login if the user is not authenticated
 *
 * This component uses the client-side auth context for verification
 * Use this in Server Components that need to protect their content
 */
export function ServerAuthGuard({
  children,
  fallbackPath = "/(auth)/login",
}: ServerAuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="size-10 rounded-full border-4 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    router.push(fallbackPath);
    return null;
  }

  return <>{children}</>;
}
