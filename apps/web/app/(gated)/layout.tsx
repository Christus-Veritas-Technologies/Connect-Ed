"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";

export default function GatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, school } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/auth/login");
      } else if (school?.isActive && school?.onboardingComplete) {
        router.push("/dashboard");
      }
    }
  }, [isAuthenticated, isLoading, school, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="size-12 rounded-full border-4 border-brand border-t-transparent animate-spin" />
          <p className="text-muted-foreground font-medium">Loading...</p>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-brand to-mid flex items-center justify-center">
              <span className="text-lg font-bold text-white">CE</span>
            </div>
            <h1 className="text-xl font-bold">Connect-Ed</h1>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {children}
      </main>
    </div>
  );
}
