"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  UserGroupIcon,
  School01Icon,
  ArrowRight01Icon,
  Calendar03Icon,
  SunCloudAngledRain01Icon,
  BookOpen01Icon,
  FileAttachmentIcon,
  ChartHistogramIcon,
  Add01Icon,
  Notification01Icon,
  CheckmarkBadge03Icon,
  AlertCircleIcon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
  Clock01Icon,
  SentIcon,
  ChevronDown,
} from "@hugeicons/core-free-icons";
import { AlertTriangle } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useNotifications, useMarkNotificationAsRead, useMarkAllNotificationsAsRead } from "@/lib/hooks";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface TeacherDashboardData {
  stats: {
    totalClasses: number;
    totalStudents: number;
    totalFiles: number;
    totalExams: number;
    avgPassRate: number;
  };
  bestStudents: Array<{
    id: string;
    name: string;
    admissionNumber: string;
    className: string;
    averageMark: number;
    examsCount: number;
  }>;
  recentExams: Array<{
    id: string;
    name: string;
    subject: string;
    subjectCode: string | null;
    className: string;
    paper: string;
    studentsCount: number;
    averageMark: number;
    passRate: number;
    createdAt: string;
  }>;
  classes: Array<{
    id: string;
    name: string;
    level: string | null;
    capacity: number | null;
    studentCount: number;
  }>;
}

export function TeacherDashboard() {
  const { user, school } = useAuth();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);

  const { data: notificationsData } = useNotifications();
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();

  const notifications = (notificationsData as any)?.notifications || [];
  const unreadCount = (notificationsData as any)?.unreadCount || 0;

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard", "teacher"],
    queryFn: () => api.get<TeacherDashboardData>("/dashboard/teacher"),
  });

  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId, {
      onSuccess: () => toast.success("Notification marked as read"),
      onError: () => toast.error("Failed to mark notification as read"),
    });
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate(undefined, {
      onSuccess: () => toast.success("All notifications marked as read"),
      onError: () => toast.error("Failed to mark all notifications as read"),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="size-10 rounded-full border-4 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-100 text-center">
        <p className="text-muted-foreground">Unable to load your dashboard</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Welcome, {user?.name?.split(" ")[0]}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground">
              {school?.name} • Teacher Dashboard
            </p>
            {school?.currentTermNumber && school?.currentTermYear && (
              <Badge variant="outline" className="gap-1.5">
                <HugeiconsIcon
                  icon={school.currentPeriodType === "TERM" ? Calendar03Icon : SunCloudAngledRain01Icon}
                  size={14}
                />
                {school.currentPeriodType === "TERM"
                  ? `Term ${school.currentTermNumber}, ${school.currentTermYear}`
                  : "Holiday"}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setIsNotificationsOpen(true)}
            className="relative"
          >
            <HugeiconsIcon icon={Notification01Icon} size={20} />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 size-6 flex items-center justify-center p-0 text-xs"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </Button>

          <DropdownMenu open={isQuickActionsOpen} onOpenChange={setIsQuickActionsOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <span>Quick actions</span>
                <HugeiconsIcon
                  icon={ChevronDown}
                  size={18}
                  className={`transition-transform duration-200 ${isQuickActionsOpen ? "rotate-180" : ""}`}
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link href="/dashboard/exams" className="flex items-center gap-2 cursor-pointer">
                  <HugeiconsIcon icon={BookOpen01Icon} size={16} />
                  <span>Create Exam</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/class" className="flex items-center gap-2 cursor-pointer">
                  <HugeiconsIcon icon={UserGroupIcon} size={16} />
                  <span>View My Class</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/student-reports" className="flex items-center gap-2 cursor-pointer">
                  <HugeiconsIcon icon={ChartHistogramIcon} size={16} />
                  <span>Student Reports</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/announcements" className="flex items-center gap-2 cursor-pointer">
                  <HugeiconsIcon icon={Notification01Icon} size={16} />
                  <span>Announcements</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/chats" className="flex items-center gap-2 cursor-pointer">
                  <HugeiconsIcon icon={SentIcon} size={16} />
                  <span>Class Chat</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/shared-files" className="flex items-center gap-2 cursor-pointer">
                  <HugeiconsIcon icon={FileAttachmentIcon} size={16} />
                  <span>Shared Files</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Students",
            value: data.stats.totalStudents,
            icon: UserGroupIcon,
            color: "from-brand to-mid",
            featured: true,
          },
          {
            label: "Shared Files",
            value: data.stats.totalFiles,
            icon: FileAttachmentIcon,
            color: "from-blue-500 to-blue-600",
          },
          {
            label: "Total Exams",
            value: data.stats.totalExams,
            icon: BookOpen01Icon,
            color: "from-purple-500 to-purple-600",
          },
          {
            label: "Avg. Pass Rate",
            value: `${data.stats.avgPassRate}%`,
            icon: ChartHistogramIcon,
            color: "from-success to-emerald-600",
          },
        ].map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className={`overflow-hidden ${card.featured ? "bg-brand" : ""}`}>
              <CardContent className="p-3">
                <div className="space-y-3">
                  <div className={`p-3 rounded-xl bg-linear-to-br ${card.featured ? "bg-white/20" : card.color} w-fit`}>
                    <HugeiconsIcon icon={card.icon} className="size-5 text-white" />
                  </div>
                  <div className="space-y-1">
                    <p className={`text-sm ${card.featured ? "text-white" : "text-muted-foreground"}`}>
                      {card.label}
                    </p>
                    <p className={`text-2xl font-semibold ${card.featured ? "text-white" : ""}`}>
                      {card.value}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Best Performing Students */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Best Performing Students</CardTitle>
              <CardDescription>Top students by average exam score</CardDescription>
            </div>
            <Link href="/dashboard/student-reports">
              <Button variant="ghost" size="sm" className="gap-1 text-brand">
                View all
                <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {data.bestStudents.length === 0 ? (
              <div className="text-center py-8">
                <HugeiconsIcon icon={ChartHistogramIcon} className="size-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No exam results yet</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead className="text-right">Avg. Mark</TableHead>
                      <TableHead className="text-right">Exams</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.bestStudents.map((student, index) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-xs text-muted-foreground">{student.admissionNumber}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{student.className}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={student.averageMark >= 70 ? "success" : student.averageMark >= 50 ? "warning" : "destructive"}
                            className="tabular-nums"
                          >
                            {student.averageMark}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {student.examsCount}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Exams */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Recent Exams</CardTitle>
              <CardDescription>Latest exams you've created</CardDescription>
            </div>
            <Link href="/dashboard/exams">
              <Button variant="ghost" size="sm" className="gap-1 text-brand">
                View all
                <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentExams.length === 0 ? (
              <div className="text-center py-8">
                <HugeiconsIcon icon={BookOpen01Icon} className="size-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No exams created yet</p>
                <Link href="/dashboard/exams">
                  <Button variant="outline" size="sm" className="mt-3 gap-1">
                    <HugeiconsIcon icon={Add01Icon} size={14} />
                    Create Exam
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exam</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead className="text-right">Students</TableHead>
                      <TableHead className="text-right">Pass Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentExams.map((exam) => (
                      <TableRow key={exam.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{exam.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {exam.subject} • {exam.paper.replace("_", " ")}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{exam.className}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {exam.studentsCount}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={exam.passRate >= 70 ? "success" : exam.passRate >= 50 ? "warning" : "destructive"}
                            className="tabular-nums"
                          >
                            {exam.passRate}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notifications Sheet */}
      <Sheet open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
        <SheetContent side="right" className="w-full sm:w-96 flex flex-col p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <HugeiconsIcon icon={Notification01Icon} size={24} />
              Notifications
            </SheetTitle>
            <SheetDescription>
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
            </SheetDescription>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
                className="mt-3 w-full gap-2"
              >
                <HugeiconsIcon icon={CheckmarkBadge03Icon} size={16} />
                Mark all as read
              </Button>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto space-y-2 py-4 px-6">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-full bg-muted mb-4">
                  <HugeiconsIcon icon={Notification01Icon} size={32} className="text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification: any, index: number) => {
                const iconMap: Record<string, any> = {
                  SUCCESS: CheckmarkCircle02Icon,
                  WARNING: AlertTriangle,
                  ERROR: AlertCircleIcon,
                  INFO: InformationCircleIcon,
                };
                const colorMap: Record<string, { bg: string; text: string; border: string }> = {
                  SUCCESS: {
                    bg: "bg-green-100 dark:bg-green-950",
                    text: "text-green-700 dark:text-green-400",
                    border: "border-green-200 dark:border-green-900",
                  },
                  WARNING: {
                    bg: "bg-orange-100 dark:bg-orange-950",
                    text: "text-orange-700 dark:text-orange-400",
                    border: "border-orange-200 dark:border-orange-900",
                  },
                  ERROR: {
                    bg: "bg-red-100 dark:bg-red-950",
                    text: "text-red-700 dark:text-red-400",
                    border: "border-red-200 dark:border-red-900",
                  },
                  INFO: {
                    bg: "bg-blue-100 dark:bg-blue-950",
                    text: "text-blue-700 dark:text-blue-400",
                    border: "border-blue-200 dark:border-blue-900",
                  },
                };
                const NotifIcon = iconMap[notification.type] || InformationCircleIcon;
                const colors = (colorMap[notification.type] || colorMap.INFO)!;

                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 rounded-lg border transition-all ${notification.isRead
                        ? "bg-muted/30 border-muted"
                        : `bg-card ${colors.border} shadow-sm`
                      }`}
                  >
                    <div className="flex gap-3">
                      <div className={`p-2 rounded-lg ${colors.bg} ${colors.text} shrink-0`}>
                        <HugeiconsIcon icon={NotifIcon} size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className={`text-sm ${notification.isRead ? "font-normal" : "font-semibold"}`}>
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <div className="size-2 rounded-full bg-brand shrink-0 mt-1" />
                          )}
                        </div>
                        <p className={`text-sm mt-1 line-clamp-2 ${notification.isRead ? "text-muted-foreground" : "text-foreground"
                          }`}>
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <HugeiconsIcon icon={Clock01Icon} size={14} />
                            {new Date(notification.createdAt).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsRead(notification.id)}
                              disabled={markAsReadMutation.isPending}
                              className="h-7 text-xs gap-1"
                            >
                              <HugeiconsIcon icon={CheckmarkBadge03Icon} size={14} />
                              Mark as read
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
