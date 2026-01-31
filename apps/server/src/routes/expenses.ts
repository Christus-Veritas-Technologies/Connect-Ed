import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "@repo/db";
import { requireAuth } from "../middleware/auth";
import { createExpenseSchema } from "../lib/validation";
import { successResponse, errors } from "../lib/response";

const expenses = new Hono();

// Apply auth middleware to all routes
expenses.use("*", requireAuth);

// GET /expenses - List expenses
expenses.get("/", async (c) => {
  try {
    const schoolId = c.get("schoolId");

    const page = parseInt(c.req.query("page") || "1");
    const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100);
    const category = c.req.query("category");
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Parameters<typeof db.expense.findMany>[0]["where"] = {
      schoolId,
      ...(category && { category }),
      ...(startDate && endDate && {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      }),
    };

    const [expenses, total] = await Promise.all([
      db.expense.findMany({
        where,
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
      db.expense.count({ where }),
    ]);

    return successResponse(c, {
      expenses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("List expenses error:", error);
    return errors.internalError(c);
  }
});

// POST /expenses - Create expense
expenses.post("/", zValidator("json", createExpenseSchema), async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const data = c.req.valid("json");

    const expense = await db.expense.create({
      data: {
        amount: data.amount,
        category: data.category,
        description: data.description,
        date: new Date(data.date),
        receiptUrl: data.receiptUrl || undefined,
        schoolId,
      },
    });

    return successResponse(c, { expense }, 201);
  } catch (error) {
    console.error("Create expense error:", error);
    return errors.internalError(c);
  }
});

// GET /expenses/:id - Get single expense
expenses.get("/:id", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const id = c.req.param("id");

    const expense = await db.expense.findFirst({
      where: { id, schoolId },
    });

    if (!expense) {
      return errors.notFound(c, "Expense");
    }

    return successResponse(c, { expense });
  } catch (error) {
    console.error("Get expense error:", error);
    return errors.internalError(c);
  }
});

// DELETE /expenses/:id - Delete expense
expenses.delete("/:id", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const id = c.req.param("id");

    const existing = await db.expense.findFirst({
      where: { id, schoolId },
    });

    if (!existing) {
      return errors.notFound(c, "Expense");
    }

    await db.expense.delete({
      where: { id },
    });

    return successResponse(c, { message: "Expense deleted successfully" });
  } catch (error) {
    console.error("Delete expense error:", error);
    return errors.internalError(c);
  }
});

// GET /expenses/categories - Get unique categories
expenses.get("/categories/list", async (c) => {
  try {
    const schoolId = c.get("schoolId");

    const categories = await db.expense.findMany({
      where: { schoolId },
      select: { category: true },
      distinct: ["category"],
    });

    return successResponse(c, {
      categories: categories.map((c) => c.category),
    });
  } catch (error) {
    console.error("Get categories error:", error);
    return errors.internalError(c);
  }
});

export default expenses;
