import { Hono } from "hono";
import { db, FeeStatus } from "@repo/db";
import { requireAuth } from "../middleware/auth";
import { successResponse, errors } from "../lib/response";

const dashboard = new Hono();

// Apply auth middleware to all routes
dashboard.use("*", requireAuth);

// GET /dashboard/stats - Get dashboard statistics
dashboard.get("/stats", async (c) => {
  try {
    const schoolId = c.get("schoolId");

    // Get current month range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch all stats in parallel
    const [
      school,
      studentStats,
      feeStats,
      expenseStats,
    ] = await Promise.all([
      db.school.findUnique({
        where: { id: schoolId },
        select: {
          emailQuota: true,
          whatsappQuota: true,
          smsQuota: true,
          emailUsed: true,
          whatsappUsed: true,
          smsUsed: true,
        },
      }),

      db.student.aggregate({
        where: { schoolId },
        _count: { _all: true },
      }),

      db.fee.aggregate({
        where: { schoolId },
        _sum: { amount: true, paidAmount: true },
      }),

      db.expense.aggregate({
        where: {
          schoolId,
          date: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
    ]);

    // Get active students count
    const activeStudents = await db.student.count({
      where: { schoolId, isActive: true },
    });

    // Calculate stats
    const totalFees = feeStats._sum.amount || 0;
    const collectedFees = feeStats._sum.paidAmount || 0;
    const pendingFees = totalFees - collectedFees;
    const totalExpenses = expenseStats._sum.amount || 0;

    return successResponse(c, {
      totalStudents: studentStats._count._all,
      activeStudents,
      totalFees,
      collectedFees,
      pendingFees,
      totalExpenses,
      quotaUsage: {
        email: {
          used: school?.emailUsed || 0,
          limit: school?.emailQuota || 200,
        },
        whatsapp: {
          used: school?.whatsappUsed || 0,
          limit: school?.whatsappQuota || 200,
        },
        sms: {
          used: school?.smsUsed || 0,
          limit: school?.smsQuota || 100,
        },
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return errors.internalError(c);
  }
});

export default dashboard;
