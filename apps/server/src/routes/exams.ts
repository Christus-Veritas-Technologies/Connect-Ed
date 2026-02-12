import { Hono } from "hono";
import { db } from "@repo/db";
import { requireAuth } from "../middleware/auth";
import { createExamSchema, enterExamResultsSchema, createGradeSchema } from "../lib/validation";
import { successResponse, errors, errorResponse } from "../lib/response";
import { sendReportToParent } from "../lib/report-dispatch";

const exams = new Hono();

// All routes require auth
exams.use("*", requireAuth);

// ============================================
// GRADES MANAGEMENT
// ============================================

// GET /exams/grades - Get all grades for school (grouped by subject)
exams.get("/grades", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const grades = await db.grade.findMany({
      where: { schoolId },
      include: {
        subject: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ subject: { name: "asc" } }, { minMark: "desc" }],
    });
    return successResponse(c, { grades });
  } catch (error) {
    console.error("Get grades error:", error);
    return errors.internalError(c);
  }
});

// GET /exams/grades/:subjectId - Get grades for a specific subject
exams.get("/grades/:subjectId", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const subjectId = c.req.param("subjectId");
    const grades = await db.grade.findMany({
      where: { schoolId, subjectId },
      orderBy: { minMark: "desc" },
    });
    return successResponse(c, { grades });
  } catch (error) {
    console.error("Get subject grades error:", error);
    return errors.internalError(c);
  }
});

// POST /exams/grades - Create a grade (Admin only)
exams.post("/grades", async (c) => {
  try {
    const role = c.get("role");
    if (role !== "ADMIN") return errors.forbidden(c);

    const schoolId = c.get("schoolId");
    const body = await c.req.json();
    const data = createGradeSchema.parse(body);

    const grade = await db.grade.create({
      data: { 
        name: data.name,
        minMark: data.minMark,
        maxMark: data.maxMark,
        isPass: data.isPass,
        schoolId,
        ...(data.subjectId && { subjectId: data.subjectId }),
      },
    });
    return successResponse(c, { grade }, 201);
  } catch (error) {
    console.error("Create grade error:", error);
    return errors.internalError(c);
  }
});

// DELETE /exams/grades/:id - Delete a grade (Admin only)
exams.delete("/grades/:id", async (c) => {
  try {
    const role = c.get("role");
    if (role !== "ADMIN") return errors.forbidden(c);

    const schoolId = c.get("schoolId");
    const id = c.req.param("id");
    await db.grade.deleteMany({ where: { id, schoolId } });
    return successResponse(c, { message: "Grade deleted" });
  } catch (error) {
    console.error("Delete grade error:", error);
    return errors.internalError(c);
  }
});

// POST /exams/grades/bulk - Bulk create grades for a subject (Admin, used during onboarding)
exams.post("/grades/bulk", async (c) => {
  try {
    const role = c.get("role");
    if (role !== "ADMIN") return errors.forbidden(c);

    const schoolId = c.get("schoolId");
    const body = await c.req.json();
    const { subjectId, grades } = body as {
      subjectId: string;
      grades: Array<{ name: string; minMark: number; maxMark: number; isPass: boolean }>;
    };

    if (!subjectId || !grades || grades.length === 0) {
      return errorResponse(c, "BAD_REQUEST", "subjectId and grades array required", 400);
    }

    // Delete existing grades for this subject then recreate
    await db.grade.deleteMany({ where: { subjectId, schoolId } });

    const created = await Promise.all(
      grades.map((g) =>
        db.grade.create({
          data: { name: g.name, minMark: g.minMark, maxMark: g.maxMark, isPass: g.isPass, subjectId, schoolId },
        })
      )
    );
    return successResponse(c, { grades: created }, 201);
  } catch (error) {
    console.error("Bulk create grades error:", error);
    return errors.internalError(c);
  }
});

// ============================================
// EXAMS MANAGEMENT (Teacher)
// ============================================

// GET /exams - List exams (filtered by teacher for TEACHER role, all for ADMIN)
exams.get("/", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const role = c.get("role");
    const userId = c.get("userId");

    let where: any = { schoolId };
    
    if (role === "TEACHER") {
      // Teacher sees exams they created OR exams for their classes (as class teacher)
      const classTeacherClasses = await db.class.findMany({
        where: { classTeacherId: userId },
        select: { id: true },
      });
      const classIds = classTeacherClasses.map((c) => c.id);
      
      where.OR = [
        { teacherId: userId },
        { classId: { in: classIds } },
      ];
    }

    const examsList = await db.exam.findMany({
      where,
      include: {
        subject: { select: { id: true, name: true, code: true } },
        class: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true } },
        _count: { select: { results: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate stats for each exam
    const examsWithStats = await Promise.all(
      examsList.map(async (exam) => {
        const results = await db.examResult.findMany({
          where: { examId: exam.id },
          select: { mark: true },
        });
        const totalStudents = results.length;
        const grades = await db.grade.findMany({
          where: { subjectId: exam.subjectId, schoolId },
        });
        const passGrades = grades.filter((g) => g.isPass);
        const passMarks = results.filter((r) => {
          return passGrades.some((g) => r.mark >= g.minMark && r.mark <= g.maxMark);
        });
        const averageMark = totalStudents > 0 ? Math.round(results.reduce((sum, r) => sum + r.mark, 0) / totalStudents) : 0;
        const passRate = totalStudents > 0 ? Math.round((passMarks.length / totalStudents) * 100) : 0;

        return {
          ...exam,
          stats: {
            totalResults: totalStudents,
            averageMark,
            passRate,
            passedCount: passMarks.length,
          },
        };
      })
    );

    return successResponse(c, { exams: examsWithStats });
  } catch (error) {
    console.error("Get exams error:", error);
    return errors.internalError(c);
  }
});

// POST /exams - Create an exam (Teacher only)
exams.post("/", async (c) => {
  try {
    const role = c.get("role");
    if (role !== "TEACHER") return errors.forbidden(c);

    const schoolId = c.get("schoolId");
    const userId = c.get("userId");
    const body = await c.req.json();
    const data = createExamSchema.parse(body);

    const exam = await db.exam.create({
      data: {
        name: data.name,
        paper: data.paper,
        subjectId: data.subjectId,
        classId: data.classId,
        teacherId: userId,
        schoolId,
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        class: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true } },
        _count: { select: { results: true } },
      },
    });

    return successResponse(c, { exam }, 201);
  } catch (error) {
    console.error("Create exam error:", error);
    return errors.internalError(c);
  }
});

// GET /exams/:id - Get exam detail with results
exams.get("/:id", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const id = c.req.param("id");

    const exam = await db.exam.findFirst({
      where: { id, schoolId },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        class: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true } },
        results: {
          include: {
            student: {
              select: { id: true, firstName: true, lastName: true, admissionNumber: true },
            },
          },
          orderBy: { mark: "desc" },
        },
      },
    });

    if (!exam) return errors.notFound(c, "Exam");

    // Get grades for this subject to determine letter grades
    const grades = await db.grade.findMany({
      where: { subjectId: exam.subjectId, schoolId },
      orderBy: { minMark: "desc" },
    });

    // Map results with grade info
    const resultsWithGrades = exam.results.map((r) => {
      const grade = grades.find((g) => r.mark >= g.minMark && r.mark <= g.maxMark);
      return {
        ...r,
        gradeName: grade?.name || "N/A",
        isPass: grade?.isPass ?? false,
      };
    });

    // Stats
    const totalResults = exam.results.length;
    const passGrades = grades.filter((g) => g.isPass);
    const passCount = exam.results.filter((r) =>
      passGrades.some((g) => r.mark >= g.minMark && r.mark <= g.maxMark)
    ).length;
    const averageMark = totalResults > 0
      ? Math.round(exam.results.reduce((sum, r) => sum + r.mark, 0) / totalResults)
      : 0;

    return successResponse(c, {
      exam: {
        ...exam,
        results: resultsWithGrades,
        grades,
        stats: {
          totalResults,
          averageMark,
          passRate: totalResults > 0 ? Math.round((passCount / totalResults) * 100) : 0,
          passedCount: passCount,
          failedCount: totalResults - passCount,
        },
      },
    });
  } catch (error) {
    console.error("Get exam detail error:", error);
    return errors.internalError(c);
  }
});

// DELETE /exams/:id - Delete an exam
exams.delete("/:id", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const role = c.get("role");
    const userId = c.get("userId");
    const id = c.req.param("id");

    const where: any = { id, schoolId };
    if (role === "TEACHER") where.teacherId = userId;

    await db.exam.deleteMany({ where });
    return successResponse(c, { message: "Exam deleted" });
  } catch (error) {
    console.error("Delete exam error:", error);
    return errors.internalError(c);
  }
});

// POST /exams/:id/results - Enter/update results for an exam
exams.post("/:id/results", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const role = c.get("role");
    const userId = c.get("userId");
    const examId = c.req.param("id");

    // Verify exam exists and belongs to this teacher (or admin)
    const exam = await db.exam.findFirst({
      where: {
        id: examId,
        schoolId,
        ...(role === "TEACHER" ? { teacherId: userId } : {}),
      },
    });

    if (!exam) return errors.notFound(c, "Exam");

    const body = await c.req.json();
    const data = enterExamResultsSchema.parse(body);

    // Upsert each result
    const results = await Promise.all(
      data.results.map((r) =>
        db.examResult.upsert({
          where: { examId_studentId: { examId, studentId: r.studentId } },
          create: { examId, studentId: r.studentId, mark: r.mark },
          update: { mark: r.mark },
          include: {
            student: {
              select: { id: true, firstName: true, lastName: true, admissionNumber: true },
            },
          },
        })
      )
    );

    // Auto-send updated reports to parents (fire-and-forget, don't block the response)
    const studentIds = [...new Set(data.results.map((r) => r.studentId))];
    Promise.allSettled(
      studentIds.map((sid) => sendReportToParent(sid, schoolId))
    ).then((dispatches) => {
      const sent = dispatches.filter(
        (d) => d.status === "fulfilled" && (d.value.emailSent || d.value.whatsappSent)
      ).length;
      console.log(`📨 Auto-dispatched ${sent}/${studentIds.length} report(s) to parents after exam results entry`);
    }).catch((err) => {
      console.error("Auto report dispatch error:", err);
    });

    return successResponse(c, { results });
  } catch (error) {
    console.error("Enter exam results error:", error);
    return errors.internalError(c);
  }
});

// GET /exams/:id/students - Get students eligible for this exam (from the exam's class)
exams.get("/:id/students", async (c) => {
  try {
    const schoolId = c.get("schoolId");
    const examId = c.req.param("id");

    const exam = await db.exam.findFirst({
      where: { id: examId, schoolId },
      select: { classId: true, id: true },
    });

    if (!exam) return errors.notFound(c, "Exam");

    const students = await db.student.findMany({
      where: { schoolId, classId: exam.classId },
      select: { id: true, firstName: true, lastName: true, admissionNumber: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    // Also get existing results for this exam
    const existingResults = await db.examResult.findMany({
      where: { examId },
      select: { studentId: true, mark: true },
    });

    const resultMap = new Map(existingResults.map((r) => [r.studentId, r.mark]));

    const studentsWithMarks = students.map((s) => ({
      ...s,
      existingMark: resultMap.get(s.id) ?? null,
    }));

    return successResponse(c, { students: studentsWithMarks });
  } catch (error) {
    console.error("Get exam students error:", error);
    return errors.internalError(c);
  }
});

export default exams;
