import type { Metadata } from "next";
import AuthLayoutClient from "./auth-layout-client";

export const metadata: Metadata = {
    title: "Sign In",
    robots: { index: false, follow: false },
};

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <AuthLayoutClient>{children}</AuthLayoutClient>;
}
