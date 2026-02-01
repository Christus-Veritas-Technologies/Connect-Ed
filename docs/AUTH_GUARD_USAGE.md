# Auth Guard Documentation

This document explains how to use the authentication guard components and functions to protect pages and routes in the Connect-Ed application.

## Components & Functions Overview

### 1. Client-Side Auth Guard Component
**File**: `components/auth-guard.tsx`
**Type**: React Client Component

The main auth guard for protecting pages and content at the client-side level.

#### Usage:
```tsx
"use client";

import { AuthGuard } from "@/components/auth-guard";

export default function ProtectedPage() {
  return (
    <AuthGuard requireAuth requirePayment requireOnboarding>
      <div>Protected content here</div>
    </AuthGuard>
  );
}
```

#### Props:
- `children` (ReactNode): Content to protect
- `requireAuth` (boolean, default: true): Require authentication
- `requirePayment` (boolean, default: false): Require payment completion
- `requireOnboarding` (boolean, default: false): Require onboarding completion
- `fallbackPath` (string, default: "/auth/login"): Where to redirect if not authenticated

#### Specialized Guards:
- `DashboardGuard`: Requires auth, payment, and onboarding
- `GatedGuard`: Requires auth only (payment/onboarding not required)
- `GuestGuard`: Redirects authenticated users away from auth pages

---

### 2. Server-Side Auth Guard Component
**File**: `components/server-auth-guard.tsx`
**Type**: React Client Component (wraps server content)

Used to protect Server Components from unauthenticated access.

#### Usage:
```tsx
"use client";

import { ServerAuthGuard } from "@/components/server-auth-guard";

export default function ServerProtectedPage() {
  return (
    <ServerAuthGuard>
      <YourServerComponent />
    </ServerAuthGuard>
  );
}
```

---

### 3. Server-Side authGuard() Function (Web)
**File**: `lib/server-auth-guard.ts`
**Type**: Server Function

Use this function in Server Components to verify authentication and get user data.

#### Usage:
```tsx
import { authGuard } from "@/lib/server-auth-guard";

export default async function ServerPage() {
  // This will redirect to /auth/login if not authenticated
  const user = await authGuard();

  return (
    <div>
      <h1>Welcome, {user.sub}</h1>
      <p>School ID: {user.schoolId}</p>
      <p>Role: {user.role}</p>
      <p>Plan: {user.plan}</p>
    </div>
  );
}
```

#### Optional Version:
```tsx
import { authGuardOptional } from "@/lib/server-auth-guard";

export default async function FlexiblePage() {
  // Returns null instead of redirecting
  const user = await authGuardOptional();

  if (!user) {
    return <div>Not authenticated</div>;
  }

  return <div>Authenticated content</div>;
}
```

---

### 4. Server-Side authGuard() Function (Backend)
**File**: `apps/server/src/lib/auth.ts`
**Type**: Backend Auth Guard

Use this function in Hono routes to protect API endpoints.

#### Usage:
```typescript
import { authGuard } from "@repo/auth";

app.get("/api/protected", async (c) => {
  const user = await authGuard(c);

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // User is authenticated, proceed with logic
  return c.json({
    userId: user.sub,
    schoolId: user.schoolId,
    role: user.role,
  });
});
```

---

## Implementation Patterns

### Pattern 1: Protected Page (Client-Side)
```tsx
"use client";

import { AuthGuard, DashboardGuard } from "@/components/auth-guard";

export default function DashboardPage() {
  return (
    <DashboardGuard>
      <div>Dashboard content</div>
    </DashboardGuard>
  );
}
```

### Pattern 2: Protected Page (Server Component with Wrapper)
```tsx
import { ServerAuthGuard } from "@/components/server-auth-guard";
import YourServerComponent from "@/components/your-server-component";

export default function ServerPage() {
  return (
    <ServerAuthGuard>
      <YourServerComponent />
    </ServerAuthGuard>
  );
}
```

### Pattern 3: Server Component with Direct Auth Check
```tsx
import { authGuard } from "@/lib/server-auth-guard";

export default async function StrictServerPage() {
  const user = await authGuard();

  return (
    <div>
      <h1>Authenticated User</h1>
      <p>{user.sub}</p>
    </div>
  );
}
```

### Pattern 4: API Route Protection (Backend)
```typescript
import { authGuard } from "@repo/auth";

app.post("/api/students/create", async (c) => {
  const user = await authGuard(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  // Safe to proceed - user is authenticated
  const body = await c.req.json();
  // ... create student
});
```

---

## Redirect Behavior

| Component/Function | No Session | Behavior |
|-------------------|-----------|----------|
| `AuthGuard` | ✗ | Redirects to `/auth/login` |
| `ServerAuthGuard` | ✗ | Redirects to `/auth/login` |
| `authGuard()` (web) | ✗ | Redirects to `/(auth)/login` |
| `authGuardOptional()` | ✗ | Returns `null` |
| `authGuard()` (server) | ✗ | Returns `null` (HTTP 401) |

---

## Best Practices

1. **Use the right guard for the context**:
   - Client-side pages: Use `AuthGuard` or specialized guards
   - Server Components: Use `authGuard()` function
   - API Routes: Use backend `authGuard()`

2. **Prefer direct function calls over components** when possible for better error handling:
   ```tsx
   // Better for server components
   const user = await authGuard();
   // vs
   <ServerAuthGuard><Component /></ServerAuthGuard>
   ```

3. **Choose appropriate requirements**:
   - Dashboard pages: Use `DashboardGuard` (auth + payment + onboarding)
   - Gated pages (payment, onboarding): Use `GatedGuard` (auth only)
   - Auth pages: Use `GuestGuard` (redirect if authenticated)

4. **Handle null returns properly** in optional guards:
   ```tsx
   const user = await authGuardOptional();
   if (!user) {
     // Handle unauthenticated state
   }
   ```

---

## Token Payload Structure

All auth guards return the following token payload:
```typescript
interface AccessTokenPayload {
  sub: string;        // User ID
  schoolId: string;   // School ID
  role: Role;         // ADMIN | RECEPTIONIST | TEACHER
  plan: Plan;         // LITE | GROWTH | ENTERPRISE
  type: "access";
}
```

---
