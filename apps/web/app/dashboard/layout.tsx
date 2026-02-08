"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home03Icon,
  UserGroupIcon,
  Money01Icon,
  School01Icon,
  TeacherIcon,
  ChartHistogramIcon,
  Settings02Icon,
  Logout01Icon,
  Notification01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useAuth } from "@/lib/auth-context";
import { useLogout } from "@/lib/hooks";
import { useNotificationCounts } from "@/lib/hooks/use-notifications";
import { DashboardGuard } from "@/components/auth-guard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
} from "@/components/ui/sidebar";

// Navigation items organized by sections
const navSections = [
  {
    label: "Main",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: Home03Icon, roles: ["ADMIN", "RECEPTIONIST", "TEACHER", "PARENT", "STUDENT"] },
      { href: "/dashboard/announcements", label: "Announcements", icon: Notification01Icon, roles: ["ADMIN", "RECEPTIONIST", "TEACHER", "PARENT", "STUDENT"] },
    ],
  },
  {
    label: "Management",
    items: [
      { href: "/dashboard/students", label: "Students", icon: UserGroupIcon, roles: ["ADMIN", "RECEPTIONIST", "TEACHER"] },
      { href: "/dashboard/teachers", label: "Teachers", icon: TeacherIcon, roles: ["ADMIN"], plans: ["GROWTH", "ENTERPRISE"] },
      { href: "/dashboard/classes", label: "Classes", icon: School01Icon, roles: ["ADMIN", "TEACHER"], plans: ["GROWTH", "ENTERPRISE"] },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/dashboard/fees", label: "Fees", icon: Money01Icon, roles: ["ADMIN", "RECEPTIONIST"] },
      { href: "/dashboard/reports", label: "Reports", icon: ChartHistogramIcon, roles: ["ADMIN", "RECEPTIONIST"] },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/dashboard/settings", label: "Settings", icon: Settings02Icon, roles: ["ADMIN"] },
    ],
  },
];

function AppSidebar({ pathname, user, school, logout }: {
  pathname: string;
  user: { name: string; email: string; role: string };
  school: { name: string | null; plan: string };
  logout: () => void;
}) {
  const { data: notificationData } = useNotificationCounts();
  const notificationCounts = notificationData?.counts || {};

  // Filter sections based on user role and school plan
  const filteredSections = navSections.map(section => ({
    ...section,
    items: section.items.filter((item) => {
      if (!item.roles.includes(user.role)) return false;
      if (item.plans && !item.plans.includes(school.plan)) return false;
      return true;
    }),
  })).filter(section => section.items.length > 0);

  return (
    <Sidebar className="border-none">
      <SidebarHeader className="p-6 border-b">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-gradient-to-br from-brand to-mid flex items-center justify-center">
            <span className="text-lg font-bold text-white">CE</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Connect-Ed</h1>
            <p className="text-xs text-gray-600 truncate max-w-[140px]">
              {school.name || "School Management"}
            </p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        {filteredSections.map((section, sectionIndex) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  const notificationCount = notificationCounts[item.href] || 0;

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                        className={`
                          ${isActive
                            ? "border-l-2 border-l-brand text-brand bg-white/60 hover:bg-white/80 rounded-tr-xl rounded-br-xl"
                            : "text-gray-600 hover:text-gray-900 hover:bg-white/40 rounded-xl"
                          }
                        `}
                      >
                        <Link href={item.href}>
                          <HugeiconsIcon
                            icon={item.icon}
                            size={20}
                            strokeWidth={2}
                            className={isActive ? "text-brand" : "text-inherit"}
                          />
                          <span>{item.label}</span>
                          {notificationCount > 0 && (
                            <SidebarMenuBadge className="ml-auto bg-brand text-white">
                              {notificationCount}
                            </SidebarMenuBadge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <div className="p-4 rounded-xl bg-white/40">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-10 rounded-full bg-brand/20 flex items-center justify-center">
              <span className="text-sm font-semibold text-brand">
                {user.name.split(" ").map(n => n[0]).join("").toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-600 truncate">{user.email}</p>
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
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
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
      <SidebarProvider defaultOpen={true}>
        <div className="flex min-h-screen w-full bg-muted/30">
          {user && school && (
            <AppSidebar
              pathname={pathname}
              user={user}
              school={school}
              logout={handleLogout}
            />
          )}

          {/* Main Content */}
          <main className="flex-1 lg:p-8 p-4 overflow-y-auto">
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
      </SidebarProvider>
    </DashboardGuard>
  );
}
