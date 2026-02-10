import { Hono } from "hono";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { db, FeeStatus } from "@repo/db";
import { requireAuth } from "../middleware/auth";
import { successResponse, errors } from "../lib/response";

const reports = new Hono();

// Apply auth middleware to all routes
reports.use("*", requireAuth);

// GET /reports/financial - Get comprehensive financial report
reports.get("/financial", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const period = c.req.query("period") || "this_month";
    const customDateFrom = c.req.query("dateFrom");
    const customDateTo = c.req.query("dateTo");

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (period) {
      case "this_week":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay());
        startDate.setHours(0, 0, 0, 0);
        break;
      case "this_month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "this_term":
        // Assuming 3 terms per year (4 months each)
        const currentMonth = now.getMonth();
        const termStartMonth = Math.floor(currentMonth / 4) * 4;
        startDate = new Date(now.getFullYear(), termStartMonth, 1);
        break;
      case "this_year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case "custom":
        if (customDateFrom) startDate = new Date(customDateFrom);
        else startDate = new Date(now.getFullYear(), 0, 1);
        if (customDateTo) endDate = new Date(customDateTo);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get comprehensive fee data
    const [allFees, paidFees, pendingFees, overdueFees, expenses] = await Promise.all([
      db.fee.aggregate({
        where: { schoolId, createdAt: { gte: startDate, lte: endDate } },
        _sum: { amount: true },
        _count: true,
      }),
      db.fee.aggregate({
        where: { schoolId, status: FeeStatus.PAID, createdAt: { gte: startDate, lte: endDate } },
        _sum: { paidAmount: true },
        _count: true,
      }),
      db.fee.aggregate({
        where: { schoolId, status: { in: [FeeStatus.PENDING, FeeStatus.PARTIAL] }, createdAt: { gte: startDate, lte: endDate } },
        _sum: { amount: true, paidAmount: true },
        _count: true,
      }),
      db.fee.aggregate({
        where: { schoolId, status: { not: FeeStatus.PAID }, dueDate: { lt: now }, createdAt: { gte: startDate, lte: endDate } },
        _sum: { amount: true, paidAmount: true },
        _count: true,
      }),
      db.expense.aggregate({
        where: { schoolId, date: { gte: startDate, lte: endDate } },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    // Get student payment statistics
    const [totalStudents, studentsWhoPaid, studentsWithPending, studentsWithOverdue] = await Promise.all([
      db.student.count({ where: { schoolId } }),
      db.student.count({
        where: {
          schoolId,
          fees: {
            some: {
              status: FeeStatus.PAID,
              createdAt: { gte: startDate, lte: endDate },
            },
          },
        },
      }),
      db.student.count({
        where: {
          schoolId,
          fees: {
            some: {
              status: { in: [FeeStatus.PENDING, FeeStatus.PARTIAL] },
              createdAt: { gte: startDate, lte: endDate },
            },
          },
        },
      }),
      db.student.count({
        where: {
          schoolId,
          fees: {
            some: {
              status: { not: FeeStatus.PAID },
              dueDate: { lt: now },
              createdAt: { gte: startDate, lte: endDate },
            },
          },
        },
      }),
    ]);

    // Get fees by status breakdown
    const feesByStatus = await db.fee.groupBy({
      by: ["status"],
      where: { schoolId, createdAt: { gte: startDate, lte: endDate } },
      _sum: { amount: true, paidAmount: true },
      _count: true,
    });

    // Get top expense categories
    const topExpenseCategories = await db.expense.groupBy({
      by: ["category"],
      where: { schoolId, date: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    });

    // Get payments by period (monthly breakdown)
    const paymentsByPeriod = await db.$queryRaw<{ period: string; amount: number; count: number }[]>`
      SELECT 
        TO_CHAR(date_trunc('month', "createdAt"), 'Mon YYYY') as period,
        COALESCE(SUM("paidAmount"), 0)::float as amount,
        COUNT(*)::int as count
      FROM "Fee"
      WHERE "schoolId" = ${schoolId}
        AND "createdAt" >= ${startDate}
        AND "createdAt" <= ${endDate}
        AND status = 'PAID'
      GROUP BY date_trunc('month', "createdAt")
      ORDER BY date_trunc('month', "createdAt")
    `;

    const totalFeesExpected = allFees._sum.amount || 0;
    const totalFeesCollected = paidFees._sum.paidAmount || 0;
    const totalFeesPending = (pendingFees._sum.amount || 0) - (pendingFees._sum.paidAmount || 0);
    const totalFeesOverdue = (overdueFees._sum.amount || 0) - (overdueFees._sum.paidAmount || 0);
    const totalExpenses = expenses._sum.amount || 0;
    const netIncome = totalFeesCollected - totalExpenses;
    const collectionRate = totalFeesExpected > 0 ? Math.round((totalFeesCollected / totalFeesExpected) * 100) : 0;

    return successResponse(c, {
      totalFeesExpected,
      totalFeesCollected,
      totalFeesPending,
      totalFeesOverdue,
      totalExpenses,
      netIncome,
      collectionRate,
      studentsWhoPaid,
      studentsWithPending,
      studentsWithOverdue,
      totalStudents,
      paymentsByPeriod,
      feesByStatus: feesByStatus.map((s) => ({
        status: s.status,
        count: s._count,
        amount: s._sum.amount || 0,
        paidAmount: s._sum.paidAmount || 0,
      })),
      topExpenseCategories: topExpenseCategories.map((c) => ({
        category: c.category,
        amount: c._sum.amount || 0,
        count: c._count,
      })),
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
  } catch (error) {
    console.error("Financial report error:", error);
    return errors.internalError(c);
  }
});

// GET /reports/managerial - Get comprehensive managerial report
reports.get("/managerial", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const period = c.req.query("period") || "this_month";
    const customDateFrom = c.req.query("dateFrom");
    const customDateTo = c.req.query("dateTo");

    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (period) {
      case "this_week":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay());
        startDate.setHours(0, 0, 0, 0);
        break;
      case "this_month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "this_term":
        const currentMonth = now.getMonth();
        const termStartMonth = Math.floor(currentMonth / 4) * 4;
        startDate = new Date(now.getFullYear(), termStartMonth, 1);
        break;
      case "this_year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case "custom":
        if (customDateFrom) startDate = new Date(customDateFrom);
        else startDate = new Date(now.getFullYear(), 0, 1);
        if (customDateTo) endDate = new Date(customDateTo);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get teacher and student statistics
    const [totalTeachers, totalStudents, activeTeachers, activeStudents] = await Promise.all([
      db.user.count({ where: { schoolId, role: "TEACHER" } }),
      db.student.count({ where: { schoolId } }),
      db.user.count({ where: { schoolId, role: "TEACHER", createdAt: { gte: startDate, lte: endDate } } }),
      db.student.count({ where: { schoolId, createdAt: { gte: startDate, lte: endDate } } }),
    ]);

    // Count parents through students
    const totalParents = await db.student.count({
      where: { schoolId, parentEmail: { not: null } },
      distinct: ['parentEmail'],
    });

    // Get class distribution
    const classDistribution = await db.class.findMany({
      where: { schoolId },
      select: {
        id: true,
        name: true,
        level: true,
        _count: { select: { students: true } },
      },
      orderBy: { name: "asc" },
    });

    // Get teacher workload
    const teacherWorkload = await db.user.findMany({
      where: { schoolId, role: "TEACHER" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        _count: {
          select: {
            classesTeaching: true,
          },
        },
      },
      orderBy: { lastName: "asc" },
    });

    // Calculate students per teacher for workload
    const teacherWorkloadWithStudents = await Promise.all(
      teacherWorkload.map(async (teacher) => {
        const totalStudents = await db.student.count({
          where: {
            schoolId,
            class: {
              classTeacherId: teacher.id,
            },
          },
        });
        return {
          id: teacher.id,
          name: `${teacher.firstName} ${teacher.lastName}`,
          classesAssigned: teacher._count.classesTeaching,
          studentsTotal: totalStudents,
        };
      })
    );

    // Get gender distribution
    const genderDistribution = await db.student.groupBy({
      by: ["gender"],
      where: { schoolId },
      _count: true,
    });

    const studentsByGender = {
      male: genderDistribution.find((g) => g.gender === "MALE")?._count || 0,
      female: genderDistribution.find((g) => g.gender === "FEMALE")?._count || 0,
      other: genderDistribution.find((g) => g.gender === "OTHER")?._count || 0,
    };

    // Get recent enrollments
    const recentEnrollments = await db.student.findMany({
      where: { schoolId, createdAt: { gte: startDate, lte: endDate } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        createdAt: true,
        class: {
          select: {
            name: true,
            level: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Calculate student-teacher ratio
    const studentTeacherRatio = totalTeachers > 0 ? Math.round((totalStudents / totalTeachers) * 10) / 10 : 0;

    return successResponse(c, {
      totalTeachers,
      totalStudents,
      totalParents,
      activeTeachers,
      activeStudents,
      studentTeacherRatio,
      classDistribution: classDistribution.map((c) => ({
        id: c.id,
        name: c.name,
        level: c.level,
        studentCount: c._count.students,
      })),
      teacherWorkload: teacherWorkloadWithStudents,
      studentsByGender,
      recentEnrollments: recentEnrollments.map((s) => ({
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        dateOfBirth: s.dateOfBirth?.toISOString() || null,
        enrollmentDate: s.createdAt.toISOString(),
        className: s.class?.name || "Unassigned",
        level: s.class?.level || null,
      })),
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
  } catch (error) {
    console.error("Managerial report error:", error);
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
