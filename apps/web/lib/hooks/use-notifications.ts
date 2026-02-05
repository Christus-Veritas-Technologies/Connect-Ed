"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

interface NotificationCountsResponse {
  counts: Record<string, number>;
}

export function useNotificationCounts() {
  return useQuery<NotificationCountsResponse>({
    queryKey: ["notification-counts"],
    queryFn: async () => {
      const response = await api.get("/dashboard/notifications/unread-counts");
      return response;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 25000, // Consider data stale after 25 seconds
  });
}

export function useNotificationCount(actionUrl: string) {
  const { data } = useNotificationCounts();
  return data?.counts[actionUrl] || 0;
}
