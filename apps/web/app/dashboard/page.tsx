"use client";

import { useAuth } from "@/lib/auth-context";
import { DashboardGuard } from "@/components/auth-guard";
import { SchoolPaymentGuard } from "@/components/school-payment-guard";
import {
  AdminDashboard,
  TeacherDashboard,
  ParentDashboard,
  StudentDashboard,
} from "./components";

export default function DashboardPage() {
  return (
    <DashboardGuard>
      <SchoolPaymentGuard>
        <DashboardRouter />
      </SchoolPaymentGuard>
    </DashboardGuard>
  );
}

function DashboardRouter() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="size-10 rounded-full border-4 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  // Route to appropriate dashboard based on role
  switch (user.role) {
    case "ADMIN":
    case "RECEPTIONIST":
      return <AdminDashboard />;
    case "TEACHER":
      return <TeacherDashboard />;
    case "PARENT":
      return <ParentDashboard />;
    case "STUDENT":
      return <StudentDashboard />;
    default:
      return <AdminDashboard />;
  }
}
