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
  TrendUp01Icon,
  TrendDown01Icon,
  Target01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useAuth } from "@/lib/auth-context";
import { fmt, type CurrencyCode } from "@/lib/currency";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
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
  const { user, school } = useAuth();
  const currency = school?.currency as CurrencyCode;
  const examColumns = useMemo(() => getExamColumns(), []);
  const feeColumns = useMemo(() => getFeeColumns(currency), [currency]);

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

  const paymentProgress = data.feeSummary.totalFees > 0
    ? (data.feeSummary.totalPaid / data.feeSummary.totalFees) * 100
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

      {/* My Class Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HugeiconsIcon icon={School01Icon} className="size-5" />
              My Class
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.class ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Class</p>
                    <p className="text-xl font-semibold">{data.class.name}</p>
                  </div>
                  {data.class.level && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Level</p>
                      <Badge variant="outline" className="capitalize text-base">
                        {data.class.level}
                      </Badge>
                    </div>
                  )}
                </div>
                {data.class.teacher && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-2">Class Teacher</p>
                    <p className="font-medium">{data.class.teacher.name}</p>
                    <a href={`mailto:${data.class.teacher.email}`} className="text-sm text-brand hover:underline">
                      {data.class.teacher.email}
                    </a>
                  </div>
                )}
                {data.class.subjects && data.class.subjects.length > 0 && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-2">Subjects</p>
                    <div className="flex flex-wrap gap-2">
                      {data.class.subjects.map((subject) => (
                        <Badge key={subject.id} variant="secondary">
                          {subject.name}
                        </Badge>
                      ))}
                    </div>
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

      {/* Report Snapshot */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HugeiconsIcon icon={Target01Icon} className="size-5" />
              Academic Report Snapshot
            </CardTitle>
            <CardDescription>Your latest exam performance summary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {data.latestExams.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No exam results yet. Keep an eye on this section for your latest marks!
              </p>
            ) : (
              <>
                {/* Key Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-brand/5 border border-brand/10">
                    <p className="text-sm text-muted-foreground">Overall Average</p>
                    <p className="text-3xl font-bold text-brand">{data.reportSnapshot.overallAverage}%</p>
                  </div>
                  <div className="p-4 rounded-lg bg-success/5 border border-success/10">
                    <p className="text-sm text-muted-foreground">Pass Rate</p>
                    <p className="text-3xl font-bold text-success">{data.reportSnapshot.overallPassRate}%</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <p className="text-sm text-muted-foreground">Exams Taken</p>
                    <p className="text-3xl font-bold">{data.reportSnapshot.examsTaken}</p>
                  </div>
                </div>

                {/* Strongest & Weakest Subjects */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {data.reportSnapshot.strongestSubject && (
                    <div className="p-4 rounded-lg border border-success/30 bg-success/5">
                      <div className="flex items-center gap-2 mb-2">
                        <HugeiconsIcon icon={TrendUp01Icon} className="size-5 text-success" />
                        <p className="text-sm font-semibold">Strongest Subject</p>
                      </div>
                      <p className="font-semibold">{data.reportSnapshot.strongestSubject.subjectName}</p>
                      <p className="text-sm text-muted-foreground">
                        {data.reportSnapshot.strongestSubject.mark}% • Grade {data.reportSnapshot.strongestSubject.grade}
                      </p>
                    </div>
                  )}
                  {data.reportSnapshot.weakestSubject && (
                    <div className="p-4 rounded-lg border border-warning/30 bg-warning/5">
                      <div className="flex items-center gap-2 mb-2">
                        <HugeiconsIcon icon={TrendDown01Icon} className="size-5 text-warning" />
                        <p className="text-sm font-semibold">Areas for Improvement</p>
                      </div>
                      <p className="font-semibold">{data.reportSnapshot.weakestSubject.subjectName}</p>
                      <p className="text-sm text-muted-foreground">
                        {data.reportSnapshot.weakestSubject.mark}% • Grade {data.reportSnapshot.weakestSubject.grade}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Latest Exam Marks Table */}
      {data.latestExams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Latest Exam Marks</CardTitle>
            <CardDescription>Your most recent results per subject</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={examColumns}
              data={data.latestExams}
              exportFileName="my-latest-marks"
            />
          </CardContent>
        </Card>
      )}

      {/* Fee Summary - Minimal at Bottom */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HugeiconsIcon icon={Money01Icon} className="size-5" />
              Fee Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment Progress</span>
                <span className="font-medium">{Math.round(paymentProgress)}%</span>
              </div>
              <Progress value={paymentProgress} className="h-2" />
            </div>

            {/* Stats Grid - Compact */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="text-center p-3 rounded bg-muted">
                <p className="text-sm font-semibold">{fmt(data.feeSummary.totalFees, currency)}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="text-center p-3 rounded bg-success/10">
                <p className="text-sm font-semibold text-success">{fmt(data.feeSummary.totalPaid, currency)}</p>
                <p className="text-xs text-muted-foreground">Paid</p>
              </div>
              <div className="text-center p-3 rounded bg-warning/10">
                <p className="text-sm font-semibold text-warning">{fmt(data.feeSummary.balance, currency)}</p>
                <p className="text-xs text-muted-foreground">Balance</p>
              </div>
              {data.feeSummary.overdueFees > 0 && (
                <div className="text-center p-3 rounded bg-destructive/10">
                  <p className="text-sm font-semibold text-destructive">{fmt(data.feeSummary.overdueFees, currency)}</p>
                  <p className="text-xs text-muted-foreground">Overdue</p>
                </div>
              )}
            </div>

            {/* Status Badge */}
            <div className="flex justify-center">
              {data.feeSummary.balance === 0 ? (
                <Badge variant="success" className="gap-2">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-4" />
                  All Fees Paid
                </Badge>
              ) : data.feeSummary.overdueFees > 0 ? (
                <Badge variant="destructive" className="gap-2">
                  <HugeiconsIcon icon={AlertCircleIcon} className="size-4" />
                  Overdue fees - Contact office
                </Badge>
              ) : (
                <Badge variant="warning" className="gap-2">
                  <HugeiconsIcon icon={TimeQuarterIcon} className="size-4" />
                  {fmt(data.feeSummary.balance, currency)} outstanding
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Fee Details Table - Expandable */}
      {data.fees.length > 0 && (
        <Card className="opacity-75">
          <CardHeader>
            <CardTitle className="text-base">Fee Details</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={feeColumns}
              data={data.fees}
              exportFileName="my-fees"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
