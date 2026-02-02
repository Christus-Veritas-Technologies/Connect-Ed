# PayNow Integration - Deployment Checklist

## Pre-Deployment Verification ✅

### Code Changes
- [x] Database schema updated (PlanPayment + IntermediatePayment models)
- [x] Database migration created: `20260202084948_add_plan_payment_and_intermediate_payment_models`
- [x] PayNow package added to server: `paynow@^0.0.7`
- [x] Payment endpoints implemented (create-checkout, callback, verify, confirm-manual)
- [x] Payment page redesigned (manual toggle, single method, dynamic amounts)
- [x] Payment success page created
- [x] Validation schema updated with email field
- [x] Pricing updated to 10% monthly rate
- [x] Documentation created (3 docs)

### Files Modified
```
✅ /packages/db/prisma/schema.prisma
✅ /apps/server/package.json
✅ /apps/server/src/routes/payments.ts
✅ /apps/server/src/lib/validation.ts
✅ /apps/web/app/(gated)/payment/page.tsx
✅ /apps/web/lib/pricing.ts
✅ /apps/web/app/payment/success/page.tsx (NEW)
✅ /docs/PAYNOW_INTEGRATION.md (NEW)
✅ /docs/PAYNOW_QUICK_REFERENCE.md (NEW)
✅ /docs/PAYNOW_TECHNICAL_FLOW.md (NEW)
✅ /docs/IMPLEMENTATION_SUMMARY.md (NEW)
```

## Deployment Steps

### 1. Environment Configuration
```bash
# In your production .env file:
PAYNOW_INTEGRATION_ID=your_paynow_integration_id
PAYNOW_INTEGRATION_KEY=your_paynow_integration_key
APP_URL=https://yourdomain.com
DATABASE_URL=postgresql://user:password@host:5432/db
```

### 2. Database Migration
```bash
# Navigate to db package
cd packages/db

# Run migration
npx prisma migrate deploy
# or for dev:
npx prisma migrate dev

# Verify migration applied
npx prisma db validate
```

### 3. Package Installation
```bash
# Install server dependencies (includes paynow)
cd apps/server
bun install

# Install web dependencies
cd ../web
bun install
```

### 4. Build & Deployment
```bash
# From root
bun run build

# Or individually:
cd apps/server && bun run build
cd apps/web && bun run build
```

### 5. Start Services
```bash
# Terminal 1 - Server
cd apps/server
bun run dev

# Terminal 2 - Web
cd apps/web
bun run dev
```

## Testing Checklist

### Database
- [ ] Run `npx prisma db validate` - should pass
- [ ] Check PostgreSQL for new tables:
  - `plan_payments` table created
  - `intermediate_payments` table created
- [ ] Verify indexes created correctly
- [ ] Check foreign key constraints

### Backend Endpoints
- [ ] POST /payments/create-checkout
  - [ ] Accepts planType, paymentType, email
  - [ ] Creates IntermediatePayment record
  - [ ] Returns checkoutUrl + intermediatePaymentId
  - [ ] Mock mode works if credentials not set

- [ ] POST /payments/confirm-manual-payment
  - [ ] Accepts plan parameter
  - [ ] Creates PlanPayment record
  - [ ] Creates IntermediatePayment for monthly only
  - [ ] Returns correct monthly amount

- [ ] GET /payments/verify/:intermediatePaymentId
  - [ ] Returns payment details
  - [ ] Returns isPaid status
  - [ ] Returns 404 for invalid IDs

- [ ] POST /payments/callback
  - [ ] Updates IntermediatePayment.paid
  - [ ] Handles PayNow webhook

### Frontend - Payment Page
- [ ] Page loads without errors
- [ ] Plan cards display correctly
- [ ] Manual payment toggle works
  - [ ] Toggle OFF: amount = signup + monthly
  - [ ] Toggle ON: amount = monthly only
- [ ] "Mark Done" button functionality
  - [ ] Shows "✓ Marked" after click
  - [ ] Amount recalculates
- [ ] "Pay Now" button
  - [ ] Calls /payments/create-checkout
  - [ ] Redirects to PayNow checkout
- [ ] Error states display correctly
- [ ] Loading states work

### Frontend - Success Page
- [ ] Loads with intermediatePaymentId query param
- [ ] Shows loading spinner while verifying
- [ ] Displays success state with payment details
  - [ ] Amount shows correctly
  - [ ] Plan shows correctly
  - [ ] Transaction ID shows
- [ ] "Continue to Onboarding" button works
- [ ] "Go to Dashboard" button works
- [ ] Error state displays for invalid IDs
- [ ] "Retry Payment" redirects to payment page
- [ ] Auto-polling works (2 second intervals)

### API Integration
- [ ] api.post() calls work correctly
- [ ] api.get() calls work correctly
- [ ] Error handling displays user-friendly messages
- [ ] Success responses parse correctly

### PayNow Integration
- [ ] PayNow SDK initializes correctly
- [ ] Checkout URL generation works
- [ ] Mock mode works without credentials
- [ ] Poll URL saved to intermediatePayment

## Manual Testing Script

### Test 1: Normal Payment Flow
```
1. Navigate to /payment
2. Select "GROWTH" plan
3. Click "Pay Now"
4. Verify redirected to PayNow
5. Complete payment (or use test card)
6. Verify redirected to /payment/success?intermediatePaymentId=XXX
7. Verify success page displays payment details
8. Click "Go to Dashboard"
9. Verify can access dashboard
```

### Test 2: Manual Payment + Online Payment
```
1. Navigate to /payment
2. Select "ENTERPRISE" plan
3. Verify amount shows $1320 (signup + monthly)
4. Click "Mark Done" button
5. Verify button shows "✓ Marked"
6. Verify amount changes to $120 (monthly only)
7. Click "Pay Now"
8. Verify redirected to PayNow with $120 amount
9. Complete payment
10. Verify success page and navigation
```

### Test 3: Error Handling
```
1. Manually navigate to /payment/success?intermediatePaymentId=invalid
2. Verify error state displays
3. Verify "Retry Payment" redirects to /payment
4. Verify "Contact Support" button visible
```

### Test 4: Payment Verification Polling
```
1. Start payment flow
2. During payment, simulate slow webhook delivery
3. Verify success page shows "Verifying..." 
4. After webhook, verify auto-updates to success state
5. Should not require page refresh
```

## Production Checklist

### Before Going Live
- [ ] PayNow credentials obtained and validated
- [ ] TEST environment fully tested
- [ ] Payment webhook URL configured in PayNow dashboard
- [ ] Email confirmation system ready (if needed)
- [ ] Support email/contact set up
- [ ] Database backup strategy in place
- [ ] Monitoring/logging configured for payment endpoint
- [ ] Error alerts set up

### Post-Deployment
- [ ] Monitor payment endpoint logs for errors
- [ ] Monitor webhook callbacks
- [ ] Test live payment (use PayNow test credentials if available)
- [ ] Verify IntermediatePayment records created
- [ ] Verify success page works after redirect
- [ ] Check for any JavaScript console errors
- [ ] Verify response times acceptable

### Monitoring
- [ ] Payment endpoint response times
- [ ] Webhook callback delivery success rate
- [ ] IntermediatePayment creation success rate
- [ ] Error rates and types
- [ ] Failed payment attempts

## Rollback Plan

If issues occur:

### Immediate Rollback
```bash
# Revert to previous code version
git revert <commit-hash>

# Rollback database migration (if needed)
npx prisma migrate resolve --rolled-back 20260202084948_add_plan_payment_and_intermediate_payment_models

# Restart services
```

### Data Safety
- All existing SchoolPayment records remain unchanged
- IntermediatePayment records can be safely deleted if needed
- PlanPayment records can be reset via database

## Success Criteria

Payment integration is successful when:

1. ✅ Users can complete payment without errors
2. ✅ IntermediatePayment records are created in database
3. ✅ PayNow redirect works correctly
4. ✅ Success page displays after redirect
5. ✅ Manual payment toggle works as expected
6. ✅ Correct amounts charged for each scenario
7. ✅ No JavaScript errors in console
8. ✅ All endpoints respond within acceptable time
9. ✅ Database records clean and properly linked
10. ✅ Webhook callbacks processed successfully

## Support Resources

If issues arise, check:
1. `/docs/PAYNOW_INTEGRATION.md` - Full integration guide
2. `/docs/PAYNOW_QUICK_REFERENCE.md` - Quick lookup
3. `/docs/PAYNOW_TECHNICAL_FLOW.md` - Technical details
4. PayNow Node.JS documentation: https://paynow.co.zw/
5. PostgreSQL logs for migration issues
6. Server logs for endpoint errors
7. Browser console for frontend errors

## Contact/Support

For implementation questions:
- Check documentation in `/docs/` folder
- Review code in `/apps/server/src/routes/payments.ts`
- Review frontend in `/apps/web/app/(gated)/payment/page.tsx`
- Check database in `/packages/db/prisma/schema.prisma`

For PayNow-specific issues:
- Contact PayNow support
- Check PayNow Node.JS library: github.com/paynow-zw/paynow
- Review PayNow API documentation

## Sign-Off

Once all testing is complete and verified:
- [ ] QA Sign-off
- [ ] DevOps Sign-off
- [ ] Product Owner Sign-off
- [ ] Clear to deploy to production

---

**Deployment Date:** ___________
**Deployed By:** ___________
**Verified By:** ___________
**Status:** ⚪ Pending | 🟡 In Progress | 🟢 Deployed | 🔴 Rolled Back
