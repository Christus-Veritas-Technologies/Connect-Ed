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
  Target01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  Mail01Icon,
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
  school: { name: string; plan: string };
  parent: { id: string; name: string; email: string; phone: string | null };
  summary: { totalChildren: number; totalFees: number; totalPaid: number; totalBalance: number; overdueFees: number };
  children: ChildData[];
}

const getExamColumns = (): ColumnDef<LatestExam>[] => [
  {
    accessorKey: "subjectName",
    header: "Subject",
    cell: ({ row }) => <span className="font-medium">{row.original.subjectName}</span>,
  },
  { accessorKey: "examName", header: "Exam" },
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
      const variant = grade === "A" || grade === "B" ? "success" : grade === "C" || grade === "D" ? "warning" : "destructive";
      return <Badge variant={variant as any}>{grade}</Badge>;
    },
  },
  {
    accessorKey: "isPass",
    header: "Result",
    cell: ({ row }) => (
      <Badge variant={row.original.isPass ? "success" : "destructive"}>
        {row.original.isPass ? "Pass" : "Fail"}
      </Badge>
    ),
  },
];

const getFeeColumns = (currency?: CurrencyCode): ColumnDef<ChildData["fees"][0]>[] => [
  { accessorKey: "description", header: "Description" },
  { accessorKey: "amount", header: "Amount", cell: ({ row }) => fmt(row.original.amount, currency) },
  { accessorKey: "paidAmount", header: "Paid", cell: ({ row }) => fmt(row.original.paidAmount, currency) },
  {
    accessorKey: "balance",
    header: "Balance",
    cell: ({ row }) => {
      const balance = row.original.balance;
      return <span className={balance > 0 ? "text-destructive font-medium" : "text-success"}>{fmt(balance, currency)}</span>;
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

export default function MyChildPage() {
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
        <p className="text-muted-foreground">Unable to load child details</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardBreadcrumbs items={[{ label: "My Child", href: "/dashboard/my-child" }]} />

      <div>
        <h1 className="text-2xl font-semibold">My Child</h1>
        <p className="text-sm text-muted-foreground">
          Detailed view of your {data.children.length === 1 ? "child" : "children"}'s academic progress and fees
        </p>
      </div>

      {data.children.map((child, index) => (
        <motion.div
          key={child.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="space-y-5"
        >
          {/* Child Profile Card */}
          <div className="rounded-2xl border border-brand/15 bg-linear-to-r from-brand/10 via-card to-transparent p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="size-14 rounded-xl bg-brand/15 text-brand flex items-center justify-center text-lg font-semibold">
                  {child.firstName[0]}{child.lastName[0]}
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{child.name}</h2>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Badge variant="outline">{child.admissionNumber}</Badge>
                    {child.class && <Badge className="bg-brand text-white">{child.class.name}</Badge>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {child.overallAverage > 0 && (
                  <div className="rounded-xl border bg-card px-4 py-2 text-center">
                    <p className="text-xs text-muted-foreground">Overall Average</p>
                    <p className="text-lg font-bold text-brand">{child.overallAverage}%</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl border bg-card p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Class</p>
                  <p className="text-sm font-semibold">{child.class?.name || "N/A"}</p>
                </div>
                <div className="size-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
                  <HugeiconsIcon icon={School01Icon} className="size-4" />
                </div>
              </div>
            </div>
            <div className="rounded-2xl border bg-card p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Exams</p>
                  <p className="text-sm font-semibold">{child.latestExams.length} subjects</p>
                </div>
                <div className="size-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
                  <HugeiconsIcon icon={Target01Icon} className="size-4" />
                </div>
              </div>
            </div>
            <div className="rounded-2xl border bg-card p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Fees</p>
                  <p className="text-sm font-semibold">{fmt(child.totalFees, currency)}</p>
                </div>
                <div className="size-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
                  <HugeiconsIcon icon={Money01Icon} className="size-4" />
                </div>
              </div>
            </div>
            <div className="rounded-2xl border bg-card p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Balance</p>
                  <p className={`text-sm font-semibold ${child.balance > 0 ? "text-warning" : "text-success"}`}>
                    {fmt(child.balance, currency)}
                  </p>
                </div>
                <div className={`size-8 rounded-lg flex items-center justify-center ${child.balance > 0 ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
                  <HugeiconsIcon icon={child.balance > 0 ? AlertCircleIcon : CheckmarkCircle01Icon} className="size-4" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left: Exams & Report */}
            <div className="lg:col-span-8 space-y-5">
              {/* Exam Results */}
              <div className="rounded-2xl border bg-card p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Exam Results</h3>
                    <p className="text-sm text-muted-foreground">Latest results per subject</p>
                  </div>
                  <Link href="/dashboard/my-child-report">
                    <Button variant="outline" size="sm">View Full Report</Button>
                  </Link>
                </div>
                <div className="mt-4">
                  {child.latestExams.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
                      No exam results yet
                    </div>
                  ) : (
                    <DataTable columns={examColumns} data={child.latestExams} exportFileName={`${child.firstName}-exams`} />
                  )}
                </div>
              </div>

              {/* Report Highlights */}
              {child.latestExams.length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {(() => {
                    const strongest = child.latestExams.reduce((a, b) => a.mark > b.mark ? a : b);
                    const weakest = child.latestExams.reduce((a, b) => a.mark < b.mark ? a : b);
                    const passCount = child.latestExams.filter((e) => e.isPass).length;
                    const passRate = Math.round((passCount / child.latestExams.length) * 100);
                    return (
                      <>
                        <div className="rounded-xl border border-success/30 bg-success/5 p-4">
                          <div className="flex items-center gap-2">
                            <HugeiconsIcon icon={ArrowUp01Icon} className="size-5 text-success" />
                            <p className="text-sm font-semibold">Strongest Subject</p>
                          </div>
                          <p className="mt-2 font-semibold">{strongest.subjectName}</p>
                          <p className="text-sm text-muted-foreground">{strongest.mark}% • Grade {strongest.grade}</p>
                        </div>
                        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
                          <div className="flex items-center gap-2">
                            <HugeiconsIcon icon={ArrowDown01Icon} className="size-5 text-warning" />
                            <p className="text-sm font-semibold">Needs Improvement</p>
                          </div>
                          <p className="mt-2 font-semibold">{weakest.subjectName}</p>
                          <p className="text-sm text-muted-foreground">{weakest.mark}% • Grade {weakest.grade}</p>
                        </div>
                        <div className="rounded-xl border p-4 sm:col-span-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold">Pass Rate</p>
                            <Badge variant={passRate >= 50 ? "success" : "destructive"}>
                              {passRate}%
                            </Badge>
                          </div>
                          <Progress value={passRate} className="mt-2 h-2" />
                          <p className="mt-1 text-xs text-muted-foreground">
                            {passCount} of {child.latestExams.length} subjects passed
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Fee Table */}
              {child.fees.length > 0 && (
                <div className="rounded-2xl border bg-card p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Fee Breakdown</h3>
                      <p className="text-sm text-muted-foreground">All fees for {child.firstName}</p>
                    </div>
                    <Link href="/dashboard/fee-payments">
                      <Button variant="outline" size="sm">All Fees</Button>
                    </Link>
                  </div>
                  <div className="mt-4">
                    <DataTable columns={feeColumns} data={child.fees} exportFileName={`${child.firstName}-fees`} />
                  </div>
                </div>
              )}
            </div>

            {/* Right: Class & Teacher */}
            <div className="lg:col-span-4 space-y-5">
              {/* Class Teacher */}
              {child.class?.classTeacher && (
                <div className="rounded-2xl border bg-card p-5">
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon icon={UserIcon} className="size-5 text-brand" />
                    <h3 className="text-base font-semibold">Class Teacher</h3>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-brand/10 text-brand flex items-center justify-center font-semibold text-sm">
                      {child.class.classTeacher.name[0]}
                    </div>
                    <div>
                      <p className="font-medium">{child.class.classTeacher.name}</p>
                      <a
                        href={`mailto:${child.class.classTeacher.email}`}
                        className="flex items-center gap-1 text-sm text-brand hover:underline"
                      >
                        <HugeiconsIcon icon={Mail01Icon} className="size-3.5" />
                        {child.class.classTeacher.email}
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Class Info */}
              <div className="rounded-2xl border bg-card p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon icon={School01Icon} className="size-5 text-brand" />
                    <h3 className="text-base font-semibold">Class Details</h3>
                  </div>
                  <Link href="/dashboard/my-child-class">
                    <Button variant="ghost" size="sm" className="text-brand text-xs">
                      View More
                    </Button>
                  </Link>
                </div>
                {child.class ? (
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Class</span>
                      <span className="font-medium">{child.class.name}</span>
                    </div>
                    {child.class.level && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Level</span>
                        <Badge variant="outline" className="capitalize">{child.class.level}</Badge>
                      </div>
                    )}
                    {child.class.classTeacher && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Teacher</span>
                        <span className="font-medium">{child.class.classTeacher.name}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">No class assigned yet.</p>
                )}
              </div>

              {/* Fee Summary Card */}
              <div className="rounded-2xl border bg-card p-5">
                <div className="flex items-center gap-2">
                  <HugeiconsIcon icon={Money01Icon} className="size-5 text-brand" />
                  <h3 className="text-base font-semibold">Fee Status</h3>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Payment progress</span>
                      <span className="font-medium text-foreground">
                        {child.totalFees > 0 ? Math.round((child.totalPaid / child.totalFees) * 100) : 100}%
                      </span>
                    </div>
                    <Progress value={child.totalFees > 0 ? (child.totalPaid / child.totalFees) * 100 : 100} className="h-2" />
                  </div>
                  <div className="rounded-xl bg-muted/40 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-semibold">{fmt(child.totalFees, currency)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-muted-foreground">Paid</span>
                      <span className="font-semibold text-success">{fmt(child.totalPaid, currency)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-muted-foreground">Balance</span>
                      <span className={`font-semibold ${child.balance > 0 ? "text-warning" : "text-success"}`}>
                        {fmt(child.balance, currency)}
                      </span>
                    </div>
                  </div>
                  {child.balance === 0 ? (
                    <Badge variant="success" className="gap-1.5 w-full justify-center">
                      <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-4" />
                      All Paid
                    </Badge>
                  ) : child.overdueFees > 0 ? (
                    <Badge variant="destructive" className="gap-1.5 w-full justify-center">
                      <HugeiconsIcon icon={AlertCircleIcon} className="size-4" />
                      {fmt(child.overdueFees, currency)} overdue
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Divider between children */}
          {index < data.children.length - 1 && (
            <div className="border-t my-2" />
          )}
        </motion.div>
      ))}
    </div>
  );
}
