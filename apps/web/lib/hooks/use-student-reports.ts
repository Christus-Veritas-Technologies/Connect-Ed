import { useQuery } from "@tanstack/react-query";
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
    queryFn: async () => {
      const res = await api.get("/student-reports");
      return res.data as { reports: StudentReportData[]; schoolInsights: SchoolInsights };
    },
  });
}

export function useStudentReport(studentId: string) {
  return useQuery({
    queryKey: reportKeys.detail(studentId),
    queryFn: async () => {
      const res = await api.get(`/student-reports/${studentId}`);
      return res.data as { report: StudentReportData };
    },
    enabled: !!studentId,
  });
}

// Parent hook
export function useParentChildrenReports() {
  return useQuery({
    queryKey: reportKeys.parent,
    queryFn: async () => {
      const res = await api.get("/student-reports/parent/my-children");
      return res.data as { reports: StudentReportData[] };
    },
  });
}

// Student hook
export function useMyReport() {
  return useQuery({
    queryKey: reportKeys.student,
    queryFn: async () => {
      const res = await api.get("/student-reports/student/my-report");
      return res.data as { report: StudentReportData };
    },
  });
}
