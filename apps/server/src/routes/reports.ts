import { Hono } from "hono";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
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

// POST /reports/export-pdf - Generate professionally formatted PDF
reports.post("/export-pdf", async (c) => {
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

    // Create PDF document (A4 size)
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;

    // Helper function to add page header
    const addPageHeader = () => {
      // Brand accent line at top
      doc.setFillColor(59, 130, 246); // Brand blue
      doc.rect(0, 0, pageWidth, 4, "F");
      
      yPosition = 15;
    };

    // Helper function to add page footer
    const addPageFooter = (pageNumber: number, totalPages: number) => {
      const footerY = pageHeight - 15;
      
      // Separator line
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.5);
      doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
      
      // School name (left)
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(school?.name || "Connect-Ed", margin, footerY);
      
      // Page number (center)
      doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth / 2, footerY, { align: "center" });
      
      // Plan (right)
      doc.text(`${school?.plan || "LITE"} Plan`, pageWidth - margin, footerY, { align: "right" });
    };

    // Start first page
    addPageHeader();
    yPosition = 25;

    // School Name Header (centered, brand color)
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(59, 130, 246);
    doc.text(school?.name || "Connect-Ed School Management", pageWidth / 2, yPosition, { align: "center" });
    yPosition += 10;

    // Subtitle
    if (subtitle) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128);
      doc.text(subtitle, pageWidth / 2, yPosition, { align: "center" });
      yPosition += 10;
    }

    // Separator line
    yPosition += 5;
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 15;

    // Report Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(31, 41, 55);
    doc.text(title, margin, yPosition);
    yPosition += 8;

    // Generated timestamp
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    const timestamp = new Date().toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    doc.text(`Generated: ${timestamp}`, margin, yPosition);
    yPosition += 15;

    // Data Table with autoTable
    autoTable(doc, {
      startY: yPosition,
      head: [headers],
      body: rows.map(row => row.map(cell => String(cell))),
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 10,
        cellPadding: 4,
        lineColor: [229, 231, 235],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [59, 130, 246], // Brand blue
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "left",
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252], // Light gray
      },
      bodyStyles: {
        textColor: [31, 41, 55],
      },
      columnStyles: {
        // Right-align numeric columns (assuming last column is numeric)
        [headers.length - 1]: { halign: "right" },
      },
    });

    // Get final Y position after table
    const finalY = (doc as any).lastAutoTable?.finalY || yPosition + 50;
    yPosition = finalY + 10;

    // Footer text (summary)
    if (footer) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(31, 41, 55);
      doc.text(footer, pageWidth - margin, yPosition, { align: "right" });
    }

    // Add page footers to all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addPageFooter(i, totalPages);
    }

    // Generate PDF buffer
    const pdfBuffer = doc.output("arraybuffer");

    // Set response headers
    c.header("Content-Type", "application/pdf");
    c.header("Content-Disposition", `attachment; filename="${title.replace(/\\s+/g, "-").toLowerCase()}-${Date.now()}.pdf"`);

    return c.body(pdfBuffer);
  } catch (error) {
    console.error("PDF generation error:", error);
    return errors.internalError(c);
  }
});

export default reports;
