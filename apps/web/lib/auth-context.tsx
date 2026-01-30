"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "RECEPTIONIST" | "TEACHER";
}

interface School {
  id: string;
  name: string | null;
  plan: "LITE" | "GROWTH" | "ENTERPRISE";
  isActive: boolean;
  signupFeePaid: boolean;
  onboardingComplete: boolean;
}

interface AuthContextType {
  user: User | null;
  school: School | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      if (data.success) {
        setAccessToken(data.data.accessToken);
        setUser(data.data.user);
        setSchool(data.data.school);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      const success = await refreshToken();
      if (!success) {
        setUser(null);
        setSchool(null);
        setAccessToken(null);
      }
      setIsLoading(false);
    };

    initAuth();
  }, [refreshToken]);

  // Set up token refresh interval
  useEffect(() => {
    if (!accessToken) return;

    // Refresh token every 14 minutes (before 15 min expiry)
    const interval = setInterval(
      () => {
        refreshToken();
      },
      14 * 60 * 1000
    );

    return () => clearInterval(interval);
  }, [accessToken, refreshToken]);

  const login = async (email: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Login failed");
    }

    setUser(data.data.user);
    setSchool(data.data.school);
    setAccessToken(data.data.accessToken);

    // Redirect based on school status
    if (!data.data.school.signupFeePaid) {
      router.push("/payment");
    } else if (!data.data.school.onboardingComplete) {
      router.push("/onboarding");
    } else {
      router.push("/dashboard");
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Signup failed");
    }

    setUser(data.data.user);
    setSchool(data.data.school);
    setAccessToken(data.data.accessToken);

    // New signups always go to payment
    router.push("/payment");
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
      setSchool(null);
      setAccessToken(null);
      router.push("/auth/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        school,
        accessToken,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Hook for making authenticated API requests
export function useAuthFetch() {
  const { accessToken, refreshToken } = useAuth();

  return useCallback(
    async (url: string, options: RequestInit = {}) => {
      const headers = new Headers(options.headers);

      if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
      }

      let response = await fetch(url, { ...options, headers });

      // If unauthorized, try refreshing token
      if (response.status === 401) {
        const refreshed = await refreshToken();
        if (refreshed) {
          // Retry with new token
          headers.set("Authorization", `Bearer ${accessToken}`);
          response = await fetch(url, { ...options, headers });
        }
      }

      return response;
    },
    [accessToken, refreshToken]
  );
}
