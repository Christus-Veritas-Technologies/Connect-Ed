# Connect-Ed Authentication Flow

## Overview

Connect-Ed uses a custom JWT-based authentication system with refresh tokens for secure, stateless authentication.

## Token Structure

### Access Token

- **Expiry**: 15 minutes
- **Storage**: Memory (JavaScript variable)
- **Contains**: userId, schoolId, role, plan

```typescript
interface AccessTokenPayload {
  sub: string;        // User ID
  schoolId: string;   // School ID
  role: Role;         // ADMIN | RECEPTIONIST | TEACHER
  plan: Plan;         // LITE | GROWTH | ENTERPRISE
  type: 'access';
  iat: number;        // Issued at
  exp: number;        // Expiry
}
```

### Refresh Token

- **Expiry**: 7 days
- **Storage**: HTTP-only secure cookie
- **Contains**: userId, tokenVersion

```typescript
interface RefreshTokenPayload {
  sub: string;        // User ID
  version: number;    // Token version for invalidation
  type: 'refresh';
  iat: number;
  exp: number;
}
```

## Authentication Flows

### 1. Signup Flow (Admin Only)

```
┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐
│  Admin  │      │ Signup  │      │ Payment │      │Onboard- │
│ visits  │─────▶│  Page   │─────▶│  Page   │─────▶│  ing    │
│ /signup │      │         │      │         │      │         │
└─────────┘      └─────────┘      └─────────┘      └─────────┘
                      │                │                │
                      ▼                ▼                ▼
               Create account    Pay signup +     Enter school
               (isActive=false)  first month      details
                      │                │                │
                      ▼                ▼                ▼
               Redirect to       Webhook/manual   Activate school
               /payment          verification     Redirect to
                                                  /dashboard
```

1. Admin visits `/auth/signup`
2. Enters email, password, confirms password
3. Account created with `isActive: false`
4. School created with `signupFeePaid: false`
5. Redirected to `/payment` to select plan and pay
6. After payment verified, redirected to `/onboarding`
7. Enters school name, teacher count, student count
8. School activated, redirected to `/dashboard`

### 2. Login Flow

```
┌─────────┐      ┌─────────┐      ┌─────────┐
│  User   │      │  Login  │      │ Verify  │
│ visits  │─────▶│  Page   │─────▶│ Creds   │
│ /login  │      │         │      │         │
└─────────┘      └─────────┘      └─────────┘
                                       │
                      ┌────────────────┴────────────────┐
                      │                                 │
                      ▼                                 ▼
               ┌─────────────┐                  ┌─────────────┐
               │  Payment    │                  │  Dashboard  │
               │  Required   │                  │  Access     │
               │  (/payment) │                  │             │
               └─────────────┘                  └─────────────┘
                (if !paid)                        (if paid)
```

1. User enters email and password
2. Server validates credentials
3. If school not paid, redirect to `/payment`
4. If paid, issue tokens and redirect to `/dashboard`

### 3. Token Refresh Flow

```
┌─────────┐      ┌─────────┐      ┌─────────┐
│ Access  │      │  POST   │      │  New    │
│ Token   │─────▶│/api/auth│─────▶│ Access  │
│ Expired │      │/refresh │      │ Token   │
└─────────┘      └─────────┘      └─────────┘
                      │
                      ▼
               Validate refresh
               token from cookie
```

1. Client detects access token expired
2. Calls `POST /api/auth/refresh`
3. Server validates refresh token cookie
4. Issues new access token
5. Client continues with new token

### 4. Logout Flow

1. Client calls `POST /api/auth/logout`
2. Server clears refresh token cookie
3. Server increments user's `tokenVersion` (invalidates all refresh tokens)
4. Client clears access token from memory
5. Redirect to `/login`

## Middleware Protection

### Route Protection Levels

| Route Pattern | Protection |
|--------------|------------|
| `/auth/*` | Public (redirect if logged in) |
| `/payment` | Requires auth, allows unpaid |
| `/onboarding` | Requires auth + signup fee paid |
| `/dashboard/*` | Requires auth + fully paid |
| `/api/auth/*` | Public |
| `/api/*` | Requires auth + paid |

### Role-Based Access

```typescript
// Middleware checks
const roleAccess = {
  '/dashboard/settings': ['ADMIN'],
  '/dashboard/teachers': ['ADMIN'],
  '/dashboard/classes': ['ADMIN', 'TEACHER'],
  '/dashboard/students': ['ADMIN', 'RECEPTIONIST', 'TEACHER'],
  '/dashboard/fees': ['ADMIN', 'RECEPTIONIST'],
  '/dashboard/expenses': ['ADMIN', 'RECEPTIONIST'],
  '/dashboard/reports': ['ADMIN', 'RECEPTIONIST'],
};
```

### Plan-Based Access

```typescript
// Features restricted by plan
const planAccess = {
  '/dashboard/classes': ['GROWTH', 'ENTERPRISE'],
  '/dashboard/teachers': ['GROWTH', 'ENTERPRISE'],
  // Student/Parent portals handled separately
};
```

## Password Security

### Hashing

- Algorithm: bcrypt
- Salt rounds: 12
- Never store plain text passwords

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

### Password Reset Flow

1. User requests reset via email
2. Server generates reset token (expires in 1 hour)
3. Email sent with reset link
4. User clicks link, enters new password
5. Token invalidated after use

## Session Invalidation

### Single Session Logout

- Clear refresh token cookie
- Client clears access token

### All Sessions Logout

- Increment user's `tokenVersion` in database
- All existing refresh tokens become invalid
- User must re-login on all devices

## Security Headers

```typescript
// Applied to all responses
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'",
};
```
