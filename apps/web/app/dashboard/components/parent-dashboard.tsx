"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  UserIcon,
  Money01Icon,
  TimeQuarterIcon,
  CheckmarkCircle01Icon,
  AlertCircleIcon,
  ArrowRight01Icon,
  School01Icon,
  Calendar03Icon,
  SunCloudAngledRain01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  class: string | null;
  totalFees: number;
  totalPaid: number;
  balance: number;
  overdueFees: number;
}

interface Fee {
  id: string;
  description: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  status: string;
  studentName: string;
}

interface Payment {
  id: string;
  amount: number;
  method: string;
  reference: string | null;
  date: string;
  feeDescription: string;
  studentName: string;
}

interface ParentDashboardData {
  children: Child[];
  recentFees: Fee[];
  recentPayments: Payment[];
  summary: {
    totalChildren: number;
    totalBalance: number;
    totalOverdue: number;
  };
}

const feeColumns: ColumnDef<Fee>[] = [
  {
    accessorKey: "studentName",
    header: "Child",
  },
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

const paymentColumns: ColumnDef<Payment>[] = [
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => new Date(row.original.date).toLocaleDateString(),
  },
  {
    accessorKey: "studentName",
    header: "Child",
  },
  {
    accessorKey: "feeDescription",
    header: "For",
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => `$${row.original.amount.toLocaleString()}`,
  },
  {
    accessorKey: "method",
    header: "Method",
    cell: ({ row }) => (
      <Badge variant="outline">{row.original.method.replace("_", " ")}</Badge>
    ),
  },
  {
    accessorKey: "reference",
    header: "Reference",
    cell: ({ row }) => row.original.reference || "—",
  },
];

export function ParentDashboard() {
  const { user, school } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard", "parent"],
    queryFn: () => api.get<ParentDashboardData>("/dashboard/parent"),
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

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Welcome, {user?.name?.split(" ")[0]}
        </h1>
        <div className="flex items-center gap-2">
          <p className="text-muted-foreground">{school?.name} • Parent Portal</p>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">My Children</p>
                  <p className="text-3xl font-semibold">{data.summary.totalChildren}</p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-brand to-mid">
                  <HugeiconsIcon icon={UserIcon} className="size-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Balance</p>
                  <p className="text-3xl font-semibold">${data.summary.totalBalance.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Outstanding fees</p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-warning to-orange-600">
                  <HugeiconsIcon icon={Money01Icon} className="size-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {data.summary.totalOverdue > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-destructive/50">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Overdue</p>
                    <p className="text-3xl font-semibold text-destructive">
                      ${data.summary.totalOverdue.toLocaleString()}
                    </p>
                    <p className="text-xs text-destructive">Requires attention</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-destructive to-red-600">
                    <HugeiconsIcon icon={AlertCircleIcon} className="size-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Children Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">My Children</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.children.map((child, index) => (
            <motion.div
              key={child.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={child.overdueFees > 0 ? "border-destructive/30" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-12 rounded-full bg-gradient-to-br from-brand to-mid flex items-center justify-center">
                        <span className="text-white font-bold">
                          {child.firstName[0]}{child.lastName[0]}
                        </span>
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {child.firstName} {child.lastName}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <HugeiconsIcon icon={School01Icon} className="size-3" />
                          {child.class || "No class assigned"}
                        </CardDescription>
                      </div>
                    </div>
                    {child.balance === 0 ? (
                      <Badge variant="success" className="gap-1">
                        <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-3" />
                        Paid Up
                      </Badge>
                    ) : child.overdueFees > 0 ? (
                      <Badge variant="destructive">Overdue</Badge>
                    ) : (
                      <Badge variant="warning">Pending</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Fees</p>
                      <p className="font-semibold">${child.totalFees.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Paid</p>
                      <p className="font-semibold text-success">${child.totalPaid.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Balance</p>
                      <p className={`font-semibold ${child.balance > 0 ? "text-destructive" : ""}`}>
                        ${child.balance.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Tabs for Fees and Payments */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Recent Fees</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Outstanding & Recent Fees</CardTitle>
              <CardDescription>
                Fees for all your children
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.recentFees.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No fees to display
                </p>
              ) : (
                <DataTable
                  columns={feeColumns}
                  data={data.recentFees}
                  exportFileName="my-children-fees"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                All payments made for your children
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.recentPayments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No payments recorded yet
                </p>
              ) : (
                <DataTable
                  columns={paymentColumns}
                  data={data.recentPayments}
                  exportFileName="my-payment-history"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
