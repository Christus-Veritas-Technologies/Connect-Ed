import { Hono } from "hono";
import { db, Plan, PaymentStatus, PaymentType } from "@repo/db";
import { createHmac } from "crypto";
import { PLAN_FEATURES } from "../lib/auth";

const webhooks = new Hono();

const DODO_WEBHOOK_SECRET = process.env.DODO_WEBHOOK_SECRET;

// Verify webhook signature
function verifySignature(payload: string, signature: string): boolean {
  if (!DODO_WEBHOOK_SECRET) {
    console.warn("DODO_WEBHOOK_SECRET not configured, skipping signature verification");
    return true; // Allow in development
  }

  const expectedSignature = createHmac("sha256", DODO_WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");

  return signature === expectedSignature;
}

// POST /webhooks/dodo - Handle Dodo Payments webhooks
webhooks.post("/dodo", async (c) => {
  try {
    const payload = await c.req.text();
    const signature = c.req.header("x-dodo-signature") || "";

    // Verify webhook signature
    if (!verifySignature(payload, signature)) {
      console.error("Invalid webhook signature");
      return c.json({ error: "Invalid signature" }, 401);
    }

    const event = JSON.parse(payload);

    // Support both SDK field names: type/metadata (correct) and event_type/custom_data (legacy)
    const eventType = event.type || event.event_type;
    console.log("Received Dodo webhook:", eventType);

    switch (eventType) {
      case "payment.succeeded": {
        const customData = event.data.metadata || event.data.custom_data;
        if (!customData) break;

        const { school_id: schoolId, plan_type: planType, is_signup: isSignup } = customData;

        if (!schoolId || !planType) {
          console.error("Missing metadata in webhook");
          break;
        }

        // Get plan pricing for quotas
        const planFeatures = PLAN_FEATURES[planType as keyof typeof PLAN_FEATURES];

        if (isSignup === "true") {
          // Signup payment - mark as paid and set plan
          await db.school.update({
            where: { id: schoolId },
            data: {
              plan: planType as Plan,
              signupFeePaid: true,
              emailQuota: planFeatures.emailQuota,
              whatsappQuota: planFeatures.whatsappQuota,
              smsQuota: planFeatures.smsQuota,
            },
          });

          // Update payment record
          await db.schoolPayment.updateMany({
            where: {
              schoolId,
              status: PaymentStatus.PENDING,
              type: PaymentType.SIGNUP_FEE,
            },
            data: {
              status: PaymentStatus.COMPLETED,
              reference: event.data.payment_id,
            },
          });

          console.log(`School ${schoolId} signup payment completed, plan: ${planType}`);
        } else {
          // Recurring payment - activate school
          await db.school.update({
            where: { id: schoolId },
            data: {
              isActive: true,
              // Reset quotas on payment
              emailUsed: 0,
              whatsappUsed: 0,
              smsUsed: 0,
              quotaResetDate: new Date(),
            },
          });

          // Update payment record
          await db.schoolPayment.updateMany({
            where: {
              schoolId,
              status: PaymentStatus.PENDING,
              type: PaymentType.TERM_PAYMENT,
            },
            data: {
              status: PaymentStatus.COMPLETED,
              reference: event.data.payment_id,
            },
          });

          console.log(`School ${schoolId} term payment completed`);
        }

        break;
      }

      case "payment.failed": {
        const customData = event.data.metadata || event.data.custom_data;
        if (!customData?.school_id) break;

        // Update payment record
        await db.schoolPayment.updateMany({
          where: {
            schoolId: customData.school_id,
            status: PaymentStatus.PENDING,
          },
          data: {
            status: PaymentStatus.FAILED,
          },
        });

        console.log(`Payment failed for school ${customData.school_id}`);
        break;
      }

      case "subscription.active": {
        const customData = event.data.metadata || event.data.custom_data;
        if (!customData?.school_id) break;

        // Update school status
        await db.school.update({
          where: { id: customData.school_id },
          data: {
            isActive: true,
          },
        });

        console.log(`Subscription activated for school ${customData.school_id}`);
        break;
      }

      case "subscription.on_hold":
      case "subscription.cancelled":
      case "subscription.expired": {
        const customData = event.data.metadata || event.data.custom_data;
        if (!customData?.school_id) break;

        // Deactivate school
        await db.school.update({
          where: { id: customData.school_id },
          data: {
            isActive: false,
          },
        });

        console.log(`Subscription ended for school ${customData.school_id}`);
        break;
      }

      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }

    return c.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return c.json({ error: "Webhook processing failed" }, 500);
  }
});

export default webhooks;
