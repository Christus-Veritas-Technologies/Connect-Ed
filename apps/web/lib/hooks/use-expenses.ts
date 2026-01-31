"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

// Types
interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  receiptUrl?: string;
  createdAt: string;
}

interface ExpenseListResponse {
  expenses: Expense[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ExpenseFilters {
  page?: number;
  limit?: number;
  category?: string;
  startDate?: string;
  endDate?: string;
}

interface CreateExpenseInput {
  amount: number;
  category: string;
  description: string;
  date: string;
  receiptUrl?: string;
}

// Query Keys
export const expenseKeys = {
  all: ["expenses"] as const,
  lists: () => [...expenseKeys.all, "list"] as const,
  list: (filters: ExpenseFilters) => [...expenseKeys.lists(), filters] as const,
  details: () => [...expenseKeys.all, "detail"] as const,
  detail: (id: string) => [...expenseKeys.details(), id] as const,
  categories: () => [...expenseKeys.all, "categories"] as const,
};

// Queries
export function useExpenses(filters: ExpenseFilters = {}) {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", filters.page.toString());
  if (filters.limit) params.set("limit", filters.limit.toString());
  if (filters.category) params.set("category", filters.category);
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);

  return useQuery<ExpenseListResponse>({
    queryKey: expenseKeys.list(filters),
    queryFn: () => api.get(`/expenses?${params.toString()}`),
  });
}

export function useExpense(id: string) {
  return useQuery<{ expense: Expense }>({
    queryKey: expenseKeys.detail(id),
    queryFn: () => api.get(`/expenses/${id}`),
    enabled: !!id,
  });
}

export function useExpenseCategories() {
  return useQuery<{ categories: string[] }>({
    queryKey: expenseKeys.categories(),
    queryFn: () => api.get("/expenses/categories/list"),
  });
}

// Mutations
export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateExpenseInput) => api.post<{ expense: Expense }>("/expenses", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: expenseKeys.categories() });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.lists() });
    },
  });
}
