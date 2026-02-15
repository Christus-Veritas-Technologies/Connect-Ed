"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

// Types
export interface Admin {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
}

interface AdminListResponse {
  admins: Admin[];
}

interface CreateAdminInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

// Query Keys
export const adminKeys = {
  all: ["admins"] as const,
  lists: () => [...adminKeys.all, "list"] as const,
};

// Queries
export function useAdmins() {
  return useQuery<AdminListResponse>({
    queryKey: adminKeys.lists(),
    queryFn: () => api.get("/admins"),
  });
}

// Mutations
export function useCreateAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAdminInput) =>
      api.post<{ admin: Admin }>("/admins", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.lists() });
    },
  });
}

export function useDeleteAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/admins/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.lists() });
    },
  });
}
