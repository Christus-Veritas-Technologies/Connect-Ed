import { Hono } from "hono";
import { db } from "@repo/db";
import {
  sendEmail,
  generateGraceReminderEmail,
  generateLockdownEmail,
  generateFinalWarningEmail,
} from "../lib/email";

const billing = new Hono();

/**
 * POST /billing/check-overdue
 *
 * Cron endpoint – should be called once per day.
 * Checks all schools with a nextPaymentDate in the past:
 *   • Days 1-3 overdue → send daily grace reminder email (from SALES)
 *   • Day 4 (just locked) → send final lockdown email
 *   • Day 4+ → school is locked (guard on frontend handles UI)
 *
 * Security: In production, protect with a shared secret header.
 */
billing.post("/check-overdue", async (c) => {
  // Simple shared-secret auth for cron
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && c.req.header("x-cron-secret") !== cronSecret) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const now = new Date();

  try {
    // Find all schools that have a nextPaymentDate in the past and have completed signup
    const overdueSchools = await db.school.findMany({
      where: {
        nextPaymentDate: { lt: now },
        signupFeePaid: true,
      },
      include: {
        users: {
          where: { role: "ADMIN", isActive: true },
          select: { email: true, name: true },
        },
      },
    });

    let graceReminders = 0;
    let lockdowns = 0;
    let alreadyLocked = 0;

    for (const school of overdueSchools) {
      if (!school.nextPaymentDate) continue;

      const msOverdue = now.getTime() - school.nextPaymentDate.getTime();
      const daysOverdue = Math.floor(msOverdue / (1000 * 60 * 60 * 24));

      const adminEmails = school.users.map((u) => u.email);
      const adminName = school.users[0]?.name || "Admin";
      const schoolName = school.name || "Your School";

      if (daysOverdue < 3) {
        // Grace period — send daily reminder (day 0, 1, 2 → grace day 1, 2, 3)
        const graceDay = daysOverdue + 1;

        for (const email of adminEmails) {
          await sendEmail({
            to: email,
            subject: `Payment Reminder (Day ${graceDay} of 3) – ${schoolName}`,
            html: generateGraceReminderEmail({
              name: adminName,
              schoolName,
              graceDay,
              dueDate: school.nextPaymentDate,
              plan: school.plan,
            }),
            schoolId: school.id,
            type: "SALES",
          });
        }

        graceReminders++;
      } else if (daysOverdue === 3) {
        // Day 4 — lockdown just kicked in. Send the final warning email.
        for (const email of adminEmails) {
          await sendEmail({
            to: email,
            subject: `⚠️ Access Suspended – ${schoolName}`,
            html: generateLockdownEmail({
              name: adminName,
              schoolName,
              plan: school.plan,
            }),
            schoolId: school.id,
            type: "SALES",
          });
        }

        lockdowns++;
      } else if (daysOverdue === 7) {
        // Day 8 — final "your school will be removed" email
        for (const email of adminEmails) {
          await sendEmail({
            to: email,
            subject: `🚨 Final Notice: School Removal – ${schoolName}`,
            html: generateFinalWarningEmail({
              name: adminName,
              schoolName,
              plan: school.plan,
            }),
            schoolId: school.id,
            type: "SALES",
          });
        }

        alreadyLocked++;
      } else {
        alreadyLocked++;
      }
    }

    return c.json({
      checked: overdueSchools.length,
      graceReminders,
      lockdowns,
      alreadyLocked,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Billing check-overdue error:", error);
    return c.json({ error: "Billing check failed" }, 500);
  }
});

export default billing;
