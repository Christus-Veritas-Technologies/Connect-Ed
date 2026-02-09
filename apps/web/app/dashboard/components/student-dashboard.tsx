"use client";

import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Money01Icon,
  CheckmarkCircle01Icon,
  TimeQuarterIcon,
  AlertCircleIcon,
  School01Icon,
  UserIcon,
  Calendar03Icon,
  SunCloudAngledRain01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";

interface Fee {
  id: string;
  description: string;
  amount: number;
  paidAmount: number;
  balance: number;
  dueDate: string;
  status: string;
}

interface Payment {
  id: string;
  amount: number;
  method: string;
  reference: string | null;
  date: string;
}

interface StudentDashboardData {
  school: {
    name: string;
  };
  student: {
    firstName: string;
    lastName: string;
    admissionNumber: string;
  };
  class: {
    name: string;
    level: string | null;
    teacher: {
      name: string;
    } | null;
  } | null;
  summary: {
    totalFees: number;
    totalPaid: number;
    balance: number;
    overdueFees: number;
  };
  fees: Fee[];
}

const feeColumns: ColumnDef<Fee>[] = [
  {
    accessorKey: "description",
    header: "Description",
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => `$${row.original.amount.toLocaleString()}`,
  },
  {
    accessorKey: "paidAmount",
    header: "Paid",
    cell: ({ row }) => `$${row.original.paidAmount.toLocaleString()}`,
  },
  {
    accessorKey: "balance",
    header: "Balance",
    cell: ({ row }) => {
      const balance = row.original.balance;
      return (
        <span className={balance > 0 ? "text-destructive font-medium" : "text-success"}>
          ${balance.toLocaleString()}
        </span>
      );
    },
  },
  {
    accessorKey: "dueDate",
    header: "Due Date",
    cell: ({ row }) => new Date(row.original.dueDate).toLocaleDateString(),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      const variant = status === "PAID" ? "success" : status === "OVERDUE" ? "destructive" : "warning";
      return <Badge variant={variant as any}>{status}</Badge>;
    },
  },
];

export function StudentDashboard() {
  const { user, school } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard", "student"],
    queryFn: () => api.get<StudentDashboardData>("/dashboard/student"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="size-10 rounded-full border-4 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <p className="text-muted-foreground">Unable to load your dashboard</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  const paymentProgress = data.summary.totalFees > 0 
    ? (data.summary.totalPaid / data.summary.totalFees) * 100 
    : 100;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Welcome, {data.student.firstName}
          </h1>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground">{data.school.name}</p>
            {school?.currentTermNumber && school?.currentTermYear && (
              <Badge variant="outline" className="gap-1.5">
                <HugeiconsIcon icon={school.currentPeriodType === "TERM" ? Calendar03Icon : SunCloudAngledRain01Icon} size={14} />
                {school.currentPeriodType === "TERM"
                  ? `Term ${school.currentTermNumber}, ${school.currentTermYear}`
                  : "Holiday"}
              </Badge>
            )}
          </div>
        </div>
        <Badge variant="outline" className="w-fit">
          {data.student.admissionNumber}
        </Badge>
      </div>

      {/* Profile & Class Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Student Profile Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HugeiconsIcon icon={UserIcon} className="size-5" />
                My Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="size-16 rounded-full bg-gradient-to-br from-brand to-mid flex items-center justify-center">
                  <span className="text-xl font-bold text-white">
                    {data.student.firstName[0]}{data.student.lastName[0]}
                  </span>
                </div>
                <div>
                  <p className="text-lg font-semibold">
                    {data.student.firstName} {data.student.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Admission #: {data.student.admissionNumber}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Class Info Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HugeiconsIcon icon={School01Icon} className="size-5" />
                My Class
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.class ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Class</span>
                    <span className="font-medium">{data.class.name}</span>
                  </div>
                  {data.class.level && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Level</span>
                      <Badge variant="outline" className="capitalize">
                        {data.class.level}
                      </Badge>
                    </div>
                  )}
                  {data.class.teacher && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Class Teacher</span>
                      <span className="font-medium">{data.class.teacher.name}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No class assigned yet
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Fee Summary */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HugeiconsIcon icon={Money01Icon} className="size-5" />
              Fee Summary
            </CardTitle>
            <CardDescription>Your current fee status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment Progress</span>
                <span className="font-medium">{Math.round(paymentProgress)}%</span>
              </div>
              <Progress value={paymentProgress} className="h-3" />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-semibold">${data.summary.totalFees.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Fees</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-success/10">
                <p className="text-2xl font-semibold text-success">${data.summary.totalPaid.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Paid</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-warning/10">
                <p className="text-2xl font-semibold text-warning">${data.summary.balance.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Balance</p>
              </div>
              {data.summary.overdueFees > 0 && (
                <div className="text-center p-4 rounded-lg bg-destructive/10">
                  <p className="text-2xl font-semibold text-destructive">${data.summary.overdueFees.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Overdue</p>
                </div>
              )}
            </div>

            {/* Status Badge */}
            <div className="flex justify-center">
              {data.summary.balance === 0 ? (
                <Badge variant="success" className="gap-2 px-4 py-2">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-4" />
                  All Fees Paid
                </Badge>
              ) : data.summary.overdueFees > 0 ? (
                <Badge variant="destructive" className="gap-2 px-4 py-2">
                  <HugeiconsIcon icon={AlertCircleIcon} className="size-4" />
                  You have overdue fees - Please contact the office
                </Badge>
              ) : (
                <Badge variant="warning" className="gap-2 px-4 py-2">
                  <HugeiconsIcon icon={TimeQuarterIcon} className="size-4" />
                  Outstanding balance to pay
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Fee Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Fee Details</CardTitle>
          <CardDescription>Breakdown of all your fees</CardDescription>
        </CardHeader>
        <CardContent>
          {data.fees.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No fees assigned yet
            </p>
          ) : (
            <DataTable
              columns={feeColumns}
              data={data.fees}
              exportFileName="my-fees"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
