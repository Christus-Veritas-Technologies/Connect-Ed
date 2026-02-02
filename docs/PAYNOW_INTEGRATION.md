# PayNow Payment Integration Implementation

## Overview
Complete redesign of the payment flow to use PayNow instead of Dodo Payments, with manual once-off payment support and intermediate payment verification.

## Database Changes

### New Models Added

#### 1. **PlanPayment** Model
Tracks payment status for a school's subscription plan:
- `id`: Unique identifier
- `onceOffPaymentPaid`: Boolean - tracks if signup fee was paid (manually)
- `monthlyPaymentPaid`: Boolean - tracks if monthly fee is current
- `paid`: Boolean - overall payment status
- `schoolId`: Reference to School
- Timestamps: `createdAt`, `updatedAt`

#### 2. **IntermediatePayment** Model
Temporary records for PayNow transactions:
- `id`: Unique identifier
- `amount`: Decimal - transaction amount
- `paid`: Boolean - payment verification status
- `plan`: Plan type (LITE, GROWTH, ENTERPRISE)
- `reference`: PayNow poll URL or transaction reference
- `userId`: Reference to User (who initiated payment)
- `schoolId`: Reference to School
- Timestamps: `createdAt`, `updatedAt`

### Updated Models
- **User**: Added `intermediatePayments` relationship
- **School**: Added `planPayments` and `intermediatePayments` relationships

### Database Migration
- Migration: `20260202084948_add_plan_payment_and_intermediate_payment_models`
- Status: ✅ Applied successfully

## Backend Changes

### Payment Pricing Updated (PRICING constant)
```typescript
LITE: { signupFee: 400, monthlyEstimate: 40 }   // 10% of signup fee
GROWTH: { signupFee: 750, monthlyEstimate: 75 }   // 10% of signup fee
ENTERPRISE: { signupFee: 1200, monthlyEstimate: 120 } // 10% of signup fee
```

### New Endpoints

#### 1. **POST /payments/create-checkout**
Creates PayNow checkout session with intermediate payment record.
- Creates `IntermediatePayment` record first
- Initializes PayNow with `Paynow` SDK
- Sets redirect URL: `/payment/success?intermediatePaymentId={id}`
- Returns: `checkoutUrl`, `intermediatePaymentId`, `pollUrl`

#### 2. **POST /payments/callback**
Webhook handler for PayNow payment notifications.
- Updates `IntermediatePayment.paid` status
- Called by PayNow when payment is processed

#### 3. **GET /payments/verify/:intermediatePaymentId**
Verifies intermediate payment status.
- Returns payment details including `isPaid` status
- Used by success page to confirm payment

#### 4. **POST /payments/confirm-manual-payment**
Handles manual once-off payment confirmation.
- Marks `onceOffPaymentPaid = true`
- Creates new `IntermediatePayment` for monthly fee only
- Returns next payment amount (monthly fee)

### PayNow Integration
- Package: `paynow@^0.0.7` (installed)
- Credentials: `PAYNOW_INTEGRATION_ID`, `PAYNOW_INTEGRATION_KEY` (from env)
- Mock mode: Falls back to development redirect if credentials not set
- Flow:
  1. Create `IntermediatePayment` record
  2. Initialize `Paynow` instance
  3. Create payment with plan details
  4. Call `paynow.send(payment)`
  5. Return redirect URL to checkout
  6. User completes payment on PayNow platform
  7. Redirected to `/payment/success?intermediatePaymentId={id}`

## Frontend Changes

### Payment Page (`apps/web/app/(gated)/payment/page.tsx`)
Complete redesign with manual payment support:

#### New Features:
1. **Manual Payment Toggle**
   - "Already paid signup fee?" section with toggle button
   - When enabled: only charge monthly fee
   - When disabled: charge signup + monthly

2. **Single Payment Method**
   - Removed payment method selection (credit card, bank transfer)
   - Removed cash payment instructions screen
   - Only online payment via PayNow

3. **Dynamic Amount**
   - Without manual payment: `signupFee + monthlyEstimate`
   - With manual payment: `monthlyEstimate` only

4. **Updated API Integration**
   - Uses new `confirm-manual-payment` endpoint
   - Passes `email` to payment creation
   - Handles `intermediatePaymentId` in response

5. **UI/UX Improvements**
   - Removed icon wrappers (now using direct imports)
   - Simplified from `@hugeicons/core-free-icons` to `@hugeicons/react`
   - Cleaner manual payment indicator
   - Loading states on button

### Payment Success Page (NEW - `/apps/web/app/payment/success/page.tsx`)
New page for post-payment verification:

#### Features:
1. **Payment Verification**
   - Reads `intermediatePaymentId` from query param
   - Calls `GET /payments/verify/:intermediatePaymentId`
   - Polls every 2 seconds if not yet verified

2. **Success State**
   - Shows payment details (amount, plan, transaction ID)
   - Displays checkmark icon
   - "Continue to Onboarding" button
   - "Go to Dashboard" button

3. **Error State**
   - Shows alert circle icon
   - Lists possible issues
   - "Retry Payment" button → back to payment page
   - "Contact Support" button

4. **Loading State**
   - Spinner animation during verification
   - Auto-polling for payment status

## Environment Variables Required

### Server (.env)
```
PAYNOW_INTEGRATION_ID=your_integration_id
PAYNOW_INTEGRATION_KEY=your_integration_key
APP_URL=https://yourdomain.com (for redirect URLs)
```

## Payment Flow Diagram

```
User at Payment Page
    ↓
Select Plan + Amount
    ↓
[Optional] Mark Manual Payment for Once-Off Fee
    ↓
Click "Pay Now"
    ↓
Backend: Create IntermediatePayment record
    ↓
Backend: Initialize PayNow
    ↓
Backend: Create payment object
    ↓
Backend: Call paynow.send()
    ↓
Frontend: Redirect to PayNow checkout
    ↓
User: Complete payment on PayNow platform
    ↓
PayNow: Redirect to /payment/success?intermediatePaymentId={id}
    ↓
Frontend: Verify payment status via GET /payments/verify/{id}
    ↓
[Success] Show confirmation + redirect options
[Error] Show retry/support options
```

## Manual Payment Flow

```
User sees "Already paid signup fee?" toggle
    ↓
Click "Mark Done"
    ↓
Backend: Update PlanPayment.onceOffPaymentPaid = true
    ↓
Backend: Create IntermediatePayment for monthly fee only
    ↓
UI: Toggle shows "✓ Marked"
    ↓
UI: Amount recalculates to monthly fee only
    ↓
User: Click "Pay Now"
    ↓
Process normal PayNow flow (same as above)
```

## Testing Checklist

- [ ] Database migration applied successfully
- [ ] PayNow package installed
- [ ] Environment variables configured
- [ ] Payment page loads without errors
- [ ] Manual payment toggle works
- [ ] Amount updates correctly when toggle enabled/disabled
- [ ] PayNow checkout initiates correctly
- [ ] Payment success page displays after redirect
- [ ] Success page shows payment details correctly
- [ ] Retry button sends user back to payment page
- [ ] Contact support button works
- [ ] Error handling for missing intermediatePaymentId
- [ ] Polling mechanism works when payment not yet verified

## Next Steps

1. Configure PayNow credentials in production
2. Test payment flow end-to-end
3. Implement payment webhook validation
4. Add email confirmation for payments
5. Update school/user status after payment confirmation
6. Implement retry logic for failed payments
7. Add payment history view in dashboard
