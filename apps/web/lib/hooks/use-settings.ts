"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

// Types
export interface SchoolSettings {
  id: string;
  name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  plan: string;
  isActive: boolean;
  emailQuota: number;
  whatsappQuota: number;
  smsQuota: number;
  emailUsed: number;
  whatsappUsed: number;
  smsUsed: number;
  quotaResetDate: string | null;
  createdAt: string;
  termlyFee: number | null;
  currentTermNumber: number | null;
  currentTermYear: number | null;
  termStartDate: string | null;
  currentPeriodType: string;
  holidayStartDate: string | null;
  notifyEmail: boolean;
  notifyWhatsapp: boolean;
  notifySms: boolean;
  notifyInApp: boolean;
}

export interface NotificationPreferences {
  notifyEmail: boolean;
  notifyWhatsapp: boolean;
  notifySms: boolean;
  notifyInApp: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  notifyInApp: boolean;
  notifyEmail: boolean;
  createdAt: string;
}

export interface UpdateSchoolInput {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
}

export interface UpdateNotificationPrefsInput {
  notifyEmail?: boolean;
  notifyWhatsapp?: boolean;
  notifySms?: boolean;
  notifyInApp?: boolean;
}

export interface UpdateProfileInput {
  name?: string;
  phone?: string;
  notifyInApp?: boolean;
  notifyEmail?: boolean;
}

// Query Keys
export const settingsKeys = {
  all: ["settings"] as const,
  school: () => [...settingsKeys.all, "school"] as const,
  notifications: () => [...settingsKeys.all, "notifications"] as const,
  profile: () => [...settingsKeys.all, "profile"] as const,
  users: () => [...settingsKeys.all, "users"] as const,
};

// =============================================
// School Settings
// =============================================

export function useSchoolSettings() {
  return useQuery<{ school: SchoolSettings }>({
    queryKey: settingsKeys.school(),
    queryFn: () => api.get("/settings/school"),
  });
}

export function useUpdateSchool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateSchoolInput) =>
      api.patch<{ school: SchoolSettings }>("/settings/school", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.school() });
    },
  });
}

// =============================================
// Notification Preferences (School-level)
// =============================================

export function useNotificationPrefs() {
  return useQuery<{ preferences: NotificationPreferences }>({
    queryKey: settingsKeys.notifications(),
    queryFn: () => api.get("/settings/notifications"),
  });
}

export function useUpdateNotificationPrefs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateNotificationPrefsInput) =>
      api.patch<{ preferences: NotificationPreferences }>(
        "/settings/notifications",
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.notifications() });
      queryClient.invalidateQueries({ queryKey: settingsKeys.school() });
    },
  });
}

// =============================================
// User Profile & Preferences
// =============================================

export function useUserProfile() {
  return useQuery<{ user: UserProfile }>({
    queryKey: settingsKeys.profile(),
    queryFn: () => api.get("/settings/profile"),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProfileInput) =>
      api.patch<{ user: UserProfile }>("/settings/profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.profile() });
    },
  });
}

// =============================================
// Users List (Admin only)
// =============================================

export interface SchoolUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export function useSchoolUsers() {
  return useQuery<{ users: SchoolUser[] }>({
    queryKey: settingsKeys.users(),
    queryFn: () => api.get("/settings/users"),
  });
}
