# Post-Login Redirect Logic

## Overview
After successful authentication, users are redirected to the appropriate page based on three factors:
1. **Payment Status** - Whether the school has paid the signup fee
2. **Onboarding Status** - Whether the school has completed onboarding
3. **User Role** - Admin, Receptionist, or Teacher

## Redirect Priority

```
Login Successful
    ↓
[Step 1] Check Payment Status
    ├─ NOT PAID → /payment
    └─ PAID ↓
        ↓
[Step 2] Check Onboarding Status
    ├─ NOT COMPLETE → /onboarding
    └─ COMPLETE ↓
        ↓
[Step 3] Check User Role
    ├─ ADMIN → /dashboard
    ├─ RECEPTIONIST → /dashboard
    └─ TEACHER → /dashboard
```

## Implementation Details

### File: `apps/web/lib/auth-redirect.ts`
Contains helper functions for managing redirect logic:

- **`getLoginRedirectPath(user, school)`**
  - Determines redirect destination based on all three factors
  - Returns string path to redirect to

- **`getAuthMessage(user, school)`**
  - Returns user-friendly message about what they need to do
  - Can be used in UI to inform user of next steps

- **`canAccessPage(pageType, user, school)`**
  - Validates if user can access specific page types
  - Used by page-level guards
  - Types: 'payment', 'onboarding', 'dashboard'

### File: `apps/web/lib/hooks/use-auth.ts`
Updated useLogin hook to use the redirect helper:

```typescript
onSuccess: (data) => {
  setAccessToken(data.accessToken);
  queryClient.setQueryData(["auth", "user"], data);
  
  // Get redirect path based on payment, onboarding, and role
  const redirectPath = getLoginRedirectPath(data.user, data.school);
  router.push(redirectPath);
},
```

## Redirect Scenarios

### Scenario 1: New School, First Login
```
Payment Status: NOT PAID (signupFeePaid = false)
Onboarding Status: NOT COMPLETE
Role: ADMIN

Result: Redirect to /payment
User pays → System updates signupFeePaid = true
Next login → Redirect to /onboarding
```

### Scenario 2: School Paid, Not Onboarded
```
Payment Status: PAID (signupFeePaid = true)
Onboarding Status: NOT COMPLETE (onboardingComplete = false)
Role: RECEPTIONIST

Result: Redirect to /onboarding
User completes onboarding → System updates onboardingComplete = true
Next login → Redirect to /dashboard
```

### Scenario 3: School Fully Set Up
```
Payment Status: PAID (signupFeePaid = true)
Onboarding Status: COMPLETE (onboardingComplete = true)
Role: TEACHER

Result: Redirect to /dashboard
User can access all dashboard features
```

### Scenario 4: Failed Payment, Second Attempt
```
First Login:
- Payment Status: NOT PAID
- Redirect to /payment
- User attempts payment but it fails

Second Login (after fixing payment):
- Payment Status: PAID (after successful payment)
- Onboarding Status: NOT COMPLETE
- Redirect to /onboarding
```

## User Role Mapping

Currently, all roles redirect to the same dashboard:
```typescript
ADMIN → /dashboard
RECEPTIONIST → /dashboard
TEACHER → /dashboard
```

### Future Customization
To implement role-specific dashboards:

```typescript
// Modify roleBasedPaths in getLoginRedirectPath()
const roleBasedPaths: Record<string, string> = {
  ADMIN: "/dashboard/admin",
  RECEPTIONIST: "/dashboard/receptionist", 
  TEACHER: "/dashboard/teacher",
};
```

## Page Access Control

### Payment Page (`/payment`)
- ✅ Can access if: `signupFeePaid = false`
- ❌ Cannot access if: `signupFeePaid = true`
- Use GatedGuard to protect

### Onboarding Page (`/onboarding`)
- ✅ Can access if: `signupFeePaid = true && onboardingComplete = false`
- ❌ Cannot access if: `signupFeePaid = false` or `onboardingComplete = true`
- Use GatedGuard to protect

### Dashboard Pages (`/dashboard/**`)
- ✅ Can access if: `signupFeePaid = true && onboardingComplete = true`
- ❌ Cannot access if: `signupFeePaid = false` or `onboardingComplete = false`
- Use DashboardGuard to protect

## Error Handling

If redirect fails or data is incomplete:
1. Falls back to `/dashboard`
2. Page-level guards catch invalid states
3. User guided to appropriate page based on current state

## Testing Checklist

- [ ] New user (no payment) redirects to `/payment`
- [ ] After payment, next login redirects to `/onboarding`
- [ ] After onboarding, redirects to `/dashboard`
- [ ] Admin user redirects to `/dashboard` (when payment + onboarding done)
- [ ] Receptionist user redirects to `/dashboard` (when payment + onboarding done)
- [ ] Teacher user redirects to `/dashboard` (when payment + onboarding done)
- [ ] Failed payment doesn't update status, stays on `/payment`
- [ ] Direct URL access respects page guards
- [ ] Role-specific behavior works correctly

## Code Examples

### Using the redirect helpers in components:

```typescript
import { getLoginRedirectPath, getAuthMessage, canAccessPage } from "@/lib/auth-redirect";

// Get where user should be sent
const path = getLoginRedirectPath(user, school);

// Get message to display
const message = getAuthMessage(user, school);

// Check if user can access a specific page
const canAccessDashboard = canAccessPage("dashboard", user, school);
```

### In useLogin hook (already implemented):

```typescript
onSuccess: (data) => {
  const redirectPath = getLoginRedirectPath(data.user, data.school);
  router.push(redirectPath);
},
```

## Database Fields Used

### From `School` model:
- `signupFeePaid: boolean` - Whether signup fee has been paid
- `onboardingComplete: boolean` - Whether school profile setup is done

### From `User` model:
- `role: "ADMIN" | "RECEPTIONIST" | "TEACHER"` - User's role in school

## Flow Diagram

```
┌─────────────┐
│  Login Form │
└──────┬──────┘
       │ Submit credentials
       ↓
┌──────────────────────────┐
│ Check Authentication     │
│ (email + password valid)  │
└──────┬───────────────────┘
       │ Valid credentials
       ↓
┌──────────────────────────┐
│ getLoginRedirectPath()   │
├──────────────────────────┤
│ 1. Check signupFeePaid   │
│    NO → /payment         │
│    YES ↓                 │
│ 2. Check onboarding      │
│    NO → /onboarding      │
│    YES ↓                 │
│ 3. Check user.role       │
│    → /dashboard          │
└──────┬───────────────────┘
       │
       ↓
┌─────────────────┐
│ Redirect User   │
└─────────────────┘
```

## Recent Commits

All redirect logic implemented in these commits:
1. `a4510d6` - feat: implement smart redirect logic based on payment status, onboarding status, and user role
2. `f821577` - feat: redesign payment page with manual payment option and add payment success page
3. `463bfc5` - feat: implement PayNow payment integration
4. `5134413` - feat: add PlanPayment and IntermediatePayment models

## Related Files

- `apps/web/lib/auth-redirect.ts` - Redirect logic utilities
- `apps/web/lib/hooks/use-auth.ts` - useLogin hook with redirect
- `apps/web/components/auth-guard.tsx` - Page-level protection guards
- `apps/web/lib/auth-context.tsx` - Authentication context and state
