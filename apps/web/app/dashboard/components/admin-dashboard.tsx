"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import {
  UserGroupIcon,
  Money01Icon,
  TimeQuarterIcon,
  Invoice03Icon,
  Mail01Icon,
  WhatsappIcon,
  MessageMultiple01Icon,
  Add01Icon,
  AlertCircleIcon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  Menu01Icon,
  ChevronDown,
  UserAdd01Icon,
  FileAddIcon,
  ShoppingBag01Icon,
  Notification01Icon,
  AlertTriangle,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
  Clock01Icon,
  CheckmarkBadge03Icon,
  Delete02Icon,
  Calendar03Icon,
  SunCloudAngledRain01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useAuth } from "@/lib/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import { useDashboardStats, useNotifications, useMarkNotificationAsRead, useMarkAllNotificationsAsRead } from "@/lib/hooks";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, Pie, PieChart, Cell, ResponsiveContainer } from "recharts";
import { exportDataAsCSV } from "@/lib/export-utils";
import { toast } from "sonner";

const quotaIcons = {
  email: Mail01Icon,
  whatsapp: WhatsappIcon,
  sms: MessageMultiple01Icon,
};

const PIE_COLORS = ["#22c55e", "#f59e0b", "#ef4444"];

export function AdminDashboard() {
  const { user, school, checkAuth } = useAuth();
  const queryClient = useQueryClient();
  const { data: stats, isLoading } = useDashboardStats();
  const { data: notificationsData } = useNotifications();
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isEndPeriodDialogOpen, setIsEndPeriodDialogOpen] = useState(false);
  const [isStartTermDialogOpen, setIsStartTermDialogOpen] = useState(false);
  const [isPeriodLoading, setIsPeriodLoading] = useState(false);
  const [newTermNumber, setNewTermNumber] = useState("");
  const [newTermMonth, setNewTermMonth] = useState("");
  const [newTermDay, setNewTermDay] = useState("");
  const [newTermYear, setNewTermYear] = useState(new Date().getFullYear().toString());
  const feeStatusChartRef = useRef<HTMLDivElement>(null);

  const notifications = notificationsData?.notifications || [];
  const unreadCount = notificationsData?.unreadCount || 0;

  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();

  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId, {
      onSuccess: () => {
        toast.success("Notification marked as read");
      },
      onError: () => {
        toast.error("Failed to mark notification as read");
      },
    });
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("All notifications marked as read");
      },
      onError: () => {
        toast.error("Failed to mark all notifications as read");
      },
    });
  };

  const isTermPeriod = school?.currentPeriodType === "TERM";

  const handleEndPeriod = async () => {
    setIsPeriodLoading(true);
    try {
      await api.post("/settings/period/end");
      await checkAuth();
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setIsEndPeriodDialogOpen(false);
      toast.success(
        isTermPeriod
          ? `Term ${school?.currentTermNumber} ended — holiday period started`
          : "Holiday ended"
      );
      // If we just ended term 3, prompt to schedule next term
      if (isTermPeriod && school?.currentTermNumber === 3) {
        setNewTermNumber("1");
        setNewTermYear((new Date().getFullYear() + 1).toString());
        setNewTermMonth("");
        setNewTermDay("");
        setIsStartTermDialogOpen(true);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to end period");
    } finally {
      setIsPeriodLoading(false);
    }
  };

  const handleStartTerm = async () => {
    if (!newTermNumber || !newTermMonth || !newTermDay || !newTermYear) {
      toast.error("Please fill in all fields");
      return;
    }
    setIsPeriodLoading(true);
    try {
      await api.post("/settings/period/start-term", {
        termNumber: parseInt(newTermNumber),
        month: parseInt(newTermMonth),
        day: parseInt(newTermDay),
        year: parseInt(newTermYear),
      });
      await checkAuth();
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setIsStartTermDialogOpen(false);
      toast.success(`Term ${newTermNumber} started`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to start term");
    } finally {
      setIsPeriodLoading(false);
    }
  };

  if (isLoading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="size-10 rounded-full border-4 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  // Prepare chart data from API response
  const revenueData = stats.charts?.monthlyRevenue || stats.monthlyRevenue || [];
  const feeStatusData = (stats.charts?.feeStatus || [])
    .map((item: any) => ({
      name: item.name === "PAID" ? "Collected" : item.name === "OVERDUE" ? "Overdue" : "Pending",
      value: item.value,
      color: item.name === "PAID" ? "#22c55e" : item.name === "OVERDUE" ? "#ef4444" : "#f59e0b",
    }))
    .filter((d: any) => d.value > 0);

  // Build activity feed from recent data
  const activityItems = [
    ...(stats.recentActivity?.students || []).map((s: any) => ({
      type: "student",
      description: `New student added: ${s.name}`,
      date: s.date,
    })),
    ...(stats.recentActivity?.payments || []).map((p: any) => ({
      type: "payment",
      description: `Payment received: $${p.amount} from ${p.student}`,
      date: p.date,
    })),
    ...(stats.recentActivity?.expenses || []).map((e: any) => ({
      type: "expense",
      description: `Expense recorded: $${e.amount} - ${e.category}`,
      date: e.date,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleExportRevenueCSV = () => {
    const dataToExport = revenueData.map((d: any) => ({ Month: d.name || d.month, Collected: d.value || d.collected }));
    exportDataAsCSV(dataToExport, ["Month", "Collected"], "monthly-revenue");
  };

  const handleExportRevenuePDF = async () => {
    try {
      const rows = revenueData.map((d: any) => [d.name || d.month, `$${(d.value || d.collected).toLocaleString()}`]);
      
      // Get auth token
      const token = localStorage.getItem("accessToken");
      
      // Use fetch directly for binary response
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/reports/export-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: "Monthly Revenue Report",
          subtitle: school?.name || "School Management System",
          headers: ["Month", "Revenue Collected"],
          rows,
          footer: `Total Revenue: $${revenueData.reduce((sum, d) => sum + (d.value || d.collected), 0).toLocaleString()}`,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }
      
      // Trigger download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${school?.name?.replace(/\s+/g, "-") || "monthly-revenue"}-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to generate report:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, {user?.name?.split(" ")[0]}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground">
              Here's what's happening at {school?.name || "your school"} today
            </p>
            {school?.currentTermNumber && school?.currentTermYear && (
              <Badge variant="outline" className="gap-1.5">
                <HugeiconsIcon icon={isTermPeriod ? Calendar03Icon : SunCloudAngledRain01Icon} size={14} />
                {isTermPeriod
                  ? `Term ${school.currentTermNumber}, ${school.currentTermYear}`
                  : `Holiday`}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Period Management Button */}
          {school?.currentTermNumber && (
            <Button
              variant="outline"
              onClick={() => {
                if (isTermPeriod) {
                  setIsEndPeriodDialogOpen(true);
                } else {
                  // Holiday — open start term dialog
                  setNewTermNumber(
                    String(Math.min((school?.currentTermNumber || 0) + 1, 3))
                  );
                  setNewTermYear(new Date().getFullYear().toString());
                  setNewTermMonth("");
                  setNewTermDay("");
                  setIsStartTermDialogOpen(true);
                }
              }}
              className="gap-2"
            >
              <HugeiconsIcon icon={isTermPeriod ? Calendar03Icon : SunCloudAngledRain01Icon} size={16} />
              {isTermPeriod ? `End Term ${school.currentTermNumber}` : "End Holiday"}
            </Button>
          )}
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
                <Link href="/dashboard/students/new" className="flex items-center gap-2 cursor-pointer">
                  <HugeiconsIcon icon={UserAdd01Icon} size={16} />
                  <span>Add Student</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/fees/new" className="flex items-center gap-2 cursor-pointer">
                  <HugeiconsIcon icon={FileAddIcon} size={16} />
                  <span>Create Fee</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/expenses/new" className="flex items-center gap-2 cursor-pointer">
                  <HugeiconsIcon icon={ShoppingBag01Icon} size={16} />
                  <span>Record Expense</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/fees?status=OVERDUE" className="flex items-center gap-2 cursor-pointer">
                  <HugeiconsIcon icon={AlertCircleIcon} size={16} />
                  <span>View Overdue</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {stats.overdueFeesCount > 0 && (
            <Link href="/dashboard/fees?status=OVERDUE">
              <Badge variant="destructive" className="flex items-center gap-2 px-3 py-1.5">
                <HugeiconsIcon icon={AlertCircleIcon} className="size-4" />
                {stats.overdueFeesCount} overdue fee{stats.overdueFeesCount > 1 ? "s" : ""}
              </Badge>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Students"
          value={stats.totalStudents}
          subtext={`${stats.activeStudents} active`}
          icon={UserGroupIcon}
          color="from-brand to-mid"
          trend={stats.studentsTrend}
          trendLabel="from last month"
          isFeatured
        />
        <StatCard
          label="Fees Collected"
          value={`$${stats.collectedFees.toLocaleString()}`}
          subtext={`${stats.totalFees > 0 ? Math.round((stats.collectedFees / stats.totalFees) * 100) : 0}% collection rate`}
          icon={Money01Icon}
          color="from-success to-emerald-600"
          trend={stats.collectionsTrend}
          trendLabel="from last month"
        />
        <StatCard
          label="Pending Fees"
          value={`$${stats.pendingFees.toLocaleString()}`}
          subtext="Outstanding balance"
          icon={TimeQuarterIcon}
          color="from-warning to-orange-600"
        />
        <StatCard
          label="Expenses"
          value={`$${stats.totalExpenses.toLocaleString()}`}
          subtext="This month"
          icon={Invoice03Icon}
          color="from-destructive to-red-600"
          trend={stats.expensesTrend}
          trendLabel="from last month"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Monthly Revenue</CardTitle>
              <CardDescription>Fee collections over the last 6 months</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportRevenueCSV}>
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportRevenuePDF}>
                PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {revenueData.length > 0 ? (
                <ChartContainer
                  config={{
                    value: { label: "Collected", color: "hsl(var(--chart-1))" },
                  }}
                  className="h-full w-full"
                >
                  <BarChart data={revenueData}>
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No revenue data yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Fee Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fee Status Breakdown</CardTitle>
            <CardDescription>Current distribution of fee statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div ref={feeStatusChartRef} className="h-[250px]">
              {feeStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={feeStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      label={(props: any) => `${props.name || ''} ${((props.percent || 0) * 100).toFixed(0)}%`}
                    >
                      {feeStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No fee data yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Quota & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Messaging Quota</CardTitle>
            <CardDescription>Monthly usage for notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(["email", "whatsapp", "sms"] as const).map((type) => {
              const quota = stats.quotaUsage?.[type] || { used: 0, limit: 100 };
              const iconDef = quotaIcons[type];
              const percentage = quota.limit > 0 ? (quota.used / quota.limit) * 100 : 0;
              const isWarning = percentage > 70;
              const isCritical = percentage > 90;

              return (
                <div key={type} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon icon={iconDef} className="size-4 text-muted-foreground" />
                      <span className="text-sm font-medium capitalize">{type}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {quota.used} / {quota.limit}
                    </span>
                  </div>
                  <Progress
                    value={percentage}
                    className={isCritical ? "bg-red-100" : isWarning ? "bg-orange-100" : ""}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {activityItems.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <CardDescription>Latest updates at your school</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activityItems.slice(0, 5).map((activity, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className={`size-2 rounded-full ${
                      activity.type === "payment" ? "bg-success" :
                      activity.type === "student" ? "bg-brand" : "bg-muted-foreground"
                    }`} />
                    <span className="text-sm">{activity.description}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(activity.date).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
              notifications.map((notification, index) => {
                const iconMap = {
                  SUCCESS: CheckmarkCircle02Icon,
                  WARNING: AlertTriangle,
                  ERROR: AlertCircleIcon,
                  INFO: InformationCircleIcon,
                };
                const colorMap = {
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
                const NotifIcon = iconMap[notification.type as keyof typeof iconMap] || InformationCircleIcon;
                const colors = colorMap[notification.type as keyof typeof colorMap] || colorMap.INFO;

                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 rounded-lg border transition-all ${
                      notification.isRead
                        ? "bg-muted/30 border-muted"
                        : `bg-card ${colors.border} shadow-sm`
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className={`p-2 rounded-lg ${colors.bg} ${colors.text} flex-shrink-0`}>
                        <HugeiconsIcon icon={NotifIcon} size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className={`text-sm ${notification.isRead ? "font-normal" : "font-semibold"}`}>
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <div className="size-2 rounded-full bg-brand flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className={`text-sm mt-1 line-clamp-2 ${
                          notification.isRead ? "text-muted-foreground" : "text-foreground"
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

      {/* End Period Confirmation Dialog */}
      <Dialog open={isEndPeriodDialogOpen} onOpenChange={setIsEndPeriodDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isTermPeriod
                ? `End Term ${school?.currentTermNumber}?`
                : "End Holiday?"}
            </DialogTitle>
            <DialogDescription>
              {isTermPeriod
                ? `This will end the current school term and start a holiday period. Students and staff will see the updated status.`
                : `This will end the current holiday. You'll be asked to configure the next term.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEndPeriodDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEndPeriod} disabled={isPeriodLoading}>
              {isPeriodLoading ? "Processing..." : isTermPeriod ? "End Term" : "End Holiday"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Start New Term Dialog */}
      <Dialog open={isStartTermDialogOpen} onOpenChange={setIsStartTermDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start New Term</DialogTitle>
            <DialogDescription>
              Configure the next school term. This will end the current holiday and begin the new term.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Term Number</Label>
              <Select value={newTermNumber} onValueChange={setNewTermNumber}>
                <SelectTrigger>
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Term 1</SelectItem>
                  <SelectItem value="2">Term 2</SelectItem>
                  <SelectItem value="3">Term 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={newTermMonth} onValueChange={setNewTermMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "January", "February", "March", "April", "May", "June",
                      "July", "August", "September", "October", "November", "December",
                    ].map((m, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Day</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={newTermDay}
                  onChange={(e) => setNewTermDay(e.target.value)}
                  placeholder="Day"
                />
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Input
                  type="number"
                  value={newTermYear}
                  onChange={(e) => setNewTermYear(e.target.value)}
                  placeholder="Year"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStartTermDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartTerm} disabled={isPeriodLoading}>
              {isPeriodLoading ? "Starting..." : "Start Term"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtext,
  icon,
  color,
  trend,
  trendLabel,
  isFeatured = false,
}: {
  label: string;
  value: string | number;
  subtext: string;
  icon: any;
  color: string;
  trend?: number;
  trendLabel?: string;
  isFeatured?: boolean;
}) {
  const isPositive = trend !== undefined && trend >= 0;
  const TrendIcon = isPositive ? ArrowUp01Icon : ArrowDown01Icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`overflow-hidden ${
        isFeatured ? "bg-brand" : ""
      }`}>
        <CardContent className={`${isFeatured ? "p-3" : "p-3"}`}>
          <div className="space-y-3">
            <div className={`p-3 rounded-xl bg-gradient-to-br ${isFeatured ? "bg-white/20" : color} w-fit`}>
              <HugeiconsIcon icon={icon} className={`size-5 ${isFeatured ? "text-white" : "text-white"}`} />
            </div>
            <div className="space-y-1">
              <p className={`text-sm ${isFeatured ? "text-white" : "text-muted-foreground"}`}>{label}</p>
              <p className={`text-2xl font-bold ${isFeatured ? "text-white" : ""}`}>{value}</p>
              <p className={`text-xs ${isFeatured ? "text-gray-200" : "text-muted-foreground"}`}>{subtext}</p>
              {trend !== undefined && (
                <p className={`text-sm flex items-center gap-1 mt-2 ${
                  isFeatured ? "text-green-200" : "text-green-600"
                }`}>
                  <HugeiconsIcon icon={TrendIcon} size={16} />
                  {Math.abs(trend)}% {trendLabel}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
