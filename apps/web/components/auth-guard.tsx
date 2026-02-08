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

    // If authenticated, check payment status (admin only — invited users skip this)
    if (requirePayment && school && !school.signupFeePaid && user?.role === "ADMIN") {
      router.push("/payment");
      return;
    }

    // If payment is done, check school-level onboarding (admin only)
    if (requireOnboarding && school && !school.onboardingComplete && user?.role === "ADMIN") {
      router.push("/onboarding");
      return;
    }

    // Check user-level onboarding (all roles except RECEPTIONIST)
    if (requireOnboarding && user && !user.onboardingComplete && user.role !== "RECEPTIONIST") {
      router.push("/onboarding");
      return;
    }
  }, [
    isLoading,
    isAuthenticated,
    user,
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

  if (requirePayment && school && !school.signupFeePaid && user?.role === "ADMIN") {
    return null;
  }

  if (requireOnboarding && school && !school.onboardingComplete && user?.role === "ADMIN") {
    return null;
  }

  if (requireOnboarding && user && !user.onboardingComplete && user.role !== "RECEPTIONIST") {
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
  const { isAuthenticated, isLoading, user, school } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect if we've finished loading AND user is authenticated
    if (isLoading) return;

    if (isAuthenticated && school && user) {
      // Admin flow: payment → school onboarding → user onboarding → dashboard
      if (user.role === "ADMIN") {
        if (!school.signupFeePaid) {
          router.push("/payment");
        } else if (!school.onboardingComplete || !user.onboardingComplete) {
          router.push("/onboarding");
        } else {
          router.push("/dashboard");
        }
        return;
      }

      // Non-admin: check user-level onboarding (except RECEPTIONIST)
      if (!user.onboardingComplete && user.role !== "RECEPTIONIST") {
        router.push("/onboarding");
      } else {
        router.push("/dashboard");
      }
    }
  }, [isLoading, isAuthenticated, user, school, router]);

  // Don't render children if already authenticated
  if (isAuthenticated) {
    return null;
  }

  // Show children even while loading - unauthenticated users should always access login
  return <>{children}</>;
}
