"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

// Types
export interface Subject {
  id: string;
  name: string;
  code?: string | null;
  level?: string | null;
  isActive: boolean;
  _count?: { students: number; classes: number };
}

interface SubjectListResponse {
  subjects: Subject[];
}

// Query Keys
export const subjectKeys = {
  all: ["subjects"] as const,
  lists: () => [...subjectKeys.all, "list"] as const,
};

// Queries
export function useSubjects() {
  return useQuery<SubjectListResponse>({
    queryKey: subjectKeys.lists(),
    queryFn: () => api.get("/subjects"),
  });
}
