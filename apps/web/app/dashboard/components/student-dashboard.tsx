"use client";

import { useMemo } from "react";
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
  subjectCode: string;
  examName: string;
  mark: number;
  grade: string;
  isPass: boolean;
  createdAt: string;
}

interface ReportSnapshot {
  overallAverage: number;
  overallPassRate: number;
  totalSubjects: number;
  examsTaken: number;
  examsPassed: number;
  weakestSubject: LatestExam | null;
  strongestSubject: LatestExam | null;
}

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
    id: string;
    name: string;
    level: string | null;
    teacher: {
      name: string;
      email: string;
    } | null;
    subjects: Array<{
      id: string;
      name: string;
      code: string;
    }>;
  } | null;
  latestExams: LatestExam[];
  reportSnapshot: ReportSnapshot;
  feeSummary: {
    totalFees: number;
    totalPaid: number;
    balance: number;
    overdueFees: number;
  };
  fees: Fee[];
}

const getExamColumns = (): ColumnDef<LatestExam>[] => [
  {
    accessorKey: "subjectName",
    header: "Subject",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.subjectName}</span>
        <span className="text-xs text-muted-foreground">{row.original.subjectCode}</span>
      </div>
    ),
  },
  {
    accessorKey: "examName",
    header: "Exam",
  },
  {
    accessorKey: "mark",
    header: "Mark",
    cell: ({ row }) => (
      <span className="font-semibold">{row.original.mark}%</span>
    ),
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

const getFeeColumns = (currency?: CurrencyCode): ColumnDef<Fee>[] => [
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
];

export function StudentDashboard() {
  const { school } = useAuth();
  const currency = school?.currency as CurrencyCode;
  const examColumns = useMemo(() => getExamColumns(), []);
  const feeColumns = useMemo(() => getFeeColumns(currency), [currency]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard", "student"],
    queryFn: () => api.get<StudentDashboardData>("/dashboard/student"),
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

  const paymentProgress = data.feeSummary.totalFees > 0
    ? (data.feeSummary.totalPaid / data.feeSummary.totalFees) * 100
    : 100;

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="rounded-2xl border border-brand/15 bg-linear-to-r from-brand/10 via-card to-transparent p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-xl bg-brand/15 text-brand flex items-center justify-center font-semibold">
                {data.student.firstName[0]}{data.student.lastName[0]}
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">
                  Welcome back, {data.student.firstName}
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
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="w-fit">
              {data.student.admissionNumber}
            </Badge>
            {data.class && (
              <Badge className="bg-brand text-white">
                {data.class.name}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stat Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Class</p>
              <p className="text-lg font-semibold">{data.class?.name || "Unassigned"}</p>
            </div>
            <div className="size-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
              <HugeiconsIcon icon={School01Icon} className="size-5" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Overall Avg</p>
              <p className="text-lg font-semibold text-brand">{data.reportSnapshot.overallAverage}%</p>
            </div>
            <div className="size-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
              <HugeiconsIcon icon={Target01Icon} className="size-5" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Pass Rate</p>
              <p className="text-lg font-semibold text-success">{data.reportSnapshot.overallPassRate}%</p>
            </div>
            <div className="size-10 rounded-xl bg-success/10 text-success flex items-center justify-center">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-5" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Exams Taken</p>
              <p className="text-lg font-semibold">{data.reportSnapshot.examsTaken}</p>
            </div>
            <div className="size-10 rounded-xl bg-muted text-foreground flex items-center justify-center">
              <HugeiconsIcon icon={Calendar03Icon} className="size-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Latest Exam Marks */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Latest Exam Marks</h2>
              <p className="text-sm text-muted-foreground">Most recent results per subject</p>
            </div>
            <Badge variant="outline" className="gap-2">
              <HugeiconsIcon icon={Target01Icon} size={14} />
              Instant updates
            </Badge>
          </div>
          <div className="mt-4">
            {data.latestExams.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
                No exam results yet.
              </div>
            ) : (
              <DataTable
                columns={examColumns}
                data={data.latestExams}
                exportFileName="my-latest-marks"
              />
            )}
          </div>
        </div>
      </motion.div>

      {/* Report Highlights */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="text-lg font-semibold">Report Highlights</h2>
          <p className="text-sm text-muted-foreground">Strengths and areas to focus</p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-success/30 bg-success/5 p-4">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={ArrowUp01Icon} className="size-5 text-success" />
                <p className="text-sm font-semibold">Strongest Subject</p>
              </div>
              <div className="mt-2">
                <p className="font-semibold">
                  {data.reportSnapshot.strongestSubject?.subjectName || "N/A"}
                </p>
                {data.reportSnapshot.strongestSubject && (
                  <p className="text-sm text-muted-foreground">
                    {data.reportSnapshot.strongestSubject.mark}% • Grade {data.reportSnapshot.strongestSubject.grade}
                  </p>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={ArrowDown01Icon} className="size-5 text-warning" />
                <p className="text-sm font-semibold">Areas for Improvement</p>
              </div>
              <div className="mt-2">
                <p className="font-semibold">
                  {data.reportSnapshot.weakestSubject?.subjectName || "N/A"}
                </p>
                {data.reportSnapshot.weakestSubject && (
                  <p className="text-sm text-muted-foreground">
                    {data.reportSnapshot.weakestSubject.mark}% • Grade {data.reportSnapshot.weakestSubject.grade}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Fee Details */}
      {data.fees.length > 0 && (
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Fee Details</h3>
              <p className="text-sm text-muted-foreground">A quick breakdown (parents see full details)</p>
            </div>
            <Badge variant="outline" className="gap-2">
              <HugeiconsIcon icon={Money01Icon} size={14} />
              Minimal view
            </Badge>
          </div>
          <div className="mt-4">
            <DataTable
              columns={feeColumns}
              data={data.fees}
              exportFileName="my-fees"
            />
          </div>
        </div>
      )}
    </div>
  );
}
