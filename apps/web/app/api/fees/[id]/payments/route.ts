import { NextRequest } from "next/server";
import { db, FeeStatus } from "@repo/db";
import { recordPaymentSchema } from "../../../../../lib/validation";
import { successResponse, errors } from "../../../../../lib/api-response";

// POST /api/fees/[id]/payments - Record a payment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const schoolId = request.headers.get("x-school-id");
    const userId = request.headers.get("x-user-id");

    if (!schoolId || !userId) {
      return errors.unauthorized();
    }

    const { id: feeId } = await params;
    const body = await request.json();

    const result = recordPaymentSchema.safeParse(body);
    if (!result.success) {
      return errors.validationError(result.error.flatten().fieldErrors);
    }

    const data = result.data;

    // Get fee and verify it belongs to school
    const fee = await db.fee.findFirst({
      where: { id: feeId, schoolId },
    });

    if (!fee) {
      return errors.notFound("Fee");
    }

    // Check payment amount doesn't exceed outstanding
    const outstanding = Number(fee.amount) - Number(fee.paidAmount);
    if (data.amount > outstanding) {
      return errors.validationError({
        amount: [`Payment amount cannot exceed outstanding amount of $${outstanding}`],
      });
    }

    // Create payment and update fee in transaction
    const [payment, updatedFee] = await db.$transaction(async (tx) => {
      // Create payment record
      const payment = await tx.feePayment.create({
        data: {
          amount: data.amount,
          paymentMethod: data.paymentMethod as any,
          reference: data.reference,
          notes: data.notes,
          feeId,
          receivedById: userId,
          schoolId,
        },
      });

      // Update fee paid amount and status
      const newPaidAmount = Number(fee.paidAmount) + data.amount;
      const newStatus: FeeStatus = 
        newPaidAmount >= Number(fee.amount) ? "PAID" :
        newPaidAmount > 0 ? "PARTIAL" :
        "PENDING";

      const updatedFee = await tx.fee.update({
        where: { id: feeId },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
          ...(newStatus === "PAID" && { paidAt: new Date() }),
        },
      });

      return [payment, updatedFee];
    });

    return successResponse({
      payment: {
        ...payment,
        amount: Number(payment.amount),
      },
      fee: {
        ...updatedFee,
        amount: Number(updatedFee.amount),
        paidAmount: Number(updatedFee.paidAmount),
      },
    }, 201);
  } catch (error) {
    console.error("Record payment error:", error);
    return errors.internalError();
  }
}
