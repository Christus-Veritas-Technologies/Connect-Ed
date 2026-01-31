"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

// Types
interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  totalFees: number;
  collectedFees: number;
  pendingFees: number;
  totalExpenses: number;
  quotaUsage: {
    email: { used: number; limit: number };
    whatsapp: { used: number; limit: number };
    sms: { used: number; limit: number };
  };
}

interface FinancialReport {
  summary: {
    totalFees: number;
    totalCollected: number;
    totalPending: number;
    collectionRate: number;
    totalExpenses: number;
    netIncome: number;
    overdueAmount: number;
    overdueCount: number;
  };
  monthlyBreakdown: { month: string; fees: number; payments: number; expenses: number }[];
  topExpenseCategories: { category: string; amount: number }[];
  period: string;
  startDate: string;
  endDate: string;
}

interface MessageQuota {
  email: { used: number; limit: number; remaining: number };
  whatsapp: { used: number; limit: number; remaining: number };
  sms: { used: number; limit: number; remaining: number };
  quotaResetDate: string | null;
}

// Query Keys
export const dashboardKeys = {
  stats: ["dashboard", "stats"] as const,
  reports: (period: string) => ["reports", "financial", period] as const,
  quota: ["messages", "quota"] as const,
};

// Queries
export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: dashboardKeys.stats,
    queryFn: () => api.get("/dashboard/stats"),
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useFinancialReport(period: string = "month") {
  return useQuery<FinancialReport>({
    queryKey: dashboardKeys.reports(period),
    queryFn: () => api.get(`/reports/financial?period=${period}`),
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useMessageQuota() {
  return useQuery<MessageQuota>({
    queryKey: dashboardKeys.quota,
    queryFn: () => api.get("/messages/quota"),
    staleTime: 30 * 1000, // 30 seconds
  });
}
