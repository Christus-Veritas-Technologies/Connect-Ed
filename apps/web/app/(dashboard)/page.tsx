"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  UserGroupIcon,
  Money01Icon,
  TimeQuarterPassIcon,
  Receipt01Icon,
  Mail01Icon,
  WhatsappIcon,
  MessageMultiple01Icon,
  Add01Icon,
} from "@hugeicons/react";
import { useAuth } from "@/lib/auth-context";
import { useDashboardStats } from "@/lib/hooks";
import { DashboardGuard } from "@/components/auth-guard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  totalFees: number;
  collectedFees: number;
  pendingFees: number;
  totalExpenses: number;
  quotaUsage: {
    email: { used: number; limit: number };
    whatsapp: { used: number; limit: number };
    sms: { used: number; limit: number };
  };
}

const statCards = [
  {
    key: "students",
    label: "Total Students",
    icon: UserGroupIcon,
    color: "from-brand to-mid",
    getValue: (s: DashboardStats) => s.totalStudents,
    getSubtext: (s: DashboardStats) => `${s.activeStudents} active`,
  },
  {
    key: "collected",
    label: "Fees Collected",
    icon: Money01Icon,
    color: "from-success to-emerald-600",
    getValue: (s: DashboardStats) => `$${s.collectedFees.toLocaleString()}`,
    getSubtext: (s: DashboardStats) => {
      const rate = s.totalFees > 0 ? Math.round((s.collectedFees / s.totalFees) * 100) : 0;
      return `${rate}% collection rate`;
    },
  },
  {
    key: "pending",
    label: "Pending Fees",
    icon: TimeQuarterPassIcon,
    color: "from-warning to-orange-600",
    getValue: (s: DashboardStats) => `$${s.pendingFees.toLocaleString()}`,
    getSubtext: () => "Outstanding balance",
  },
  {
    key: "expenses",
    label: "Expenses",
    icon: Receipt01Icon,
    color: "from-destructive to-red-600",
    getValue: (s: DashboardStats) => `$${s.totalExpenses.toLocaleString()}`,
    getSubtext: () => "This month",
  },
];

const quotaIcons = {
  email: Mail01Icon,
  whatsapp: WhatsappIcon,
  sms: MessageMultiple01Icon,
};

export default function DashboardPage() {
  return (
    <DashboardGuard>
      <DashboardPageContent />
    </DashboardGuard>
  );
}

function DashboardPageContent() {
  const { user, school } = useAuth();
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="size-10 rounded-full border-4 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back, {user?.name?.split(" ")[0]}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s what&apos;s happening at {school?.name || "your school"} today
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card hover className="relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-10 rounded-bl-full`} />
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {stat.label}
                      </p>
                      <p className="text-3xl font-bold mt-2">
                        {stats ? stat.getValue(stats) : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {stats ? stat.getSubtext(stats) : "—"}
                      </p>
                    </div>
                    <div className={`size-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                      <Icon size={24} className="text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Quota Usage & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messaging Quota */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Messaging Quota</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats?.quotaUsage &&
                  Object.entries(stats.quotaUsage).map(([type, quota]) => {
                    const Icon = quotaIcons[type as keyof typeof quotaIcons];
                    const percentage = Math.round((quota.used / quota.limit) * 100);
                    const isWarning = percentage > 70;
                    const isCritical = percentage > 90;

                    return (
                      <div key={type} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon size={18} className="text-muted-foreground" />
                            <span className="font-medium capitalize">{type}</span>
                          </div>
                          <Badge
                            variant={isCritical ? "destructive" : isWarning ? "warning" : "secondary"}
                            size="sm"
                          >
                            {percentage}%
                          </Badge>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${
                              isCritical ? "bg-destructive" :
                              isWarning ? "bg-warning" :
                              "bg-brand"
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {quota.used.toLocaleString()} / {quota.limit.toLocaleString()} used
                        </p>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/dashboard/students?action=add">
                <Button className="w-full justify-start" variant="outline">
                  <Add01Icon size={18} />
                  Add Student
                </Button>
              </Link>
              <Link href="/dashboard/fees?action=add">
                <Button className="w-full justify-start" variant="outline">
                  <Add01Icon size={18} />
                  Create Fee
                </Button>
              </Link>
              <Link href="/dashboard/expenses?action=add">
                <Button className="w-full justify-start" variant="outline">
                  <Add01Icon size={18} />
                  Record Expense
                </Button>
              </Link>
              <Link href="/dashboard/fees?filter=overdue">
                <Button className="w-full justify-start" variant="outline">
                  <TimeQuarterPassIcon size={18} />
                  View Overdue
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
