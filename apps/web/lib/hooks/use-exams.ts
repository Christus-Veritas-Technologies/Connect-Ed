import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";

// Types
export interface ExamSubject {
  id: string;
  name: string;
  code: string | null;
}

export interface ExamClass {
  id: string;
  name: string;
}

export interface ExamTeacher {
  id: string;
  name: string;
}

export interface ExamStats {
  totalResults: number;
  averageMark: number;
  passRate: number;
  passedCount: number;
  failedCount?: number;
}

export interface ExamResultWithStudent {
  id: string;
  mark: number;
  gradeName: string;
  isPass: boolean;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
  };
}

export interface Grade {
  id: string;
  name: string;
  minMark: number;
  maxMark: number;
  isPass: boolean;
  subjectId: string;
  subject?: { id: string; name: string; code?: string | null };
}

export interface Exam {
  id: string;
  name: string;
  paper: string;
  createdAt: string;
  subject: ExamSubject;
  class: ExamClass;
  teacher: ExamTeacher;
  _count: { results: number };
  stats?: ExamStats;
}

export interface ExamDetail extends Omit<Exam, "stats"> {
  results: ExamResultWithStudent[];
  grades: Grade[];
  stats: ExamStats;
}

export interface ExamStudent {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  existingMark: number | null;
}

// Keys
const examKeys = {
  all: ["exams"] as const,
  detail: (id: string) => ["exams", id] as const,
  students: (id: string) => ["exams", id, "students"] as const,
  grades: ["grades"] as const,
  subjectGrades: (subjectId: string) => ["grades", subjectId] as const,
};

// Hooks

export function useExams() {
  return useQuery({
    queryKey: examKeys.all,
    queryFn: async () => {
      const res = await api.get("/exams");
      return res.data as { exams: Exam[] };
    },
  });
}

export function useExamDetail(id: string) {
  return useQuery({
    queryKey: examKeys.detail(id),
    queryFn: async () => {
      const res = await api.get(`/exams/${id}`);
      return res.data as { exam: ExamDetail };
    },
    enabled: !!id,
  });
}

export function useExamStudents(examId: string) {
  return useQuery({
    queryKey: examKeys.students(examId),
    queryFn: async () => {
      const res = await api.get(`/exams/${examId}/students`);
      return res.data as { students: ExamStudent[] };
    },
    enabled: !!examId,
  });
}

export function useCreateExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; paper: string; subjectId: string; classId: string }) => {
      const res = await api.post("/exams", data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: examKeys.all }),
  });
}

export function useDeleteExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/exams/${id}`);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: examKeys.all }),
  });
}

export function useEnterExamResults(examId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (results: Array<{ studentId: string; mark: number }>) => {
      const res = await api.post(`/exams/${examId}/results`, { results });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: examKeys.detail(examId) });
      qc.invalidateQueries({ queryKey: examKeys.students(examId) });
      qc.invalidateQueries({ queryKey: examKeys.all });
    },
  });
}

// Grades hooks
export function useGrades() {
  return useQuery({
    queryKey: examKeys.grades,
    queryFn: async () => {
      const res = await api.get("/exams/grades");
      return res.data as { grades: Grade[] };
    },
  });
}

export function useSubjectGrades(subjectId: string) {
  return useQuery({
    queryKey: examKeys.subjectGrades(subjectId),
    queryFn: async () => {
      const res = await api.get(`/exams/grades/${subjectId}`);
      return res.data as { grades: Grade[] };
    },
    enabled: !!subjectId,
  });
}

export function useCreateGrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; minMark: number; maxMark: number; isPass: boolean; subjectId: string }) => {
      const res = await api.post("/exams/grades", data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: examKeys.grades }),
  });
}

export function useDeleteGrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/exams/grades/${id}`);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: examKeys.grades }),
  });
}
