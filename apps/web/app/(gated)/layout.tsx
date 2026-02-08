"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { GatedGuard } from "@/components/auth-guard";

export default function GatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, school } = useAuth();
  const router = useRouter();

  // Redirect to dashboard if both school and user onboarding are complete
  useEffect(() => {
    if (!user || !school) return;
    const schoolDone = school.isActive && school.onboardingComplete;
    const userDone = user.onboardingComplete || user.role === "RECEPTIONIST";
    if (schoolDone && userDone) {
      router.push("/dashboard");
    }
  }, [user, school, router]);

  return (
    <GatedGuard>
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
    </GatedGuard>
  );
}
