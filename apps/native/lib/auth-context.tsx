import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api, setForceLogoutCallback } from './api';
import { getAccessToken, setAccessToken, clearAccessToken } from './secure-store';
import type { User, School, UserType, LoginResponse } from './types';

interface AuthContextType {
    user: User | null;
    school: School | null;
    userType: UserType | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<boolean>;
    refreshUser: () => Promise<void>;
    refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [school, setSchool] = useState<School | null>(null);
    const [userType, setUserType] = useState<UserType | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const clearAuth = useCallback(async () => {
        setUser(null);
        setSchool(null);
        setUserType(null);
        await clearAccessToken();
    }, []);

    const checkAuth = useCallback(async (): Promise<boolean> => {
        try {
            const token = await getAccessToken();
            if (!token) {
                setIsLoading(false);
                return false;
            }

            const data = await api.post<LoginResponse>('/auth/refresh');
            await setAccessToken(data.accessToken);
            setUser(data.user);
            setSchool(data.school);
            setUserType(data.userType);
            return true;
        } catch {
            await clearAuth();
            return false;
        }
    }, [clearAuth]);

    const login = useCallback(async (email: string, password: string) => {
        const data = await api.post<LoginResponse>('/auth/login', { email, password });
        await setAccessToken(data.accessToken);
        setUser(data.user);
        setSchool(data.school);
        setUserType(data.userType);
    }, []);

    const logout = useCallback(async () => {
        try {
            await api.post('/auth/logout');
        } catch {
            // ignore logout errors
        }
        await clearAuth();
    }, [clearAuth]);

    const refetch = useCallback(async () => {
        await checkAuth();
    }, [checkAuth]);

    const refreshUser = useCallback(async () => {
        await checkAuth();
    }, [checkAuth]);

    // Register force-logout callback for API layer (401 after refresh fails)
    useEffect(() => {
        setForceLogoutCallback(() => {
            clearAuth();
        });
    }, [clearAuth]);

    // Initial auth check
    useEffect(() => {
        const init = async () => {
            await checkAuth();
            setIsLoading(false);
        };
        init();
    }, [checkAuth]);

    // Token refresh interval (every 14 minutes)
    useEffect(() => {
        if (!user) return;
        const interval = setInterval(() => {
            checkAuth();
        }, 14 * 60 * 1000);
        return () => clearInterval(interval);
    }, [user, checkAuth]);

    return (
        <AuthContext.Provider
            value={{
                user,
                school,
                userType,
                isLoading,
                isAuthenticated: !!user,
                login,
                logout,
                checkAuth,
                refreshUser,
                refetch,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
