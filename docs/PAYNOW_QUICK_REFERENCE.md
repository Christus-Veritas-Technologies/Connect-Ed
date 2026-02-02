# PayNow Integration - Quick Reference

## What Was Built

### 1. Database Models (Prisma)
✅ **PlanPayment** - Tracks subscription payment status
- `onceOffPaymentPaid`: Boolean - Once-off signup fee payment status
- `monthlyPaymentPaid`: Boolean - Monthly recurring payment status
- `paid`: Overall payment status
- Relations: School

✅ **IntermediatePayment** - Tracks PayNow transactions
- `amount`: Decimal - Transaction amount
- `paid`: Boolean - Payment verification status
- `plan`: Plan type (LITE, GROWTH, ENTERPRISE)
- `reference`: PayNow poll URL
- Relations: User, School

### 2. Backend Payment Endpoints

#### POST /payments/create-checkout
Creates PayNow checkout with intermediate payment tracking
- **Input**: `planType`, `paymentType`, `email` (optional)
- **Flow**:
  1. Create IntermediatePayment record
  2. Initialize PayNow SDK
  3. Create payment object
  4. Call paynow.send()
  5. Return checkout URL + intermediatePaymentId
- **Return**: `{ checkoutUrl, intermediatePaymentId, pollUrl }`

#### POST /payments/callback
Webhook for PayNow payment notifications
- Updates IntermediatePayment.paid status
- Called by PayNow after payment completion

#### GET /payments/verify/:intermediatePaymentId
Verifies payment status
- Returns payment details and `isPaid` flag
- Used by success page for verification

#### POST /payments/confirm-manual-payment
Handles manual once-off payment
- Sets `onceOffPaymentPaid = true`
- Creates new IntermediatePayment for monthly fee only
- Returns next payment amount (monthly only)

### 3. Frontend Payment Page

#### Features
- ✅ Plan selection (LITE, GROWTH, ENTERPRISE)
- ✅ Manual payment toggle ("Already paid signup fee?")
- ✅ Dynamic amount calculation based on toggle
- ✅ Single payment method (PayNow only)
- ✅ No cash/transfer options
- ✅ Loading states and error handling

#### New File
`apps/web/app/(gated)/payment/page.tsx`

### 4. Payment Success Page

#### Features
- ✅ Reads intermediatePaymentId from query param
- ✅ Verifies payment status via API
- ✅ Auto-polling if not yet verified
- ✅ Success state with payment details
- ✅ Error state with retry options
- ✅ Buttons: "Continue to Onboarding", "Go to Dashboard", "Retry Payment"

#### New File
`apps/web/app/payment/success/page.tsx`

## Configuration Required

### Environment Variables (Server)
```bash
PAYNOW_INTEGRATION_ID=your_id
PAYNOW_INTEGRATION_KEY=your_key
APP_URL=https://yourdomain.com  # For redirect URLs
```

## Payment Flow
```
Payment Page
    ↓
Select Plan & Toggle Manual Payment (optional)
    ↓
Click "Pay Now"
    ↓
Backend creates IntermediatePayment
    ↓
Backend initializes PayNow
    ↓
User redirected to PayNow checkout
    ↓
User completes payment on PayNow
    ↓
PayNow redirects to /payment/success?intermediatePaymentId={id}
    ↓
Frontend verifies payment
    ↓
Show success/error state
```

## Manual Payment Flow
```
Toggle "Already paid signup fee?" → Click "Mark Done"
    ↓
Backend marks onceOffPaymentPaid = true
    ↓
Backend creates IntermediatePayment for monthly only
    ↓
User now pays only monthly fee (no signup fee)
    ↓
Continue with normal PayNow flow
```

## Pricing Updated
- **LITE**: Signup $400 + Monthly $40 (10% of signup)
- **GROWTH**: Signup $750 + Monthly $75 (10% of signup)
- **ENTERPRISE**: Signup $1200 + Monthly $120 (10% of signup)

## Files Modified
- ✅ `/packages/db/prisma/schema.prisma` - New models
- ✅ `/apps/server/package.json` - Added paynow
- ✅ `/apps/server/src/routes/payments.ts` - New endpoints
- ✅ `/apps/server/src/lib/validation.ts` - Updated checkout schema
- ✅ `/apps/web/app/(gated)/payment/page.tsx` - Complete redesign
- ✅ `/apps/web/lib/pricing.ts` - Monthly pricing updated
- ✅ `/docs/PAYNOW_INTEGRATION.md` - Comprehensive docs
- ✅ NEW: `/apps/web/app/payment/success/page.tsx` - Success page

## Database Migration
- ✅ Applied: `20260202084948_add_plan_payment_and_intermediate_payment_models`

## Testing Checklist
- [ ] PayNow environment variables configured
- [ ] Database migration applied
- [ ] Payment page loads without errors
- [ ] Manual payment toggle works
- [ ] Amount recalculates correctly
- [ ] PayNow checkout initiates
- [ ] Success page displays after redirect
- [ ] Payment details show correctly
- [ ] Error page shows for invalid IDs
- [ ] Polling works when payment not verified
- [ ] Buttons navigate correctly

## Next Steps
1. Set PayNow environment variables
2. Test payment flow end-to-end
3. Verify webhook handling
4. Update school status after payment
5. Add email confirmations
6. Implement payment history view
