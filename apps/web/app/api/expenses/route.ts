import { NextRequest } from "next/server";
import { db } from "@repo/db";
import { createExpenseSchema } from "../../../lib/validation";
import { successResponse, errors } from "../../../lib/api-response";

// GET /api/expenses - List expenses
export async function GET(request: NextRequest) {
  try {
    const schoolId = request.headers.get("x-school-id");

    if (!schoolId) {
      return errors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const where: Parameters<typeof db.expense.findMany>[0]["where"] = {
      schoolId,
      ...(category && { category }),
      ...(dateFrom && { date: { gte: new Date(dateFrom) } }),
      ...(dateTo && { date: { lte: new Date(dateTo) } }),
    };

    const expenses = await db.expense.findMany({
      where,
      include: {
        recordedBy: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
    });

    const serializedExpenses = expenses.map((expense) => ({
      ...expense,
      amount: Number(expense.amount),
    }));

    return successResponse({ expenses: serializedExpenses });
  } catch (error) {
    console.error("List expenses error:", error);
    return errors.internalError();
  }
}

// POST /api/expenses - Create expense
export async function POST(request: NextRequest) {
  try {
    const schoolId = request.headers.get("x-school-id");
    const userId = request.headers.get("x-user-id");

    if (!schoolId || !userId) {
      return errors.unauthorized();
    }

    const body = await request.json();

    const result = createExpenseSchema.safeParse(body);
    if (!result.success) {
      return errors.validationError(result.error.flatten().fieldErrors);
    }

    const data = result.data;

    const expense = await db.expense.create({
      data: {
        amount: data.amount,
        category: data.category,
        description: data.description,
        date: new Date(data.date),
        receiptUrl: data.receiptUrl || undefined,
        recordedById: userId,
        schoolId,
      },
      include: {
        recordedBy: { select: { id: true, name: true } },
      },
    });

    return successResponse({
      expense: {
        ...expense,
        amount: Number(expense.amount),
      },
    }, 201);
  } catch (error) {
    console.error("Create expense error:", error);
    return errors.internalError();
  }
}
