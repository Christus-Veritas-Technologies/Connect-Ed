"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiClient } from "../api";

// ─── Types ───────────────────────────────────────────────────

export interface SharedFileUploader {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

export interface SharedFileRecipient {
  id: string;
  recipientType: "USER" | "STUDENT" | "PARENT" | "ROLE";
  recipientRole?: string | null;
  recipientUser?: { id: string; name: string } | null;
  recipientStudent?: { id: string; firstName: string; lastName: string } | null;
  recipientParent?: { id: string; name: string } | null;
}

export interface SharedFile {
  id: string;
  title: string;
  description: string | null;
  storedName: string;
  originalName: string;
  size: number;
  mimeType: string;
  url: string | null;
  createdAt: string;
  updatedAt: string;
  uploadedByUser?: SharedFileUploader | null;
  uploadedByStudent?: { id: string; firstName: string; lastName: string } | null;
  uploadedByParent?: { id: string; name: string } | null;
  recipients?: SharedFileRecipient[];
}

export interface SharedFilesResponse {
  files: SharedFile[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SearchResult {
  type: "USER" | "STUDENT" | "PARENT";
  id: string;
  label: string;
  subtitle: string;
}

export interface ShareRecipient {
  type: "USER" | "STUDENT" | "PARENT" | "ROLE";
  id?: string;
  role?: string;
}

// ─── Query Keys ──────────────────────────────────────────────

export const sharedFileKeys = {
  all: ["shared-files"] as const,
  lists: () => [...sharedFileKeys.all, "list"] as const,
  list: (page: number, search?: string) =>
    [...sharedFileKeys.lists(), page, search] as const,
  detail: (id: string) => [...sharedFileKeys.all, "detail", id] as const,
  search: (query: string) => [...sharedFileKeys.all, "search", query] as const,
};

// ─── Queries ─────────────────────────────────────────────────

export function useSharedFiles(page: number = 1, search?: string) {
  return useQuery<SharedFilesResponse>({
    queryKey: sharedFileKeys.list(page, search),
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      return api.get(`/shared-files/staff?${params}`);
    },
  });
}

export function useSharedFile(id: string) {
  return useQuery<SharedFile>({
    queryKey: sharedFileKeys.detail(id),
    queryFn: () => api.get(`/shared-files/staff/${id}`),
    enabled: !!id,
  });
}

export function useSearchUsers(query: string) {
  return useQuery<{ results: SearchResult[] }>({
    queryKey: sharedFileKeys.search(query),
    queryFn: () => api.get(`/shared-files/staff/search/users?q=${encodeURIComponent(query)}`),
    enabled: query.length >= 2,
  });
}

// ─── Mutations ───────────────────────────────────────────────

export function useUploadFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      file: File;
      title: string;
      description?: string;
      recipients?: ShareRecipient[];
    }) => {
      const formData = new FormData();
      formData.append("file", data.file);
      formData.append("title", data.title);
      if (data.description) formData.append("description", data.description);
      if (data.recipients) {
        formData.append("recipients", JSON.stringify(data.recipients));
      }

      const response = await apiClient.post("/shared-files/staff/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) return response.data.data;
      throw new Error("Upload failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sharedFileKeys.lists() });
    },
  });
}

export function useShareFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { fileId: string; recipients: ShareRecipient[] }) =>
      api.post(`/shared-files/staff/${data.fileId}/share`, {
        recipients: data.recipients,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sharedFileKeys.all });
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/shared-files/staff/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sharedFileKeys.lists() });
    },
  });
}

export function useFileDownloadUrl() {
  return useMutation({
    mutationFn: (id: string) =>
      api.get<{ downloadUrl: string; fileName: string }>(
        `/shared-files/staff/${id}/download`
      ),
  });
}

export function useFileViewUrl() {
  return useMutation({
    mutationFn: (id: string) =>
      api.get<{ viewUrl: string; fileName: string; mimeType: string }>(
        `/shared-files/staff/${id}/view`
      ),
  });
}
