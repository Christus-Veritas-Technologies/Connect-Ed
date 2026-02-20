// ============================================
// AI Agent Tools — Read-only data access for the school agent
// These are the "superpowers" the agent has
// NO CUD operations — read only
// ============================================

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { db } from "@repo/db";
import bcrypt from "bcryptjs";

// ============================================
// EMAIL EXTRACTION TOOLS
// ============================================

/**
 * Extract email address from natural language text
 * The AI uses this to intelligently find emails in conversational messages
 */
export const extractEmail = createTool({
  id: "extract-email",
  description:
    "Extract an email address from a message. Use this when a user sends a message that might contain their email, even if it's in natural language like 'My email is john@example.com' or 'Hey, it's kinzinzombe07@gmail.com'.",
  inputSchema: z.object({
    message: z.string().describe("The user's message that might contain an email"),
  }),
  outputSchema: z.object({
    found: z.boolean(),
    email: z.string().optional().describe("The extracted email address if found"),
  }),
  execute: async ({ context: inputData }) => {
    const { message } = inputData;
    
    // Use regex to find email patterns
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = message.match(emailRegex);
    
    if (matches && matches.length > 0) {
      return { found: true, email: matches[0].toLowerCase() };
    }
    
    return { found: false };
  },
});

/**
 * Check if an email exists in the system
 * Returns which type of account it is (user/parent/student)
 */
export const checkEmailExists = createTool({
  id: "check-email-exists",
  description:
    "Check if an email address exists in the system and return the account type. Use this after extracting an email to verify it exists before asking for a password.",
  inputSchema: z.object({
    email: z.string().email().describe("The email address to check"),
  }),
  outputSchema: z.object({
    exists: z.boolean(),
    accountType: z.enum(["user", "parent", "student", "none"]).optional(),
    name: z.string().optional().describe("The user's name if found"),
  }),
  execute: async ({ context: inputData }) => {
    const { email } = inputData;

    // Try User (Admin/Teacher/Receptionist)
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, name: true },
    });
    if (user) {
      return { exists: true, accountType: "user" as const, name: user.name };
    }

    // Try Parent
    const parent = await db.parent.findUnique({
      where: { email },
      select: { id: true, name: true },
    });
    if (parent) {
      return { exists: true, accountType: "parent" as const, name: parent.name };
    }

    // Try Student
    const student = await db.student.findFirst({
      where: { email },
      select: { id: true, firstName: true, lastName: true },
    });
    if (student) {
      return { 
        exists: true, 
        accountType: "student" as const, 
        name: `${student.firstName} ${student.lastName}` 
      };
    }

    return { exists: false, accountType: "none" as const };
  },
});

// ============================================
// AUTH TOOLS
// ============================================

/**
 * Verify user credentials (email + password)
 * Returns the user/parent/student data if valid
 * The agent can't do this itself because passwords are hashed
 */
export const verifyCredentials = createTool({
  id: "verify-credentials",
  description:
    "Verify a user's email and password. Call this when the user provides their email and password to log in. Returns their profile data if valid, or an error if invalid.",
  inputSchema: z.object({
    email: z.string().email().describe("The user's email address"),
    password: z.string().describe("The user's password"),
  }),
  outputSchema: z.object({
    valid: z.boolean(),
    userType: z.string().optional(),
    userId: z.string().optional(),
    name: z.string().optional(),
    schoolId: z.string().optional(),
    schoolName: z.string().optional(),
    role: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context: inputData }) => {
    const { email, password } = inputData;

    // Try User (Admin/Teacher/Receptionist)
    const user = await db.user.findUnique({
      where: { email },
      include: { school: { select: { id: true, name: true } } },
    });
    if (user) {
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return { valid: false, error: "Invalid password" };
      return {
        valid: true,
        userType: "staff",
        userId: user.id,
        name: user.name,
        schoolId: user.school.id,
        schoolName: user.school.name ?? "Unknown School",
        role: user.role,
      };
    }

    // Try Parent
    const parent = await db.parent.findUnique({
      where: { email },
      include: { school: { select: { id: true, name: true } } },
    });
    if (parent) {
      const valid = await bcrypt.compare(password, parent.password);
      if (!valid) return { valid: false, error: "Invalid password" };
      return {
        valid: true,
        userType: "parent",
        userId: parent.id,
        name: parent.name,
        schoolId: parent.school.id,
        schoolName: parent.school.name ?? "Unknown School",
        role: "PARENT",
      };
    }

    // Try Student
    const student = await db.student.findFirst({
      where: { email },
      include: { school: { select: { id: true, name: true } } },
    });
    if (student && student.password) {
      const valid = await bcrypt.compare(password, student.password);
      if (!valid) return { valid: false, error: "Invalid password" };
      return {
        valid: true,
        userType: "student",
        userId: student.id,
        name: `${student.firstName} ${student.lastName}`,
        schoolId: student.school.id,
        schoolName: student.school.name ?? "Unknown School",
        role: "STUDENT",
      };
    }

    return { valid: false, error: "No account found with this email" };
  },
});

// ============================================
// STUDENT DATA TOOLS
// ============================================

export const getStudentReport = createTool({
  id: "get-student-report",
  description:
    "Get a student's full academic report with all subjects, grades, and insights. Use when a parent asks about their child's grades or performance, or when a student asks about their own grades.",
  inputSchema: z.object({
    studentId: z.string().describe("The student's ID"),
    schoolId: z.string().describe("The school's ID"),
  }),
  outputSchema: z.object({
    found: z.boolean(),
    studentName: z.string().optional(),
    className: z.string().optional(),
    averageMark: z.number().optional(),
    passRate: z.number().optional(),
    totalSubjects: z.number().optional(),
    totalExams: z.number().optional(),
    subjects: z
      .array(
        z.object({
          name: z.string(),
          averageMark: z.number(),
          grade: z.string(),
          isPass: z.boolean(),
          examsTaken: z.number(),
        })
      )
      .optional(),
    strongestSubject: z.string().optional(),
    weakestSubject: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context: inputData }) => {
    const { studentId, schoolId } = inputData;

    const student = await db.student.findFirst({
      where: { id: studentId, schoolId },
      include: {
        class: { select: { name: true } },
      },
    });
    if (!student) return { found: false, error: "Student not found" };

    // Get all exam results for this student
    const results = await db.examResult.findMany({
      where: { student: { id: studentId, schoolId } },
      include: {
        exam: {
          include: {
            subject: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    if (results.length === 0) {
      return {
        found: true,
        studentName: `${student.firstName} ${student.lastName}`,
        className: student.class?.name ?? "Unassigned",
        averageMark: 0,
        passRate: 0,
        totalSubjects: 0,
        totalExams: 0,
        subjects: [],
        error: "No exam results recorded yet",
      };
    }

    const allGrades = await db.grade.findMany({ where: { schoolId } });

    // Group by subject
    const subjectMap = new Map<
      string,
      { name: string; marks: number[]; exams: number }
    >();
    for (const r of results) {
      const subId = r.exam.subject.id;
      const subName = r.exam.subject.name;
      if (!subjectMap.has(subId)) {
        subjectMap.set(subId, { name: subName, marks: [], exams: 0 });
      }
      const entry = subjectMap.get(subId)!;
      entry.marks.push(r.mark);
      entry.exams++;
    }

    const subjects = Array.from(subjectMap.entries()).map(([subId, data]) => {
      const avgMark = Math.round(
        data.marks.reduce((a, b) => a + b, 0) / data.marks.length
      );
      const subGrades = allGrades.filter((g: any) => g.subjectId === subId);
      const grade = subGrades.find(
        (g: any) => avgMark >= g.minMark && avgMark <= g.maxMark
      );
      return {
        name: data.name,
        averageMark: avgMark,
        grade: grade ? (grade as any).name : "N/A",
        isPass: grade ? (grade as any).isPass : false,
        examsTaken: data.exams,
      };
    });

    const overallAvg = Math.round(
      subjects.reduce((sum, s) => sum + s.averageMark, 0) / subjects.length
    );
    const passCount = subjects.filter((s) => s.isPass).length;
    const passRate = Math.round((passCount / subjects.length) * 100);

    const sorted = [...subjects].sort((a, b) => b.averageMark - a.averageMark);

    return {
      found: true,
      studentName: `${student.firstName} ${student.lastName}`,
      className: student.class?.name ?? "Unassigned",
      averageMark: overallAvg,
      passRate,
      totalSubjects: subjects.length,
      totalExams: results.length,
      subjects,
      strongestSubject: sorted[0]
        ? `${sorted[0].name} (${sorted[0].averageMark}%)`
        : undefined,
      weakestSubject: sorted[sorted.length - 1]
        ? `${sorted[sorted.length - 1]!.name} (${sorted[sorted.length - 1]!.averageMark}%)`
        : undefined,
    };
  },
});

export const getParentChildren = createTool({
  id: "get-parent-children",
  description:
    "Get all children of a parent with their basic info and class. Use when a parent asks about their children or needs to choose which child to discuss.",
  inputSchema: z.object({
    parentId: z.string().describe("The parent's ID"),
    schoolId: z.string().describe("The school's ID"),
  }),
  outputSchema: z.object({
    children: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        admissionNumber: z.string(),
        className: z.string(),
        status: z.string(),
      })
    ),
  }),
  execute: async ({ context: inputData }) => {
    const students = await db.student.findMany({
      where: { parentId: inputData.parentId, schoolId: inputData.schoolId },
      include: { class: { select: { name: true } } },
    });

    return {
      children: students.map((s) => ({
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        admissionNumber: s.admissionNumber,
        className: s.class?.name ?? "Unassigned",
        status: s.status,
      })),
    };
  },
});

export const getStudentFees = createTool({
  id: "get-student-fees",
  description:
    "Get all fee records for a student, including payment status and amounts. Use when a parent or student asks about fees or outstanding balances.",
  inputSchema: z.object({
    studentId: z.string().describe("The student's ID"),
    schoolId: z.string().describe("The school's ID"),
  }),
  outputSchema: z.object({
    fees: z.array(
      z.object({
        description: z.string(),
        amount: z.string(),
        paidAmount: z.string(),
        status: z.string(),
        dueDate: z.string(),
        remaining: z.string(),
      })
    ),
    totalOwed: z.string(),
  }),
  execute: async ({ context: inputData }) => {
    const fees = await db.fee.findMany({
      where: { studentId: inputData.studentId, schoolId: inputData.schoolId },
      orderBy: { dueDate: "desc" },
    });

    const feeList = fees.map((f) => {
      const amount = Number(f.amount);
      const paid = Number(f.paidAmount);
      return {
        description: f.description,
        amount: `$${amount.toFixed(2)}`,
        paidAmount: `$${paid.toFixed(2)}`,
        status: f.status,
        dueDate: f.dueDate.toLocaleDateString(),
        remaining: `$${(amount - paid).toFixed(2)}`,
      };
    });

    const totalOwed = fees.reduce(
      (sum, f) => sum + (Number(f.amount) - Number(f.paidAmount)),
      0
    );

    return {
      fees: feeList,
      totalOwed: `$${totalOwed.toFixed(2)}`,
    };
  },
});

export const getSchoolAnnouncements = createTool({
  id: "get-school-announcements",
  description:
    "Get recent school announcements. Use when someone asks about school news, notices, or announcements.",
  inputSchema: z.object({
    schoolId: z.string().describe("The school's ID"),
  }),
  outputSchema: z.object({
    announcements: z.array(
      z.object({
        heading: z.string(),
        subheading: z.string(),
        date: z.string(),
        createdBy: z.string(),
      })
    ),
  }),
  execute: async ({ context: inputData }) => {
    const announcements = await db.announcement.findMany({
      where: { schoolId: inputData.schoolId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        createdBy: { select: { name: true } },
      },
    });

    return {
      announcements: announcements.map((a) => ({
        heading: a.heading,
        subheading: a.subheading,
        date: a.createdAt.toLocaleDateString(),
        createdBy: a.createdBy.name,
      })),
    };
  },
});

export const getSchoolInfo = createTool({
  id: "get-school-info",
  description:
    "Get general school information like name, current term, period type. Use when someone asks about the school or its schedule.",
  inputSchema: z.object({
    schoolId: z.string().describe("The school's ID"),
  }),
  outputSchema: z.object({
    name: z.string(),
    currentTerm: z.string(),
    periodType: z.string(),
    termlyFee: z.string().optional(),
    studentCount: z.number().optional(),
    teacherCount: z.number().optional(),
  }),
  execute: async ({ context: inputData }) => {
    const school = await db.school.findUnique({
      where: { id: inputData.schoolId },
    });
    if (!school) return { name: "Unknown", currentTerm: "Unknown", periodType: "Unknown" };

    return {
      name: school.name ?? "Unknown School",
      currentTerm: school.currentTermNumber
        ? `Term ${school.currentTermNumber}, ${school.currentTermYear}`
        : "Not set",
      periodType: school.currentPeriodType,
      termlyFee: school.termlyFee ? `$${Number(school.termlyFee).toFixed(2)}` : undefined,
      studentCount: school.studentCount ?? undefined,
      teacherCount: school.teacherCount ?? undefined,
    };
  },
});

export const getTeacherClasses = createTool({
  id: "get-teacher-classes",
  description:
    "Get the classes and subjects a teacher teaches. Use when a teacher asks about their classes or students.",
  inputSchema: z.object({
    teacherId: z.string().describe("The teacher's user ID"),
    schoolId: z.string().describe("The school's ID"),
  }),
  outputSchema: z.object({
    classes: z.array(
      z.object({
        className: z.string(),
        subjectName: z.string().nullable(),
        studentCount: z.number(),
      })
    ),
  }),
  execute: async ({ context: inputData }) => {
    const teacherClasses = await db.teacherClass.findMany({
      where: {
        teacherId: inputData.teacherId,
        class: { schoolId: inputData.schoolId },
      },
      include: {
        class: {
          include: { students: { select: { id: true } } },
        },
        subject: { select: { name: true } },
      },
    });

    return {
      classes: teacherClasses.map((tc: any) => ({
        className: tc.class.name,
        subjectName: tc.subject?.name ?? null,
        studentCount: tc.class.students.length,
      })),
    };
  },
});

export const getClassStudents = createTool({
  id: "get-class-students",
  description:
    "Get all students in a specific class. Use when a teacher asks about students in one of their classes.",
  inputSchema: z.object({
    className: z.string().describe("The name of the class"),
    schoolId: z.string().describe("The school's ID"),
  }),
  outputSchema: z.object({
    students: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        admissionNumber: z.string(),
        status: z.string(),
      })
    ),
  }),
  execute: async ({ context: inputData }) => {
    const cls = await db.class.findFirst({
      where: { name: inputData.className, schoolId: inputData.schoolId },
      include: {
        students: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
            status: true,
          },
        },
      },
    });
    if (!cls) return { students: [] };

    return {
      students: cls.students.map((s) => ({
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        admissionNumber: s.admissionNumber,
        status: s.status,
      })),
    };
  },
});

// Export all tools as a map for the agent
export const agentTools = {
  extractEmail,
  checkEmailExists,
  verifyCredentials,
  getStudentReport,
  getParentChildren,
  getStudentFees,
  getSchoolAnnouncements,
  getSchoolInfo,
  getTeacherClasses,
  getClassStudents,
};
