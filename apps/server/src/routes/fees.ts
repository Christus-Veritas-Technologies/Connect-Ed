import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, FeeStatus, PaymentMethod, NotificationType, NotificationPriority } from "@repo/db";
import { requireAuth } from "../middleware/auth";
import { createFeeSchema, recordPaymentSchema } from "../lib/validation";
import { successResponse, errors } from "../lib/response";
import { fmtServer, type CurrencyCode } from "../lib/currency";
import { createNotification } from "./notifications";

const fees = new Hono();

// Apply auth middleware to all routes
fees.use("*", requireAuth);

// GET /fees/stats - Get fee statistics
fees.get("/stats", async (c) => {
  try {
    const schoolId = c.get("schoolId");

    const now = new Date();
    const currentYear = now.getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59);

    // Determine current term dates (3 terms per year)
    // Term 1: Jan-Apr, Term 2: May-Aug, Term 3: Sep-Dec
    const currentMonth = now.getMonth(); // 0-11
    let termStart: Date;
    let termEnd: Date;
    let termNumber: number;

    if (currentMonth < 4) {
      termNumber = 1;
      termStart = new Date(currentYear, 0, 1);
      termEnd = new Date(currentYear, 3, 30, 23, 59, 59);
    } else if (currentMonth < 8) {
      termNumber = 2;
      termStart = new Date(currentYear, 4, 1);
      termEnd = new Date(currentYear, 7, 31, 23, 59, 59);
    } else {
      termNumber = 3;
      termStart = new Date(currentYear, 8, 1);
      termEnd = new Date(currentYear, 11, 31, 23, 59, 59);
    }

    // Fees paid this term (sum of paidAmount for fees created in current term)
    const termFees = await db.fee.aggregate({
      where: {
        schoolId,
        createdAt: { gte: termStart, lte: termEnd },
      },
      _sum: { paidAmount: true, amount: true },
    });

    const feesPaidThisTerm = Number(termFees._sum.paidAmount || 0);
    const totalFeesThisTerm = Number(termFees._sum.amount || 0);
    const unpaidFeesThisTerm = totalFeesThisTerm - feesPaidThisTerm;

    // Fees paid this year
    const yearFees = await db.fee.aggregate({
      where: {
        schoolId,
        createdAt: { gte: yearStart, lte: yearEnd },
      },
      _sum: { paidAmount: true, amount: true },
    });

    const feesPaidThisYear = Number(yearFees._sum.paidAmount || 0);
    const totalFeesThisYear = Number(yearFees._sum.amount || 0);
    const unpaidFeesThisYear = totalFeesThisYear - feesPaidThisYear;

    // Students owing (students with unpaid fees)
    const studentsOwing = await db.fee.groupBy({
      by: ["studentId"],
      where: {
        schoolId,
        status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
      },
      _sum: { amount: true, paidAmount: true },
    });

    // Get student details for owing students
    const owingStudentIds = studentsOwing.map((s) => s.studentId);
    const owingStudents = await db.student.findMany({
      where: { id: { in: owingStudentIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        admissionNumber: true,
        class: { select: { name: true } },
      },
    });

    const studentsOwingList = studentsOwing.map((s) => {
      const student = owingStudents.find((st) => st.id === s.studentId);
      const totalAmount = Number(s._sum.amount || 0);
      const paidAmount = Number(s._sum.paidAmount || 0);
      return {
        studentId: s.studentId,
        firstName: student?.firstName || "",
        lastName: student?.lastName || "",
        admissionNumber: student?.admissionNumber || "",
        className: student?.class?.name || "—",
        totalOwed: totalAmount - paidAmount,
      };
    }).filter((s) => s.totalOwed > 0)
      .sort((a, b) => b.totalOwed - a.totalOwed);

    return successResponse(c, {
      termNumber,
      currentYear,
      feesPaidThisTerm,
      unpaidFeesThisTerm,
      feesPaidThisYear,
      unpaidFeesThisYear,
      studentsOwing: studentsOwingList,
    });
  } catch (error) {
    console.error("Fee stats error:", error);
    return errors.internalError(c);
  }
});

// GET /fees - List fees
fees.get("/", async (c) => {
  try {
    const schoolId = c.get("schoolId");

    const page = parseInt(c.req.query("page") || "1");
    const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100);
    const studentId = c.req.query("studentId");
    const status = c.req.query("status");
    const filter = c.req.query("filter");
    const term = c.req.query("term");
    const year = c.req.query("year");
    const dateFrom = c.req.query("dateFrom");
    const dateTo = c.req.query("dateTo");

    const skip = (page - 1) * limit;

    // Calculate date range for term/year filters or custom date range
    let dateFilter: { gte?: Date; lte?: Date } | undefined;
    if (dateFrom || dateTo) {
      // Custom date range takes priority
      dateFilter = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) dateFilter.lte = new Date(dateTo + "T23:59:59");
    } else if (year) {
      const y = parseInt(year);
      if (term) {
        const t = parseInt(term);
        // Term 1: Jan-Apr, Term 2: May-Aug, Term 3: Sep-Dec
        const termStartMonth = (t - 1) * 4;
        const termEndMonth = termStartMonth + 3;
        dateFilter = {
          gte: new Date(y, termStartMonth, 1),
          lte: new Date(y, termEndMonth + 1, 0, 23, 59, 59), // last day of end month
        };
      } else {
        dateFilter = {
          gte: new Date(y, 0, 1),
          lte: new Date(y, 11, 31, 23, 59, 59),
        };
      }
    }

    // Build where clause
    const where: Parameters<typeof db.fee.findMany>[0]["where"] = {
      schoolId,
      ...(studentId && { studentId }),
      ...(status && { status: status as FeeStatus }),
      ...(filter === "overdue" && {
        status: { not: FeeStatus.PAID },
        dueDate: { lt: new Date() },
      }),
      ...(dateFilter && { createdAt: dateFilter }),
    };

    const [fees, total] = await Promise.all([
      db.fee.findMany({
        where,
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true, admissionNumber: true },
          },
          payments: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { dueDate: "asc" },
        skip,
        take: limit,
      }),
      db.fee.count({ where }),
    ]);

    return successResponse(c, {
      fees,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("List fees error:", error);
    return errors.internalError(c);
  }
});

// POST /fees - Create fee
fees.post("/", zValidator("json", createFeeSchema), async (c) => {
  const schoolId = c.get("schoolId");
  console.log(`[POST /fees] Creating fee for school: ${schoolId}`);
  
  try {
    const data = c.req.valid("json");
    console.log(`[POST /fees] Fee data:`, {
      studentId: data.studentId,
      amount: data.amount,
      description: data.description,
      dueDate: data.dueDate,
    });

    // Verify student belongs to school
    const student = await db.student.findFirst({
      where: { id: data.studentId, schoolId },
    });

    if (!student) {
      console.log(`[POST /fees] ❌ Student not found: ${data.studentId}`);
      return errors.notFound(c, "Student");
    }

    console.log(`[POST /fees] Found student: ${student.firstName} ${student.lastName}`);

    // Create fee
    console.log(`[POST /fees] Creating fee: ${data.description} (${data.amount})`);
    const fee = await db.fee.create({
      data: {
        studentId: data.studentId,
        amount: data.amount,
        description: data.description,
        dueDate: new Date(data.dueDate),
        schoolId,
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, admissionNumber: true },
        },
      },
    });

    console.log(`[POST /fees] ✅ Fee created successfully: ${fee.id}`);
    return successResponse(c, { fee }, 201);
  } catch (error) {
    console.error(`[POST /fees] ❌ Create fee error:`, error);
    return errors.internalError(c);
  }
});

// POST /fees/:id/payments - Record payment for a fee
fees.post("/:id/payments", zValidator("json", recordPaymentSchema), async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const userId = c.get("userId");
    const feeId = c.req.param("id");
    const data = c.req.valid("json");

    // Get fee with student and parent info for notifications
    const fee = await db.fee.findFirst({
      where: { id: feeId, schoolId },
      include: {
        payments: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
            parentId: true,
          },
        },
      },
    });

    if (!fee) {
      return errors.notFound(c, "Fee");
    }

    // Calculate total paid including this payment
    const totalPaid = fee.payments.reduce((sum, p) => sum + p.amount, 0);
    const newTotal = totalPaid + data.amount;

    // Determine new fee status
    let newStatus: FeeStatus;
    if (newTotal >= fee.amount) {
      newStatus = FeeStatus.PAID;
    } else if (newTotal > 0) {
      newStatus = FeeStatus.PARTIAL;
    } else {
      newStatus = fee.status;
    }

    // Create payment and update fee status in transaction
    const payment = await db.$transaction(async (tx) => {
      const payment = await tx.feePayment.create({
        data: {
          feeId,
          amount: data.amount,
          paymentMethod: data.paymentMethod as PaymentMethod,
          reference: data.reference,
          notes: data.notes,
          schoolId,
          receivedById: userId,
          ...(typeof data.termNumber === "number" ? { termNumber: data.termNumber } : {}),
          ...(typeof data.termYear === "number" ? { termYear: data.termYear } : {}),
        },
      });

      await tx.fee.update({
        where: { id: feeId },
        data: {
          status: newStatus,
          paidAmount: newTotal,
        },
      });

      return payment;
    });

    // Send notifications for the fee payment
    const studentName = fee.student
      ? `${fee.student.firstName} ${fee.student.lastName}`
      : "Unknown Student";
    const school = await db.school.findUnique({ where: { id: schoolId }, select: { currency: true } });
    const cur = (school?.currency || "USD") as CurrencyCode;
    const amountFormatted = fmtServer(data.amount, cur);
    const notifications: Promise<unknown>[] = [];

    // 1. Notify all admins about the fee payment
    const admins = await db.user.findMany({
      where: { schoolId, role: "ADMIN", isActive: true },
      select: { id: true },
    });

    for (const admin of admins) {
      notifications.push(
        createNotification({
          type: NotificationType.PAYMENT_SUCCESS,
          priority: NotificationPriority.MEDIUM,
          title: "Fee Payment Received",
          message: `A payment of ${amountFormatted} has been recorded for ${studentName}. Fee status: ${newStatus}.`,
          actionUrl: `/dashboard/fees`,
          schoolId,
          userId: admin.id,
          actorName: studentName,
        })
      );
    }

    // 2. Notify the student's parent (if linked)
    if (fee.student?.parentId) {
      const parent = await db.parent.findUnique({
        where: { id: fee.student.parentId },
        select: { id: true, name: true },
      });

      if (parent) {
        notifications.push(
          createNotification({
            type: NotificationType.PAYMENT_SUCCESS,
            priority: NotificationPriority.HIGH,
            title: "Fee Payment Recorded",
            message: `A payment of ${amountFormatted} has been recorded for ${studentName}. Remaining balance: ${fmtServer(Math.max(0, Number(fee.amount) - newTotal), cur)}.`,
            actionUrl: `/dashboard/fees`,
            schoolId,
            metadata: { parentId: parent.id, studentId: fee.student.id },
            actorName: studentName,
          })
        );
      }
    }

    // 3. Notify the student (school-level notification with student metadata)
    if (fee.student) {
      notifications.push(
        createNotification({
          type: NotificationType.PAYMENT_SUCCESS,
          priority: NotificationPriority.MEDIUM,
          title: "Fee Payment Recorded",
          message: `A payment of ${amountFormatted} has been recorded for your fee: ${fee.description}. Remaining balance: ${fmtServer(Math.max(0, Number(fee.amount) - newTotal), cur)}.`,
          actionUrl: `/dashboard/fees`,
          schoolId,
          metadata: { studentId: fee.student.id },
          actorName: studentName,
        })
      );
    }

    // Execute all notifications (non-blocking, don't fail the payment if notifications fail)
    Promise.all(notifications).catch((err) => {
      console.error("[POST /fees/:id/payments] Notification error:", err);
    });

    return successResponse(c, { payment, newStatus }, 201);
  } catch (error) {
    console.error("Record payment error:", error);
    return errors.internalError(c);
  }
});

// DELETE /fees/payments/:paymentId - Delete fee payment
fees.delete("/payments/:paymentId", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const paymentId = c.req.param("paymentId");

    const payment = await db.feePayment.findFirst({
      where: { id: paymentId, schoolId },
      include: {
        fee: {
          include: { payments: true },
        },
      },
    });

    if (!payment) {
      return errors.notFound(c, "Fee payment");
    }

    const fee = payment.fee;
    const remainingPayments = fee.payments.filter((p) => p.id !== paymentId);
    const remainingPaid = remainingPayments.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    );

    let newStatus: FeeStatus;
    if (remainingPaid >= Number(fee.amount)) {
      newStatus = FeeStatus.PAID;
    } else if (remainingPaid > 0) {
      newStatus = FeeStatus.PARTIAL;
    } else {
      newStatus = fee.dueDate < new Date() ? FeeStatus.OVERDUE : FeeStatus.PENDING;
    }

    const newPaidAt = newStatus === FeeStatus.PAID ? fee.paidAt ?? new Date() : null;

    await db.$transaction(async (tx) => {
      await tx.feePayment.delete({ where: { id: paymentId } });
      await tx.fee.update({
        where: { id: fee.id },
        data: {
          status: newStatus,
          paidAmount: remainingPaid,
          paidAt: newPaidAt,
        },
      });
    });

    return successResponse(c, {
      message: "Fee payment deleted successfully",
      feeId: fee.id,
      status: newStatus,
      paidAmount: remainingPaid,
    });
  } catch (error) {
    console.error("Delete fee payment error:", error);
    return errors.internalError(c);
  }
});

// GET /fees/:id - Get single fee
fees.get("/:id", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const id = c.req.param("id");

    const fee = await db.fee.findFirst({
      where: { id, schoolId },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, admissionNumber: true },
        },
        payments: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!fee) {
      return errors.notFound(c, "Fee");
    }

    return successResponse(c, { fee });
  } catch (error) {
    console.error("Get fee error:", error);
    return errors.internalError(c);
  }
});

export default fees;
