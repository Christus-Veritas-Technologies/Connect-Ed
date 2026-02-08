import { Hono } from "hono";
import { db } from "@repo/db";
import { requireAuth, requireParentAuth, requireStudentAuth } from "../middleware/auth";
import { successResponse, errors } from "../lib/response";

const studentReports = new Hono();

// Helper: compute a student's academic report
async function computeStudentReport(studentId: string, schoolId: string) {
  const student = await db.student.findFirst({
    where: { id: studentId, schoolId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      admissionNumber: true,
      class: { select: { id: true, name: true } },
    },
  });

  if (!student) return null;

  // Get all exam results for this student
  const results = await db.examResult.findMany({
    where: { studentId, exam: { schoolId } },
    include: {
      exam: {
        include: {
          subject: { select: { id: true, name: true, code: true } },
          class: { select: { id: true, name: true } },
        },
      },
    },
  });

  // Get all grades for the school
  const allGrades = await db.grade.findMany({
    where: { schoolId },
  });

  // Group results by subject
  const subjectMap = new Map<string, {
    subjectId: string;
    subjectName: string;
    subjectCode: string | null;
    exams: Array<{
      examId: string;
      examName: string;
      paper: string;
      mark: number;
      gradeName: string;
      isPass: boolean;
    }>;
  }>();

  for (const result of results) {
    const subId = result.exam.subjectId;
    if (!subjectMap.has(subId)) {
      subjectMap.set(subId, {
        subjectId: subId,
        subjectName: result.exam.subject.name,
        subjectCode: result.exam.subject.code,
        exams: [],
      });
    }

    const subjectGrades = allGrades.filter((g) => g.subjectId === subId);
    const grade = subjectGrades.find((g) => result.mark >= g.minMark && result.mark <= g.maxMark);

    subjectMap.get(subId)!.exams.push({
      examId: result.examId,
      examName: result.exam.name,
      paper: result.exam.paper,
      mark: result.mark,
      gradeName: grade?.name || "N/A",
      isPass: grade?.isPass ?? false,
    });
  }

  const subjects = Array.from(subjectMap.values());

  // Calculate per-subject averages
  const subjectReports = subjects.map((s) => {
    const avgMark = s.exams.length > 0
      ? Math.round(s.exams.reduce((sum, e) => sum + e.mark, 0) / s.exams.length)
      : 0;
    const passCount = s.exams.filter((e) => e.isPass).length;
    const subjectGrades = allGrades.filter((g) => g.subjectId === s.subjectId);
    const avgGrade = subjectGrades.find((g) => avgMark >= g.minMark && avgMark <= g.maxMark);

    return {
      ...s,
      averageMark: avgMark,
      averageGrade: avgGrade?.name || "N/A",
      averageIsPass: avgGrade?.isPass ?? false,
      examsTaken: s.exams.length,
      examsPassed: passCount,
      passRate: s.exams.length > 0 ? Math.round((passCount / s.exams.length) * 100) : 0,
    };
  });

  // Overall stats
  const totalExams = results.length;
  const totalSubjects = subjects.length;
  const allMarks = results.map((r) => r.mark);
  const overallAverage = allMarks.length > 0
    ? Math.round(allMarks.reduce((a, b) => a + b, 0) / allMarks.length)
    : 0;

  const totalPassed = results.filter((r) => {
    const subjectGrades = allGrades.filter((g) => g.subjectId === r.exam.subjectId);
    const passGrades = subjectGrades.filter((g) => g.isPass);
    return passGrades.some((g) => r.mark >= g.minMark && r.mark <= g.maxMark);
  }).length;

  const overallPassRate = totalExams > 0 ? Math.round((totalPassed / totalExams) * 100) : 0;

  // Identify weakest and strongest subjects
  const sortedSubjects = [...subjectReports].sort((a, b) => a.averageMark - b.averageMark);
  const weakestSubject = sortedSubjects.length > 0 ? sortedSubjects[0] : null;
  const strongestSubject = sortedSubjects.length > 0 ? sortedSubjects[sortedSubjects.length - 1] : null;

  return {
    student: {
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      admissionNumber: student.admissionNumber,
      className: student.class?.name || "Unassigned",
    },
    subjects: subjectReports,
    overall: {
      averageMark: overallAverage,
      totalSubjects,
      totalExams,
      passRate: overallPassRate,
      totalPassed,
      totalFailed: totalExams - totalPassed,
    },
    insights: {
      weakestSubject: weakestSubject ? { name: weakestSubject.subjectName, averageMark: weakestSubject.averageMark } : null,
      strongestSubject: strongestSubject ? { name: strongestSubject.subjectName, averageMark: strongestSubject.averageMark } : null,
    },
  };
}

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

export default studentReports;
