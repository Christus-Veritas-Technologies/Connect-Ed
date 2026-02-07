"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

// Types
interface Fee {
  id: string;
  amount: number;
  paidAmount: number;
  description: string;
  dueDate: string;
  status: "PENDING" | "PARTIAL" | "PAID" | "OVERDUE";
  student: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
  };
  payments: FeePayment[];
  createdAt: string;
}

interface FeePayment {
  id: string;
  amount: number;
  paymentMethod: string;
  reference?: string;
  notes?: string;
  createdAt: string;
}

interface FeeListResponse {
  fees: Fee[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface StudentOwing {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  className: string;
  totalOwed: number;
}

interface FeeStatsResponse {
  termNumber: number;
  currentYear: number;
  feesPaidThisTerm: number;
  unpaidFeesThisTerm: number;
  feesPaidThisYear: number;
  unpaidFeesThisYear: number;
  studentsOwing: StudentOwing[];
}

interface FeeFilters {
  page?: number;
  limit?: number;
  studentId?: string;
  status?: string;
  filter?: "overdue";
  term?: number;
  year?: number;
}

interface CreateFeeInput {
  studentId: string;
  amount: number;
  description: string;
  dueDate: string;
}

interface RecordPaymentInput {
  amount: number;
  paymentMethod: "CASH" | "BANK_TRANSFER" | "ONLINE";
  reference?: string;
  notes?: string;
}

// Query Keys
export const feeKeys = {
  all: ["fees"] as const,
  lists: () => [...feeKeys.all, "list"] as const,
  list: (filters: FeeFilters) => [...feeKeys.lists(), filters] as const,
  details: () => [...feeKeys.all, "detail"] as const,
  detail: (id: string) => [...feeKeys.details(), id] as const,
  stats: () => [...feeKeys.all, "stats"] as const,
};

// Queries
export function useFeeStats() {
  return useQuery<FeeStatsResponse>({
    queryKey: feeKeys.stats(),
    queryFn: () => api.get("/fees/stats"),
  });
}

export function useFees(filters: FeeFilters = {}) {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", filters.page.toString());
  if (filters.limit) params.set("limit", filters.limit.toString());
  if (filters.studentId) params.set("studentId", filters.studentId);
  if (filters.status) params.set("status", filters.status);
  if (filters.filter) params.set("filter", filters.filter);
  if (filters.term) params.set("term", filters.term.toString());
  if (filters.year) params.set("year", filters.year.toString());

  return useQuery<FeeListResponse>({
    queryKey: feeKeys.list(filters),
    queryFn: () => api.get(`/fees?${params.toString()}`),
  });
}

export function useFee(id: string) {
  return useQuery<{ fee: Fee }>({
    queryKey: feeKeys.detail(id),
    queryFn: () => api.get(`/fees/${id}`),
    enabled: !!id,
  });
}

// Mutations
export function useCreateFee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFeeInput) => api.post<{ fee: Fee }>("/fees", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feeKeys.lists() });
    },
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ feeId, data }: { feeId: string; data: RecordPaymentInput }) =>
      api.post<{ payment: FeePayment; newStatus: string }>(`/fees/${feeId}/payments`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: feeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: feeKeys.detail(variables.feeId) });
    },
  });
}
