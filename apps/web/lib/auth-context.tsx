"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, setAccessToken, clearAccessToken, api } from "./api";

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
  isLoading: boolean;
  isAuthenticated: boolean;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const checkAuth = async (): Promise<boolean> => {
    try {
      // Check if we have a token
      const token = getAccessToken();
      if (!token) {
        // Try to refresh
        const data = await api.post<{
          user: User;
          school: School;
          accessToken: string;
        }>("auth/refresh");
        
        setAccessToken(data.accessToken);
        setUser(data.user);
        setSchool(data.school);
        return true;
      }

      // If we have a token but no user data, fetch it
      if (!user) {
        const data = await api.post<{
          user: User;
          school: School;
          accessToken: string;
        }>("/auth/refresh");
        
        setUser(data.user);
        setSchool(data.school);
        return true;
      }

      return true;
    } catch (error) {
      setUser(null);
      setSchool(null);
      clearAccessToken();
      return false;
    }
  };

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      await checkAuth();
      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Set up token refresh interval
  useEffect(() => {
    if (!user) return;

    // Refresh token every 14 minutes (before 15 min expiry)
    const interval = setInterval(
      async () => {
        await checkAuth();
      },
      14 * 60 * 1000
    );

    return () => clearInterval(interval);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        school,
        isLoading,
        isAuthenticated: !!user,
        checkAuth,
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
