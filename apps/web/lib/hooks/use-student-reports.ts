import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Types
export interface SubjectExam {
  examId: string;
  examName: string;
  paper: string;
  mark: number;
  gradeName: string;
  isPass: boolean;
}

export interface SubjectReport {
  subjectId: string;
  subjectName: string;
  subjectCode: string | null;
  exams: SubjectExam[];
  averageMark: number;
  averageGrade: string;
  averageIsPass: boolean;
  examsTaken: number;
  examsPassed: number;
  passRate: number;
}

export interface StudentReportData {
  student: {
    id: string;
    name: string;
    admissionNumber: string;
    className: string;
  };
  subjects: SubjectReport[];
  overall: {
    averageMark: number;
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

export interface SchoolInsights {
  totalStudents: number;
  schoolAverage: number;
  schoolPassRate: number;
}

// Keys
const reportKeys = {
  all: ["student-reports"] as const,
  detail: (id: string) => ["student-reports", id] as const,
  parent: ["student-reports", "parent"] as const,
  student: ["student-reports", "student"] as const,
};

// Staff hooks (Admin / Teacher)
export function useStudentReports() {
  return useQuery({
    queryKey: reportKeys.all,
    queryFn: () =>
      api.get<{ reports: StudentReportData[]; schoolInsights: SchoolInsights }>("/student-reports"),
  });
}

export function useStudentReport(studentId: string) {
  return useQuery({
    queryKey: reportKeys.detail(studentId),
    queryFn: () =>
      api.get<{ report: StudentReportData }>(`/student-reports/${studentId}`),
    enabled: !!studentId,
  });
}

// Parent hook
export function useParentChildrenReports() {
  return useQuery({
    queryKey: reportKeys.parent,
    queryFn: () =>
      api.get<{ reports: StudentReportData[] }>("/student-reports/parent/my-children"),
  });
}

// Student hook
export function useMyReport() {
  return useQuery({
    queryKey: reportKeys.student,
    queryFn: () =>
      api.get<{ report: StudentReportData }>("/student-reports/student/my-report"),
  });
}

// ============================================
// Send report to parent hooks
// ============================================

export interface DispatchResult {
  studentId: string;
  studentName: string;
  parentName: string | null;
  emailSent: boolean;
  whatsappSent: boolean;
  error?: string;
}

// Send a single student's report to their parent
export function useSendReportToParent() {
  return useMutation({
    mutationFn: (studentId: string) =>
      api.post<{ message: string; result: DispatchResult }>(
        `/student-reports/${studentId}/send-to-parent`
      ),
  });
}

// Bulk send reports to parents (admin only)
export function useBulkSendReportsToParents() {
  return useMutation({
    mutationFn: (studentIds: string[]) =>
      api.post<{ message: string; results: DispatchResult[]; sent: number; failed: number }>(
        "/student-reports/bulk/send-to-parents",
        { studentIds }
      ),
  });
}
