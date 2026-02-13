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
      thisMonthStudents,
      lastMonthStudents,
      feeStats,
      thisMonthCollections,
      lastMonthCollections,
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

      db.student.count({
        where: {
          schoolId,
          createdAt: { gte: startOfMonth },
        },
      }),

      db.student.count({
        where: {
          schoolId,
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
      }),

      db.fee.aggregate({
        where: { schoolId },
        _sum: { amount: true, paidAmount: true },
      }),

      db.feePayment.aggregate({
        where: {
          schoolId,
          createdAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),

      db.feePayment.aggregate({
        where: {
          schoolId,
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
        _sum: { amount: true },
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
    const totalStudents = studentStats._count._all;
    const studentsTrend = lastMonthStudents > 0 
      ? ((thisMonthStudents - lastMonthStudents) / lastMonthStudents) * 100 
      : thisMonthStudents > 0 ? 100 : 0;

    const totalFees = feeStats._sum.amount || 0;
    const collectedFees = feeStats._sum.paidAmount || 0;
    const pendingFees = totalFees - collectedFees;
    
    const thisMonthCollected = thisMonthCollections._sum.amount || 0;
    const lastMonthCollected = lastMonthCollections._sum.amount || 0;
    const collectionsTrend = lastMonthCollected > 0 
      ? ((thisMonthCollected - lastMonthCollected) / lastMonthCollected) * 100 
      : thisMonthCollected > 0 ? 100 : 0;

    const totalExpenses = expenseStats._sum.amount || 0;
    const lastMonthExpenses = lastMonthExpenseStats._sum.amount || 0;
    const expensesTrend = lastMonthExpenses > 0 
      ? ((totalExpenses - lastMonthExpenses) / lastMonthExpenses) * 100 
      : totalExpenses > 0 ? 100 : 0;

    return successResponse(c, {
      school: {
        name: school?.name,
        plan: school?.plan,
      },
      totalStudents,
      studentsTrend: Math.round(studentsTrend),
      activeStudents,
      totalFees,
      collectedFees,
      collectionsTrend: Math.round(collectionsTrend),
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
    const teacherClassIds = await db.class.findMany({
      where: { schoolId, classTeacherId: userId, isActive: true },
      select: { id: true },
    });
    const classIds = teacherClassIds.map((c) => c.id);

    // Get teacher's classes teaching (subject assignments)
    const teacherClassAssignments = await db.teacherClass.findMany({
      where: { teacherId: userId },
      select: { classId: true },
    });
    const allClassIds = [...new Set([...classIds, ...teacherClassAssignments.map((tc) => tc.classId)])];

    // Parallel queries for stats
    const [
      classes,
      totalStudents,
      totalFiles,
      totalExams,
      examResults,
      recentExams,
    ] = await Promise.all([
      // Full class data
      db.class.findMany({
        where: { schoolId, classTeacherId: userId, isActive: true },
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
              parent: { select: { name: true, email: true, phone: true } },
            },
          },
          subjects: {
            include: { subject: { select: { id: true, name: true, code: true } } },
          },
          _count: { select: { students: { where: { isActive: true } } } },
        },
      }),

      // Total students across teacher's classes
      allClassIds.length > 0
        ? db.student.count({ where: { schoolId, classId: { in: allClassIds }, isActive: true } })
        : Promise.resolve(0),

      // Files uploaded by or shared with teacher
      db.sharedFile.count({
        where: {
          schoolId,
          OR: [
            { uploadedByUserId: userId },
            { recipients: { some: { recipientUserId: userId } } },
          ],
        },
      }),

      // Exams created by this teacher
      db.exam.count({ where: { teacherId: userId } }),

      // All exam results for teacher's exams (for pass rate calculation)
      db.examResult.findMany({
        where: { exam: { teacherId: userId } },
        select: { mark: true, exam: { select: { subjectId: true } } },
      }),

      // Recent exams with results summary
      db.exam.findMany({
        where: { teacherId: userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          subject: { select: { name: true, code: true } },
          class: { select: { name: true } },
          results: { select: { mark: true } },
        },
      }),
    ]);

    // Calculate average pass rate (mark >= 50 = pass)
    const totalResults = examResults.length;
    const passCount = examResults.filter((r) => r.mark >= 50).length;
    const avgPassRate = totalResults > 0 ? Math.round((passCount / totalResults) * 100) : 0;

    // Best performing students: get all students with exam results for teacher's exams
    const studentResults = await db.examResult.findMany({
      where: { exam: { teacherId: userId } },
      select: {
        mark: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
            class: { select: { name: true } },
          },
        },
      },
    });

    // Group by student, compute average
    const studentAvgMap = new Map<string, { student: any; total: number; count: number }>();
    studentResults.forEach((r) => {
      const existing = studentAvgMap.get(r.student.id);
      if (existing) {
        existing.total += r.mark;
        existing.count += 1;
      } else {
        studentAvgMap.set(r.student.id, { student: r.student, total: r.mark, count: 1 });
      }
    });
    const bestStudents = Array.from(studentAvgMap.values())
      .map((s) => ({
        id: s.student.id,
        name: `${s.student.firstName} ${s.student.lastName}`,
        admissionNumber: s.student.admissionNumber,
        className: s.student.class?.name || "Unassigned",
        averageMark: Math.round(s.total / s.count),
        examsCount: s.count,
      }))
      .sort((a, b) => b.averageMark - a.averageMark)
      .slice(0, 5);

    // Format recent exams
    const formattedRecentExams = recentExams.map((exam) => {
      const marks = exam.results.map((r) => r.mark);
      const avg = marks.length > 0 ? Math.round(marks.reduce((a, b) => a + b, 0) / marks.length) : 0;
      const passRate = marks.length > 0 ? Math.round((marks.filter((m) => m >= 50).length / marks.length) * 100) : 0;
      return {
        id: exam.id,
        name: exam.name,
        subject: exam.subject.name,
        subjectCode: exam.subject.code,
        className: exam.class.name,
        paper: exam.paper,
        studentsCount: marks.length,
        averageMark: avg,
        passRate,
        createdAt: exam.createdAt,
      };
    });

    // Gender breakdown
    const genderBreakdown = { male: 0, female: 0, other: 0 };
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
        totalFiles,
        totalExams,
        avgPassRate,
      },
      bestStudents,
      recentExams: formattedRecentExams,
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
// MY CLASS (for teachers and students)
// ============================================

// GET /dashboard/my-class - Get class data for teacher or student
dashboard.get("/my-class", requireAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const schoolId = c.get("schoolId");
    const role = c.get("role");

    if (role !== "TEACHER") {
      return errors.forbidden(c, "Only teachers can access this endpoint");
    }

    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "12");
    const search = c.req.query("search") || "";
    const gender = c.req.query("gender") || "";
    const status = c.req.query("status") || "";
    const classId = c.req.query("classId") || "";

    // Get teacher's class(es) — both as class teacher AND as subject teacher
    // First, get classes where teacher is the class teacher
    const classTeacherClasses = await db.class.findMany({
      where: {
        schoolId,
        classTeacherId: userId,
        isActive: true,
        ...(classId ? { id: classId } : {}),
      },
      select: { id: true, name: true, level: true, capacity: true },
    });

    // Also get classes where teacher is a subject teacher
    const teacherClassAssignments = await db.teacherClass.findMany({
      where: {
        teacherId: userId,
        class: { schoolId, isActive: true, ...(classId ? { id: classId } : {}) },
      },
      select: {
        class: { select: { id: true, name: true, level: true, capacity: true } },
      },
    });

    // Combine and deduplicate classes
    const classMap = new Map<string, any>();
    
    classTeacherClasses.forEach((cl) => {
      classMap.set(cl.id, cl);
    });
    
    teacherClassAssignments.forEach(({ class: cl }) => {
      if (!classMap.has(cl.id)) {
        classMap.set(cl.id, cl);
      }
    });

    const teacherClasses = Array.from(classMap.values());

    if (teacherClasses.length === 0) {
      return successResponse(c, {
        classes: [],
        students: [],
        stats: { totalStudents: 0, totalMessages: 0, totalParents: 0 },
        pagination: { page, limit, total: 0, totalPages: 0 },
      });
    }

    const targetClassIds = teacherClasses.map((cl) => cl.id);

    // Build student filter
    const studentWhere: any = {
      schoolId,
      classId: { in: targetClassIds },
      isActive: true,
    };
    if (search) {
      studentWhere.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { admissionNumber: { contains: search, mode: "insensitive" } },
      ];
    }
    if (gender) {
      studentWhere.gender = gender;
    }
    if (status) {
      studentWhere.status = status;
    }

    // Parallel queries
    const [total, students, messageCount, parentCount] = await Promise.all([
      db.student.count({ where: studentWhere }),
      db.student.findMany({
        where: studentWhere,
        orderBy: { lastName: "asc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNumber: true,
          gender: true,
          status: true,
          email: true,
          phone: true,
          dateOfBirth: true,
          createdAt: true,
          class: { select: { id: true, name: true } },
          parent: { select: { id: true, name: true, email: true, phone: true } },
        },
      }),

      // Total chat messages across teacher's classes
      db.chatMessage.count({
        where: { classId: { in: targetClassIds } },
      }),

      // Unique parents across all students in teacher's classes
      db.student.findMany({
        where: { schoolId, classId: { in: targetClassIds }, isActive: true, parentId: { not: null } },
        select: { parentId: true },
        distinct: ["parentId"],
      }).then((r) => r.length),
    ]);

    const totalStudents = await db.student.count({
      where: { schoolId, classId: { in: targetClassIds }, isActive: true },
    });

    return successResponse(c, {
      classes: teacherClasses,
      students: students.map((s) => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        name: `${s.firstName} ${s.lastName}`,
        admissionNumber: s.admissionNumber,
        gender: s.gender,
        status: s.status,
        email: s.email,
        phone: s.phone,
        dateOfBirth: s.dateOfBirth,
        createdAt: s.createdAt,
        className: s.class?.name || "Unassigned",
        classId: s.class?.id || null,
        parent: s.parent ? {
          id: s.parent.id,
          name: s.parent.name,
          email: s.parent.email,
          phone: s.parent.phone,
        } : null,
      })),
      stats: {
        totalStudents,
        totalMessages: messageCount,
        totalParents: parentCount,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("My class error:", error);
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

// ============================================
// NOTIFICATIONS
// ============================================

// GET /dashboard/notifications - Get all notifications for current user/school with role filtering
dashboard.get("/notifications", requireAuth, async (c) => {
  try {
    const userId = c.get("userId");
    const schoolId = c.get("schoolId");
    const userRole = c.get("role");

    // Fetch notifications for this user
    // Admins see all notifications
    // Teachers see notifications with TEACHER+ role
    // Students see notifications with STUDENT role
    const roleFilters = {
      ADMIN: ["ADMIN", "TEACHER", "STUDENT"],
      TEACHER: ["TEACHER", "STUDENT"],
      STUDENT: ["STUDENT"],
    };

    const allowedRoles = roleFilters[userRole as keyof typeof roleFilters] || ["STUDENT"];

    // Build OR conditions for role-based notifications
    const roleConditions = allowedRoles.map(role => ({
      userId: null,
      metadata: {
        path: ["role"],
        equals: role,
      },
    }));

    const notifications = await db.notification.findMany({
      where: {
        schoolId,
        OR: [
          { userId }, // Personal notifications
          ...roleConditions, // Role-based notifications
        ],
      },
      orderBy: [
        { isRead: "asc" },
        { createdAt: "desc" }
      ],
      take: 100,
    });

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return successResponse(c, {
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return errors.internalError(c);
  }
});

// GET /dashboard/notifications/unread-counts - Get unread notification counts grouped by actionUrl
dashboard.get("/notifications/unread-counts", requireAuth, async (c) => {
  try {
    const userId = c.get("userId");

    // Fetch all unread notifications for the user
    const notifications = await db.notification.findMany({
      where: {
        userId,
        isRead: false,
      },
      select: {
        actionUrl: true,
      },
    });

    // Group by actionUrl and count
    const counts: Record<string, number> = {};
    notifications.forEach((notification) => {
      const url = notification.actionUrl || "general";
      counts[url] = (counts[url] || 0) + 1;
    });

    return successResponse(c, { counts });
  } catch (error) {
    console.error("Notification counts error:", error);
    return errors.internalError(c);
  }
});

export default dashboard;
