import { Hono } from "hono";
import { db, FeeStatus } from "@repo/db";
import { requireAuth } from "../middleware/auth";
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

    const totalFees = Number(feeStats._sum.amount || 0);
    const collectedFees = Number(feeStats._sum.paidAmount || 0);
    const pendingFees = totalFees - collectedFees;
    
    const thisMonthCollected = Number(thisMonthCollections._sum.amount || 0);
    const lastMonthCollected = Number(lastMonthCollections._sum.amount || 0);
    const collectionsTrend = lastMonthCollected > 0 
      ? ((thisMonthCollected - lastMonthCollected) / lastMonthCollected) * 100 
      : thisMonthCollected > 0 ? 100 : 0;

    const totalExpenses = Number(expenseStats._sum.amount || 0);
    const lastMonthExpenses = Number(lastMonthExpenseStats._sum.amount || 0);
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
        balance: Number(f.amount) - Number(f.paidAmount),
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
      return errors.forbidden(c);
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
      return errors.forbidden(c);
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

// GET /dashboard/my-class/student - Get class data for a student
dashboard.get("/my-class/student", requireAuth, async (c) => {
  try {
    const role = c.get("role");
    if (role !== ("STUDENT" as any)) {
      return errors.forbidden(c);
    }
    const studentId = c.get("userId");
    const schoolId = c.get("schoolId");

    // Get student with class info
    const student = await db.student.findUnique({
      where: { id: studentId },
      include: {
        class: {
          include: {
            classTeacher: { select: { id: true, name: true, email: true } },
            subjects: {
              include: { subject: { select: { id: true, name: true, code: true } } },
            },
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
              },
            },
            _count: { select: { students: { where: { isActive: true } } } },
          },
        },
      },
    });

    if (!student) {
      return errors.notFound(c, "Student not found");
    }

    if (!student.class) {
      return successResponse(c, {
        class: null,
        classmates: [],
        subjects: [],
        teacher: null,
        stats: { totalClassmates: 0, totalSubjects: 0 },
      });
    }

    const cls = student.class;

    return successResponse(c, {
      class: {
        id: cls.id,
        name: cls.name,
        level: cls.level,
        capacity: cls.capacity,
        studentCount: cls._count.students,
      },
      teacher: cls.classTeacher
        ? {
            id: cls.classTeacher.id,
            name: cls.classTeacher.name,
            email: cls.classTeacher.email,
          }
        : null,
      subjects: cls.subjects.map((s) => ({
        id: s.subject.id,
        name: s.subject.name,
        code: s.subject.code,
      })),
      classmates: cls.students
        .filter((s) => s.id !== studentId)
        .map((s) => ({
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          name: `${s.firstName} ${s.lastName}`,
          admissionNumber: s.admissionNumber,
          gender: s.gender,
          email: s.email,
        })),
      stats: {
        totalClassmates: cls._count.students - 1,
        totalSubjects: cls.subjects.length,
      },
    });
  } catch (error) {
    console.error("Student my-class error:", error);
    return errors.internalError(c);
  }
});

// ============================================
// PARENT DASHBOARD
// ============================================

// GET /dashboard/parent - Get parent dashboard data
dashboard.get("/parent", requireAuth, async (c) => {
  try {
    const role = c.get("role");
    if (role !== ("PARENT" as any)) {
      return errors.forbidden(c);
    }
    const parentId = c.get("userId");
    const schoolId = c.get("schoolId");

    // Get parent with children, fees, and exam results
    const parent = await db.parent.findUnique({
      where: { id: parentId },
      include: {
        school: {
          select: { name: true, plan: true },
        },
        children: {
          where: { isActive: true },
          include: {
            class: {
              select: {
                id: true,
                name: true,
                level: true,
                classTeacher: { select: { name: true, email: true } },
              },
            },
            fees: {
              orderBy: { dueDate: "desc" },
              take: 5,
              include: {
                payments: {
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
            examResults: {
              orderBy: { createdAt: "desc" },
              take: 10,
              include: {
                exam: {
                  include: {
                    subject: { select: { id: true, name: true, code: true } },
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

    // Get grades for pass/fail determination
    const allGrades = await db.grade.findMany({ where: { schoolId } });

    // Calculate summary stats
    let totalFees = 0;
    let totalPaid = 0;
    let overdueFees = 0;

    parent.children.forEach((child) => {
      child.fees.forEach((fee) => {
        totalFees += Number(fee.amount);
        totalPaid += Number(fee.paidAmount);
        if (fee.status === FeeStatus.OVERDUE) {
          overdueFees += Number(fee.amount) - Number(fee.paidAmount);
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
      children: parent.children.map((child) => {
        const childTotalFees = child.fees.reduce((acc, f) => acc + Number(f.amount), 0);
        const childTotalPaid = child.fees.reduce((acc, f) => acc + Number(f.paidAmount), 0);
        const childOverdue = child.fees
          .filter((f) => f.status === FeeStatus.OVERDUE)
          .reduce((acc, f) => acc + Number(f.amount) - Number(f.paidAmount), 0);

        // Latest exam per subject for this child
        const latestExamsBySubject = new Map<string, (typeof child.examResults)[0]>();
        for (const result of child.examResults) {
          const subId = result.exam.subjectId;
          if (!latestExamsBySubject.has(subId)) {
            latestExamsBySubject.set(subId, result);
          }
        }

        const latestExams = Array.from(latestExamsBySubject.values()).map((result) => {
          const subjectGrades = allGrades.filter((g) => g.subjectId === result.exam.subjectId || g.subjectId === null);
          const grade = subjectGrades.find((g) => result.mark >= g.minMark && result.mark <= g.maxMark);
          const isPass = grade ? grade.isPass : result.mark >= 50;
          let gradeName = grade?.name || "N/A";
          if (!grade) {
            if (result.mark >= 90) gradeName = "A";
            else if (result.mark >= 80) gradeName = "B";
            else if (result.mark >= 70) gradeName = "C";
            else if (result.mark >= 60) gradeName = "D";
            else if (result.mark >= 50) gradeName = "E";
            else gradeName = "F";
          }
          return {
            subjectName: result.exam.subject.name,
            examName: result.exam.name,
            mark: result.mark,
            grade: gradeName,
            isPass,
          };
        });

        const overallAverage = latestExams.length > 0
          ? Math.round(latestExams.reduce((sum, e) => sum + e.mark, 0) / latestExams.length)
          : 0;

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
          overallAverage,
          latestExams,
          fees: child.fees.map((fee) => ({
            id: fee.id,
            description: fee.description,
            amount: Number(fee.amount),
            paidAmount: Number(fee.paidAmount),
            balance: Number(fee.amount) - Number(fee.paidAmount),
            dueDate: fee.dueDate,
            status: fee.status,
          })),
        };
      }),
    });
  } catch (error) {
    console.error("Parent dashboard error:", error);
    return errors.internalError(c);
  }
});

// GET /dashboard/my-child-class - Get child's class info for parent
dashboard.get("/my-child-class", requireAuth, async (c) => {
  try {
    const role = c.get("role");
    if (role !== ("PARENT" as any)) {
      return errors.forbidden(c);
    }
    const parentId = c.get("userId");
    const schoolId = c.get("schoolId");

    const children = await db.student.findMany({
      where: { parentId, schoolId, isActive: true },
      include: {
        class: {
          include: {
            classTeacher: { select: { id: true, name: true, email: true, phone: true } },
            subjects: {
              include: {
                subject: { select: { id: true, name: true, code: true } },
              },
            },
            students: {
              where: { isActive: true },
              select: {
                id: true,
                firstName: true,
                lastName: true,
                admissionNumber: true,
              },
            },
          },
        },
      },
    });

    return successResponse(c, {
      children: children.map((child) => ({
        id: child.id,
        name: `${child.firstName} ${child.lastName}`,
        admissionNumber: child.admissionNumber,
        class: child.class ? {
          id: child.class.id,
          name: child.class.name,
          level: child.class.level,
          teacher: child.class.classTeacher,
          subjects: child.class.subjects.map((s) => ({
            id: s.subject.id,
            name: s.subject.name,
            code: s.subject.code,
            teacher: null, // SubjectClass doesn't have teacher relation
          })),
          totalStudents: child.class.students.length,
        } : null,
      })),
    });
  } catch (error) {
    console.error("Parent my-child-class error:", error);
    return errors.internalError(c);
  }
});

// GET /dashboard/fee-payments - Get all fee info for parent's children (view-only)
dashboard.get("/fee-payments", requireAuth, async (c) => {
  try {
    const role = c.get("role");
    if (role !== ("PARENT" as any)) {
      return errors.forbidden(c);
    }
    const parentId = c.get("userId");
    const schoolId = c.get("schoolId");

    const children = await db.student.findMany({
      where: { parentId, schoolId, isActive: true },
      include: {
        fees: {
          orderBy: { dueDate: "desc" },
          include: {
            payments: {
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

    let totalFees = 0;
    let totalPaid = 0;
    let overdueFees = 0;

    const allFees = children.flatMap((child) =>
      child.fees.map((fee) => {
        totalFees += Number(fee.amount);
        totalPaid += Number(fee.paidAmount);
        if (fee.status === FeeStatus.OVERDUE) {
          overdueFees += Number(fee.amount) - Number(fee.paidAmount);
        }
        return {
          id: fee.id,
          childName: `${child.firstName} ${child.lastName}`,
          childId: child.id,
          description: fee.description,
          amount: Number(fee.amount),
          paidAmount: Number(fee.paidAmount),
          balance: Number(fee.amount) - Number(fee.paidAmount),
          dueDate: fee.dueDate,
          status: fee.status,
          payments: fee.payments.map((p) => ({
            id: p.id,
            amount: Number(p.amount),
            method: p.paymentMethod,
            reference: p.reference,
            date: p.createdAt,
          })),
        };
      })
    );

    return successResponse(c, {
      summary: { totalFees, totalPaid, balance: totalFees - totalPaid, overdueFees },
      fees: allFees,
    });
  } catch (error) {
    console.error("Parent fee-payments error:", error);
    return errors.internalError(c);
  }
});

// ============================================
// STUDENT DASHBOARD
// ============================================

// GET /dashboard/student - Get student dashboard data
dashboard.get("/student", requireAuth, async (c) => {
  try {
    const role = c.get("role");
    if (role !== ("STUDENT" as any)) {
      return errors.forbidden(c);
    }
    const studentId = c.get("userId");
    const schoolId = c.get("schoolId");

    // Get student with class, fees, and exam results
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
          take: 3, // Only latest 3 fees for dashboard
          include: {
            payments: {
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

    // Get latest exam results (last exam per subject)
    const examResults = await db.examResult.findMany({
      where: { studentId, exam: { schoolId } },
      include: {
        exam: {
          include: {
            subject: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get grades for pass/fail determination
    const allGrades = await db.grade.findMany({ where: { schoolId } });

    // Group by subject and get latest exam per subject
    const latestExamsBySubject = new Map<string, (typeof examResults)[0]>();
    for (const result of examResults) {
      const subId = result.exam.subjectId;
      if (!latestExamsBySubject.has(subId)) {
        latestExamsBySubject.set(subId, result);
      }
    }

    // Transform into dashboard format
    const latestExams = Array.from(latestExamsBySubject.values()).map((result) => {
      // Determine if pass based on grades
      const subjectGrades = allGrades.filter((g) => g.subjectId === result.exam.subjectId || g.subjectId === null);
      const grade = subjectGrades.find((g) => result.mark >= g.minMark && result.mark <= g.maxMark);
      const isPass = grade ? grade.isPass : result.mark >= 50;
      
      // Determine grade name
      let gradeName = grade?.name || "N/A";
      if (!grade) {
        if (result.mark >= 90) gradeName = "A";
        else if (result.mark >= 80) gradeName = "B";
        else if (result.mark >= 70) gradeName = "C";
        else if (result.mark >= 60) gradeName = "D";
        else if (result.mark >= 50) gradeName = "E";
        else gradeName = "F";
      }

      return {
        subjectName: result.exam.subject.name,
        subjectCode: result.exam.subject.code,
        examName: result.exam.name,
        mark: result.mark,
        grade: gradeName,
        isPass,
        createdAt: result.createdAt,
      };
    });

    // Calculate overall report snapshot
    const overallAverage = latestExams.length > 0
      ? Math.round(latestExams.reduce((sum, e) => sum + e.mark, 0) / latestExams.length)
      : 0;
    
    const passCount = latestExams.filter((e) => e.isPass).length;
    const overallPassRate = latestExams.length > 0
      ? Math.round((passCount / latestExams.length) * 100)
      : 0;

    // Identify strongest and weakest subjects
    const sorted = [...latestExams].sort((a, b) => a.mark - b.mark);
    const weakestSubject = sorted.length > 0 ? sorted[0] : null;
    const strongestSubject = sorted.length > 0 ? sorted[sorted.length - 1] : null;

    // Calculate fee summary (minimal for dashboard)
    const totalFees = student.fees.reduce((acc, f) => acc + Number(f.amount), 0);
    const totalPaid = student.fees.reduce((acc, f) => acc + Number(f.paidAmount), 0);
    const overdueFees = student.fees
      .filter((f) => f.status === FeeStatus.OVERDUE)
      .reduce((acc, f) => acc + (Number(f.amount) - Number(f.paidAmount)), 0);

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
      // Latest exam results - shows current marks per subject
      latestExams: latestExams.sort((a, b) => b.mark - a.mark), // Sort by mark descending
      // Report snapshot - key metrics
      reportSnapshot: {
        overallAverage,
        overallPassRate,
        totalSubjects: latestExams.length,
        examsTaken: latestExams.length,
        examsPassed: passCount,
        weakestSubject,
        strongestSubject,
      },
      // Minimal fee info (moved to bottom of dashboard)
      feeSummary: {
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
        balance: Number(fee.amount) - Number(fee.paidAmount),
        dueDate: fee.dueDate,
        status: fee.status,
        payments: fee.payments.map((p) => ({
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

// GET /dashboard/student/exams - Get student's exam results
dashboard.get("/student/exams", requireAuth, async (c) => {
  try {
    const role = c.get("role");
    if (role !== ("STUDENT" as any)) {
      return errors.forbidden(c);
    }
    const studentId = c.get("userId");
    const schoolId = c.get("schoolId");
    const subjectId = c.req.query("subjectId");

    // Build query filter
    const where: any = {
      studentId,
      exam: { schoolId },
    };
    if (subjectId) {
      where.exam.subjectId = subjectId;
    }

    // Get all exam results for the student
    const examResults = await db.examResult.findMany({
      where,
      include: {
        exam: {
          include: {
            subject: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get grades for pass/fail determination
    const allGrades = await db.grade.findMany({ where: { schoolId } });

    // Transform results
    const formattedResults = examResults.map((result) => {
      // Determine if pass based on grades
      const subjectGrades = allGrades.filter(
        (g) => g.subjectId === result.exam.subjectId || g.subjectId === null
      );
      const grade = subjectGrades.find(
        (g) => result.mark >= g.minMark && result.mark <= g.maxMark
      );
      const isPass = grade ? grade.isPass : result.mark >= 50;

      // Determine grade name
      let gradeName = grade?.name || "N/A";
      if (!grade) {
        if (result.mark >= 90) gradeName = "A";
        else if (result.mark >= 80) gradeName = "B";
        else if (result.mark >= 70) gradeName = "C";
        else if (result.mark >= 60) gradeName = "D";
        else if (result.mark >= 50) gradeName = "E";
        else gradeName = "F";
      }

      return {
        id: result.id,
        mark: result.mark,
        grade: gradeName,
        isPass,
        createdAt: result.createdAt,
        exam: {
          id: result.exam.id,
          name: result.exam.name,
          paper: result.exam.paper,
          subject: result.exam.subject,
        },
      };
    });

    // Calculate stats
    const totalExams = formattedResults.length;
    const averageMark =
      totalExams > 0
        ? formattedResults.reduce((sum, r) => sum + r.mark, 0) / totalExams
        : 0;
    const passCount = formattedResults.filter((r) => r.isPass).length;
    const failCount = totalExams - passCount;

    // Calculate subject averages for best/weakest
    const subjectAverages = new Map<string, { name: string; total: number; count: number }>();
    formattedResults.forEach((result) => {
      const subjectName = result.exam.subject.name;
      const percentage = result.mark; // Use raw mark since totalMarks not available
      const existing = subjectAverages.get(subjectName);
      if (existing) {
        existing.total += percentage;
        existing.count += 1;
      } else {
        subjectAverages.set(subjectName, { name: subjectName, total: percentage, count: 1 });
      }
    });

    const subjects = Array.from(subjectAverages.values()).map((s) => ({
      name: s.name,
      average: s.total / s.count,
    }));

    const bestSubject = subjects.length > 0 ? subjects.reduce((best, s) => (s.average > best.average ? s : best)) : null;
    const weakestSubject = subjects.length > 0 ? subjects.reduce((weak, s) => (s.average < weak.average ? s : weak)) : null;

    return successResponse(c, {
      examResults: formattedResults,
      stats: {
        totalExams,
        averageMark: Math.round(averageMark * 10) / 10,
        passCount,
        failCount,
        bestSubject,
        weakestSubject,
      },
    });
  } catch (error) {
    console.error("Student exams error:", error);
    return errors.internalError(c);
  }
});

export default dashboard;
