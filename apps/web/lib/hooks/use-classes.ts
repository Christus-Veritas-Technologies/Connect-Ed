"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

// Types
interface Class {
  id: string;
  name: string;
  classTeacher?: { id: string; name: string; email: string } | null;
  _count?: { students: number };
  students?: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
    isActive: boolean;
  }[];
  createdAt: string;
}

interface ClassListResponse {
  classes: Class[];
}

interface CreateClassInput {
  name: string;
  classTeacherId?: string;
}

// Query Keys
export const classKeys = {
  all: ["classes"] as const,
  lists: () => [...classKeys.all, "list"] as const,
  details: () => [...classKeys.all, "detail"] as const,
  detail: (id: string) => [...classKeys.details(), id] as const,
};

// Queries
export function useClasses() {
  return useQuery<ClassListResponse>({
    queryKey: classKeys.lists(),
    queryFn: () => api.get("/classes"),
  });
}

export function useClass(id: string) {
  return useQuery<{ class: Class }>({
    queryKey: classKeys.detail(id),
    queryFn: () => api.get(`/classes/${id}`),
    enabled: !!id,
  });
}

// Mutations
export function useCreateClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateClassInput) => api.post<{ class: Class }>("/classes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classKeys.lists() });
    },
  });
}

export function useUpdateClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateClassInput> }) =>
      api.patch<{ class: Class }>(`/classes/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: classKeys.lists() });
      queryClient.invalidateQueries({ queryKey: classKeys.detail(variables.id) });
    },
  });
}

export function useDeleteClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/classes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classKeys.lists() });
    },
  });
}
