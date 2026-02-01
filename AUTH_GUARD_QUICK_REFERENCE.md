# Auth Guard Quick Reference

## Components & Functions Created

### 1️⃣ Client-Side Auth Guard (Updated)
📁 `apps/web/components/auth-guard.tsx`
- `AuthGuard` - Main flexible guard component
- `DashboardGuard` - Full protection (auth + payment + onboarding)
- `GatedGuard` - Authentication only
- `GuestGuard` - Redirects authenticated users away

### 2️⃣ Server-Side Auth Guard Component ✨ NEW
📁 `apps/web/components/server-auth-guard.tsx`
- `ServerAuthGuard` - Wraps server components for authentication

### 3️⃣ Web Server Auth Guard Function ✨ NEW
📁 `apps/web/lib/server-auth-guard.ts`
- `authGuard()` - Server function, redirects if not authenticated
- `authGuardOptional()` - Server function, returns null if not authenticated

### 4️⃣ Backend Auth Guard Function ✨ ADDED
📁 `apps/server/src/lib/auth.ts`
- `authGuard(c)` - API route protection

## 🚀 Quick Usage

### Protect a Page (Client)
```tsx
"use client";
import { DashboardGuard } from "@/components/auth-guard";

export default function Page() {
  return <DashboardGuard><Content /></DashboardGuard>;
}
```

### Protect a Server Component
```tsx
import { authGuard } from "@/lib/server-auth-guard";

export default async function Page() {
  const user = await authGuard(); // Redirects if not authed
  return <div>{user.sub}</div>;
}
```

### Protect an API Route
```ts
import { authGuard } from "@repo/auth";

app.post("/api/endpoint", async (c) => {
  const user = await authGuard(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  // Safe to proceed
});
```

## 📍 Applied To

- ✅ Login page - Uses `GuestGuard` to prevent authenticated users
- ✅ Dashboard page - Uses `DashboardGuard` for full protection

## 📚 Documentation

- **[AUTH_GUARD_USAGE.md](./docs/AUTH_GUARD_USAGE.md)** - Complete usage guide
- **[AUTH_GUARD_EXAMPLES.md](./AUTH_GUARD_EXAMPLES.md)** - Practical examples
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - What was created

## ✨ Key Features

✅ No middleware - Protection at page level
✅ Flexible requirements - Mix and match auth, payment, onboarding  
✅ Consistent redirects - All use `/(auth)/login`
✅ Type-safe - Full TypeScript support
✅ Both client & server - React components + server functions + API guards
✅ Well documented - Comprehensive examples and guides

## 🔄 Redirect Paths

| Type | Redirect |
|------|----------|
| Web Client | `/(auth)/login` |
| Web Server | `/(auth)/login` |
| Backend API | HTTP 401 |

## 📦 Token Payload

```typescript
{
  sub: string;        // User ID
  schoolId: string;   // School ID
  role: Role;         // ADMIN | RECEPTIONIST | TEACHER
  plan: Plan;         // LITE | GROWTH | ENTERPRISE
}
```

---

**All components follow page-level protection pattern (no middleware).**
