"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import type { Plan, Role } from "@repo/db";

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  requirePayment?: boolean;
  requireOnboarding?: boolean;
  requireRoles?: Role[];
  requirePlans?: Plan[];
  requirePermissions?: string[];
  requireActiveSchool?: boolean;
  requireDevice?: "mobile" | "desktop";
  fallbackPath?: string;
}

export function AuthGuard({
  children,
  requireAuth = true,
  requirePayment = false,
  requireOnboarding = false,
  requireRoles,
  requirePlans,
  requirePermissions,
  requireActiveSchool = false,
  requireDevice,
  requireFreshSession?: boolean;
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

    if (requireActiveSchool && school && !school.isActive) {
      router.push(fallbackPath);
    if (requireFreshSession) {
      checkAuth().then((valid) => {
        if (!valid) {
          router.push(fallbackPath);
        }
      });
    }
      return;
    }

    if (requireRoles?.length && user && !requireRoles.includes(user.role as Role)) {
      router.push(fallbackPath);
      return;
    }

    if (requirePlans?.length && school && !requirePlans.includes(school.plan as Plan)) {
      router.push(fallbackPath);
      return;
    }

    if (requirePermissions?.length) {
      const permissions = (user as unknown as { permissions?: string[] })?.permissions || [];
      const hasAll = requirePermissions.every((permission) => permissions.includes(permission));
      if (!hasAll) {
        router.push(fallbackPath);
        return;
      }
    }

    if (requireDevice) {
      const isMobile = typeof window !== "undefined"
        ? window.matchMedia("(max-width: 768px)").matches
        : false;
      const shouldAllow = requireDevice === "mobile" ? isMobile : !isMobile;
      if (!shouldAllow) {
        router.push(fallbackPath);
      }
    }
  }, [
    isLoading,
    isAuthenticated,
    school,
    requireAuth,
    requirePayment,
    requireOnboarding,
    requireRoles,
    requirePlans,
    requirePermissions,
    requireActiveSchool,
    requireDevice,
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

  if (requireActiveSchool && school && !school.isActive) {
    return null;
  }

  if (requireRoles?.length && user && !requireRoles.includes(user.role as Role)) {
    return null;
  }

  if (requirePlans?.length && school && !requirePlans.includes(school.plan as Plan)) {
    return null;
  }

  if (requirePermissions?.length) {
    const permissions = (user as unknown as { permissions?: string[] })?.permissions || [];
    const hasAll = requirePermissions.every((permission) => permissions.includes(permission));
    if (!hasAll) {
      return null;
    }
  }

  if (requireDevice) {
    const isMobile = typeof window !== "undefined"
      ? window.matchMedia("(max-width: 768px)").matches
      : false;
    const shouldAllow = requireDevice === "mobile" ? isMobile : !isMobile;
    if (!shouldAllow) {
      return null;
    }
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

// Role-based guard
export function RoleGuard({ children, roles }: { children: ReactNode; roles: Role[] }) {
  return (
    <AuthGuard
      requireAuth
      requireRoles={roles}
      fallbackPath="/dashboard"
    >
      {children}
    </AuthGuard>
  );
}

// Plan-based guard
export function PlanGuard({ children, plans }: { children: ReactNode; plans: Plan[] }) {
  return (
    <AuthGuard
      requireAuth
      requirePlans={plans}
      fallbackPath="/dashboard"
    >
      {children}
    </AuthGuard>
  );
}

// Permission-based guard
export function PermissionGuard({
  children,
  permissions,
}: {
  children: ReactNode;
  permissions: string[];
}) {
  return (
    <AuthGuard
      requireAuth
      requirePermissions={permissions}
      fallbackPath="/dashboard"
    >
      {children}
    </AuthGuard>
  );
}

// Active school guard
export function ActiveSchoolGuard({ children }: { children: ReactNode }) {
  return (
    <AuthGuard
      requireAuth
      requireActiveSchool
      fallbackPath="/dashboard"
    >
      {children}
    </AuthGuard>
  );
}

// Device-based guard
export function DeviceGuard({
  children,
  device,
}: {
  children: ReactNode;
  device: "mobile" | "desktop";
}) {
  return (
    <AuthGuard
      requireAuth
      requireDevice={device}
      fallbackPath="/dashboard"
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
    // Only redirect if we've finished loading AND user is authenticated
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

  // Don't render children if already authenticated
  if (isAuthenticated) {
    return null;
  }

  // Show children even while loading - unauthenticated users should always access login
  return <>{children}</>;
}
