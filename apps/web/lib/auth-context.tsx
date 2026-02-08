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
  role: "ADMIN" | "RECEPTIONIST" | "TEACHER" | "PARENT" | "STUDENT";
  onboardingComplete: boolean;
  // Additional fields for specific roles
  children?: Array<{ id: string; name: string; class?: string }>; // For parents
  admissionNumber?: string; // For students
  class?: string; // For students
}

interface School {
  id: string;
  name: string | null;
  plan: "LITE" | "GROWTH" | "ENTERPRISE";
  isActive: boolean;
  signupFeePaid: boolean;
  onboardingComplete: boolean;
  termlyFee: number | null;
  currentTermNumber: number | null;
  currentTermYear: number | null;
  termStartDate: string | null;
  currentPeriodType: "TERM" | "HOLIDAY";
  holidayStartDate: string | null;
}

type UserType = "STAFF" | "PARENT" | "STUDENT";

interface AuthContextType {
  user: User | null;
  school: School | null;
  userType: UserType | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  checkAuth: () => Promise<boolean>;
  setAuthData: (user: User, school: School, userType: UserType) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [userType, setUserType] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const checkAuth = async (): Promise<boolean> => {
    try {
      // Always refresh to get latest data
      const data = await api.post<{
        user: User;
        school: School;
        userType: UserType;
        accessToken: string;
      }>("/auth/refresh");
      
      setAccessToken(data.accessToken);
      setUser(data.user);
      setSchool(data.school);
      setUserType(data.userType);
      return true;
    } catch (error) {
      setUser(null);
      setSchool(null);
      setUserType(null);
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
        userType,
        isLoading,
        isAuthenticated: !!user,
        checkAuth,
        setAuthData: (newUser: User, newSchool: School, newUserType: UserType) => {
          setUser(newUser);
          setSchool(newSchool);
          setUserType(newUserType);
        },
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
