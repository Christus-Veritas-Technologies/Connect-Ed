"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

// Types
export interface Receptionist {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

interface ReceptionistListResponse {
  receptionists: Receptionist[];
}

interface CreateReceptionistInput {
  firstName: string;
  lastName: string;
  email: string;
}

// Query Keys
export const receptionistKeys = {
  all: ["receptionists"] as const,
  lists: () => [...receptionistKeys.all, "list"] as const,
};

// Queries
export function useReceptionists() {
  return useQuery<ReceptionistListResponse>({
    queryKey: receptionistKeys.lists(),
    queryFn: () => api.get("/receptionists"),
  });
}

// Mutations
export function useCreateReceptionist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReceptionistInput) =>
      api.post<{ receptionist: Receptionist }>("/receptionists", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: receptionistKeys.lists() });
    },
  });
}

export function useDeleteReceptionist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/receptionists/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: receptionistKeys.lists() });
    },
  });
}
