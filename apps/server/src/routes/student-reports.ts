import { Hono } from "hono";
import { db } from "@repo/db";
import { requireAuth, requireParentAuth, requireStudentAuth } from "../middleware/auth";
import { successResponse, errors, errorResponse } from "../lib/response";
import { computeStudentReport, sendReportToParent, sendReportsToParentsBulk } from "../lib/report-dispatch";

const studentReports = new Hono();

// ============================================
// STAFF ROUTES (Admin / Teacher)
// ============================================

// GET /student-reports - All student reports (Admin) or teacher's students (Teacher)
studentReports.get("/", requireAuth, async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const role = c.get("role");
    const userId = c.get("userId");

    let studentIds: string[];

    if (role === "ADMIN") {
      // Admin sees all students
      const students = await db.student.findMany({
        where: { schoolId },
        select: { id: true },
      });
      studentIds = students.map((s) => s.id);
    } else if (role === "TEACHER") {
      // Teacher sees students from their classes
      const teacherClasses = await db.teacherClass.findMany({
        where: { teacherId: userId },
        select: { classId: true },
      });
      const classIds = teacherClasses.map((tc) => tc.classId);
      const students = await db.student.findMany({
        where: { schoolId, classId: { in: classIds } },
        select: { id: true },
      });
      studentIds = students.map((s) => s.id);
    } else {
      return errors.forbidden(c);
    }

    // Build summary cards for each student  
    const reports = await Promise.all(
      studentIds.map((id) => computeStudentReport(id, schoolId))
    );

    const validReports = reports.filter(Boolean);

    // School-wide insights (for admin)
    const allAverages = validReports.map((r: any) => r.overall.averageMark);
    const schoolAverage = allAverages.length > 0
      ? Math.round(allAverages.reduce((a: number, b: number) => a + b, 0) / allAverages.length)
      : 0;

    const allPassRates = validReports.map((r: any) => r.overall.passRate);
    const schoolPassRate = allPassRates.length > 0
      ? Math.round(allPassRates.reduce((a: number, b: number) => a + b, 0) / allPassRates.length)
      : 0;

    return successResponse(c, {
      reports: validReports,
      schoolInsights: {
        totalStudents: validReports.length,
        schoolAverage,
        schoolPassRate,
      },
    });
  } catch (error) {
    console.error("Get student reports error:", error);
    return errors.internalError(c);
  }
});

// GET /student-reports/:studentId - Single student report (Admin/Teacher)
studentReports.get("/:studentId", requireAuth, async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const studentId = c.req.param("studentId");

    const report = await computeStudentReport(studentId, schoolId);
    if (!report) return errors.notFound(c, "Student");

    return successResponse(c, { report });
  } catch (error) {
    console.error("Get student report error:", error);
    return errors.internalError(c);
  }
});

// ============================================
// PARENT ROUTES
// ============================================

// GET /student-reports/parent/my-children - Parent views their children's reports
studentReports.get("/parent/my-children", requireParentAuth, async (c) => {
  try {
    const parentId = c.get("parentId");
    const parent = c.get("parent");
    const schoolId = parent.schoolId;

    const children = await db.student.findMany({
      where: { parentId, schoolId },
      select: { id: true },
    });

    const reports = await Promise.all(
      children.map((child) => computeStudentReport(child.id, schoolId))
    );

    return successResponse(c, { reports: reports.filter(Boolean) });
  } catch (error) {
    console.error("Parent get reports error:", error);
    return errors.internalError(c);
  }
});

// ============================================
// STUDENT ROUTES
// ============================================

// GET /student-reports/student/my-report - Student views their own report
studentReports.get("/student/my-report", requireStudentAuth, async (c) => {
  try {
    const studentId = c.get("studentId");
    const student = c.get("student");
    const schoolId = student.schoolId;

    const report = await computeStudentReport(studentId, schoolId);
    if (!report) return errors.notFound(c, "Student report");

    return successResponse(c, { report });
  } catch (error) {
    console.error("Student get report error:", error);
    return errors.internalError(c);
  }
});

// ============================================
// SEND REPORT TO PARENT (Manual trigger)
// ============================================

// POST /student-reports/:studentId/send-to-parent - Send a single student's report to their parent
studentReports.post("/:studentId/send-to-parent", requireAuth, async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const role = c.get("role");
    const studentId = c.req.param("studentId");

    if (role !== "ADMIN" && role !== "TEACHER") {
      return errors.forbidden(c);
    }

    const result = await sendReportToParent(studentId, schoolId);

    if (result.error) {
      return successResponse(c, {
        message: `Report dispatch completed with note: ${result.error}`,
        result,
      });
    }

    return successResponse(c, {
      message: `Report for ${result.studentName} sent to ${result.parentName}`,
      result,
    });
  } catch (error) {
    console.error("Send report to parent error:", error);
    return errors.internalError(c);
  }
});

// POST /student-reports/bulk/send-to-parents - Send reports for multiple students to their parents
studentReports.post("/bulk/send-to-parents", requireAuth, async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const role = c.get("role");

    if (role !== "ADMIN") {
      return errors.forbidden(c);
    }

    const body = await c.req.json();
    const studentIds: string[] = body.studentIds;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return errorResponse(c, "BAD_REQUEST", "studentIds array is required", 400);
    }

    const results = await sendReportsToParentsBulk(studentIds, schoolId);

    const sent = results.filter((r) => r.emailSent || r.whatsappSent).length;
    const failed = results.filter((r) => r.error).length;

    return successResponse(c, {
      message: `Dispatched ${sent} report(s), ${failed} failed or skipped`,
      results,
    });
  } catch (error) {
    console.error("Bulk send reports error:", error);
    return errors.internalError(c);
  }
});

export default studentReports;
