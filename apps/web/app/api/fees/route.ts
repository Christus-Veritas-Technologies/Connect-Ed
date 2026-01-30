import { NextRequest } from "next/server";
import { db } from "@repo/db";
import { createFeeSchema } from "../../../lib/validation";
import { successResponse, errors } from "../../../lib/api-response";

// GET /api/fees - List fees
export async function GET(request: NextRequest) {
  try {
    const schoolId = request.headers.get("x-school-id");

    if (!schoolId) {
      return errors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const status = searchParams.get("status");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const where: Parameters<typeof db.fee.findMany>[0]["where"] = {
      schoolId,
      ...(studentId && { studentId }),
      ...(status && { status: status as any }),
      ...(dateFrom && { dueDate: { gte: new Date(dateFrom) } }),
      ...(dateTo && { dueDate: { lte: new Date(dateTo) } }),
    };

    const fees = await db.fee.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    // Convert Decimal to number for JSON serialization
    const serializedFees = fees.map((fee) => ({
      ...fee,
      amount: Number(fee.amount),
      paidAmount: Number(fee.paidAmount),
    }));

    return successResponse({ fees: serializedFees });
  } catch (error) {
    console.error("List fees error:", error);
    return errors.internalError();
  }
}

// POST /api/fees - Create fee
export async function POST(request: NextRequest) {
  try {
    const schoolId = request.headers.get("x-school-id");

    if (!schoolId) {
      return errors.unauthorized();
    }

    const body = await request.json();

    const result = createFeeSchema.safeParse(body);
    if (!result.success) {
      return errors.validationError(result.error.flatten().fieldErrors);
    }

    const data = result.data;

    // Verify student belongs to school
    const student = await db.student.findFirst({
      where: { id: data.studentId, schoolId },
    });

    if (!student) {
      return errors.notFound("Student");
    }

    const fee = await db.fee.create({
      data: {
        amount: data.amount,
        description: data.description,
        dueDate: new Date(data.dueDate),
        studentId: data.studentId,
        schoolId,
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
      },
    });

    return successResponse({
      fee: {
        ...fee,
        amount: Number(fee.amount),
        paidAmount: Number(fee.paidAmount),
      },
    }, 201);
  } catch (error) {
    console.error("Create fee error:", error);
    return errors.internalError();
  }
}
