"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

// Types
interface Teacher {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  classes?: { id: string; name: string }[];
  createdAt: string;
}

interface TeacherListResponse {
  teachers: Teacher[];
}

interface CreateTeacherInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: "TEACHER";
  classId?: string;
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
    mutationFn: (data: Omit<CreateTeacherInput, "role">) =>
      api.post<{ teacher: Teacher }>("/teachers", { ...data, role: "TEACHER" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.lists() });
    },
  });
}

export function useUpdateTeacher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; isActive?: boolean } }) =>
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
