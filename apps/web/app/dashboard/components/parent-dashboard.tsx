"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  UserIcon,
  Money01Icon,
  CheckmarkCircle01Icon,
  AlertCircleIcon,
  School01Icon,
  Calendar03Icon,
  SunCloudAngledRain01Icon,
  Target01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useAuth } from "@/lib/auth-context";
import { fmt, type CurrencyCode } from "@/lib/currency";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";

interface LatestExam {
  subjectName: string;
  examName: string;
  mark: number;
  grade: string;
  isPass: boolean;
}

interface ChildData {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  admissionNumber: string;
  class: {
    id: string;
    name: string;
    level: string | null;
    classTeacher: {
      name: string;
      email: string;
    } | null;
  } | null;
  totalFees: number;
  totalPaid: number;
  balance: number;
  overdueFees: number;
  overallAverage: number;
  latestExams: LatestExam[];
  fees: Array<{
    id: string;
    description: string;
    amount: number;
    paidAmount: number;
    balance: number;
    dueDate: string;
    status: string;
  }>;
}

interface ParentDashboardData {
  school: {
    name: string;
    plan: string;
  };
  parent: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  summary: {
    totalChildren: number;
    totalFees: number;
    totalPaid: number;
    totalBalance: number;
    overdueFees: number;
  };
  children: ChildData[];
}

const getExamColumns = (): ColumnDef<LatestExam>[] => [
  {
    accessorKey: "subjectName",
    header: "Subject",
    cell: ({ row }) => <span className="font-medium">{row.original.subjectName}</span>,
  },
  {
    accessorKey: "examName",
    header: "Exam",
  },
  {
    accessorKey: "mark",
    header: "Mark",
    cell: ({ row }) => <span className="font-semibold">{row.original.mark}%</span>,
  },
  {
    accessorKey: "grade",
    header: "Grade",
    cell: ({ row }) => {
      const grade = row.original.grade;
      const variant = grade === "A" || grade === "B" ? "success"
        : grade === "C" || grade === "D" ? "warning"
          : "destructive";
      return <Badge variant={variant as any}>{grade}</Badge>;
    },
  },
];

const getFeeColumns = (currency?: CurrencyCode): ColumnDef<ChildData["fees"][0]>[] => [
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
    cell: ({ row }) => fmt(row.original.paidAmount, currency),
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
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      const variant = status === "PAID" ? "success" : status === "OVERDUE" ? "destructive" : "warning";
      return <Badge variant={variant as any} className="capitalize">{status.toLowerCase()}</Badge>;
    },
  },
];

export function ParentDashboard() {
  const { school } = useAuth();
  const currency = school?.currency as CurrencyCode;
  const examColumns = useMemo(() => getExamColumns(), []);
  const feeColumns = useMemo(() => getFeeColumns(currency), [currency]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard", "parent"],
    queryFn: () => api.get<ParentDashboardData>("/dashboard/parent"),
  });

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

  const paymentProgress = data.summary.totalFees > 0
    ? (data.summary.totalPaid / data.summary.totalFees) * 100
    : 100;

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="rounded-2xl border border-brand/15 bg-linear-to-r from-brand/10 via-card to-transparent p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-xl bg-brand/15 text-brand flex items-center justify-center font-semibold">
                {data.parent.name[0]}
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">
                  Welcome back, {data.parent.name.split(" ")[0]}
                </h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{data.school.name}</span>
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
            </div>
          </div>
          <Badge variant="outline" className="w-fit">
            {data.summary.totalChildren} {data.summary.totalChildren === 1 ? "child" : "children"} enrolled
          </Badge>
        </div>
      </div>

      {/* Quick Stat Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Children</p>
              <p className="text-lg font-semibold">{data.summary.totalChildren}</p>
            </div>
            <div className="size-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
              <HugeiconsIcon icon={UserIcon} className="size-5" />
            </div>
          </div>
        </div>
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
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Paid</p>
              <p className="text-lg font-semibold text-success">{fmt(data.summary.totalPaid, currency)}</p>
            </div>
            <div className="size-10 rounded-xl bg-success/10 text-success flex items-center justify-center">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-5" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className={`text-lg font-semibold ${data.summary.totalBalance > 0 ? "text-warning" : "text-success"}`}>
                {fmt(data.summary.totalBalance, currency)}
              </p>
            </div>
            <div className={`size-10 rounded-xl flex items-center justify-center ${data.summary.totalBalance > 0 ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
              <HugeiconsIcon icon={data.summary.totalBalance > 0 ? AlertCircleIcon : CheckmarkCircle01Icon} className="size-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Children Sections */}
      {data.children.map((child, index) => (
        <motion.div
          key={child.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <div className="rounded-2xl border bg-card overflow-hidden">
            {/* Child Header */}
            <div className="flex items-center justify-between border-b bg-muted/30 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-brand/15 text-brand flex items-center justify-center text-sm font-semibold">
                  {child.firstName[0]}{child.lastName[0]}
                </div>
                <div>
                  <h2 className="text-base font-semibold">{child.name}</h2>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{child.admissionNumber}</span>
                    {child.class && (
                      <>
                        <span>•</span>
                        <span>{child.class.name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {child.overallAverage > 0 && (
                  <Badge variant="outline" className="gap-1.5">
                    <HugeiconsIcon icon={Target01Icon} size={14} />
                    Avg: {child.overallAverage}%
                  </Badge>
                )}
                <Link href="/dashboard/my-child">
                  <Button variant="ghost" size="sm" className="text-brand">
                    View Details
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-12">
              {/* Left: Exams */}
              <div className="lg:col-span-8 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <HugeiconsIcon icon={Target01Icon} className="size-4 text-brand" />
                    Latest Exam Results
                  </h3>
                  <div className="mt-3">
                    {child.latestExams.length === 0 ? (
                      <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
                        No exam results yet
                      </div>
                    ) : (
                      <DataTable
                        columns={examColumns}
                        data={child.latestExams}
                        exportFileName={`${child.firstName}-exam-results`}
                      />
                    )}
                  </div>
                </div>

                {/* Report Highlights */}
                {child.latestExams.length > 0 && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {(() => {
                      const strongest = child.latestExams.reduce((a, b) => a.mark > b.mark ? a : b);
                      const weakest = child.latestExams.reduce((a, b) => a.mark < b.mark ? a : b);
                      return (
                        <>
                          <div className="rounded-xl border border-success/30 bg-success/5 p-3">
                            <div className="flex items-center gap-2">
                              <HugeiconsIcon icon={ArrowUp01Icon} className="size-4 text-success" />
                              <p className="text-xs font-semibold">Strongest</p>
                            </div>
                            <p className="mt-1 font-medium text-sm">{strongest.subjectName}</p>
                            <p className="text-xs text-muted-foreground">{strongest.mark}% • Grade {strongest.grade}</p>
                          </div>
                          <div className="rounded-xl border border-warning/30 bg-warning/5 p-3">
                            <div className="flex items-center gap-2">
                              <HugeiconsIcon icon={ArrowDown01Icon} className="size-4 text-warning" />
                              <p className="text-xs font-semibold">Needs Improvement</p>
                            </div>
                            <p className="mt-1 font-medium text-sm">{weakest.subjectName}</p>
                            <p className="text-xs text-muted-foreground">{weakest.mark}% • Grade {weakest.grade}</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Right: Class & Fees */}
              <div className="lg:col-span-4 space-y-4">
                {/* Class Info */}
                <div className="rounded-xl border p-4">
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon icon={School01Icon} className="size-4 text-brand" />
                    <h3 className="text-sm font-semibold">Class</h3>
                  </div>
                  {child.class ? (
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Class</span>
                        <span className="font-medium">{child.class.name}</span>
                      </div>
                      {child.class.level && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Level</span>
                          <Badge variant="outline" className="capitalize text-xs">{child.class.level}</Badge>
                        </div>
                      )}
                      {child.class.classTeacher && (
                        <div className="rounded-lg bg-muted/40 p-2 mt-2">
                          <p className="text-xs text-muted-foreground">Class Teacher</p>
                          <p className="font-medium text-sm">{child.class.classTeacher.name}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">No class assigned</p>
                  )}
                </div>

                {/* Fee Summary */}
                <div className="rounded-xl border p-4">
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon icon={Money01Icon} className="size-4 text-brand" />
                    <h3 className="text-sm font-semibold">Fees</h3>
                  </div>
                  <div className="mt-3 space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Payment progress</span>
                        <span className="font-medium text-foreground">
                          {child.totalFees > 0 ? Math.round((child.totalPaid / child.totalFees) * 100) : 100}%
                        </span>
                      </div>
                      <Progress
                        value={child.totalFees > 0 ? (child.totalPaid / child.totalFees) * 100 : 100}
                        className="h-2"
                      />
                    </div>
                    <div className="rounded-lg bg-muted/40 p-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Balance</span>
                        <span className={`font-semibold ${child.balance > 0 ? "text-warning" : "text-success"}`}>
                          {fmt(child.balance, currency)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Paid</span>
                        <span>{fmt(child.totalPaid, currency)}</span>
                      </div>
                    </div>
                    {child.overdueFees > 0 && (
                      <Badge variant="destructive" className="gap-1.5 w-full justify-center">
                        <HugeiconsIcon icon={AlertCircleIcon} className="size-3.5" />
                        {fmt(child.overdueFees, currency)} overdue
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ))}

      {/* Overall Fee Summary */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Overall Payment Progress</h2>
            <p className="text-sm text-muted-foreground">Across all children</p>
          </div>
          <Link href="/dashboard/fee-payments">
            <Button variant="outline" size="sm">View All Fees</Button>
          </Link>
        </div>
        <div className="mt-4 space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Total progress</span>
              <span className="font-medium text-foreground">{Math.round(paymentProgress)}%</span>
            </div>
            <Progress value={paymentProgress} className="h-3" />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Total Fees</p>
              <p className="font-semibold">{fmt(data.summary.totalFees, currency)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Total Paid</p>
              <p className="font-semibold text-success">{fmt(data.summary.totalPaid, currency)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className="font-semibold text-warning">{fmt(data.summary.totalBalance, currency)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Overdue</p>
              <p className="font-semibold text-destructive">{fmt(data.summary.overdueFees, currency)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
