"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Money01Icon,
  CheckmarkCircle01Icon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useAuth } from "@/lib/auth-context";
import { fmt, type CurrencyCode } from "@/lib/currency";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DataTable } from "@/components/ui/data-table";
import { DashboardBreadcrumbs } from "@/components/dashboard/breadcrumbs";
import { ColumnDef } from "@tanstack/react-table";

interface Payment {
  id: string;
  amount: number;
  method: string;
  reference: string | null;
  date: string;
}

interface FeeItem {
  id: string;
  childName: string;
  childId: string;
  description: string;
  amount: number;
  paidAmount: number;
  balance: number;
  dueDate: string;
  status: string;
  payments: Payment[];
}

interface FeePaymentsData {
  summary: {
    totalFees: number;
    totalPaid: number;
    balance: number;
    overdueFees: number;
  };
  fees: FeeItem[];
}

export default function FeePaymentsPage() {
  const { school } = useAuth();
  const currency = school?.currency as CurrencyCode;

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard", "fee-payments"],
    queryFn: () => api.get<FeePaymentsData>("/dashboard/fee-payments"),
  });

  const columns = useMemo((): ColumnDef<FeeItem>[] => [
    {
      accessorKey: "childName",
      header: "Child",
      cell: ({ row }) => <span className="font-medium">{row.original.childName}</span>,
    },
    {
      accessorKey: "description",
      header: "Description",
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => fmt(row.original.amount, currency),
    },
    {
      accessorKey: "paidAmount",
      header: "Paid",
      cell: ({ row }) => (
        <span className="text-success">{fmt(row.original.paidAmount, currency)}</span>
      ),
    },
    {
      accessorKey: "balance",
      header: "Balance",
      cell: ({ row }) => {
        const balance = row.original.balance;
        return (
          <span className={balance > 0 ? "text-destructive font-medium" : "text-success"}>
            {fmt(balance, currency)}
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
        return <Badge variant={variant as any} className="capitalize">{status.toLowerCase()}</Badge>;
      },
    },
    {
      accessorKey: "payments",
      header: "Payments",
      cell: ({ row }) => {
        const count = row.original.payments.length;
        return count > 0 ? (
          <Badge variant="outline">{count} payment{count !== 1 ? "s" : ""}</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">None</span>
        );
      },
    },
  ], [currency]);

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
        <p className="text-muted-foreground">Unable to load fee information</p>
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
      <DashboardBreadcrumbs items={[{ label: "Fee Payments", href: "/dashboard/fee-payments" }]} />

      <div>
        <h1 className="text-2xl font-semibold">Fee Payments</h1>
        <p className="text-sm text-muted-foreground">View all fee information for your children</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Fees</p>
                <p className="text-lg font-semibold">{fmt(data.summary.totalFees, currency)}</p>
              </div>
              <div className="size-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                <HugeiconsIcon icon={Money01Icon} className="size-5" />
              </div>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Paid</p>
                <p className="text-lg font-semibold text-success">{fmt(data.summary.totalPaid, currency)}</p>
              </div>
              <div className="size-10 rounded-xl bg-success/10 text-success flex items-center justify-center">
                <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-5" />
              </div>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Outstanding</p>
                <p className={`text-lg font-semibold ${data.summary.balance > 0 ? "text-warning" : "text-success"}`}>
                  {fmt(data.summary.balance, currency)}
                </p>
              </div>
              <div className={`size-10 rounded-xl flex items-center justify-center ${data.summary.balance > 0 ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
                <HugeiconsIcon icon={data.summary.balance > 0 ? AlertCircleIcon : CheckmarkCircle01Icon} className="size-5" />
              </div>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Overdue</p>
                <p className={`text-lg font-semibold ${data.summary.overdueFees > 0 ? "text-destructive" : "text-success"}`}>
                  {fmt(data.summary.overdueFees, currency)}
                </p>
              </div>
              <div className={`size-10 rounded-xl flex items-center justify-center ${data.summary.overdueFees > 0 ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
                <HugeiconsIcon icon={AlertCircleIcon} className="size-5" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Progress Bar */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">Payment Progress</h3>
          <span className="text-sm font-medium text-brand">{Math.round(paymentProgress)}%</span>
        </div>
        <Progress value={paymentProgress} className="h-3" />
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>Paid: {fmt(data.summary.totalPaid, currency)}</span>
          <span>Remaining: {fmt(data.summary.balance, currency)}</span>
        </div>
      </div>

      {/* Fee Table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">All Fees</h3>
              <p className="text-sm text-muted-foreground">{data.fees.length} fee{data.fees.length !== 1 ? "s" : ""} across all children</p>
            </div>
            <Badge variant="outline" className="gap-2">
              <HugeiconsIcon icon={Money01Icon} size={14} />
              View only
            </Badge>
          </div>
          <div className="mt-4">
            {data.fees.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                No fees found
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={data.fees}
                exportFileName="my-children-fees"
              />
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
