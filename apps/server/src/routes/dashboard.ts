import { Hono } from "hono";
import { db, FeeStatus } from "@repo/db";
import { requireAuth, requireParentAuth, requireStudentAuth } from "../middleware/auth";
import { successResponse, errors } from "../lib/response";

const dashboard = new Hono();

// ============================================
// ADMIN / RECEPTIONIST DASHBOARD
// ============================================

// GET /dashboard/stats - Get dashboard statistics (Admin/Receptionist)
dashboard.get("/stats", requireAuth, async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const userRole = c.get("role");

    // Get current month range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Fetch all stats in parallel
    const [
      school,
      studentStats,
      feeStats,
      expenseStats,
      lastMonthExpenseStats,
      overdueFeesCount,
      recentStudents,
      recentPayments,
      recentExpenses,
      monthlyRevenue,
      teacherCount,
      classCount,
    ] = await Promise.all([
      db.school.findUnique({
        where: { id: schoolId },
        select: {
          name: true,
          plan: true,
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

      db.expense.aggregate({
        where: {
          schoolId,
          date: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
        _sum: { amount: true },
      }),

      db.fee.count({
        where: {
          schoolId,
          status: FeeStatus.OVERDUE,
        },
      }),

      db.student.findMany({
        where: { schoolId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNumber: true,
          createdAt: true,
          class: { select: { name: true } },
        },
      }),

      db.feePayment.findMany({
        where: { schoolId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          amount: true,
          paymentMethod: true,
          createdAt: true,
          fee: {
            select: {
              student: {
                select: { firstName: true, lastName: true },
              },
            },
          },
        },
      }),

      db.expense.findMany({
        where: { schoolId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          amount: true,
          category: true,
          description: true,
          createdAt: true,
        },
      }),

      // Monthly revenue for charts (last 6 months)
      db.$queryRaw`
        SELECT 
          TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon') as month,
          EXTRACT(MONTH FROM "createdAt") as month_num,
          COALESCE(SUM(amount), 0)::float as collected
        FROM fee_payments
        WHERE "schoolId" = ${schoolId}
          AND "createdAt" >= ${new Date(now.getFullYear(), now.getMonth() - 5, 1)}
        GROUP BY DATE_TRUNC('month', "createdAt"), TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon'), EXTRACT(MONTH FROM "createdAt")
        ORDER BY DATE_TRUNC('month', "createdAt")
      ` as Promise<{ month: string; month_num: number; collected: number }[]>,

      db.user.count({
        where: { schoolId, role: "TEACHER", isActive: true },
      }),

      db.class.count({
        where: { schoolId, isActive: true },
      }),
    ]);

    // Get active students count
    const activeStudents = await db.student.count({
      where: { schoolId, isActive: true },
    });

    // Fee status breakdown for pie chart
    const feeStatusBreakdown = await db.fee.groupBy({
      by: ["status"],
      where: { schoolId },
      _sum: { amount: true },
      _count: true,
    });

    // Calculate stats
    const totalFees = feeStats._sum.amount || 0;
    const collectedFees = feeStats._sum.paidAmount || 0;
    const pendingFees = totalFees - collectedFees;
    const totalExpenses = expenseStats._sum.amount || 0;
    const lastMonthExpenses = lastMonthExpenseStats._sum.amount || 0;
    const expensesTrend = lastMonthExpenses > 0 
      ? ((totalExpenses - lastMonthExpenses) / lastMonthExpenses) * 100 
      : 0;

    return successResponse(c, {
      school: {
        name: school?.name,
        plan: school?.plan,
      },
      totalStudents: studentStats._count._all,
      activeStudents,
      totalFees,
      collectedFees,
      pendingFees,
      totalExpenses,
      expensesTrend: Math.round(expensesTrend),
      overdueFeesCount,
      teacherCount,
      classCount,
      collectionRate: totalFees > 0 ? Math.round((collectedFees / totalFees) * 100) : 0,
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
      recentActivity: {
        students: recentStudents.map((s) => ({
          id: s.id,
          name: `${s.firstName} ${s.lastName}`,
          admissionNumber: s.admissionNumber,
          class: s.class?.name || "Unassigned",
          date: s.createdAt,
          type: "student_added",
        })),
        payments: recentPayments.map((p) => ({
          id: p.id,
          amount: p.amount,
          method: p.paymentMethod,
          student: p.fee?.student ? `${p.fee.student.firstName} ${p.fee.student.lastName}` : "Unknown",
          date: p.createdAt,
          type: "payment_received",
        })),
        expenses: recentExpenses.map((e) => ({
          id: e.id,
          amount: e.amount,
          category: e.category,
          description: e.description,
          date: e.createdAt,
          type: "expense_recorded",
        })),
      },
      charts: {
        monthlyRevenue: monthlyRevenue.map((r) => ({
          name: r.month,
          value: Number(r.collected),
        })),
        feeStatus: feeStatusBreakdown.map((f) => ({
          name: f.status,
          value: f._sum.amount || 0,
          count: f._count,
        })),
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return errors.internalError(c);
  }
});

// GET /dashboard/overdue-fees - Get overdue fees list
dashboard.get("/overdue-fees", requireAuth, async (c) => {
  try {
    const schoolId = c.get("schoolId");

    const overdueFees = await db.fee.findMany({
      where: {
        schoolId,
        status: FeeStatus.OVERDUE,
      },
      orderBy: { dueDate: "asc" },
      take: 20,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
            class: { select: { name: true } },
            parent: { select: { name: true, email: true, phone: true } },
          },
        },
      },
    });

    return successResponse(c, {
      overdueFees: overdueFees.map((f) => ({
        id: f.id,
        amount: f.amount,
        paidAmount: f.paidAmount,
        balance: f.amount - f.paidAmount,
        dueDate: f.dueDate,
        description: f.description,
        student: {
          id: f.student.id,
          name: `${f.student.firstName} ${f.student.lastName}`,
          admissionNumber: f.student.admissionNumber,
          class: f.student.class?.name || "Unassigned",
          parent: f.student.parent,
        },
      })),
    });
  } catch (error) {
    console.error("Overdue fees error:", error);
    return errors.internalError(c);
  }
});

// ============================================
// TEACHER DASHBOARD
// ============================================

// GET /dashboard/teacher - Get teacher dashboard data
dashboard.get("/teacher", requireAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const schoolId = c.get("schoolId");
    const role = c.get("role");

    // Only teachers can access this
    if (role !== "TEACHER") {
      return errors.forbidden(c, "Only teachers can access this dashboard");
    }

    // Get teacher's assigned classes
    const classes = await db.class.findMany({
      where: {
        schoolId,
        classTeacherId: userId,
        isActive: true,
      },
      include: {
        students: {
          where: { isActive: true },
          orderBy: { lastName: "asc" },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
            gender: true,
            email: true,
            phone: true,
            dateOfBirth: true,
            parent: {
              select: { name: true, email: true, phone: true },
            },
          },
        },
        subjects: {
          include: {
            subject: { select: { id: true, name: true, code: true } },
          },
        },
        _count: {
          select: { students: { where: { isActive: true } } },
        },
      },
    });

    // Calculate stats
    const totalStudents = classes.reduce((acc, c) => acc + c._count.students, 0);
    const classesWithCapacity = classes.filter((c) => c.capacity);
    const avgUtilization = classesWithCapacity.length > 0
      ? Math.round(
          classesWithCapacity.reduce(
            (acc, c) => acc + (c._count.students / (c.capacity || 1)) * 100,
            0
          ) / classesWithCapacity.length
        )
      : 0;

    // Gender breakdown
    const genderBreakdown = {
      male: 0,
      female: 0,
      other: 0,
    };
    classes.forEach((c) => {
      c.students.forEach((s) => {
        if (s.gender === "MALE") genderBreakdown.male++;
        else if (s.gender === "FEMALE") genderBreakdown.female++;
        else genderBreakdown.other++;
      });
    });

    return successResponse(c, {
      stats: {
        totalClasses: classes.length,
        totalStudents,
        avgUtilization,
      },
      classes: classes.map((cls) => ({
        id: cls.id,
        name: cls.name,
        level: cls.level,
        capacity: cls.capacity,
        studentCount: cls._count.students,
        utilization: cls.capacity
          ? Math.round((cls._count.students / cls.capacity) * 100)
          : null,
        subjects: cls.subjects.map((s) => ({
          id: s.subject.id,
          name: s.subject.name,
          code: s.subject.code,
        })),
        students: cls.students.map((s) => ({
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          name: `${s.firstName} ${s.lastName}`,
          admissionNumber: s.admissionNumber,
          gender: s.gender,
          email: s.email,
          phone: s.phone,
          dateOfBirth: s.dateOfBirth,
          parentName: s.parent?.name || null,
          parentEmail: s.parent?.email || null,
          parentPhone: s.parent?.phone || null,
        })),
      })),
      charts: {
        genderBreakdown: [
          { name: "Male", value: genderBreakdown.male },
          { name: "Female", value: genderBreakdown.female },
          { name: "Other", value: genderBreakdown.other },
        ].filter((g) => g.value > 0),
      },
    });
  } catch (error) {
    console.error("Teacher dashboard error:", error);
    return errors.internalError(c);
  }
});

// ============================================
// PARENT DASHBOARD
// ============================================

// GET /dashboard/parent - Get parent dashboard data
dashboard.get("/parent", requireParentAuth, async (c) => {
  try {
    const parentId = c.get("parentId");
    const schoolId = c.get("schoolId");

    // Get parent with children and their fees
    const parent = await db.parent.findUnique({
      where: { id: parentId },
      include: {
        school: {
          select: { name: true, plan: true },
        },
        children: {
          where: { isActive: true },
          include: {
            class: { select: { id: true, name: true, level: true } },
            fees: {
              orderBy: { dueDate: "desc" },
              include: {
                feePayments: {
                  orderBy: { createdAt: "desc" },
                  select: {
                    id: true,
                    amount: true,
                    paymentMethod: true,
                    reference: true,
                    createdAt: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!parent) {
      return errors.notFound(c, "Parent not found");
    }

    // Calculate summary stats
    let totalFees = 0;
    let totalPaid = 0;
    let overdueFees = 0;
    const upcomingDueDates: { studentName: string; amount: number; dueDate: Date }[] = [];

    parent.children.forEach((child) => {
      child.fees.forEach((fee) => {
        totalFees += fee.amount;
        totalPaid += fee.paidAmount;
        if (fee.status === FeeStatus.OVERDUE) {
          overdueFees += fee.amount - fee.paidAmount;
        }
        // Upcoming dues (next 30 days)
        const dueDate = new Date(fee.dueDate);
        const now = new Date();
        const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        if (dueDate > now && dueDate <= thirtyDaysLater && fee.status !== FeeStatus.PAID) {
          upcomingDueDates.push({
            studentName: `${child.firstName} ${child.lastName}`,
            amount: fee.amount - fee.paidAmount,
            dueDate: fee.dueDate,
          });
        }
      });
    });

    return successResponse(c, {
      school: {
        name: parent.school.name,
        plan: parent.school.plan,
      },
      parent: {
        id: parent.id,
        name: parent.name,
        email: parent.email,
        phone: parent.phone,
      },
      summary: {
        totalChildren: parent.children.length,
        totalFees,
        totalPaid,
        totalBalance: totalFees - totalPaid,
        overdueFees,
      },
      upcomingDueDates: upcomingDueDates.sort((a, b) => 
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      ).slice(0, 5),
      children: parent.children.map((child) => {
        const childTotalFees = child.fees.reduce((acc, f) => acc + f.amount, 0);
        const childTotalPaid = child.fees.reduce((acc, f) => acc + f.paidAmount, 0);
        const childOverdue = child.fees
          .filter((f) => f.status === FeeStatus.OVERDUE)
          .reduce((acc, f) => acc + (f.amount - f.paidAmount), 0);

        return {
          id: child.id,
          firstName: child.firstName,
          lastName: child.lastName,
          name: `${child.firstName} ${child.lastName}`,
          admissionNumber: child.admissionNumber,
          class: child.class,
          totalFees: childTotalFees,
          totalPaid: childTotalPaid,
          balance: childTotalFees - childTotalPaid,
          overdueFees: childOverdue,
          fees: child.fees.map((fee) => ({
            id: fee.id,
            description: fee.description,
            amount: fee.amount,
            paidAmount: fee.paidAmount,
            balance: fee.amount - fee.paidAmount,
            dueDate: fee.dueDate,
            status: fee.status,
            payments: fee.feePayments.map((p) => ({
              id: p.id,
              amount: p.amount,
              method: p.paymentMethod,
              reference: p.reference,
              date: p.createdAt,
            })),
          })),
        };
      }),
    });
  } catch (error) {
    console.error("Parent dashboard error:", error);
    return errors.internalError(c);
  }
});

// ============================================
// STUDENT DASHBOARD
// ============================================

// GET /dashboard/student - Get student dashboard data
dashboard.get("/student", requireStudentAuth, async (c) => {
  try {
    const studentId = c.get("studentId");
    const schoolId = c.get("schoolId");

    // Get student with fees
    const student = await db.student.findUnique({
      where: { id: studentId },
      include: {
        school: {
          select: { name: true, plan: true },
        },
        class: {
          include: {
            subjects: {
              include: {
                subject: { select: { id: true, name: true, code: true } },
              },
            },
            classTeacher: { select: { name: true, email: true } },
          },
        },
        fees: {
          orderBy: { dueDate: "desc" },
          include: {
            feePayments: {
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                amount: true,
                paymentMethod: true,
                reference: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!student) {
      return errors.notFound(c, "Student not found");
    }

    // Calculate summary
    const totalFees = student.fees.reduce((acc, f) => acc + f.amount, 0);
    const totalPaid = student.fees.reduce((acc, f) => acc + f.paidAmount, 0);
    const overdueFees = student.fees
      .filter((f) => f.status === FeeStatus.OVERDUE)
      .reduce((acc, f) => acc + (f.amount - f.paidAmount), 0);

    return successResponse(c, {
      school: {
        name: student.school.name,
        plan: student.school.plan,
      },
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        name: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        email: student.email,
        phone: student.phone,
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
      },
      class: student.class
        ? {
            id: student.class.id,
            name: student.class.name,
            level: student.class.level,
            teacher: student.class.classTeacher
              ? {
                  name: student.class.classTeacher.name,
                  email: student.class.classTeacher.email,
                }
              : null,
            subjects: student.class.subjects.map((s) => ({
              id: s.subject.id,
              name: s.subject.name,
              code: s.subject.code,
            })),
          }
        : null,
      summary: {
        totalFees,
        totalPaid,
        balance: totalFees - totalPaid,
        overdueFees,
        totalFeeRecords: student.fees.length,
      },
      fees: student.fees.map((fee) => ({
        id: fee.id,
        description: fee.description,
        amount: fee.amount,
        paidAmount: fee.paidAmount,
        balance: fee.amount - fee.paidAmount,
        dueDate: fee.dueDate,
        status: fee.status,
        payments: fee.feePayments.map((p) => ({
          id: p.id,
          amount: p.amount,
          method: p.paymentMethod,
          reference: p.reference,
          date: p.createdAt,
        })),
      })),
    });
  } catch (error) {
    console.error("Student dashboard error:", error);
    return errors.internalError(c);
  }
});

export default dashboard;
