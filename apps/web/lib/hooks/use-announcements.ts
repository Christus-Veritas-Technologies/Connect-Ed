"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

// Types
export interface AnnouncementComment {
  id: string;
  content: string;
  createdAt: string;
  user?: { id: string; name: string; email: string; role: string } | null;
  parent?: { id: string; name: string; email: string } | null;
  student?: { id: string; firstName: string; lastName: string; email?: string | null } | null;
}

export interface Announcement {
  id: string;
  heading: string;
  subheading: string;
  length: "ONE_DAY" | "ONE_WEEK" | "ONE_MONTH";
  createdAt: string;
  createdBy: { id: string; name: string; email: string; role: string };
  comments: AnnouncementComment[];
  _count: { comments: number };
}

interface AnnouncementListResponse {
  announcements: Announcement[];
}

interface CreateAnnouncementInput {
  heading: string;
  subheading: string;
  length: "ONE_DAY" | "ONE_WEEK" | "ONE_MONTH";
}

interface CreateCommentInput {
  announcementId: string;
  content: string;
}

// Query Keys
export const announcementKeys = {
  all: ["announcements"] as const,
  lists: () => [...announcementKeys.all, "list"] as const,
};

// Queries
export function useAnnouncements() {
  return useQuery<AnnouncementListResponse>({
    queryKey: announcementKeys.lists(),
    queryFn: () => api.get("/announcements"),
  });
}

// Mutations
export function useCreateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAnnouncementInput) =>
      api.post<{ announcement: Announcement }>("/announcements", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: announcementKeys.lists() });
    },
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/announcements/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: announcementKeys.lists() });
    },
  });
}

export function useCreateAnnouncementComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ announcementId, content }: CreateCommentInput) =>
      api.post(`/announcements/${announcementId}/comments`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: announcementKeys.lists() });
    },
  });
}
