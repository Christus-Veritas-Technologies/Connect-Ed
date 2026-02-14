"use client";

import { motion } from "framer-motion";
import {
  ArrowUp01Icon,
  ArrowDown01Icon,
  BookOpen01Icon,
  ChartHistogramIcon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  FileDownloadIcon,
  SentIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { StudentReportData } from "@/lib/hooks/use-student-reports";
import { useSendReportToParent } from "@/lib/hooks/use-student-reports";
import { exportStudentReportPDF, type SchoolBranding, type StudentInfo, type TeacherInfo } from "@/lib/export-utils";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export function ReportOverviewCards({ report }: { report: StudentReportData }) {
  const stats = [
    {
      label: "Average Mark",
      value: `${report.overall.averageMark}%`,
      progress: report.overall.averageMark,
      color: report.overall.averageMark >= 50 ? "text-green-600" : "text-red-600",
      subValue: report.overall.averageGrade ? `Grade: ${report.overall.averageGrade}` : undefined,
    },
    {
      label: "Total Subjects",
      value: report.overall.totalSubjects,
      icon: BookOpen01Icon,
      color: "text-blue-600",
    },
    {
      label: "Exams Written",
      value: report.overall.totalExams,
      icon: ChartHistogramIcon,
      color: "text-purple-600",
    },
    {
      label: "Pass Rate",
      value: `${report.overall.passRate}%`,
      progress: report.overall.passRate,
      color: report.overall.passRate >= 50 ? "text-green-600" : "text-red-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
        >
          <Card>
            <CardContent className="pt-5 pb-4 space-y-2">
              <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
              <p className={`text-2xl font-semibold ${stat.color}`}>{stat.value}</p>
              {stat.subValue && (
                <p className="text-xs font-medium text-brand">{stat.subValue}</p>
              )}
              {stat.progress !== undefined && (
                <Progress value={stat.progress} className="h-1.5" />
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

export function ReportInsights({ report }: { report: StudentReportData }) {
  const { weakestSubject, strongestSubject } = report.insights;

  if (!weakestSubject && !strongestSubject) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {strongestSubject && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="py-4 flex items-center gap-4">
            <div className="size-12 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <HugeiconsIcon icon={ArrowUp01Icon} size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-green-700 font-medium">Strongest Subject</p>
              <p className="text-lg font-bold text-green-800">{strongestSubject.name}</p>
              <p className="text-sm text-green-600">{strongestSubject.averageMark}% average</p>
            </div>
          </CardContent>
        </Card>
      )}
      {weakestSubject && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="py-4 flex items-center gap-4">
            <div className="size-12 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
              <HugeiconsIcon icon={ArrowDown01Icon} size={24} className="text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-orange-700 font-medium">Needs Improvement</p>
              <p className="text-lg font-bold text-orange-800">{weakestSubject.name}</p>
              <p className="text-sm text-orange-600">{weakestSubject.averageMark}% average</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function ReportSubjectBreakdown({ report }: { report: StudentReportData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Subject Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {report.subjects.length === 0 ? (
          <p className="text-muted-foreground text-sm py-6 text-center">
            No exam results recorded yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead className="text-center">Exams</TableHead>
                <TableHead className="text-center">Average</TableHead>
                <TableHead className="text-center">Grade</TableHead>
                <TableHead className="text-center">Pass Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.subjects.map((subject) => (
                <TableRow key={subject.subjectId}>
                  <TableCell className="font-medium">{subject.subjectName}</TableCell>
                  <TableCell className="text-center">{subject.examsTaken}</TableCell>
                  <TableCell className="text-center">
                    <span
                      className={
                        subject.averageMark >= 50 ? "text-green-600 font-bold" : "text-red-600 font-bold"
                      }
                    >
                      {subject.averageMark}%
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={subject.averageIsPass ? "success" : "destructive"}
                      className="text-xs"
                    >
                      {subject.averageGrade}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{subject.passRate}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export function ReportExamDetails({ report }: { report: StudentReportData }) {
  const allExams = report.subjects.flatMap((s) =>
    s.exams.map((e) => ({ ...e, subjectName: s.subjectName }))
  );

  if (allExams.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">All Exam Results</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Exam</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="text-center">Paper</TableHead>
              <TableHead className="text-center">Mark</TableHead>
              <TableHead className="text-center">Grade</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allExams.map((exam) => (
              <TableRow key={exam.examId}>
                <TableCell className="font-medium">{exam.examName}</TableCell>
                <TableCell>{exam.subjectName}</TableCell>
                <TableCell className="text-center">
                  {exam.paper.replace("PAPER_", "")}
                </TableCell>
                <TableCell className="text-center font-bold">
                  {exam.mark}%
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="text-xs">
                    {exam.gradeName}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <HugeiconsIcon
                    icon={exam.isPass ? CheckmarkCircle02Icon : Cancel01Icon}
                    size={18}
                    className={exam.isPass ? "text-green-500" : "text-red-500"}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function ExportReportButton({ report }: { report: StudentReportData }) {
  const { school, user } = useAuth();

  const handleExport = () => {
    // Prepare school branding
    const schoolBranding: SchoolBranding = {
      schoolName: school?.name || "School",
      schoolAddress: school?.address || undefined,
      schoolPhone: school?.phone || undefined,
      schoolEmail: school?.email || undefined,
    };

    // Prepare student info
    const studentInfo: StudentInfo = {
      name: report.student.name,
      admissionNumber: report.student.admissionNumber,
      className: report.student.className,
    };

    // Prepare teacher info (current user generating the report)
    const teacherInfo: TeacherInfo | undefined = user ? {
      name: user.name,
      email: user.email,
    } : undefined;

    // Export using the enhanced PDF function
    exportStudentReportPDF(
      {
        subjects: report.subjects.map(s => ({
          subjectName: s.subjectName,
          subjectCode: s.subjectCode || undefined,
          examsTaken: s.examsTaken,
          averageMark: s.averageMark,
          averageGrade: s.averageGrade,
          passRate: s.passRate,
          examsPassed: s.examsPassed,
        })),
        overall: {
          averageMark: report.overall.averageMark,
          averageGrade: report.overall.averageGrade,
          totalSubjects: report.overall.totalSubjects,
          totalExams: report.overall.totalExams,
          passRate: report.overall.passRate,
          totalPassed: report.overall.totalPassed,
          totalFailed: report.overall.totalFailed,
        },
        insights: report.insights,
      },
      studentInfo,
      schoolBranding,
      teacherInfo,
      `${report.student.name.replace(/\s+/g, "-").toLowerCase()}-academic-report`
    );
  };

  return (
    <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
      <HugeiconsIcon icon={FileDownloadIcon} size={16} />
      Export PDF
    </Button>
  );
}

export function SendReportToParentButton({ studentId }: { studentId: string }) {
  const sendMutation = useSendReportToParent();

  const handleSend = () => {
    sendMutation.mutate(studentId, {
      onSuccess: (data) => {
        const r = data.result;
        const channels = [];
        if (r.emailSent) channels.push("email");
        if (r.whatsappSent) channels.push("WhatsApp");

        if (channels.length > 0) {
          toast.success(`Report sent to ${r.parentName} via ${channels.join(" & ")}`);
        } else if (r.error) {
          toast.warning(r.error);
        } else {
          toast.info("Report dispatched — parent may not have contact info on file");
        }
      },
      onError: (err) => {
        const msg = err instanceof ApiError ? err.message : "Failed to send report";
        toast.error(msg);
      },
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={handleSend}
      disabled={sendMutation.isPending}
    >
      <HugeiconsIcon icon={SentIcon} size={16} />
      {sendMutation.isPending ? "Sending..." : "Send to Parent"}
    </Button>
  );
}

export function StudentReportFull({
  report,
  showStudentHeader = true,
  showSendButton = false,
}: {
  report: StudentReportData;
  showStudentHeader?: boolean;
  showSendButton?: boolean;
}) {
  return (
    <div className="space-y-6">
      {showStudentHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">{report.student.name}</h2>
            <p className="text-sm text-muted-foreground">
              {report.student.admissionNumber} • {report.student.className}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {showSendButton && <SendReportToParentButton studentId={report.student.id} />}
            <ExportReportButton report={report} />
          </div>
        </div>
      )}
      <ReportOverviewCards report={report} />
      <ReportInsights report={report} />
      <ReportSubjectBreakdown report={report} />
      <ReportExamDetails report={report} />
    </div>
  );
}
