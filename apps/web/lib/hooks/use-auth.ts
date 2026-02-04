"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, setAccessToken, clearAccessToken, ApiError } from "../api";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth-context";
import { getLoginRedirectPath } from "../auth-redirect";

// Types
interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface School {
  id: string;
  name: string | null;
  plan: string;
  isActive: boolean;
  signupFeePaid: boolean;
  onboardingComplete: boolean;
}

interface AuthResponse {
  user: User;
  school: School;
  userType: "STAFF" | "PARENT" | "STUDENT";
  accessToken: string;
}

interface RefreshResponse {
  user: User;
  school: School;
  userType: "STAFF" | "PARENT" | "STUDENT";
  accessToken: string;
}

// Auth Queries & Mutations
export function useRefreshToken() {
  return useQuery<RefreshResponse>({
    queryKey: ["auth", "refresh"],
    queryFn: async () => {
      const data = await api.post<RefreshResponse>("/auth/refresh");
      setAccessToken(data.accessToken);
      return data;
    },
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { setAuthData } = useAuth();

  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      return api.post<AuthResponse>("/auth/login", credentials);
    },
    onSuccess: (data) => {
      setAccessToken(data.accessToken);
      // Update auth context immediately with userType
      setAuthData(data.user, data.school, data.userType);
      queryClient.setQueryData(["auth", "user"], data);
      
      // Get redirect path based on payment status, onboarding status, and role
      const redirectPath = getLoginRedirectPath(data.user, data.school);
      router.push(redirectPath);
    },
  });
}

export function useSignup() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { setAuthData } = useAuth();

  return useMutation({
    mutationFn: async (data: { email: string; password: string; name: string }) => {
      return api.post<AuthResponse>("/auth/signup", data);
    },
    onSuccess: (data) => {
      setAccessToken(data.accessToken);
      // Update auth context immediately with userType (signup is always STAFF/ADMIN)
      setAuthData(data.user, data.school, data.userType);
      queryClient.setQueryData(["auth", "user"], data);
      router.push("/payment");
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      return api.post("/auth/logout");
    },
    onSuccess: () => {
      clearAccessToken();
      queryClient.clear();
      router.push("/auth/login");
    },
    onError: () => {
      // Clear anyway on error
      clearAccessToken();
      queryClient.clear();
      router.push("/auth/login");
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      return api.post<{ message: string }>("/auth/forgot-password", { email });
    },
  });
}

export function useResetPassword() {
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: { token: string; password: string }) => {
      return api.post<{ message: string }>("/auth/reset-password", data);
    },
    onSuccess: () => {
      router.push("/auth/login");
    },
  });
}
