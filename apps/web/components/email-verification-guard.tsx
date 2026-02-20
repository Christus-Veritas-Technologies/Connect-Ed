"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Email Verification Guard
 * 
 * Redirects unverified users (except staff/teachers) to email verification page
 * - Staff/teachers are auto-verified on creation, so they skip this check
 * - Parents and students must verify their email before accessing the app
 */
export function EmailVerificationGuard({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();
    const router = useRouter();

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
            router.push("/auth/verify-email");
        }
    }, [user, isLoading, router]);

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
