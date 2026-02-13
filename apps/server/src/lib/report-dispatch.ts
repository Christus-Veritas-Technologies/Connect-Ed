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
  school: {
    name: string;
    logo?: string | null;
    motto?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  classTeacher?: {
    name: string;
    email?: string | null;
    phone?: string | null;
  } | null;
  reportSettings: {
    showSchoolBranding: boolean;
    showTeacherDetails: boolean;
    showGrades: boolean;
    showPassRates: boolean;
    showInsights: boolean;
    showExamDetails: boolean;
    showOverallAverage: boolean;
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
  generatedAt: Date;
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
      class: { 
        select: { 
          id: true, 
          name: true,
          classTeacher: {
            select: {
              name: true,
              email: true,
              phone: true,
            }
          }
        } 
      },
    },
  });

  if (!student) return null;

  // Get school details and settings
  const school = await db.school.findUnique({
    where: { id: schoolId },
    select: {
      name: true,
      address: true,
      phone: true,
      email: true,
      reportSchoolLogo: true,
      reportSchoolMotto: true,
      reportShowSchoolBranding: true,
      reportShowTeacherDetails: true,
      reportShowGrades: true,
      reportShowPassRates: true,
      reportShowInsights: true,
      reportShowExamDetails: true,
      reportShowOverallAverage: true,
    },
  });

  if (!school) return null;

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
    // Determine pass status: use grade if found, otherwise use 50% threshold
    let isPass = false;
    if (grade) {
      isPass = grade.isPass;
    } else {
      isPass = result.mark >= 50;
    }
    
    // Determine grade name: use configured grade or default scale
    let gradeName = grade?.name || "N/A";
    if (!grade && result.mark >= 50) {
      // Show default grades when no configured grade matches
      if (result.mark >= 90) gradeName = "A";
      else if (result.mark >= 80) gradeName = "B";
      else if (result.mark >= 70) gradeName = "C";
      else if (result.mark >= 60) gradeName = "D";
      else gradeName = "F";
    }
    
    subjectMap.get(subId)!.exams.push({
      examName: result.exam.name,
      paper: result.exam.paper,
      mark: result.mark,
      gradeName,
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
      // Determine pass status: use grade if found, otherwise use 50% threshold
      let avgIsPass = false;
      let avgGradeName = "N/A";
      if (avgGrade) {
        avgIsPass = avgGrade.isPass;
        avgGradeName = avgGrade.name;
      } else {
        avgIsPass = avgMark >= 50;
        // Show default grades when no configured grade matches
        if (avgMark >= 90) avgGradeName = "A";
        else if (avgMark >= 80) avgGradeName = "B";
        else if (avgMark >= 70) avgGradeName = "C";
        else if (avgMark >= 60) avgGradeName = "D";
        else if (avgMark >= 0) avgGradeName = "F";
      }

      return {
        subjectName: s.subjectName,
        averageMark: avgMark,
        averageGrade: avgGradeName,
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
      const matchesPassingGrade = subjectGrades
        .filter((g) => g.isPass)
        .some((g) => r.mark >= g.minMark && r.mark <= g.maxMark);
      if (matchesPassingGrade) {
        console.log(`[PASS] Exam ${r.exam.name}: ${r.mark}% - matches grade`);
        return true;
      }
    }
    // Fallback: pass if >= 50% (either no grades or mark doesn't match any grade range)
    const passes = r.mark >= 50;
    console.log(`[${passes ? 'PASS' : 'FAIL'}] Exam ${r.exam.name}: ${r.mark}% - fallback 50% check`);
    return passes;
  }).length;
  
  console.log(`[REPORT] Total exams: ${totalExams}, Passed: ${totalPassed}, Failed: ${totalExams - totalPassed}`);

  const overallPassRate =
    totalExams > 0 ? Math.round((totalPassed / totalExams) * 100) : 0;

  // Calculate overall grade based on average mark
  // Find any grade that matches the overall average
  const overallGrade = allGrades.find(
    (g) => overallAverage >= g.minMark && overallAverage <= g.maxMark
  );
  
  // Determine overall grade name with fallback to default scale
  let overallGradeName: string | null = null;
  if (overallGrade) {
    overallGradeName = overallGrade.name;
  } else if (overallAverage >= 50) {
    // Show default grades when no configured grade matches
    if (overallAverage >= 90) overallGradeName = "A";
    else if (overallAverage >= 80) overallGradeName = "B";
    else if (overallAverage >= 70) overallGradeName = "C";
    else if (overallAverage >= 60) overallGradeName = "D";
    else overallGradeName = "F";
  }

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
    school: {
      name: school.name || "Unknown School",
      logo: school.reportSchoolLogo,
      motto: school.reportSchoolMotto,
      address: school.address,
      phone: school.phone,
      email: school.email,
    },
    classTeacher: student.class?.classTeacher || null,
    reportSettings: {
      showSchoolBranding: school.reportShowSchoolBranding,
      showTeacherDetails: school.reportShowTeacherDetails,
      showGrades: school.reportShowGrades,
      showPassRates: school.reportShowPassRates,
      showInsights: school.reportShowInsights,
      showExamDetails: school.reportShowExamDetails,
      showOverallAverage: school.reportShowOverallAverage,
    },
    subjects,
    overall: {
      averageMark: overallAverage,
      averageGrade: overallGradeName,
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
    generatedAt: new Date(),
  };
}

// ============================================
// HTML email template for the report
// ============================================

function generateReportEmailHtml(
  report: StudentReportPayload,
  parentName: string
): string {
  const settings = report.reportSettings;
  
  const subjectRows = report.subjects
    .map(
      (s) => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${s.subjectName}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: center;">${s.examsTaken}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: bold; color: ${s.averageMark >= 50 ? "#16a34a" : "#dc2626"};">${s.averageMark}%</td>
      ${settings.showGrades ? `<td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        <span style="background: ${s.averageIsPass ? "#dcfce7" : "#fecaca"}; color: ${s.averageIsPass ? "#166534" : "#991b1b"}; padding: 2px 10px; border-radius: 12px; font-size: 13px; font-weight: 600;">${s.averageGrade}</span>
      </td>` : ''}
      ${settings.showPassRates ? `<td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: center;">${s.passRate}%</td>` : ''}
    </tr>`
    )
    .join("");

  const insightHtml = [];
  if (settings.showInsights) {
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
              ${settings.showSchoolBranding && report.school.logo ? `<img src="${report.school.logo}" alt="${report.school.name}" style="max-height: 80px; margin-bottom: 16px;" />` : '<div style="font-size: 48px; margin-bottom: 12px;">📊</div>'}
              ${settings.showSchoolBranding ? `<h1 style="margin: 0 0 4px 0; font-size: 28px;">${report.school.name}</h1>` : ''}
              ${settings.showSchoolBranding && report.school.motto ? `<p style="margin: 0 0 16px 0; opacity: 0.9; font-style: italic; font-size: 14px;">${report.school.motto}</p>` : ''}
              <h2 style="margin: 8px 0 0 0; font-size: 22px; font-weight: 600;">Academic Report</h2>
              <p style="margin: 4px 0 0 0; opacity: 0.9;">${report.student.name} — ${report.student.className}</p>
              <p style="margin: 4px 0 0 0; opacity: 0.8; font-size: 13px;">Generated: ${new Date(report.generatedAt).toLocaleDateString()}</p>
            </div>

            <!-- Content -->
            <div style="padding: 30px;">
              <p style="font-size: 16px;">Dear ${parentName},</p>
              <p style="color: #6b7280;">
                Please find below the latest academic report for <strong>${report.student.name}</strong> 
                (${report.student.admissionNumber}), enrolled in <strong>${report.student.className}</strong>.
              </p>

              ${settings.showTeacherDetails && report.classTeacher ? `
              <!-- Class Teacher -->
              <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Class Teacher</h3>
                <p style="margin: 0; font-size: 16px; font-weight: 600; color: #111827;">${report.classTeacher.name}</p>
                ${report.classTeacher.email ? `<p style="margin: 4px 0 0 0; font-size: 14px; color: #6b7280;">📧 ${report.classTeacher.email}</p>` : ''}
                ${report.classTeacher.phone ? `<p style="margin: 4px 0 0 0; font-size: 14px; color: #6b7280;">📞 ${report.classTeacher.phone}</p>` : ''}
              </div>
              ` : ''}

              <!-- Stats row -->
              ${settings.showOverallAverage ? `
              <div style="display: flex; gap: 12px; margin: 24px 0; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 100px; background: #eff6ff; border-radius: 10px; padding: 16px; text-align: center;">
                  <div style="font-size: 28px; font-weight: bold; color: ${report.overall.averageMark >= 50 ? "#16a34a" : "#dc2626"};">${report.overall.averageMark}%</div>
                  <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">Average</div>
                  ${settings.showGrades && report.overall.averageGrade ? `<div style="margin-top: 4px; font-size: 14px; font-weight: 600; color: #1d4ed8;">Grade: ${report.overall.averageGrade}</div>` : ''}
                </div>
                <div style="flex: 1; min-width: 100px; background: #f5f3ff; border-radius: 10px; padding: 16px; text-align: center;">
                  <div style="font-size: 28px; font-weight: bold; color: #7c3aed;">${report.overall.totalSubjects}</div>
                  <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">Subjects</div>
                </div>
                <div style="flex: 1; min-width: 100px; background: #fdf4ff; border-radius: 10px; padding: 16px; text-align: center;">
                  <div style="font-size: 28px; font-weight: bold; color: #a21caf;">${report.overall.totalExams}</div>
                  <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">Total Exams</div>
                </div>
                ${settings.showPassRates ? `
                <div style="flex: 1; min-width: 100px; background: #f0fdf4; border-radius: 10px; padding: 16px; text-align: center;">
                  <div style="font-size: 28px; font-weight: bold; color: ${report.overall.passRate >= 50 ? "#16a34a" : "#dc2626"};">${report.overall.passRate}%</div>
                  <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">Pass Rate</div>
                  <div style="margin-top: 6px; font-size: 11px; color: #6b7280;">${report.overall.totalPassed} passed, ${report.overall.totalFailed} failed</div>
                </div>
                ` : ''}
              </div>
              ` : ''}

              <!-- Insights -->
              ${insightHtml.length > 0 ? `<div style="margin: 24px 0;">${insightHtml.join("")}</div>` : ""}

              <!-- Subject breakdown table -->
              ${
                report.subjects.length > 0
                  ? `
              <h3 style="font-size: 18px; margin: 28px 0 12px 0; color: #111827;">Subject Performance</h3>
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background: #f9fafb;">
                    <th style="padding: 12px 16px; text-align: left; font-size: 13px; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Subject</th>
                    <th style="padding: 12px 16px; text-align: center; font-size: 13px; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Exams</th>
                    <th style="padding: 12px 16px; text-align: center; font-size: 13px; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Average</th>
                    ${settings.showGrades ? '<th style="padding: 12px 16px; text-align: center; font-size: 13px; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Grade</th>' : ''}
                    ${settings.showPassRates ? '<th style="padding: 12px 16px; text-align: center; font-size: 13px; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Pass Rate</th>' : ''}
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
              ${settings.showSchoolBranding ? `
              <p style="margin: 0;"><strong>${report.school.name}</strong></p>
              ${report.school.address ? `<p style="margin: 4px 0 0 0;">${report.school.address}</p>` : ''}
              ${report.school.phone || report.school.email ? `<p style="margin: 4px 0 0 0;">${[report.school.phone, report.school.email].filter(Boolean).join(' • ')}</p>` : ''}
              ` : ''}
              <p style="margin: ${settings.showSchoolBranding ? '8px' : '0'} 0 0 0;">Connect-Ed School Management System</p>
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
  report: StudentReportPayload
): string {
  const settings = report.reportSettings;
  const lines = [
    `📊 *Academic Report*`,
  ];

  if (settings.showSchoolBranding) {
    lines.push(`🏫 ${report.school.name}`);
    if (report.school.motto) {
      lines.push(`_${report.school.motto}_`);
    }
  }

  lines.push(
    ``,
    `👤 *Student:* ${report.student.name}`,
    `📋 *Admission #:* ${report.student.admissionNumber}`,
    `🏷️ *Class:* ${report.student.className}`
  );

  if (settings.showTeacherDetails && report.classTeacher) {
    lines.push(`👨‍🏫 *Teacher:* ${report.classTeacher.name}`);
  }

  if (settings.showOverallAverage) {
    lines.push(
      ``,
      `📈 *Overall Performance:*`,
      `• Average Mark: *${report.overall.averageMark}%*${settings.showGrades && report.overall.averageGrade ? ` (Grade ${report.overall.averageGrade})` : ''}`,
      `• Subjects: ${report.overall.totalSubjects}`,
      `• Total Exams: ${report.overall.totalExams}`
    );

    if (settings.showPassRates) {
      lines.push(
        `• Pass Rate: *${report.overall.passRate}%*`,
        `• Passed: ${report.overall.totalPassed} | Failed: ${report.overall.totalFailed}`
      );
    }
  }

  if (report.subjects.length > 0 && settings.showExamDetails) {
    lines.push(``, `📚 *Subject Results:*`);
    for (const s of report.subjects) {
      const icon = s.averageIsPass ? "✅" : "❌";
      let subjectLine = `${icon} ${s.subjectName}: *${s.averageMark}%*`;
      if (settings.showGrades) {
        subjectLine += ` (${s.averageGrade})`;
      }
      subjectLine += ` — ${s.examsTaken} exam(s)`;
      if (settings.showPassRates) {
        subjectLine += `, ${s.passRate}% pass rate`;
      }
      lines.push(subjectLine);
    }
  }

  if (settings.showInsights) {
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
  }

  lines.push(``, `_Generated: ${new Date(report.generatedAt).toLocaleDateString()}_`, `_Sent via Connect-Ed_`);

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

  // 3. Send email
  let emailSent = false;
  if (parent.email) {
    const html = generateReportEmailHtml(report, parent.name);
    emailSent = await sendEmail({
      to: parent.email,
      subject: `Academic Report — ${report.student.name} (${report.student.className})`,
      html,
      schoolId,
      type: "NOREPLY",
    });
  }

  // 4. Send WhatsApp
  let whatsappSent = false;
  if (parent.phone) {
    const text = generateReportWhatsAppText(report);
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
