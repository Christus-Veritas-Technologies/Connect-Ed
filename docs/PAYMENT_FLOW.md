# Connect-Ed Payment Flow

## Overview

Connect-Ed uses Dodo Payments for online payments with an additional manual cash verification option.

## Payment Types

### 1. Signup Fee (One-time)

| Plan | Amount |
|------|--------|
| Lite | $400 |
| Growth | $750 |
| Enterprise | $1,200 |

### 2. Term Payment (Recurring)

| Plan | Per-Term | Monthly |
|------|----------|---------|
| Lite | $50 | ~$17 |
| Growth | $90 | $30 |
| Enterprise | $150 | $50 |

- Term = 3 months
- Billed monthly
- Due on the 1st of each month

## Payment Methods

### Online (Dodo Payments)

Automated payment processing with webhook verification.

### Cash

Manual payment with admin verification.

## Payment Flows

### Initial Signup Payment

```
┌───────────┐     ┌───────────┐     ┌───────────┐     ┌───────────┐
│  Select   │     │  Choose   │     │  Payment  │     │  Verify   │
│   Plan    │────▶│  Method   │────▶│  Process  │────▶│   and     │
│           │     │           │     │           │     │ Activate  │
└───────────┘     └───────────┘     └───────────┘     └───────────┘
```

#### Online Payment Flow

1. Admin selects plan on `/payment`
2. Clicks "Pay Online"
3. Redirected to Dodo Payments checkout
4. Amount: Signup Fee + First Month
5. On success, Dodo sends webhook to `/api/webhooks/dodo`
6. Webhook handler:
   - Verifies signature
   - Updates `signupFeePaid = true`
   - Creates `SchoolPayment` record
   - Sets `isActive = true` (if onboarding complete)
7. User redirected back to `/onboarding` or `/dashboard`

#### Cash Payment Flow

1. Admin selects plan on `/payment`
2. Clicks "Pay with Cash"
3. Shown payment instructions:
   - Contact information
   - Bank details for transfer
   - Reference number to use
4. Admin contacts support with payment proof
5. System admin verifies payment manually
6. Updates school record via admin panel
7. User receives email confirmation

### Monthly Recurring Payment

```
┌───────────┐     ┌───────────┐     ┌───────────┐
│  Due Date │     │  Payment  │     │  Update   │
│ Approaches│────▶│ Collected │────▶│  Status   │
│           │     │           │     │           │
└───────────┘     └───────────┘     └───────────┘
```

#### Online Recurring

1. System sends reminder 7 days before due date
2. Admin can pay from `/dashboard/billing`
3. Or set up auto-pay with saved payment method
4. Webhook confirms payment
5. `SchoolPayment` record created

#### Cash Recurring

1. System sends reminder 7 days before due date
2. Admin pays via cash/transfer
3. Contacts support with payment proof
4. Manual verification and update

### Failed Payment Handling

```
┌───────────┐     ┌───────────┐     ┌───────────┐     ┌───────────┐
│  Payment  │     │   Grace   │     │  Warning  │     │ Deactivate│
│  Failed   │────▶│  Period   │────▶│   Sent    │────▶│  School   │
│           │     │  (7 days) │     │           │     │           │
└───────────┘     └───────────┘     └───────────┘     └───────────┘
```

1. Payment fails or not received by due date
2. 7-day grace period begins
3. Daily reminder emails sent
4. After grace period:
   - `isActive = false`
   - Users cannot access dashboard
   - Data preserved (not deleted)
5. Payment received → immediate reactivation

## Dodo Payments Integration

### Checkout Session Creation

```typescript
// POST /api/payments/create-checkout
interface CreateCheckoutRequest {
  planType: 'LITE' | 'GROWTH' | 'ENTERPRISE';
  paymentType: 'SIGNUP' | 'RECURRING';
}

interface CreateCheckoutResponse {
  checkoutUrl: string;
  sessionId: string;
}
```

### Webhook Handling

```typescript
// POST /api/webhooks/dodo
// Headers: x-dodo-signature

interface DodoWebhookPayload {
  event: 'payment.completed' | 'payment.failed';
  data: {
    sessionId: string;
    amount: number;
    currency: string;
    metadata: {
      schoolId: string;
      paymentType: string;
    };
  };
}
```

### Webhook Security

1. Verify `x-dodo-signature` header
2. Use HMAC-SHA256 with webhook secret
3. Reject requests with invalid signatures
4. Log all webhook events

## Database Records

### SchoolPayment Model

```prisma
model SchoolPayment {
  id            String        @id @default(cuid())
  schoolId      String
  school        School        @relation(fields: [schoolId], references: [id])
  amount        Decimal
  type          PaymentType   // SIGNUP_FEE, TERM_PAYMENT
  status        PaymentStatus // PENDING, COMPLETED, FAILED
  paymentMethod PaymentMethod // ONLINE, CASH
  reference     String?       // Dodo session ID or manual reference
  periodStart   DateTime?
  periodEnd     DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}
```

## Admin Panel Features

### Manual Payment Verification

1. View pending cash payments
2. Search by school name or reference
3. Mark as verified with notes
4. Automatic school activation

### Payment History

1. View all payments by school
2. Filter by date, type, status
3. Export to CSV

### Billing Management

1. Send manual payment reminders
2. Extend grace periods
3. Apply discounts/credits
4. Process refunds

## Email Notifications

| Event | Recipients | Template |
|-------|------------|----------|
| Payment successful | Admin | `payment-success` |
| Payment failed | Admin | `payment-failed` |
| Payment due (7 days) | Admin | `payment-reminder` |
| Payment overdue | Admin | `payment-overdue` |
| Grace period ending | Admin | `grace-period-warning` |
| Account deactivated | Admin | `account-deactivated` |
| Account reactivated | Admin | `account-reactivated` |

## Environment Variables

```env
# Dodo Payments
DODO_API_KEY=your_api_key
DODO_WEBHOOK_SECRET=your_webhook_secret
DODO_API_URL=https://api.dodopayments.com

# App URLs
NEXT_PUBLIC_APP_URL=https://connect-ed.com
PAYMENT_SUCCESS_URL=/onboarding
PAYMENT_CANCEL_URL=/payment
```
