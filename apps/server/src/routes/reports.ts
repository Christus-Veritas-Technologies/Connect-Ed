import { Hono } from "hono";
import { db, FeeStatus } from "@repo/db";
import { requireAuth } from "../middleware/auth";
import { successResponse, errors } from "../lib/response";

const reports = new Hono();

// Apply auth middleware to all routes
reports.use("*", requireAuth);

// GET /reports/financial - Get financial report
reports.get("/financial", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const period = c.req.query("period") || "month"; // month, quarter, year

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "quarter":
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get fee data
    const [fees, expenses, monthlyBreakdown] = await Promise.all([
      db.fee.aggregate({
        where: {
          schoolId,
          createdAt: { gte: startDate },
        },
        _sum: { amount: true, paidAmount: true },
        _count: true,
      }),

      db.expense.aggregate({
        where: {
          schoolId,
          date: { gte: startDate },
        },
        _sum: { amount: true },
        _count: true,
      }),

      // Monthly breakdown for charts
      db.$queryRaw<{ month: string; fees: number; payments: number; expenses: number }[]>`
        SELECT 
          TO_CHAR(date_trunc('month', f."createdAt"), 'YYYY-MM') as month,
          COALESCE(SUM(f.amount), 0)::float as fees,
          COALESCE(SUM(f."paidAmount"), 0)::float as payments,
          0::float as expenses
        FROM "Fee" f
        WHERE f."schoolId" = ${schoolId}
          AND f."createdAt" >= ${startDate}
        GROUP BY date_trunc('month', f."createdAt")
        ORDER BY month
      `,
    ]);

    // Get overdue fees
    const overdueFees = await db.fee.aggregate({
      where: {
        schoolId,
        status: { not: FeeStatus.PAID },
        dueDate: { lt: now },
      },
      _sum: { amount: true, paidAmount: true },
      _count: true,
    });

    // Get top expense categories
    const topCategories = await db.expense.groupBy({
      by: ["category"],
      where: {
        schoolId,
        date: { gte: startDate },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    });

    const totalFees = fees._sum.amount || 0;
    const totalCollected = fees._sum.paidAmount || 0;
    const totalExpenses = expenses._sum.amount || 0;
    const overdueAmount = (overdueFees._sum.amount || 0) - (overdueFees._sum.paidAmount || 0);

    return successResponse(c, {
      summary: {
        totalFees,
        totalCollected,
        totalPending: totalFees - totalCollected,
        collectionRate: totalFees > 0 ? Math.round((totalCollected / totalFees) * 100) : 0,
        totalExpenses,
        netIncome: totalCollected - totalExpenses,
        overdueAmount,
        overdueCount: overdueFees._count,
      },
      monthlyBreakdown,
      topExpenseCategories: topCategories.map((c) => ({
        category: c.category,
        amount: c._sum.amount || 0,
      })),
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
    });
  } catch (error) {
    console.error("Financial report error:", error);
    return errors.internalError(c);
  }
});

export default reports;
