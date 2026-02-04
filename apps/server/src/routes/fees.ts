import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, FeeStatus, PaymentMethod } from "@repo/db";
import { requireAuth } from "../middleware/auth";
import { createFeeSchema, recordPaymentSchema } from "../lib/validation";
import { successResponse, errors } from "../lib/response";

const fees = new Hono();

// Apply auth middleware to all routes
fees.use("*", requireAuth);

// GET /fees - List fees
fees.get("/", async (c) => {
  try {
    const schoolId = c.get("schoolId");

    const page = parseInt(c.req.query("page") || "1");
    const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100);
    const studentId = c.req.query("studentId");
    const status = c.req.query("status");
    const filter = c.req.query("filter");

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Parameters<typeof db.fee.findMany>[0]["where"] = {
      schoolId,
      ...(studentId && { studentId }),
      ...(status && { status: status as FeeStatus }),
      ...(filter === "overdue" && {
        status: { not: FeeStatus.PAID },
        dueDate: { lt: new Date() },
      }),
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
    const feeId = c.req.param("id");
    const data = c.req.valid("json");

    // Get fee
    const fee = await db.fee.findFirst({
      where: { id: feeId, schoolId },
      include: { payments: true },
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

    return successResponse(c, { payment, newStatus }, 201);
  } catch (error) {
    console.error("Record payment error:", error);
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
