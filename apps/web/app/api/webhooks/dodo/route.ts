import { NextRequest, NextResponse } from "next/server";
import { db, Plan } from "@repo/db";
import { createHmac } from "crypto";
import { PRICING } from "@/lib/pricing";
import type { DodoWebhookPayload } from "@/lib/dodo-payments";

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

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get("x-dodo-signature") || "";

    // Verify webhook signature
    if (!verifySignature(payload, signature)) {
      console.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event: DodoWebhookPayload = JSON.parse(payload);

    console.log("Received Dodo webhook:", event.event_type);

    switch (event.event_type) {
      case "payment.succeeded": {
        const customData = event.data.custom_data;
        if (!customData) break;

        const { school_id: schoolId, plan_type: planType, is_signup: isSignup } = customData;

        if (!schoolId || !planType) {
          console.error("Missing custom_data in webhook");
          break;
        }

        // Get plan pricing for quotas
        const planPricing = PRICING[planType as Plan];

        if (isSignup === "true") {
          // Signup payment - mark as paid and set plan
          await db.school.update({
            where: { id: schoolId },
            data: {
              plan: planType as Plan,
              signupFeePaid: true,
              emailQuota: planPricing.quotas.email,
              whatsappQuota: planPricing.quotas.whatsapp,
              smsQuota: planPricing.quotas.sms,
            },
          });

          // Create payment record
          await db.schoolPayment.create({
            data: {
              schoolId,
              amount: planPricing.signupFee + planPricing.monthlyEstimate,
              type: "SIGNUP_FEE",
              status: "COMPLETED",
              paymentMethod: "ONLINE",
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

          // Create payment record
          await db.schoolPayment.create({
            data: {
              schoolId,
              amount: planPricing.monthlyEstimate,
              type: "TERM_PAYMENT",
              status: "COMPLETED",
              paymentMethod: "ONLINE",
              reference: event.data.payment_id,
            },
          });

          console.log(`School ${schoolId} term payment completed`);
        }

        break;
      }

      case "payment.failed": {
        const customData = event.data.custom_data;
        if (!customData?.school_id) break;

        console.log(`Payment failed for school ${customData.school_id}`);
        break;
      }

      case "subscription.active": {
        const customData = event.data.custom_data;
        if (!customData?.school_id) break;

        // Update school with subscription ID
        await db.school.update({
          where: { id: customData.school_id },
          data: {
            isActive: true,
          },
        });

        console.log(`Subscription activated for school ${customData.school_id}`);
        break;
      }

      case "subscription.on_hold": {
        const customData = event.data.custom_data;
        if (!customData?.school_id) break;

        // Deactivate school when subscription is on hold
        await db.school.update({
          where: { id: customData.school_id },
          data: {
            isActive: false,
          },
        });

        console.log(`Subscription on hold for school ${customData.school_id}`);
        break;
      }

      case "subscription.cancelled":
      case "subscription.expired": {
        const customData = event.data.custom_data;
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
        console.log(`Unhandled webhook event: ${event.event_type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
