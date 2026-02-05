"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

// Types
interface Parent {
  id: string;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  children?: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
  }[];
  createdAt: string;
}

interface CreateParentInput {
  name: string;
  email: string;
  phone?: string;
  studentIds?: string[];
}

interface ParentListResponse {
  parents: Parent[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Query Keys
export const parentKeys = {
  all: ["parents"] as const,
  lists: () => [...parentKeys.all, "list"] as const,
  details: () => [...parentKeys.all, "detail"] as const,
  detail: (id: string) => [...parentKeys.details(), id] as const,
};

// Queries
export function useParents(params?: { page?: number; limit?: number; search?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", params.page.toString());
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  if (params?.search) searchParams.set("search", params.search);

  return useQuery<ParentListResponse>({
    queryKey: [...parentKeys.lists(), params],
    queryFn: () => api.get(`/parents?${searchParams.toString()}`),
  });
}

export function useParent(id: string) {
  return useQuery<{ parent: Parent }>({
    queryKey: parentKeys.detail(id),
    queryFn: () => api.get(`/parents/${id}`),
    enabled: !!id,
  });
}

// Mutations
export function useCreateParent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateParentInput) =>
      api.post<{ parent: Parent; password: string }>("/parents", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parentKeys.lists() });
    },
  });
}

export function useUpdateParent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateParentInput> }) =>
      api.patch<{ parent: Parent }>(`/parents/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: parentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: parentKeys.detail(variables.id) });
    },
  });
}

export function useDeleteParent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/parents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parentKeys.lists() });
    },
  });
}
