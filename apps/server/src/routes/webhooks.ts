import { Hono } from "hono";
import { db, Plan, PaymentStatus, PaymentType } from "@repo/db";
import { createHmac } from "crypto";
import { PLAN_FEATURES } from "../lib/auth";
import { fmtServer, type CurrencyCode } from "../lib/currency";
import { createNotification, getSchoolNotificationPrefs } from "./notifications";
import { sendEmail, generatePaymentSuccessEmail, generatePaymentFailedEmail } from "../lib/email";
import { sendWhatsApp } from "../lib/whatsapp";

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

        const intermediatePaymentId = customData.intermediate_payment_id;
        const paymentId = event.data.payment_id;

        // Look up IntermediatePayment by metadata ID first, then by payment_id in reference
        let intermediatePayment = intermediatePaymentId
          ? await db.intermediatePayment.findUnique({
              where: { id: intermediatePaymentId },
              include: { user: true, school: true },
            })
          : null;

        // If not found by metadata ID, search by payment_id in reference (e.g., "type:FULL|dodo:pay_xxx")
        if (!intermediatePayment && paymentId) {
          intermediatePayment = await db.intermediatePayment.findFirst({
            where: { 
              reference: { 
                contains: `dodo:${paymentId}` 
              } 
            },
            include: { user: true, school: true },
          });
        }

        if (!intermediatePayment) {
          console.error("No IntermediatePayment found for Dodo webhook", { intermediatePaymentId, paymentId });
          break;
        }

        if (intermediatePayment.paid) {
          console.log(`IntermediatePayment ${intermediatePayment.id} already marked paid, skipping`);
          break;
        }

        // Extract payment type from reference (e.g., "type:FULL|dodo:pay_xxx")
        const refString = intermediatePayment.reference || "";
        const typeMatch = refString.match(/type:(\w+)/);
        const effectiveType = typeMatch ? typeMatch[1] : "FULL";
        const cycleMatch = refString.match(/cycle:(\w+)/);
        const billingCycle = (cycleMatch ? cycleMatch[1] : "monthly") as "monthly" | "annual";

        // Get plan features for updating school
        const planFeatures = PLAN_FEATURES[intermediatePayment.plan as keyof typeof PLAN_FEATURES];
        const isAnnual = billingCycle === "annual";

        await db.$transaction(async (tx) => {
          await tx.intermediatePayment.update({
            where: { id: intermediatePayment.id },
            data: { paid: true },
          });

          // Upsert PlanPayment — always mark monthly paid
          const planPaymentData: any = {
            monthlyPaymentPaid: true,
            paid: true,
          };

          // Upsert PlanPayment
          const existing = await tx.planPayment.findFirst({ where: { schoolId: intermediatePayment.schoolId } });
          if (existing) {
            await tx.planPayment.update({ where: { id: existing.id }, data: planPaymentData });
          } else {
            await tx.planPayment.create({ data: { schoolId: intermediatePayment.schoolId, ...planPaymentData } });
          }

          const nextPaymentDate = new Date();
          if (isAnnual) {
            nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
          } else {
            nextPaymentDate.setDate(nextPaymentDate.getDate() + 31);
          }

          await tx.school.update({
            where: { id: intermediatePayment.schoolId },
            data: {
              signupFeePaid: true,
              plan: intermediatePayment.plan as keyof typeof Plan,
              nextPaymentDate,
              emailQuota: planFeatures.emailQuota,
              whatsappQuota: planFeatures.whatsappQuota,
              billingCycle: isAnnual ? "ANNUAL" as const : "MONTHLY" as const,
              ...(isAnnual ? {
                foundingSchool: true,
                billingCycleEnd: nextPaymentDate,
              } : {}),
            },
          });
        });

        // Notification + email (mirroring PayNow callback)
        const currency = (intermediatePayment.school?.currency || "USD") as CurrencyCode;
        await createNotification({
          schoolId: intermediatePayment.schoolId,
          title: "Payment Received",
          message: `Payment of ${fmtServer(Number(intermediatePayment.amount), currency)} for ${intermediatePayment.plan} plan has been successfully processed.`,
          type: "PAYMENT_SUCCESS",
          priority: "HIGH",
          actionUrl: "/payments",
          metadata: {
            paymentId: intermediatePayment.id,
            amount: intermediatePayment.amount.toString(),
            plan: intermediatePayment.plan,
          },
          actorName: intermediatePayment.user.name,
        });

        const prefs = await getSchoolNotificationPrefs(intermediatePayment.schoolId);
        if (prefs.email) {
          await sendEmail({
            to: intermediatePayment.user.email,
            subject: "Payment Successful - Connect-Ed",
            html: generatePaymentSuccessEmail({
              name: intermediatePayment.user.name,
              amount: Number(intermediatePayment.amount),
              plan: intermediatePayment.plan,
              transactionId: intermediatePayment.id,
              currency,
            }),
            schoolId: intermediatePayment.schoolId,
            type: "SALES",
          });
        }

        const successMsg = `Payment of ${fmtServer(Number(intermediatePayment.amount), currency)} for your ${intermediatePayment.plan} plan has been processed successfully.`;
        if (prefs.whatsapp && intermediatePayment.user.phone) {
          await sendWhatsApp({ phone: intermediatePayment.user.phone, content: successMsg, schoolId: intermediatePayment.schoolId });
        }

        console.log(`Dodo payment succeeded for school ${intermediatePayment.schoolId}, plan: ${intermediatePayment.plan}`);
        break;
      }

      case "payment.failed": {
        const customData = event.data.metadata || event.data.custom_data;
        const intermediatePaymentId = customData?.intermediate_payment_id;
        const paymentId = event.data.payment_id;

        // Try to find the IntermediatePayment
        const failedPayment = intermediatePaymentId
          ? await db.intermediatePayment.findUnique({
              where: { id: intermediatePaymentId },
              include: { user: true, school: true },
            })
          : paymentId
            ? await db.intermediatePayment.findFirst({
                where: { reference: paymentId },
                include: { user: true, school: true },
              })
            : null;

        if (failedPayment) {
          const failCurrency = (failedPayment.school?.currency || "USD") as CurrencyCode;
          await createNotification({
            schoolId: failedPayment.schoolId,
            title: "Payment Failed",
            message: `Payment of ${fmtServer(Number(failedPayment.amount), failCurrency)} for ${failedPayment.plan} plan failed to process.`,
            type: "PAYMENT_FAILED",
            priority: "HIGH",
            actionUrl: "/payments",
            metadata: {
              paymentId: failedPayment.id,
              amount: failedPayment.amount.toString(),
              plan: failedPayment.plan,
            },
            actorName: failedPayment.user.name,
          });

          const failPrefs = await getSchoolNotificationPrefs(failedPayment.schoolId);
          if (failPrefs.email) {
            await sendEmail({
              to: failedPayment.user.email,
              subject: "Payment Failed - Connect-Ed",
              html: generatePaymentFailedEmail({
                name: failedPayment.user.name,
                amount: Number(failedPayment.amount),
                plan: failedPayment.plan,
                currency: failCurrency,
              }),
              schoolId: failedPayment.schoolId,
              type: "SALES",
            });
          }

          const failMsg = `Your payment of ${fmtServer(Number(failedPayment.amount), failCurrency)} for the ${failedPayment.plan} plan failed. Please try again or contact support.`;
          if (failPrefs.whatsapp && failedPayment.user.phone) {
            await sendWhatsApp({ phone: failedPayment.user.phone, content: failMsg, schoolId: failedPayment.schoolId });
          }
        }

        console.log(`Dodo payment failed`, { intermediatePaymentId, paymentId });
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
