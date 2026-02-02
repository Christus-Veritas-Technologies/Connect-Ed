# PayNow Transaction Flow - Technical Details

## 1. Payment Initiation (Frontend)

### User Actions
1. User selects a plan (LITE, GROWTH, or ENTERPRISE)
2. [Optional] User marks they already paid the signup fee
3. User clicks "Pay Now" button

### Code Execution
```typescript
// Payment Page Logic
handlePayOnline = async () => {
  const response = await api.post("/payments/create-checkout", {
    planType: selectedPlan,
    paymentType: isManualPayment ? "TERM_PAYMENT" : "SIGNUP",
    email: user?.email,
  });
  
  window.location.href = response.checkoutUrl;
};
```

## 2. Backend Processing (Payment Creation)

### Endpoint: POST /payments/create-checkout

#### Step 1: Create IntermediatePayment Record
```typescript
const intermediatePayment = await db.intermediatePayment.create({
  data: {
    userId,
    schoolId,
    amount: paymentAmount,
    plan: selectedPlan,
    paid: false,
    // reference will be filled with pollUrl after PayNow response
  },
});
// Returns: intermediatePayment.id (used in redirect URL)
```

#### Step 2: Initialize PayNow
```typescript
const paynow = new Paynow(
  process.env.PAYNOW_INTEGRATION_ID,
  process.env.PAYNOW_INTEGRATION_KEY
);

paynow.resultUrl = `${baseUrl}/api/payments/callback`;
paynow.returnUrl = `/payment/success?intermediatePaymentId=${intermediatePayment.id}`;
```

#### Step 3: Create Payment Object
```typescript
const payment = paynow.createPayment(
  `Invoice-${intermediatePayment.id}`, // Unique reference
  user?.email // Auto-login on PayNow if email registered
);

payment.add(
  PRICING[plan].name, // e.g., "Growth"
  amount // e.g., 825 for GROWTH signup
);
```

#### Step 4: Send to PayNow
```typescript
const response = await paynow.send(payment);

if (response.success) {
  // Save pollUrl for webhook verification
  await db.intermediatePayment.update({
    where: { id: intermediatePayment.id },
    data: { reference: response.pollUrl },
  });
  
  return {
    checkoutUrl: response.redirectUrl,
    intermediatePaymentId: intermediatePayment.id,
    pollUrl: response.pollUrl,
  };
}
```

## 3. User PayNow Experience

### PayNow Redirect Flow
1. User is redirected to PayNow checkout with `response.redirectUrl`
2. PayNow displays payment options:
   - Credit card
   - Mobile money
   - Bank transfer
3. User completes payment
4. PayNow confirms payment processed
5. User is redirected to: `/payment/success?intermediatePaymentId={id}`

## 4. Payment Verification (Success Page)

### Endpoint: GET /payments/verify/:intermediatePaymentId

#### Frontend Logic
```typescript
useEffect(() => {
  const verifyPayment = async () => {
    try {
      const response = await api.get(
        `/payments/verify/${intermediatePaymentId}`
      );
      
      setPayment(response.payment);
      
      if (response.isPaid) {
        setStatus("success");
      } else {
        // Poll again in 2 seconds
        setTimeout(verifyPayment, 2000);
      }
    } catch (err) {
      setStatus("error");
    }
  };
  
  verifyPayment();
}, [intermediatePaymentId]);
```

#### Backend Response
```typescript
// GET /payments/verify/:id response
{
  "payment": {
    "id": "cuid123...",
    "amount": 825,
    "paid": false, // or true if webhook updated
    "plan": "GROWTH",
    "reference": "pollUrl...",
    "createdAt": "2026-02-02T08:49:48.000Z"
  },
  "isPaid": false
}
```

## 5. PayNow Webhook (Payment Confirmation)

### Endpoint: POST /payments/callback

#### PayNow sends webhook data:
```typescript
{
  "intermediatePaymentId": "cuid123...",
  "paid": true,
  "transactionRef": "paynow_tx_123456"
}
```

#### Backend updates record:
```typescript
const updated = await db.intermediatePayment.update({
  where: { id: intermediatePaymentId },
  data: { paid: true },
});
```

#### Now when success page polls:
- `GET /payments/verify/{id}` returns `isPaid: true`
- Success page displays green checkmark
- Shows payment details
- Offers "Continue to Onboarding" button

## 6. Manual Payment Workflow

### Alternative: Already Paid Signup Fee

#### User clicks "Mark Done"
```typescript
handleManualPaymentToggle = async () => {
  const response = await api.post(
    "/payments/confirm-manual-payment",
    {
      plan: selectedPlan,
      paymentType: "SIGNUP",
    }
  );
  
  setIsManualPayment(true);
};
```

#### Backend creates PlanPayment:
```typescript
const planPayment = await db.planPayment.upsert({
  where: { schoolId },
  update: { onceOffPaymentPaid: true },
  create: {
    schoolId,
    onceOffPaymentPaid: true,
    monthlyPaymentPaid: false,
    paid: false,
  },
});

// Create intermediate payment for MONTHLY only
const intermediatePayment = await db.intermediatePayment.create({
  data: {
    userId,
    schoolId,
    amount: PRICING[plan].monthlyEstimate, // Only monthly, no signup fee
    plan,
    paid: false,
  },
});
```

#### Result:
- Amount now shows only monthly fee
- User pays only monthly amount
- PlanPayment tracks signup as already paid

## 7. Data Models Diagram

```
┌─────────────────────────┐
│   IntermediatePayment   │
├─────────────────────────┤
│ id                      │
│ amount: 825             │ (or just 75 for monthly)
│ paid: false/true        │ (updated by webhook)
│ plan: "GROWTH"          │
│ reference: pollUrl      │ (from PayNow)
│ userId (FK)             │
│ schoolId (FK)           │
│ createdAt               │
│ updatedAt               │
└─────────────────────────┘
         ↓
    [PayNow]
         ↓
  Webhook: PAID ✓

┌─────────────────────────┐
│    PlanPayment          │
├─────────────────────────┤
│ id                      │
│ onceOffPaymentPaid: t/f │ (manual payment)
│ monthlyPaymentPaid: t/f │ (auto after webhook)
│ paid: t/f               │ (both paid?)
│ schoolId (FK)           │
│ createdAt               │
│ updatedAt               │
└─────────────────────────┘
```

## 8. Payment States Timeline

### Normal PayNow Flow
```
Time 0s:   User clicks "Pay Now"
           └─ IntermediatePayment created with paid: false
           └─ PayNow checkout initiated

Time 5-30s: User on PayNow completing payment

Time 35s:  PayNow processes payment
           └─ Webhook sent to /api/payments/callback
           └─ IntermediatePayment.paid = true

Time 36s:  User redirected to success page
           └─ Success page queries verify endpoint
           └─ Returns isPaid: true
           └─ Displays success state
```

### With Polling (Asynchronous Confirmation)
```
Time 0s:   Redirect to success page
           └─ Status: "loading"

Time 1s:   Query verify endpoint
           └─ IntermediatePayment.paid = false (still processing)
           └─ Schedule next poll in 2s

Time 3s:   Query verify endpoint again
           └─ IntermediatePayment.paid = true (webhook received)
           └─ Status: "success"
           └─ Display confirmation
```

## 9. Error Scenarios

### Missing intermediatePaymentId
```typescript
// Success page
if (!intermediatePaymentId) {
  setStatus("error");
  setError("Payment not found");
}
```

### Payment Not Found
```typescript
// GET /payments/verify/{id}
if (!intermediatePayment) {
  return errors.notFound(c, { error: "Payment not found" });
}
```

### User cancels on PayNow
```typescript
// PayNow redirects back anyway with same intermediatePaymentId
// paid: false (no webhook)
// Success page shows error after retries
```

## 10. Integration with SchoolPayment (Future)

Once verified, consider creating SchoolPayment record:
```typescript
// After intermediatePayment verified
const schoolPayment = await db.schoolPayment.create({
  data: {
    schoolId,
    amount: intermediatePayment.amount,
    type: PaymentType.SIGNUP_FEE,
    status: PaymentStatus.COMPLETED,
    paymentMethod: PaymentMethod.ONLINE,
    reference: intermediatePayment.id,
  },
});

// Update school status
await db.school.update({
  where: { id: schoolId },
  data: {
    plan: intermediatePayment.plan,
    isActive: true,
    signupFeePaid: true,
  },
});
```

## Summary

The PayNow integration creates a smooth payment flow:

1. **Frontend**: User selects plan and amount
2. **Backend**: Creates IntermediatePayment tracking record
3. **PayNow**: User completes payment securely
4. **Webhook**: PayNow confirms payment received
5. **Frontend**: Success page verifies and shows confirmation
6. **Database**: Records updated with payment status

All transactions are tracked via `IntermediatePayment` records linked to users and schools, providing audit trail and flexibility for future features like billing and reporting.
