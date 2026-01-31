"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  requirePayment?: boolean;
  requireOnboarding?: boolean;
  fallbackPath?: string;
}

export function AuthGuard({
  children,
  requireAuth = true,
  requirePayment = false,
  requireOnboarding = false,
  fallbackPath = "/auth/login",
}: AuthGuardProps) {
  const { isAuthenticated, isLoading, user, school } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    // Check authentication
    if (requireAuth && !isAuthenticated) {
      router.push(fallbackPath);
      return;
    }

    // If authenticated, check payment status
    if (requirePayment && school && !school.signupFeePaid) {
      router.push("/payment");
      return;
    }

    // If payment is done, check onboarding
    if (requireOnboarding && school && !school.onboardingComplete) {
      router.push("/onboarding");
      return;
    }
  }, [
    isLoading,
    isAuthenticated,
    school,
    requireAuth,
    requirePayment,
    requireOnboarding,
    fallbackPath,
    router,
  ]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="size-10 rounded-full border-4 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  // Don't render children if checks fail
  if (requireAuth && !isAuthenticated) {
    return null;
  }

  if (requirePayment && school && !school.signupFeePaid) {
    return null;
  }

  if (requireOnboarding && school && !school.onboardingComplete) {
    return null;
  }

  return <>{children}</>;
}

// Specialized guards for common use cases
export function DashboardGuard({ children }: { children: ReactNode }) {
  return (
    <AuthGuard
      requireAuth
      requirePayment
      requireOnboarding
      fallbackPath="/auth/login"
    >
      {children}
    </AuthGuard>
  );
}

export function GatedGuard({ children }: { children: ReactNode }) {
  return (
    <AuthGuard
      requireAuth
      requirePayment={false}
      requireOnboarding={false}
      fallbackPath="/auth/login"
    >
      {children}
    </AuthGuard>
  );
}

// Guest guard - redirects authenticated users away from auth pages
export function GuestGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, school } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && school) {
      // Redirect based on school status
      if (!school.signupFeePaid) {
        router.push("/payment");
      } else if (!school.onboardingComplete) {
        router.push("/onboarding");
      } else {
        router.push("/dashboard");
      }
    }
  }, [isLoading, isAuthenticated, school, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="size-10 rounded-full border-4 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  // Don't render children if already authenticated
  if (isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
