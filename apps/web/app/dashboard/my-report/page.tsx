"use client";

import { BarChart3, Loader2 } from "lucide-react";
import { useMyReport } from "@/lib/hooks/use-student-reports";
import {
  StudentReportFull,
  ExportReportButton,
} from "../components/student-report-card";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardBreadcrumbs } from "@/components/dashboard";

export default function MyReportPage() {
  const { data, isLoading } = useMyReport();
  const report = data?.report;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <DashboardBreadcrumbs items={[{ label: "My Report" }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            My Academic Report
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your performance across all subjects
          </p>
        </div>
        {report && <ExportReportButton report={report} />}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-brand" />
        </div>
      ) : !report ? (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl">
          <BarChart3 className="size-12 text-muted-foreground mb-4" />
          <p className="text-lg font-semibold mb-1">No report available</p>
          <p className="text-sm text-muted-foreground">
            Your academic report will appear here once exams have been graded.
          </p>
        </div>
      ) : (
        <StudentReportFull report={report} showStudentHeader={false} />
      )}
    </div>
  );
}
