import { useAuth } from "@/lib/auth-context";
import { router } from "expo-router";
import { useEffect } from "react";

/**
 * Email Verification Guard for React Native
 * 
 * Redirects unverified users (except staff/teachers) to email verification screen
 * - Staff/teachers are auto-verified on creation, so they skip this check
 * - Parents and students must verify their email before accessing the app
 */
export function EmailVerificationGuard({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();

    useEffect(() => {
        if (isLoading) return;

        if (!user) {
            // Not logged in - let auth guard handle it
            return;
        }

        // Staff/teachers are auto-verified, skip check
        if (user.role === "ADMIN" || user.role === "TEACHER" || user.role === "RECEPTIONIST") {
            return;
        }

        // Parents and students must verify email
        if (!user.emailVerified) {
            router.replace("/(tabs)" as any); // Will be redirected by verify-email screen
        }
    }, [user, isLoading]);

    // Show children only if verified or staff
    if (isLoading) {
        return null; // Or loading spinner
    }

    if (!user) {
        return null; // Auth guard will handle redirect
    }

    // Allow staff through regardless
    if (user.role === "ADMIN" || user.role === "TEACHER" || user.role === "RECEPTIONIST") {
        return <>{children}</>;
    }

    // Allow verified users through
    if (user.emailVerified) {
        return <>{children}</>;
    }

    // Unverified - will redirect
    return null;
}
