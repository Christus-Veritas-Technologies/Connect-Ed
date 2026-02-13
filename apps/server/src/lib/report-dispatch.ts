import { db } from "@repo/db";
import { sendEmail } from "./email";

// ============================================
// Types
// ============================================

interface SubjectReportData {
  subjectName: string;
  averageMark: number;
  averageGrade: string;
  averageIsPass: boolean;
  examsTaken: number;
  examsPassed: number;
  passRate: number;
  exams: Array<{
    examName: string;
    paper: string;
    mark: number;
    gradeName: string;
    isPass: boolean;
  }>;
}

interface StudentReportPayload {
  student: {
    id: string;
    name: string;
    admissionNumber: string;
    className: string;
  };
  subjects: SubjectReportData[];
  overall: {
    averageMark: number;
    averageGrade: string | null;
    totalSubjects: number;
    totalExams: number;
    passRate: number;
    totalPassed: number;
    totalFailed: number;
  };
  insights: {
    weakestSubject: { name: string; averageMark: number } | null;
    strongestSubject: { name: string; averageMark: number } | null;
  };
}

export interface DispatchResult {
  studentId: string;
  studentName: string;
  parentName: string | null;
  emailSent: boolean;
  whatsappSent: boolean;
  error?: string;
}

// ============================================
// Core: compute a student report (reusable)
// ============================================

export async function computeStudentReport(
  studentId: string,
  schoolId: string
): Promise<StudentReportPayload | null> {
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

  const results = await db.examResult.findMany({
    where: { studentId, exam: { schoolId } },
    include: {
      exam: {
        include: {
          subject: { select: { id: true, name: true, code: true } },
        },
      },
    },
  });

  const allGrades = await db.grade.findMany({ where: { schoolId } });

  // Group by subject
  const subjectMap = new Map<
    string,
    {
      subjectId: string;
      subjectName: string;
      exams: Array<{
        examName: string;
        paper: string;
        mark: number;
        gradeName: string;
        isPass: boolean;
      }>;
    }
  >();

  for (const result of results) {
    const subId = result.exam.subjectId;
    if (!subjectMap.has(subId)) {
      subjectMap.set(subId, {
        subjectId: subId,
        subjectName: result.exam.subject.name,
        exams: [],
      });
    }
    // Get subject-specific grades first, then fall back to school-wide grades
    const subjectGrades = allGrades.filter((g) => g.subjectId === subId || g.subjectId === null);
    const grade = subjectGrades.find(
      (g) => result.mark >= g.minMark && result.mark <= g.maxMark
    );
    // If no grades configured, default: pass if >= 50%
    const isPass = grade?.isPass ?? (result.mark >= 50);
    subjectMap.get(subId)!.exams.push({
      examName: result.exam.name,
      paper: result.exam.paper,
      mark: result.mark,
      gradeName: grade?.name || "N/A",
      isPass,
    });
  }

  const subjects: SubjectReportData[] = Array.from(subjectMap.values()).map(
    (s) => {
      const avgMark =
        s.exams.length > 0
          ? Math.round(
              s.exams.reduce((sum, e) => sum + e.mark, 0) / s.exams.length
            )
          : 0;
      const passCount = s.exams.filter((e) => e.isPass).length;
      // Get subject-specific grades first, then fall back to school-wide grades
      const subjectGrades = allGrades.filter((g) => g.subjectId === s.subjectId || g.subjectId === null);
      const avgGrade = subjectGrades.find(
        (g) => avgMark >= g.minMark && avgMark <= g.maxMark
      );
      // If no grades configured, default: pass if >= 50%
      const avgIsPass = avgGrade?.isPass ?? (avgMark >= 50);

      return {
        subjectName: s.subjectName,
        averageMark: avgMark,
        averageGrade: avgGrade?.name || "N/A",
        averageIsPass: avgIsPass,
        examsTaken: s.exams.length,
        examsPassed: passCount,
        passRate:
          s.exams.length > 0
            ? Math.round((passCount / s.exams.length) * 100)
            : 0,
        exams: s.exams,
      };
    }
  );

  const totalExams = results.length;
  const allMarks = results.map((r) => r.mark);
  const overallAverage =
    allMarks.length > 0
      ? Math.round(allMarks.reduce((a, b) => a + b, 0) / allMarks.length)
      : 0;

  const totalPassed = results.filter((r) => {
    // Get subject-specific grades first, then fall back to school-wide grades
    const subjectGrades = allGrades.filter(
      (g) => g.subjectId === r.exam.subjectId || g.subjectId === null
    );
    // If grades exist, check if mark matches a passing grade
    if (subjectGrades.length > 0) {
      return subjectGrades
        .filter((g) => g.isPass)
        .some((g) => r.mark >= g.minMark && r.mark <= g.maxMark);
    }
    // If no grades, default: pass if >= 50%
    return r.mark >= 50;
  }).length;

  const overallPassRate =
    totalExams > 0 ? Math.round((totalPassed / totalExams) * 100) : 0;

  // Calculate overall grade based on average mark
  // Find any grade that matches the overall average
  const overallGrade = allGrades.find(
    (g) => overallAverage >= g.minMark && overallAverage <= g.maxMark
  );

  const sortedSubjects = [...subjects].sort(
    (a, b) => a.averageMark - b.averageMark
  );

  return {
    student: {
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      admissionNumber: student.admissionNumber,
      className: student.class?.name || "Unassigned",
    },
    subjects,
    overall: {
      averageMark: overallAverage,
      averageGrade: overallGrade?.name || null,
      totalSubjects: subjects.length,
      totalExams,
      passRate: overallPassRate,
      totalPassed,
      totalFailed: totalExams - totalPassed,
    },
    insights: {
      weakestSubject:
        sortedSubjects.length > 0
          ? {
              name: sortedSubjects[0]!.subjectName,
              averageMark: sortedSubjects[0]!.averageMark,
            }
          : null,
      strongestSubject:
        sortedSubjects.length > 0
          ? {
              name: sortedSubjects[sortedSubjects.length - 1]!.subjectName,
              averageMark:
                sortedSubjects[sortedSubjects.length - 1]!.averageMark,
            }
          : null,
    },
  };
}

// ============================================
// HTML email template for the report
// ============================================

function generateReportEmailHtml(
  report: StudentReportPayload,
  schoolName: string,
  parentName: string
): string {
  const subjectRows = report.subjects
    .map(
      (s) => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${s.subjectName}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: center;">${s.examsTaken}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: bold; color: ${s.averageMark >= 50 ? "#16a34a" : "#dc2626"};">${s.averageMark}%</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        <span style="background: ${s.averageIsPass ? "#dcfce7" : "#fecaca"}; color: ${s.averageIsPass ? "#166534" : "#991b1b"}; padding: 2px 10px; border-radius: 12px; font-size: 13px; font-weight: 600;">${s.averageGrade}</span>
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: center;">${s.passRate}%</td>
    </tr>`
    )
    .join("");

  const insightHtml = [];
  if (report.insights.strongestSubject) {
    insightHtml.push(
      `<div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 10px;">
        <strong style="color: #166534;">⭐ Strongest Subject:</strong> <span style="color: #15803d;">${report.insights.strongestSubject.name} (${report.insights.strongestSubject.averageMark}%)</span>
      </div>`
    );
  }
  if (report.insights.weakestSubject) {
    insightHtml.push(
      `<div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 12px 16px; border-radius: 0 8px 8px 0;">
        <strong style="color: #9a3412;">⚠ Needs Improvement:</strong> <span style="color: #c2410c;">${report.insights.weakestSubject.name} (${report.insights.weakestSubject.averageMark}%)</span>
      </div>`
    );
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Academic Report - ${report.student.name}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background: #f3f4f6;">
        <div style="padding: 20px;">
          <div style="max-width: 640px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 12px;">📊</div>
              <h1 style="margin: 0 0 4px 0; font-size: 24px;">Academic Report</h1>
              <p style="margin: 0; opacity: 0.9;">${report.student.name} — ${report.student.className}</p>
            </div>

            <!-- Content -->
            <div style="padding: 30px;">
              <p style="font-size: 16px;">Dear ${parentName},</p>
              <p style="color: #6b7280;">
                Please find below the latest academic report for <strong>${report.student.name}</strong> 
                (${report.student.admissionNumber}), enrolled in <strong>${report.student.className}</strong>.
              </p>

              <!-- Stats row -->
              <div style="display: flex; gap: 12px; margin: 24px 0;">
                <div style="flex: 1; background: #eff6ff; border-radius: 10px; padding: 16px; text-align: center;">
                  <div style="font-size: 28px; font-weight: bold; color: ${report.overall.averageMark >= 50 ? "#16a34a" : "#dc2626"};">${report.overall.averageMark}%</div>
                  <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">Average</div>
                </div>
                <div style="flex: 1; background: #f5f3ff; border-radius: 10px; padding: 16px; text-align: center;">
                  <div style="font-size: 28px; font-weight: bold; color: #7c3aed;">${report.overall.totalSubjects}</div>
                  <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">Subjects</div>
                </div>
                <div style="flex: 1; background: #fdf4ff; border-radius: 10px; padding: 16px; text-align: center;">
                  <div style="font-size: 28px; font-weight: bold; color: #a21caf;">${report.overall.totalExams}</div>
                  <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">Exams</div>
                </div>
                <div style="flex: 1; background: #f0fdf4; border-radius: 10px; padding: 16px; text-align: center;">
                  <div style="font-size: 28px; font-weight: bold; color: ${report.overall.passRate >= 50 ? "#16a34a" : "#dc2626"};">${report.overall.passRate}%</div>
                  <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">Pass Rate</div>
                </div>
              </div>

              <!-- Insights -->
              ${insightHtml.length > 0 ? `<div style="margin: 24px 0;">${insightHtml.join("")}</div>` : ""}

              <!-- Subject breakdown table -->
              ${
                report.subjects.length > 0
                  ? `
              <h3 style="margin: 28px 0 12px 0; font-size: 16px; color: #374151;">Subject Breakdown</h3>
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background: #f9fafb;">
                    <th style="padding: 12px 16px; text-align: left; font-size: 13px; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Subject</th>
                    <th style="padding: 12px 16px; text-align: center; font-size: 13px; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Exams</th>
                    <th style="padding: 12px 16px; text-align: center; font-size: 13px; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Average</th>
                    <th style="padding: 12px 16px; text-align: center; font-size: 13px; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Grade</th>
                    <th style="padding: 12px 16px; text-align: center; font-size: 13px; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Pass Rate</th>
                  </tr>
                </thead>
                <tbody>
                  ${subjectRows}
                </tbody>
              </table>`
                  : `<p style="color: #9ca3af; text-align: center; padding: 20px 0;">No exam results recorded yet.</p>`
              }

              <p style="margin-top: 28px; color: #6b7280; font-size: 14px;">
                This report was automatically generated by Connect-Ed. For questions, please contact the school administration.
              </p>
            </div>

            <!-- Footer -->
            <div style="background: #f9fafb; padding: 20px 30px; text-align: center; color: #9ca3af; font-size: 13px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0;"><strong>${schoolName}</strong></p>
              <p style="margin: 4px 0 0 0;">Connect-Ed School Management System</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

// ============================================
// WhatsApp message text for the report
// ============================================

function generateReportWhatsAppText(
  report: StudentReportPayload,
  schoolName: string
): string {
  const lines = [
    `📊 *Academic Report*`,
    `🏫 ${schoolName}`,
    ``,
    `👤 *Student:* ${report.student.name}`,
    `📋 *Admission #:* ${report.student.admissionNumber}`,
    `🏷️ *Class:* ${report.student.className}`,
    ``,
    `📈 *Overall Performance:*`,
    `• Average Mark: *${report.overall.averageMark}%*`,
    `• Subjects: ${report.overall.totalSubjects}`,
    `• Exams Written: ${report.overall.totalExams}`,
    `• Pass Rate: *${report.overall.passRate}%*`,
    `• Passed: ${report.overall.totalPassed} | Failed: ${report.overall.totalFailed}`,
  ];

  if (report.subjects.length > 0) {
    lines.push(``, `📚 *Subject Results:*`);
    for (const s of report.subjects) {
      const icon = s.averageIsPass ? "✅" : "❌";
      lines.push(
        `${icon} ${s.subjectName}: *${s.averageMark}%* (${s.averageGrade}) — ${s.examsTaken} exam(s)`
      );
    }
  }

  if (report.insights.strongestSubject) {
    lines.push(
      ``,
      `⭐ *Best Subject:* ${report.insights.strongestSubject.name} (${report.insights.strongestSubject.averageMark}%)`
    );
  }
  if (report.insights.weakestSubject) {
    lines.push(
      `⚠️ *Needs Improvement:* ${report.insights.weakestSubject.name} (${report.insights.weakestSubject.averageMark}%)`
    );
  }

  lines.push(``, `_Sent via Connect-Ed_`);

  return lines.join("\n");
}

// ============================================
// Send WhatsApp message (placeholder)
// ============================================

async function sendWhatsAppReport(
  phone: string,
  text: string,
  schoolId: string
): Promise<boolean> {
  try {
    // Check quota
    const school = await db.school.findUnique({
      where: { id: schoolId },
      select: { whatsappQuota: true, whatsappUsed: true },
    });

    if (!school || school.whatsappUsed >= school.whatsappQuota) {
      console.log(
        `⚠️ WhatsApp quota exceeded for school ${schoolId}. Skipping.`
      );
      await db.messageLog.create({
        data: {
          type: "WHATSAPP",
          recipient: phone,
          content: text,
          status: "FAILED",
          errorMessage: "WhatsApp quota exceeded",
          schoolId,
        },
      });
      return false;
    }

    // TODO: Integrate with whatsapp-web.js or WhatsApp Business API
    // For now, log the message and create a PENDING entry for the agent to pick up
    console.log(`📱 [WhatsApp Report] To: ${phone}`);
    console.log(`📱 [WhatsApp Report] Message length: ${text.length} chars`);

    await db.messageLog.create({
      data: {
        type: "WHATSAPP",
        recipient: phone,
        content: text,
        status: "PENDING",
        schoolId,
      },
    });

    // Increment quota (will be used even for pending — agent will process)
    await db.school.update({
      where: { id: schoolId },
      data: { whatsappUsed: { increment: 1 } },
    });

    return true;
  } catch (error) {
    console.error("WhatsApp report dispatch error:", error);
    return false;
  }
}

// ============================================
// Main dispatch: send report for ONE student to their parent(s)
// ============================================

export async function sendReportToParent(
  studentId: string,
  schoolId: string
): Promise<DispatchResult> {
  // 1. Load student with parent relationship
  const student = await db.student.findFirst({
    where: { id: studentId, schoolId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      parent: {
        select: { id: true, name: true, email: true, phone: true },
      },
    },
  });

  const studentName = student
    ? `${student.firstName} ${student.lastName}`
    : "Unknown";

  if (!student) {
    return {
      studentId,
      studentName,
      parentName: null,
      emailSent: false,
      whatsappSent: false,
      error: "Student not found",
    };
  }

  if (!student.parent) {
    return {
      studentId,
      studentName,
      parentName: null,
      emailSent: false,
      whatsappSent: false,
      error: "No parent linked to this student",
    };
  }

  const parent = student.parent;

  // 2. Compute the report
  const report = await computeStudentReport(studentId, schoolId);
  if (!report || report.overall.totalExams === 0) {
    return {
      studentId,
      studentName,
      parentName: parent.name,
      emailSent: false,
      whatsappSent: false,
      error: "No exam results to report",
    };
  }

  // 3. Get school name
  const school = await db.school.findUnique({
    where: { id: schoolId },
    select: { name: true },
  });
  const schoolName = school?.name || "Your School";

  // 4. Send email
  let emailSent = false;
  if (parent.email) {
    const html = generateReportEmailHtml(report, schoolName, parent.name);
    emailSent = await sendEmail({
      to: parent.email,
      subject: `Academic Report — ${report.student.name} (${report.student.className})`,
      html,
      schoolId,
      type: "NOREPLY",
    });
  }

  // 5. Send WhatsApp
  let whatsappSent = false;
  if (parent.phone) {
    const text = generateReportWhatsAppText(report, schoolName);
    whatsappSent = await sendWhatsAppReport(parent.phone, text, schoolId);
  }

  return {
    studentId,
    studentName,
    parentName: parent.name,
    emailSent,
    whatsappSent,
    error:
      !parent.email && !parent.phone
        ? "Parent has no email or phone number"
        : undefined,
  };
}

// ============================================
// Bulk dispatch: send reports for MANY students
// ============================================

export async function sendReportsToParentsBulk(
  studentIds: string[],
  schoolId: string
): Promise<DispatchResult[]> {
  // Process sequentially to avoid overwhelming email/quota systems
  const results: DispatchResult[] = [];
  for (const studentId of studentIds) {
    const result = await sendReportToParent(studentId, schoolId);
    results.push(result);
  }
  return results;
}

// ============================================
// Convenience: send reports for ALL students in a school
// ============================================

export async function sendAllReportsToParents(
  schoolId: string
): Promise<DispatchResult[]> {
  const students = await db.student.findMany({
    where: { schoolId, parentId: { not: null } },
    select: { id: true },
  });

  return sendReportsToParentsBulk(
    students.map((s) => s.id),
    schoolId
  );
}
