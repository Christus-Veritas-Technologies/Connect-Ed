"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home03Icon,
  UserGroupIcon,
  Money01Icon,
  Invoice03Icon,
  School01Icon,
  TeacherIcon,
  ChartHistogramIcon,
  Settings02Icon,
  Logout01Icon,
  Menu01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useAuth } from "@/lib/auth-context";
import { useLogout } from "@/lib/hooks";
import { DashboardGuard } from "@/components/auth-guard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home03Icon, roles: ["ADMIN", "RECEPTIONIST", "TEACHER", "PARENT", "STUDENT"] },
  { href: "/dashboard/students", label: "Students", icon: UserGroupIcon, roles: ["ADMIN", "RECEPTIONIST", "TEACHER"] },
  { href: "/dashboard/fees", label: "Fees", icon: Money01Icon, roles: ["ADMIN", "RECEPTIONIST"] },
  { href: "/dashboard/expenses", label: "Expenses", icon: Invoice03Icon, roles: ["ADMIN", "RECEPTIONIST"] },
  { href: "/dashboard/classes", label: "Classes", icon: School01Icon, roles: ["ADMIN", "TEACHER"], plans: ["GROWTH", "ENTERPRISE"] },
  { href: "/dashboard/teachers", label: "Teachers", icon: TeacherIcon, roles: ["ADMIN"], plans: ["GROWTH", "ENTERPRISE"] },
  { href: "/dashboard/reports", label: "Reports", icon: ChartHistogramIcon, roles: ["ADMIN", "RECEPTIONIST"] },
  { href: "/dashboard/settings", label: "Settings", icon: Settings02Icon, roles: ["ADMIN"] },
];

function SidebarContent({ pathname, user, school, logout }: {
  pathname: string;
  user: { name: string; email: string; role: string };
  school: { name: string | null; plan: string };
  logout: () => void;
}) {
  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles.includes(user.role)) return false;
    if (item.plans && !item.plans.includes(school.plan)) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-gradient-to-br from-brand to-mid flex items-center justify-center">
            <span className="text-lg font-bold text-white">CE</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Connect-Ed</h1>
            <p className="text-xs text-muted-foreground truncate max-w-[140px]">
              {school.name || "School Management"}
            </p>
          </div>
        </Link>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {filteredNavItems.map((item, index) => {
          const isActive = pathname === item.href;

          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200
                  ${isActive
                    ? "border-r-2 border-r-brand text-brand"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }
                `}
              >
                <HugeiconsIcon
                  icon={item.icon}
                  size={20}
                  strokeWidth={2}
                  className={`${isActive ? "text-brand" : "text-inherit"}`}
                />
                <span className={`${isActive ? "text-brand" : ""}`}>{item.label}</span>
              </Link>
            </motion.div>
          );
        })}
      </nav>

      <Separator />

      {/* User Info */}
      <div className="p-4">
        <div className="p-4 rounded-xl bg-muted/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-10 rounded-full bg-brand/10 flex items-center justify-center">
              <span className="text-sm font-semibold text-brand">
                {user.name.split(" ").map(n => n[0]).join("").toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Badge
              variant={
                school.plan === "ENTERPRISE" ? "brand" :
                school.plan === "GROWTH" ? "success" :
                "warning"
              }
              size="sm"
            >
              {school.plan}
            </Badge>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={logout}
              className="text-muted-foreground hover:text-destructive"
            >
              <HugeiconsIcon icon={Logout01Icon} size={18} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, school } = useAuth();
  const logoutMutation = useLogout();
  const pathname = usePathname();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <DashboardGuard>
      <div className="flex min-h-screen bg-muted/30">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-[280px] bg-card border-r border-border">
          {user && school && (
            <SidebarContent
              pathname={pathname}
              user={user}
              school={school}
              logout={handleLogout}
            />
          )}
        </aside>

        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
          <div className="flex items-center justify-between p-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-gradient-to-br from-brand to-mid flex items-center justify-center">
                <span className="text-sm font-bold text-white">CE</span>
              </div>
              <span className="font-bold">Connect-Ed</span>
            </Link>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <HugeiconsIcon icon={Menu01Icon} size={24} />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[280px]">
                {user && school && (
                  <SidebarContent
                    pathname={pathname}
                    user={user}
                    school={school}
                    logout={handleLogout}
                  />
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 lg:p-8 p-4 pt-20 lg:pt-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </DashboardGuard>
  );
}
