"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

// Types
export interface TeacherClassAssignment {
  id: string;
  class: { id: string; name: string; level?: string | null; _count?: { students: number } };
  subject: { id: string; name: string } | null;
}

export interface TeacherSubjectAssignment {
  id: string;
  subject: { id: string; name: string; level?: string | null };
}

export interface Teacher {
  id: string;
  email: string;
  name: string;
  level?: string | null;
  isActive: boolean;
  classesTeaching: TeacherClassAssignment[];
  teacherSubjects: TeacherSubjectAssignment[];
  createdAt: string;
}

interface TeacherListResponse {
  teachers: Teacher[];
}

interface CreateTeacherInput {
  email: string;
  firstName: string;
  lastName: string;
  level?: string;
  classIds?: string[];
  subjectIds?: string[];
}

interface UpdateTeacherInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  level?: string | null;
  isActive?: boolean;
  classIds?: string[];
  subjectIds?: string[];
}

// Query Keys
export const teacherKeys = {
  all: ["teachers"] as const,
  lists: () => [...teacherKeys.all, "list"] as const,
  details: () => [...teacherKeys.all, "detail"] as const,
  detail: (id: string) => [...teacherKeys.details(), id] as const,
};

// Queries
export function useTeachers() {
  return useQuery<TeacherListResponse>({
    queryKey: teacherKeys.lists(),
    queryFn: () => api.get("/teachers"),
  });
}

export function useTeacher(id: string) {
  return useQuery<{ teacher: Teacher }>({
    queryKey: teacherKeys.detail(id),
    queryFn: () => api.get(`/teachers/${id}`),
    enabled: !!id,
  });
}

// Mutations
export function useCreateTeacher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTeacherInput) =>
      api.post<{ teacher: Teacher }>("/teachers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.lists() });
    },
  });
}

export function useUpdateTeacher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTeacherInput }) =>
      api.patch<{ teacher: Teacher }>(`/teachers/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.lists() });
      queryClient.invalidateQueries({ queryKey: teacherKeys.detail(variables.id) });
    },
  });
}

export function useDeleteTeacher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/teachers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.lists() });
    },
  });
}
