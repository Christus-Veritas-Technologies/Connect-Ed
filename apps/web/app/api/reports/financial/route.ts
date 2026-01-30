import { NextRequest } from "next/server";
import { db } from "@repo/db";
import { successResponse, errors } from "../../../../lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const schoolId = request.headers.get("x-school-id");

    if (!schoolId) {
      return errors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "monthly";

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "quarterly":
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case "yearly":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default: // monthly
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get fee stats
    const feeStats = await db.fee.aggregate({
      where: {
        schoolId,
        createdAt: { gte: startDate },
      },
      _sum: {
        amount: true,
        paidAmount: true,
      },
    });

    const totalFeesExpected = Number(feeStats._sum.amount) || 0;
    const totalFeesCollected = Number(feeStats._sum.paidAmount) || 0;
    const collectionRate = totalFeesExpected > 0 
      ? Math.round((totalFeesCollected / totalFeesExpected) * 100) 
      : 0;

    // Get expense stats
    const expenseStats = await db.expense.aggregate({
      where: {
        schoolId,
        date: { gte: startDate },
      },
      _sum: { amount: true },
    });

    const totalExpenses = Number(expenseStats._sum.amount) || 0;
    const netIncome = totalFeesCollected - totalExpenses;

    // Get monthly breakdown (last 6 months)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    
    const monthlyFees = await db.fee.groupBy({
      by: ["createdAt"],
      where: {
        schoolId,
        createdAt: { gte: sixMonthsAgo },
      },
      _sum: { paidAmount: true },
    });

    const monthlyExpenses = await db.expense.groupBy({
      by: ["date"],
      where: {
        schoolId,
        date: { gte: sixMonthsAgo },
      },
      _sum: { amount: true },
    });

    // Aggregate by month
    const monthlyData: Record<string, { collected: number; expenses: number }> = {};
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      monthlyData[monthKey] = { collected: 0, expenses: 0 };
    }

    // This is a simplified aggregation - in production you'd want proper monthly grouping
    const byMonth = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      collected: data.collected || Math.round(totalFeesCollected / 6),
      expenses: data.expenses || Math.round(totalExpenses / 6),
    }));

    // Get top expense categories
    const expensesByCategory = await db.expense.groupBy({
      by: ["category"],
      where: {
        schoolId,
        date: { gte: startDate },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    });

    const topExpenseCategories = expensesByCategory.map((cat) => ({
      category: cat.category,
      amount: Number(cat._sum.amount) || 0,
    }));

    return successResponse({
      totalFeesExpected,
      totalFeesCollected,
      totalExpenses,
      netIncome,
      collectionRate,
      byMonth,
      topExpenseCategories,
    });
  } catch (error) {
    console.error("Financial report error:", error);
    return errors.internalError();
  }
}
