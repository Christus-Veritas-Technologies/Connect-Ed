import { NextRequest } from "next/server";
import { db } from "@repo/db";
import { successResponse, errors } from "../../../../lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const schoolId = request.headers.get("x-school-id");

    if (!schoolId) {
      return errors.unauthorized();
    }

    // Get school with quota info
    const school = await db.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      return errors.notFound("School");
    }

    // Get student counts
    const [totalStudents, activeStudents] = await Promise.all([
      db.student.count({ where: { schoolId } }),
      db.student.count({ where: { schoolId, isActive: true } }),
    ]);

    // Get fee stats
    const feeStats = await db.fee.aggregate({
      where: { schoolId },
      _sum: {
        amount: true,
        paidAmount: true,
      },
    });

    const totalFees = Number(feeStats._sum.amount) || 0;
    const collectedFees = Number(feeStats._sum.paidAmount) || 0;
    const pendingFees = totalFees - collectedFees;

    // Get expense total for current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const expenseStats = await db.expense.aggregate({
      where: {
        schoolId,
        date: { gte: startOfMonth },
      },
      _sum: { amount: true },
    });

    const totalExpenses = Number(expenseStats._sum.amount) || 0;

    return successResponse({
      totalStudents,
      activeStudents,
      totalFees,
      collectedFees,
      pendingFees,
      totalExpenses,
      quotaUsage: {
        email: { used: school.emailUsed, limit: school.emailQuota },
        whatsapp: { used: school.whatsappUsed, limit: school.whatsappQuota },
        sms: { used: school.smsUsed, limit: school.smsQuota },
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return errors.internalError();
  }
}
