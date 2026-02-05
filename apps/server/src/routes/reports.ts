import { Hono } from "hono";
import { Document, Packer, Paragraph, Table, TableCell, TableRow, BorderStyle, WidthType, VerticalAlign, AlignmentType } from "docx";
import { db, FeeStatus } from "@repo/db";
import { requireAuth } from "../middleware/auth";
import { successResponse, errors } from "../lib/response";

const reports = new Hono();

// Apply auth middleware to all routes
reports.use("*", requireAuth);

// GET /reports/financial - Get financial report
reports.get("/financial", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const period = c.req.query("period") || "month"; // month, quarter, year

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "quarter":
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get fee data
    const [fees, expenses, monthlyBreakdown] = await Promise.all([
      db.fee.aggregate({
        where: {
          schoolId,
          createdAt: { gte: startDate },
        },
        _sum: { amount: true, paidAmount: true },
        _count: true,
      }),

      db.expense.aggregate({
        where: {
          schoolId,
          date: { gte: startDate },
        },
        _sum: { amount: true },
        _count: true,
      }),

      // Monthly breakdown for charts
      db.$queryRaw<{ month: string; fees: number; payments: number; expenses: number }[]>`
        SELECT 
          TO_CHAR(date_trunc('month', f."createdAt"), 'YYYY-MM') as month,
          COALESCE(SUM(f.amount), 0)::float as fees,
          COALESCE(SUM(f."paidAmount"), 0)::float as payments,
          0::float as expenses
        FROM "Fee" f
        WHERE f."schoolId" = ${schoolId}
          AND f."createdAt" >= ${startDate}
        GROUP BY date_trunc('month', f."createdAt")
        ORDER BY month
      `,
    ]);

    // Get overdue fees
    const overdueFees = await db.fee.aggregate({
      where: {
        schoolId,
        status: { not: FeeStatus.PAID },
        dueDate: { lt: now },
      },
      _sum: { amount: true, paidAmount: true },
      _count: true,
    });

    // Get top expense categories
    const topCategories = await db.expense.groupBy({
      by: ["category"],
      where: {
        schoolId,
        date: { gte: startDate },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    });

    const totalFees = fees._sum.amount || 0;
    const totalCollected = fees._sum.paidAmount || 0;
    const totalExpenses = expenses._sum.amount || 0;
    const overdueAmount = (overdueFees._sum.amount || 0) - (overdueFees._sum.paidAmount || 0);

    return successResponse(c, {
      summary: {
        totalFees,
        totalCollected,
        totalPending: totalFees - totalCollected,
        collectionRate: totalFees > 0 ? Math.round((totalCollected / totalFees) * 100) : 0,
        totalExpenses,
        netIncome: totalCollected - totalExpenses,
        overdueAmount,
        overdueCount: overdueFees._count,
      },
      monthlyBreakdown,
      topExpenseCategories: topCategories.map((c) => ({
        category: c.category,
        amount: c._sum.amount || 0,
      })),
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
    });
  } catch (error) {
    console.error("Financial report error:", error);
    return errors.internalError(c);
  }
});

// POST /reports/export-docx - Generate Word document
reports.post("/export-docx", async (c) => {
  try {
    const body = await c.req.json() as {
      title: string;
      subtitle?: string;
      headers: string[];
      rows: (string | number)[][];
      footer?: string;
    };
    const { title, subtitle, headers, rows, footer } = body;

    if (!title || !headers || !rows) {
      return errors.badRequest(c, "Missing required fields: title, headers, rows");
    }

    const schoolId = c.get("schoolId");
    const school = await db.school.findUnique({
      where: { id: schoolId },
      select: { name: true, plan: true },
    });

    // Create table rows
    const tableRows = [
      // Header row
      new TableRow({
        height: { value: 500, rule: "atLeast" },
        children: headers.map(
          (header) =>
            new TableCell({
              children: [new Paragraph({ 
                text: header, 
                bold: true,
                color: "FFFFFF",
              })],
              shading: { fill: "3B82F6" }, // Brand color
              margins: { top: 150, bottom: 150, left: 150, right: 150 },
              verticalAlign: VerticalAlign.CENTER,
            })
        ),
      }),
      // Data rows
      ...rows.map(
        (row, index) =>
          new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  children: [new Paragraph({ 
                    text: String(cell),
                    alignment: typeof cell === 'number' ? AlignmentType.RIGHT : AlignmentType.LEFT,
                  })],
                  shading: { fill: index % 2 === 0 ? "FFFFFF" : "F8FAFC" }, // Alternating rows
                  margins: { top: 120, bottom: 120, left: 150, right: 150 },
                })
            ),
          })
      ),
    ];

    // Create document sections
    const documentSections = [
      // School Header
      new Paragraph({
        text: school?.name || "Connect-Ed School Management",
        fontSize: 32,
        bold: true,
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        color: "3B82F6",
      }),

      new Paragraph({
        text: subtitle || "",
        fontSize: 14,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        color: "6B7280",
      }),

      // Report Title
      new Paragraph({
        text: title,
        fontSize: 24,
        bold: true,
        alignment: AlignmentType.LEFT,
        spacing: { after: 200 },
      }),

      // Generated timestamp
      new Paragraph({
        text: `Generated: ${new Date().toLocaleString('en-US', { 
          dateStyle: 'full', 
          timeStyle: 'short' 
        })}`,
        fontSize: 10,
        color: "6B7280",
        alignment: AlignmentType.LEFT,
        spacing: { after: 400 },
      }),

      // Table
      new Table({
        rows: tableRows,
        width: {
          size: 100,
          type: WidthType.PERCENTAGE,
        },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
          left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
          right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
          insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
        },
      }),
    ];

    // Add footer if provided
    if (footer) {
      documentSections.push(
        new Paragraph({
          text: footer,
          fontSize: 14,
          bold: true,
          alignment: AlignmentType.RIGHT,
          spacing: { before: 400 },
          color: "1F2937",
        })
      );
    }

    // Add school plan info
    documentSections.push(
      new Paragraph({
        text: `Plan: ${school?.plan || 'LITE'}`,
        fontSize: 9,
        alignment: AlignmentType.CENTER,
        spacing: { before: 600 },
        color: "9CA3AF",
      })
    );

    // Create document
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440,    // 1 inch
                bottom: 1440,
                left: 1440,
                right: 1440,
              },
            },
          },
          children: documentSections,
        },
      ],
    });

    // Generate document
    const buffer = await Packer.toBuffer(doc);

    // Set response headers
    c.header("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    c.header("Content-Disposition", `attachment; filename="${title.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.docx"`);

    return c.body(buffer);
  } catch (error) {
    console.error("Report generation error:", error);
    return errors.internalError(c);
  }
});

export default reports;
