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
  Logout01Icon,
  Notification01Icon,
  BookOpen01Icon,
  SentIcon,
  FileAttachmentIcon,
  Shield01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useAuth } from "@/lib/auth-context";
import { useLogout } from "@/lib/hooks";
import { useNotificationCounts } from "@/lib/hooks/use-notifications";
import { useParentChildren } from "@/lib/hooks/use-parent-children";
import { DashboardGuard } from "@/components/auth-guard";
import { BillingGuard } from "@/components/billing-guard";
import { SetupFeeGuard } from "@/components/setup-fee-guard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";

// Navigation items organized by sections
const navSections = [
  {
    label: "Main",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: Home03Icon, roles: ["ADMIN", "RECEPTIONIST", "TEACHER", "PARENT", "STUDENT"] },
      { href: "/dashboard/announcements", label: "Announcements", icon: Notification01Icon, roles: ["ADMIN", "RECEPTIONIST", "TEACHER", "PARENT", "STUDENT"] },
      { href: "/dashboard/shared-files", label: "Shared Files", icon: FileAttachmentIcon, roles: ["ADMIN", "RECEPTIONIST", "TEACHER", "PARENT", "STUDENT"] },
      { href: "/dashboard/chats", label: "Chats", icon: SentIcon, roles: ["ADMIN"], plans: ["GROWTH", "ENTERPRISE"] },
      { href: "/dashboard/class/chat", label: "Class Chat", icon: SentIcon, roles: ["TEACHER", "PARENT", "STUDENT"], plans: ["GROWTH", "ENTERPRISE"] },
    ],
  },
  {
    label: "Management",
    items: [
      { href: "/dashboard/students", label: "Students", icon: UserGroupIcon, roles: ["ADMIN", "RECEPTIONIST", "TEACHER"] },
      { href: "/dashboard/parents", label: "Parents", icon: UserGroupIcon, roles: ["ADMIN", "RECEPTIONIST"] },
      { href: "/dashboard/teachers", label: "Teachers", icon: TeacherIcon, roles: ["ADMIN", "RECEPTIONIST"], plans: ["GROWTH", "ENTERPRISE"] },
      { href: "/dashboard/receptionists", label: "Receptionists", icon: UserGroupIcon, roles: ["ADMIN"] },
      { href: "/dashboard/admins", label: "Admins", icon: Shield01Icon, roles: ["ADMIN"] },
      { href: "/dashboard/classes", label: "Classes", icon: School01Icon, roles: ["ADMIN"], plans: ["GROWTH", "ENTERPRISE"] },
      { href: "/dashboard/class", label: "My Class", icon: School01Icon, roles: ["TEACHER", "STUDENT"] },
      // Parent-specific "My Child" and "My Child's Class" items are rendered dynamically based on children count
    ],
  },
  {
    label: "Academics",
    items: [
      { href: "/dashboard/exams", label: "Exams", icon: BookOpen01Icon, roles: ["ADMIN", "TEACHER"] },
      { href: "/dashboard/student-reports", label: "Student Reports", icon: ChartHistogramIcon, roles: ["ADMIN", "TEACHER"] },
      { href: "/dashboard/my-report", label: "My Report", icon: ChartHistogramIcon, roles: ["STUDENT"] },
      // Parent-specific "My Child's Report" is rendered dynamically based on children count
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/dashboard/fees", label: "Fees", icon: Money01Icon, roles: ["ADMIN", "RECEPTIONIST"] },
      { href: "/dashboard/fee-payments", label: "Fee Payments", icon: Money01Icon, roles: ["PARENT"] },
      { href: "/dashboard/reports", label: "Reports", icon: ChartHistogramIcon, roles: ["ADMIN", "RECEPTIONIST"] },
    ],
  },
  {
    label: "System",
    items: [
      // Settings removed from student/teacher/parent sidebars
    ],
  },
];

interface ParentChildrenLinksProps {
  pathname: string;
  isActive: (href: string) => boolean;
  notificationCounts: Record<string, number>;
  section: string; // "Management" or "Academics"
}

/**
 * Component to render parent's "My Child" related links with dynamic labels
 * Shows loading skeletons while loading, hides if no children, shows singular/plural labels
 * Renders different links based on section (Management or Academics)
 */
function ParentChildrenLinks({ pathname, isActive, notificationCounts, section }: ParentChildrenLinksProps) {
  const { childrenCount, isLoading } = useParentChildren();

  console.log(`[ParentChildrenLinks] Section: ${section}`, {
    childrenCount,
    isLoading,
    willRender: !(!isLoading && childrenCount === 0),
  });

  // Hide entire section if no children
  if (!isLoading && childrenCount === 0) {
    console.log(`[ParentChildrenLinks] Hiding ${section} - no children`);
    return null;
  }

  // Management section links
  if (section === "Management") {
    const managementLinks = [
      {
        href: "/dashboard/my-child",
        label: childrenCount === 1 ? "My Child" : "My Children",
        icon: UserGroupIcon,
      },
      {
        href: "/dashboard/my-child-class",
        label: childrenCount === 1 ? "My Child's Class" : "My Children's Class",
        icon: School01Icon,
      },
    ];

    return (
      <>
        {isLoading ? (
          // Show loading skeletons
          <div className="space-y-2 px-3">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={`skeleton-${i}`} className="h-8 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          managementLinks.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.href)}
                tooltip={item.label}
                className={`
                  ${isActive(item.href)
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
                    className={isActive(item.href) ? "text-brand" : "text-inherit"}
                  />
                  <span>{item.label}</span>
                  {notificationCounts[item.href] > 0 && (
                    <SidebarMenuBadge className="ml-auto bg-brand text-white">
                      {notificationCounts[item.href]}
                    </SidebarMenuBadge>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))
        )}
      </>
    );
  }

  // Academics section links
  if (section === "Academics") {
    const reportLink = {
      href: "/dashboard/my-child-report",
      label: childrenCount === 1 ? "My Child's Report" : "My Children's Reports",
      icon: ChartHistogramIcon,
    };

    return (
      <>
        {isLoading ? (
          <Skeleton className="h-8 w-full rounded-lg mx-3" />
        ) : (
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive(reportLink.href)}
              tooltip={reportLink.label}
              className={`
                ${isActive(reportLink.href)
                  ? "border-l-2 border-l-brand text-brand bg-white/60 hover:bg-white/80 rounded-tr-xl rounded-br-xl"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/40 rounded-xl"
                }
              `}
            >
              <Link href={reportLink.href}>
                <HugeiconsIcon
                  icon={reportLink.icon}
                  size={20}
                  strokeWidth={2}
                  className={isActive(reportLink.href) ? "text-brand" : "text-inherit"}
                />
                <span>{reportLink.label}</span>
                {notificationCounts[reportLink.href] > 0 && (
                  <SidebarMenuBadge className="ml-auto bg-brand text-white">
                    {notificationCounts[reportLink.href]}
                  </SidebarMenuBadge>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
      </>
    );
  }

  return null;
}

function AppSidebar({ pathname, user, school, logout }: {
  pathname: string;
  user: { name: string; email: string; role: string };
  school: { name: string | null; plan: string };
  logout: () => void;
}) {
  const { data: notificationData } = useNotificationCounts();
  const notificationCounts = notificationData?.counts || {};

  console.log("[AppSidebar] User role:", user.role, "Is parent:", user.role === "PARENT");

  // Filter sections based on user role and school plan
  // Keep Management and Academics sections for parents even if empty (they'll show parent children links)
  const filteredSections = navSections.map(section => ({
    ...section,
    items: section.items.filter((item) => {
      if (!item.roles.includes(user.role)) return false;
      if (item.plans && !item.plans.includes(school.plan)) return false;
      return true;
    }),
  })).filter(section => {
    // Always keep Management and Academics for parents (even if no items)
    if (user.role === "PARENT" && (section.label === "Management" || section.label === "Academics")) {
      return true;
    }
    return section.items.length > 0;
  });

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
        {filteredSections.map((section, sectionIndex) => {
          const isParentUser = user.role === "PARENT";

          return (
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

                  {/* Render parent children links after Management section items */}
                  {isParentUser && section.label === "Management" && (
                    <ParentChildrenLinks
                      pathname={pathname}
                      isActive={(href) => pathname === href}
                      notificationCounts={notificationCounts}
                      section="Management"
                    />
                  )}

                  {/* Render parent report link after Academics section items */}
                  {isParentUser && section.label === "Academics" && (
                    <ParentChildrenLinks
                      pathname={pathname}
                      isActive={(href) => pathname === href}
                      notificationCounts={notificationCounts}
                      section="Academics"
                    />
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
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

export default function DashboardLayoutClient({
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
      <SetupFeeGuard>
        <BillingGuard>
          <SidebarProvider defaultOpen={true}>
            {user && school && (
              <AppSidebar
                pathname={pathname}
                user={user}
                school={school}
                logout={handleLogout}
              />
            )}

            <SidebarInset>
              {/* Mobile header with trigger */}
              <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4 md:hidden">
                <SidebarTrigger className="-ml-1" />
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-gradient-to-br from-brand to-mid flex items-center justify-center">
                    <span className="text-sm font-bold text-white">CE</span>
                  </div>
                  <span className="font-semibold text-sm">Connect-Ed</span>
                </div>
              </header>

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
            </SidebarInset>
          </SidebarProvider>
        </BillingGuard>
      </SetupFeeGuard>
    </DashboardGuard>
  );
}
