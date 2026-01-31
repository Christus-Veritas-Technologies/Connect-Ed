"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

// Types
interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  dateOfBirth?: string;
  gender?: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  class?: { id: string; name: string } | null;
  parent?: { id: string; name: string } | null;
  createdAt: string;
}

interface StudentListResponse {
  students: Student[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface StudentFilters {
  page?: number;
  limit?: number;
  search?: string;
  classId?: string;
  status?: "active" | "inactive";
}

interface CreateStudentInput {
  firstName: string;
  lastName: string;
  admissionNumber: string;
  dateOfBirth?: string;
  gender?: string;
  classId?: string;
  parentId?: string;
  email?: string;
  phone?: string;
}

// Query Keys
export const studentKeys = {
  all: ["students"] as const,
  lists: () => [...studentKeys.all, "list"] as const,
  list: (filters: StudentFilters) => [...studentKeys.lists(), filters] as const,
  details: () => [...studentKeys.all, "detail"] as const,
  detail: (id: string) => [...studentKeys.details(), id] as const,
};

// Queries
export function useStudents(filters: StudentFilters = {}) {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", filters.page.toString());
  if (filters.limit) params.set("limit", filters.limit.toString());
  if (filters.search) params.set("search", filters.search);
  if (filters.classId) params.set("classId", filters.classId);
  if (filters.status) params.set("status", filters.status);

  return useQuery<StudentListResponse>({
    queryKey: studentKeys.list(filters),
    queryFn: () => api.get(`/students?${params.toString()}`),
  });
}

export function useStudent(id: string) {
  return useQuery<{ student: Student }>({
    queryKey: studentKeys.detail(id),
    queryFn: () => api.get(`/students/${id}`),
    enabled: !!id,
  });
}

// Mutations
export function useCreateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStudentInput) => api.post<{ student: Student }>("/students", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.lists() });
    },
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateStudentInput> }) =>
      api.patch<{ student: Student }>(`/students/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: studentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: studentKeys.detail(variables.id) });
    },
  });
}

export function useDeleteStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/students/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.lists() });
    },
  });
}
