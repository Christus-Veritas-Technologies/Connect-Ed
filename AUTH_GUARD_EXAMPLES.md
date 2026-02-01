# Auth Guard Implementation Examples

This file provides practical examples for implementing auth guards across different page types in the Connect-Ed application.

## Example 1: Protected Dashboard Page (Client-Side)

```tsx
// app/(dashboard)/page.tsx
"use client";

import { DashboardGuard } from "@/components/auth-guard";

export default function DashboardPage() {
  return (
    <DashboardGuard>
      <DashboardPageContent />
    </DashboardGuard>
  );
}

function DashboardPageContent() {
  // Component content here
  // Only renders if: authenticated + payment done + onboarding complete
  return <div>Dashboard content</div>;
}
```

## Example 2: Gated Page (Authentication Only)

```tsx
// app/(gated)/payment/page.tsx
"use client";

import { GatedGuard } from "@/components/auth-guard";

export default function PaymentPage() {
  return (
    <GatedGuard>
      <PaymentPageContent />
    </GatedGuard>
  );
}

function PaymentPageContent() {
  // Renders if authenticated, even if payment not done
  return <div>Payment content</div>;
}
```

## Example 3: Public Page for Guests (Client-Side)

```tsx
// app/(auth)/login/page.tsx
"use client";

import { GuestGuard } from "@/components/auth-guard";

export default function LoginPage() {
  return (
    <GuestGuard>
      <LoginPageContent />
    </GuestGuard>
  );
}

function LoginPageContent() {
  // Only renders if NOT authenticated
  // Redirects authenticated users to appropriate page
  return <div>Login form</div>;
}
```

## Example 4: Server Component with Auth Guard Function

```tsx
// app/(dashboard)/students/page.tsx
import { authGuard } from "@/lib/server-auth-guard";

export default async function StudentsPage() {
  // Automatically redirects to /(auth)/login if not authenticated
  const user = await authGuard();

  // Access user information
  const userId = user.sub;
  const schoolId = user.schoolId;
  const userRole = user.role;
  const schoolPlan = user.plan;

  return (
    <div>
      <h1>Students - {schoolId}</h1>
      <p>Loaded for user: {userId}</p>
    </div>
  );
}
```

## Example 5: Server Component with Optional Auth

```tsx
// app/public-page/page.tsx
import { authGuardOptional } from "@/lib/server-auth-guard";

export default async function PublicPage() {
  // Returns null if not authenticated (doesn't redirect)
  const user = await authGuardOptional();

  if (!user) {
    return <div>Please sign in to see personalized content</div>;
  }

  return <div>Hello, {user.sub}!</div>;
}
```

## Example 6: Protected API Route (Backend)

```typescript
// apps/server/src/routes/students.ts
import { Hono } from "hono";
import { authGuard } from "@repo/auth";

const app = new Hono();

// List students for authenticated school
app.get("/students", async (c) => {
  const user = await authGuard(c);
  
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Now safe to access user data
  const schoolId = user.schoolId;
  const userId = user.sub;

  // Fetch students for this school
  // const students = await db.student.findMany({
  //   where: { schoolId }
  // });

  return c.json({ students: [], schoolId });
});

// Create new student (admin only)
app.post("/students", async (c) => {
  const user = await authGuard(c);
  
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Check role if needed
  if (user.role !== "ADMIN") {
    return c.json({ error: "Forbidden" }, 403);
  }

  const body = await c.req.json();
  
  // Create student
  // const student = await db.student.create({
  //   data: {
  //     schoolId: user.schoolId,
  //     ...body
  //   }
  // });

  return c.json({ success: true });
});

export default app;
```

## Example 7: Custom Auth Guard Wrapper

```tsx
// components/custom-guards.tsx
"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

interface TeacherGuardProps {
  children: ReactNode;
}

/**
 * Custom guard that requires TEACHER role
 */
export function TeacherGuard({ children }: TeacherGuardProps) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push("/(auth)/login");
      return;
    }

    if (user?.role !== "TEACHER") {
      router.push("/dashboard"); // Redirect non-teachers
      return;
    }
  }, [isLoading, isAuthenticated, user?.role, router]);

  if (isLoading || !isAuthenticated || user?.role !== "TEACHER") {
    return null;
  }

  return <>{children}</>;
}

/**
 * Custom guard that requires specific plan
 */
export function PlanGuard({
  children,
  requiredPlan,
}: {
  children: ReactNode;
  requiredPlan: "LITE" | "GROWTH" | "ENTERPRISE";
}) {
  const { isAuthenticated, school, isLoading } = useAuth();
  const router = useRouter();

  const planTiers = { LITE: 0, GROWTH: 1, ENTERPRISE: 2 };

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !school) {
      router.push("/(auth)/login");
      return;
    }

    if (
      planTiers[school.plan] < planTiers[requiredPlan]
    ) {
      router.push("/upgrade"); // Redirect to upgrade page
      return;
    }
  }, [isLoading, isAuthenticated, school, requiredPlan, router]);

  if (
    isLoading ||
    !isAuthenticated ||
    !school ||
    planTiers[school.plan] < planTiers[requiredPlan]
  ) {
    return null;
  }

  return <>{children}</>;
}
```

## Example 8: Usage of Custom Guards

```tsx
// app/(dashboard)/teachers/page.tsx
"use client";

import { TeacherGuard } from "@/components/custom-guards";

export default function TeachersPage() {
  return (
    <TeacherGuard>
      <div>Teacher management page</div>
    </TeacherGuard>
  );
}
```

```tsx
// app/(dashboard)/advanced-reports/page.tsx
"use client";

import { PlanGuard } from "@/components/custom-guards";

export default function AdvancedReportsPage() {
  return (
    <PlanGuard requiredPlan="ENTERPRISE">
      <div>Advanced reports (Enterprise only)</div>
    </PlanGuard>
  );
}
```

## Example 9: Combined Guards Pattern

```tsx
// app/(dashboard)/admin/page.tsx
"use client";

import { useAuth } from "@/lib/auth-context";
import { DashboardGuard } from "@/components/auth-guard";
import { TeacherGuard } from "@/components/custom-guards";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user?.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [user?.role, isLoading, router]);

  return (
    <DashboardGuard>
      {user?.role === "ADMIN" && (
        <div>Admin-only content</div>
      )}
    </DashboardGuard>
  );
}
```

## Best Practices Summary

1. **Use the right guard for your context**
   - Client pages: `AuthGuard`, `DashboardGuard`, `GatedGuard`
   - Server components: `authGuard()` function
   - API routes: backend `authGuard()` function
   - Public pages: `GuestGuard` or optional auth

2. **Wrap at the lowest necessary level**
   ```tsx
   // Good - wrap just the protected part
   export default function Page() {
     return (
       <div>
         <PublicHeader />
         <AuthGuard>
           <ProtectedContent />
         </AuthGuard>
       </div>
     );
   }

   // Avoid - wrapping entire page
   export default function Page() {
     return (
       <AuthGuard>
         <div>...</div>
       </AuthGuard>
     );
   }
   ```

3. **Use server functions when possible**
   ```tsx
   // Preferred for server components
   const user = await authGuard();
   
   // vs wrapped component (more overhead)
   <ServerAuthGuard><YourComponent /></ServerAuthGuard>
   ```

4. **Handle different user states**
   ```tsx
   if (isLoading) return <LoadingSpinner />;
   if (!isAuthenticated) return <LoginPrompt />;
   return <ProtectedContent />;
   ```

5. **Check permissions, not just authentication**
   - Use role-based guards for admin pages
   - Use plan-based guards for premium features
   - Always verify on the backend before sensitive operations
